import { supabase } from '../config/supabase'
import { addDays, zonedNow } from './business'
import { weekFromRows } from './hours'
import { fromMinutes, parseDateKey, toDateKey, toMinutes, todayKey } from './dates'
import { loadBookingMoney, paidOnline } from './payments'
import { loadTrust } from './reliability'

const STEP = 30
const PENDING = 'pendingBooking'
const PENDING_TTL = 2 * 60 * 60 * 1000

export const monthShort = (date) => date.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)

export const bookingDays = (timeZone, week, count = 28) => {
    const { dateKey } = zonedNow(timeZone)
    return Array.from({ length: count }, (_, i) => {
        const key = addDays(dateKey, i)
        const date = parseDateKey(key)
        return { key, date, dow: date.getDay(), windows: week[date.getDay()] || [], today: i === 0 }
    })
}

// Free times come from the same function the server books with, so staff hours, blocks and
// overlaps agree. Shown on the half-hour grid of each opening window.
export const windowsFor = ({ windows, free, after = -1 }) => {
    const out = windows.map((w) => ({ ...w, slots: [] }))
    const extra = []
    for (const m of free) {
        if (m <= after) continue
        const w = out.find((x) => m >= x.start && m < x.end)
        if (w) {
            if ((m - w.start) % STEP === 0) w.slots.push(m)
        } else if (m % STEP === 0) {
            extra.push(m)
        }
    }
    if (extra.length) out.push({ start: extra[0], end: extra[extra.length - 1] + STEP, slots: extra })
    return out.sort((a, b) => a.start - b.start)
}

export const hasTimeLeft = (day, duration, nowMinutes) =>
    day.windows.some((w) => {
        const first = day.today ? Math.max(w.start, nowMinutes + 1) : w.start
        return first + duration <= w.end
    })

export const loadSlots = async ({ businessId, serviceId, dateKey, staffId = null, ignore = null, addonIds = [], people = null }) => {
    const { data, error } = await supabase.rpc('get_available_slots', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_date: dateKey,
        p_staff_id: staffId,
        p_ignore_appointment: ignore,
        p_addon_ids: addonIds.length ? addonIds : null,
        p_people: people,
    })
    if (error) throw error
    return [...new Set((data || []).map((row) => toMinutes(row.slot_time)))].sort((a, b) => a - b)
}

export const requestBooking = async ({ businessId, serviceId, staffId = null, dateKey, minutes, name, email, phone, notes, addonIds = [], mode = null, clientAddress = null, clientLandmark = null, clientZone = null, clientLat = null, clientLng = null, clientPlaceId = null, people = 1 }) => {
    const { data, error } = await supabase.rpc('book_appointment', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_date: dateKey,
        p_time: fromMinutes(minutes),
        p_client_name: name,
        p_client_email: email,
        p_client_phone: phone,
        p_notes: notes,
        p_staff_id: staffId,
        p_addon_ids: addonIds.length ? addonIds : null,
        p_mode: mode,
        p_client_address: clientAddress,
        p_client_landmark: clientLandmark,
        p_client_zone: clientZone,
        p_client_lat: clientLat,
        p_client_lng: clientLng,
        p_client_place_id: clientPlaceId,
        p_people: people,
    })
    if (error) throw error
    return data
}

export const savePending = ({ slug, serviceId, dateKey, minutes, addonIds = [], mode = null, people = 1 }) => {
    try {
        sessionStorage.setItem(PENDING, JSON.stringify({ businessSlug: slug, serviceId, addonIds, mode, people, date: dateKey, time: fromMinutes(minutes), savedAt: Date.now() }))
    } catch { /* storage blocked: the client picks the time again */ }
}

export const readPending = (slug) => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(PENDING) || 'null')
        if (!saved || saved.businessSlug !== slug || !parseDateKey(saved.date)) return null
        if (saved.savedAt && Date.now() - saved.savedAt > PENDING_TTL) return null
        return { serviceId: saved.serviceId, addonIds: Array.isArray(saved.addonIds) ? saved.addonIds : [], mode: saved.mode || null, people: Number(saved.people) || 1, dateKey: saved.date, minutes: toMinutes(saved.time) }
    } catch {
        return null
    }
}

// ?book=<service>.<date>.<hhmm>, from sign-in or from "What do you need?", which also carries the
// format (&mode=) and the group size (&people=).
export const readBookParam = (search) => {
    const params = new URLSearchParams(search)
    const value = params.get('book')
    const match = value && /^([^.]+)\.(\d{4}-\d{2}-\d{2})\.(\d{2})(\d{2})$/.exec(value)
    if (!match || !parseDateKey(match[2])) return null
    const mode = ['at_business', 'at_client', 'online'].includes(params.get('mode')) ? params.get('mode') : null
    const people = Math.max(1, Math.min(50, Number(params.get('people')) || 1))
    return { serviceId: match[1], dateKey: match[2], minutes: Number(match[3]) * 60 + Number(match[4]), mode, people }
}

// Your bookings: made while signed in, or as a guest with your email. Filtered to you, because a
// business owner can also read their own business's bookings.
const mine = async (email) => {
    const { data } = await supabase.auth.getSession()
    const id = data?.session?.user?.id
    const safe = String(email || '').replace(/[,()]/g, '')
    return id ? `client_id.eq.${id},client_email.eq.${safe}` : `client_email.eq.${safe}`
}

export const loadNextBooking = async (email) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, status, businesses (business_name, slug), services (service_name)')
        .or(await mine(email))
        .gte('appointment_date', todayKey())
        .in('status', ['pending', 'confirmed'])
        .neq('payment_status', 'awaiting')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(1)
    if (error) throw error
    return data?.[0] || null
}

const BOOKING_FIELDS = 'id, service_id, appointment_date, appointment_time, duration_minutes, status, notes, price, mode, people, meeting_url, client_address, client_landmark, client_zone, travel_fee, payment_status, total, client_fee, currency, cancelled_by, rescheduled_from, addons, businesses (id, business_name, slug, address, city, country, phone, whatsapp, timezone, banner_url, logo_url, category, category_detail, auto_confirm, cancel_cutoff_minutes), services (id, service_name, duration_minutes, price, modes, travel_fee, max_people, price_per, extra_person_minutes), reviews (id, rating, body, reply, replied_at, created_at, status), receipts (kind, number, token)'

export const loadMyBookings = async (email) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(BOOKING_FIELDS)
        .or(await mine(email))
        .neq('payment_status', 'awaiting')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
    if (error) throw error
    return withMoney(data || [])
}

// Paid bookings carry what was refunded and the cancellation rule. Without them a paid booking
// still shows as paid; only the refund preview waits.
export const withMoney = async (rows) => {
    const ids = rows.filter(paidOnline).map((r) => r.id)
    if (!ids.length) return rows
    try {
        const money = await loadBookingMoney(ids)
        return rows.map((r) => (money.has(r.id) ? { ...r, refund: money.get(r.id).refund, policy: money.get(r.id).policy } : r))
    } catch (err) {
        console.error('Booking money failed:', err)
        return rows
    }
}

export const cancelMyBooking = async (id) => {
    const { error } = await supabase.rpc('cancel_my_booking', { p_appointment_id: id })
    if (error) throw error
}

export const rescheduleMyBooking = async ({ id, dateKey, minutes }) => {
    const { error } = await supabase.rpc('reschedule_appointment', { p_appointment_id: id, p_date: dateKey, p_time: fromMinutes(minutes) })
    if (error) throw error
}

// The private manage link from a booking email: see, move or cancel without signing in.
export const loadByLink = async (token) => {
    const { data, error } = await supabase.rpc('booking_by_link', { p_token: token })
    if (error) throw error
    return data
}

export const cancelByLink = async (token) => {
    const { error } = await supabase.rpc('cancel_by_link', { p_token: token })
    if (error) throw error
}

export const rescheduleByLink = async ({ token, dateKey, minutes }) => {
    const { error } = await supabase.rpc('reschedule_by_link', { p_token: token, p_date: dateKey, p_time: fromMinutes(minutes) })
    if (error) throw error
}

// The services a business offers on top of another one, for the booking sheet's "Add to it" row.
export const loadExtras = async (businessId) => {
    const { data, error } = await supabase
        .from('services')
        .select('id, service_name, duration_minutes, price, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('is_addon', true)
        .order('sort_order')
    if (error) throw error
    return data || []
}

export const loadWeek = async (businessId) => {
    const { data, error } = await supabase
        .from('availability')
        .select('staff_id, day_of_week, start_time, end_time, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)
    if (error) throw error
    return weekFromRows(data || [])
}

export const canChange = (booking) => {
    const business = booking.businesses || {}
    const { dateKey, minutes } = zonedNow(business.timezone || 'Europe/Lisbon')
    const cutoff = Number(business.cancel_cutoff_minutes) || 0
    const start = toMinutes(booking.appointment_time)
    const daysAhead = Math.round((parseDateKey(booking.appointment_date) - parseDateKey(dateKey)) / 86400000)
    return daysAhead * 1440 + start - cutoff > minutes
}

export const bookingPrice = (booking) => booking.price ?? booking.services?.price

// Still ahead in the business's own time: a 09:00 visit is past by 09:30, not at midnight.
export const isAhead = (booking) => {
    const { dateKey, minutes } = zonedNow(booking.businesses?.timezone || 'Europe/Lisbon')
    if (booking.appointment_date !== dateKey) return booking.appointment_date > dateKey
    return toMinutes(booking.appointment_time) + (Number(booking.duration_minutes) || 0) > minutes
}

export const loadMyRebook = async () => {
    const { data, error } = await supabase.rpc('my_rebook')
    if (error) throw error
    return data || []
}

export const loadRebookByLink = async (token) => {
    const { data, error } = await supabase.rpc('rebook_by_link', { p_token: token })
    if (error) throw error
    return data
}

export const stopEmailsByLink = async (token) => {
    const { error } = await supabase.rpc('stop_emails_by_link', { p_token: token })
    if (error) throw error
}

export const firstOnOrAfter = (days, dateKey) => days.find((d) => d.key >= dateKey && d.windows.length > 0)

export const gapLabel = (days) => {
    if (days < 10) return days === 1 ? 'day' : `${days} days`
    if (days < 60) {
        const weeks = Math.round(days / 7)
        return weeks === 1 ? 'week' : `${weeks} weeks`
    }
    const months = Math.round(days / 30)
    return months === 1 ? 'month' : `${months} months`
}

export const dueLabel = (rhythm) => {
    if (!rhythm?.due_date) return rhythm?.last_date ? `Last visit ${shortDate(rhythm.last_date)}` : ''
    const days = Math.round((parseDateKey(rhythm.due_date) - parseDateKey(rhythm.today || todayKey())) / 86400000)
    if (days < -1) return 'Due now'
    if (days <= 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    return days < 14 ? `Due in ${days} days` : `Due ${shortDate(rhythm.due_date)}`
}

export const shortDate = (dateKey) => {
    const date = parseDateKey(String(dateKey).slice(0, 10))
    return date ? `${date.getDate()} ${monthShort(date)}` : ''
}

// What a "Book again" opens with: the service, the person if still bookable, and the suggested day.
export const rebookFrom = ({ service, staffId, staffName, staffCount, rhythm, client, addonIds }) => ({
    service,
    addonIds: addonIds || [],
    staffId: staffId || null,
    staffName: staffName || null,
    staffCount: Number(staffCount) || 1,
    suggested: rhythm?.suggested_date || null,
    due: rhythm?.due_date || null,
    today: rhythm?.today || toDateKey(new Date()),
    gapDays: rhythm?.gap_days || null,
    client: client || null,
})

export const USER_ERRORS = ['22023', 'P0001', 'P0002', '28000', '42501']

export const loadPlaces = async () => {
    const [places, services, hours, ratings, trust] = await Promise.all([
        supabase.from('businesses')
            .select('id, business_name, slug, description, category, category_detail, city, neighbourhood, timezone, banner_url, logo_url, is_demo')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        supabase.from('services').select('business_id, price, is_active').eq('is_active', true),
        supabase.from('availability').select('business_id, staff_id, day_of_week, start_time, end_time, is_active').eq('is_active', true),
        supabase.rpc('business_ratings'),
        loadTrust(),
    ])
    for (const result of [places, services, hours]) if (result.error) throw result.error
    const prices = new Map()
    for (const s of services.data || []) {
        const price = Number(String(s.price ?? '').replace(',', '.'))
        if (String(s.price ?? '').trim() === '' || Number.isNaN(price)) continue
        prices.set(s.business_id, Math.min(prices.get(s.business_id) ?? Infinity, price))
    }
    const rows = new Map()
    for (const h of hours.data || []) {
        if (!rows.has(h.business_id)) rows.set(h.business_id, [])
        rows.get(h.business_id).push(h)
    }
    // Ratings are a nice-to-have in results: if they fail, places still list.
    const stars = new Map((ratings.error ? [] : ratings.data || []).map((r) => [r.business_id, { average: Number(r.average), count: Number(r.count) }]))
    // Demo businesses stay findable for walkthroughs but never outrank a real one.
    return (places.data || [])
        .map((b) => ({ ...b, fromPrice: prices.get(b.id) ?? null, hourRows: rows.get(b.id) || [], rating: stars.get(b.id) || null, trust: trust.get(b.id) || null }))
        .sort((a, b) => Number(Boolean(a.is_demo)) - Number(Boolean(b.is_demo)))
}

export const clearPending = () => {
    try { sessionStorage.removeItem(PENDING) } catch { /* nothing to clear */ }
}

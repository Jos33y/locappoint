import { supabase } from '../config/supabase'
import { addDays, zonedNow } from './business'
import { weekFromRows } from './hours'
import { fromMinutes, parseDateKey, toMinutes, todayKey } from './dates'

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

export const slotsFor = ({ windows, busy, duration, after = -1 }) => {
    const taken = busy.map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)])
    return windows.map((w) => {
        const slots = []
        for (let start = w.start; start + duration <= w.end; start += STEP) {
            const end = start + duration
            if (start > after && !taken.some(([s, e]) => start < e && end > s)) slots.push(start)
        }
        return { ...w, slots }
    })
}

export const hasTimeLeft = (day, duration, nowMinutes) =>
    day.windows.some((w) => {
        const first = day.today ? Math.max(w.start, nowMinutes + 1) : w.start
        return first + duration <= w.end
    })

export const loadBusy = async (businessId, dateKey) => {
    const { data, error } = await supabase.rpc('get_busy_slots', { p_business_id: businessId, p_date: dateKey })
    if (error) throw error
    return data || []
}

export const requestBooking = async ({ businessId, serviceId, dateKey, minutes, name, email, phone, notes }) => {
    const { data, error } = await supabase.rpc('book_appointment', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_date: dateKey,
        p_time: fromMinutes(minutes),
        p_client_name: name,
        p_client_email: email,
        p_client_phone: phone,
        p_notes: notes,
    })
    if (error) throw error
    return data
}

export const savePending = ({ slug, serviceId, dateKey, minutes }) => {
    try {
        sessionStorage.setItem(PENDING, JSON.stringify({ businessSlug: slug, serviceId, date: dateKey, time: fromMinutes(minutes), savedAt: Date.now() }))
    } catch { /* storage blocked: the client picks the time again */ }
}

export const readPending = (slug) => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(PENDING) || 'null')
        if (!saved || saved.businessSlug !== slug || !parseDateKey(saved.date)) return null
        if (saved.savedAt && Date.now() - saved.savedAt > PENDING_TTL) return null
        return { serviceId: saved.serviceId, dateKey: saved.date, minutes: toMinutes(saved.time) }
    } catch {
        return null
    }
}

export const readBookParam = (search) => {
    const value = new URLSearchParams(search).get('book')
    const match = value && /^([^.]+)\.(\d{4}-\d{2}-\d{2})\.(\d{2})(\d{2})$/.exec(value)
    if (!match || !parseDateKey(match[2])) return null
    return { serviceId: match[1], dateKey: match[2], minutes: Number(match[3]) * 60 + Number(match[4]) }
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
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(1)
    if (error) throw error
    return data?.[0] || null
}

const BOOKING_FIELDS = 'id, service_id, appointment_date, appointment_time, duration_minutes, status, notes, price, cancelled_by, rescheduled_from, businesses (id, business_name, slug, address, city, country, phone, whatsapp, timezone, banner_url, logo_url, category, category_detail, auto_confirm, cancel_cutoff_minutes), services (id, service_name, duration_minutes, price)'

export const loadMyBookings = async (email) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(BOOKING_FIELDS)
        .or(await mine(email))
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
    if (error) throw error
    return data || []
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

export const USER_ERRORS = ['22023', 'P0001', 'P0002', '28000', '42501']

export const loadPlaces = async () => {
    const [places, services, hours] = await Promise.all([
        supabase.from('businesses')
            .select('id, business_name, slug, description, category, category_detail, city, neighbourhood, timezone, banner_url, logo_url')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        supabase.from('services').select('business_id, price, is_active').eq('is_active', true),
        supabase.from('availability').select('business_id, staff_id, day_of_week, start_time, end_time, is_active').eq('is_active', true),
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
    return (places.data || []).map((b) => ({ ...b, fromPrice: prices.get(b.id) ?? null, hourRows: rows.get(b.id) || [] }))
}

export const clearPending = () => {
    try { sessionStorage.removeItem(PENDING) } catch { /* nothing to clear */ }
}

import { supabase } from '../config/supabase'
import { parseDateKey, toDateKey } from './dates'

export const ACTIVE_STATUSES = ['pending', 'confirmed']

export const STATUS_LABEL = {
    pending: 'Needs confirming',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
}

const KNOWN_ERRORS = ['23P01', '22023', 'P0002', '42501', '28000']

export const friendlyError = (error) =>
    KNOWN_ERRORS.includes(error?.code) ? error.message : 'Something went wrong. Try again.'

export const zonedNow = (timeZone) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date()).map((part) => [part.type, part.value])
    )
    return {
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        minutes: Number(parts.hour) * 60 + Number(parts.minute),
    }
}

export const addDays = (dateKey, days) => {
    const date = parseDateKey(dateKey)
    date.setDate(date.getDate() + days)
    return toDateKey(date)
}

export const startOfWeek = (dateKey) => {
    const date = parseDateKey(dateKey)
    const offset = (date.getDay() + 6) % 7
    date.setDate(date.getDate() - offset)
    return toDateKey(date)
}

export const formatDay = (dateKey, options = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    parseDateKey(dateKey).toLocaleDateString('en-GB', options).replace(/\bSept\b/, 'Sep')

export const shortTime = (time) => (time || '').slice(0, 5)

export const minutesToLabel = (total) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

// Prices in the business's own currency: euros with cents only when there are cents, whole naira.
const priceFormats = new Map()
const priceFormat = (currency, decimals) => {
    const key = `${currency}:${decimals}`
    if (!priceFormats.has(key)) {
        priceFormats.set(key, new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
    }
    return priceFormats.get(key)
}

export const formatMoney = (value, currency = 'EUR') => {
    const amount = Number(value) || 0
    return priceFormat(currency || 'EUR', Number.isInteger(amount) ? 0 : 2).format(amount)
}

export const menuPrice = (value, currency = 'EUR') => {
    const amount = Number(String(value).replace(',', '.').trim())
    return priceFormat(currency || 'EUR', Number.isInteger(amount) ? 0 : 2).format(amount)
}

// What a client reads: a service that costs nothing is Free, never a zero.
export const shownPrice = (value, currency = 'EUR') => (Number(String(value).replace(',', '.').trim()) === 0 ? 'Free' : menuPrice(value, currency))

// The symbol a price field shows in front of the number.
export const currencySign = (currency) => (currency === 'NGN' ? '\u20a6' : '\u20ac')

export const loadWorkspace = async (businessId) => {
    const [business, members, services, hours] = await Promise.all([
        supabase.from('businesses')
            .select('id, business_name, slug, timezone, is_active, city, country, market, currency, phone, whatsapp, description, address, logo_url, banner_url')
            .eq('id', businessId)
            .single(),
        supabase.from('business_members')
            .select('id, user_id, role, display_name, status, is_bookable, sort_order')
            .eq('business_id', businessId)
            .eq('status', 'active')
            .order('sort_order')
            .order('created_at'),
        supabase.from('services')
            .select('id, service_name, duration_minutes, price, is_active')
            .eq('business_id', businessId)
            .order('sort_order')
            .order('service_name'),
        supabase.from('availability')
            .select('id, staff_id, day_of_week, start_time, end_time')
            .eq('business_id', businessId)
            .eq('is_active', true),
    ])
    for (const result of [business, members, services, hours]) {
        if (result.error) throw result.error
    }
    return {
        business: business.data,
        members: members.data,
        services: services.data,
        hours: hours.data,
    }
}

// Has this business ever had a booking, at any date and in any state? Today starts from here.
export const hasAnyBooking = async (businessId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .limit(1)
    if (error) throw error
    return (data || []).length > 0
}

export const loadBookings = async (businessId, fromKey, toKey) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, staff_id, service_id, appointment_date, appointment_time, duration_minutes, status, source, client_name, client_phone, client_email, notes, price, mode, people, meeting_url, client_address, client_landmark, client_zone, travel_fee, payment_status, total, client_fee, currency, cancelled_by, rescheduled_from, addons, services(service_name, price)')
        .eq('business_id', businessId)
        .neq('payment_status', 'awaiting')
        .gte('appointment_date', fromKey)
        .lte('appointment_date', toKey)
        .order('appointment_date')
        .order('appointment_time')
    if (error) throw error
    return data
}

export const loadBooking = async (businessId, id) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, staff_id, service_id, appointment_date, appointment_time, duration_minutes, status, source, client_name, client_phone, client_email, notes, price, mode, people, meeting_url, client_address, client_landmark, client_zone, travel_fee, payment_status, total, client_fee, currency, cancelled_by, rescheduled_from, addons, services(service_name, price)')
        .eq('business_id', businessId)
        .eq('id', id)
        .maybeSingle()
    if (error) throw error
    return data
}

export const loadBlocks = async (businessId, fromKey, toKey) => {
    const { data, error } = await supabase
        .from('time_blocks')
        .select('id, staff_id, starts_at, ends_at, reason')
        .eq('business_id', businessId)
        .lt('starts_at', `${addDays(toKey, 1)}T00:00:00`)
        .gt('ends_at', `${fromKey}T00:00:00`)
    if (error) throw error
    return data
}

export const setBookingStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
        .select('id')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('Update returned 0 rows for booking ' + id)
}

export const addBooking = async ({ businessId, serviceId, staffId, date, time, name, phone, email, notes }) => {
    const { data, error } = await supabase.rpc('owner_book_appointment', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_staff_id: staffId,
        p_date: date,
        p_time: time,
        p_client_name: name,
        p_client_phone: phone || null,
        p_client_email: email || null,
        p_notes: notes || null,
    })
    if (error) throw error
    return data
}

export const moveBooking = async ({ id, date, time, staffId }) => {
    const { error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: id,
        p_date: date,
        p_time: time,
        p_staff_id: staffId || null,
    })
    if (error) throw error
}

export const getSlots = async ({ businessId, serviceId, date, staffId }) => {
    const { data, error } = await supabase.rpc('get_available_slots', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_date: date,
        p_staff_id: staffId || null,
    })
    if (error) throw error
    return data || []
}

// The service as the client booked it, extras included: "Corte + Barba".
export const serviceLabel = (booking, fallback = 'Booking') =>
    [booking.services?.service_name || fallback, ...(Array.isArray(booking.addons) ? booking.addons.map((a) => a.name) : [])].filter(Boolean).join(' + ')

export const bookingStart = (booking) => {
    const [hours, minutes] = booking.appointment_time.split(':').map(Number)
    return hours * 60 + minutes
}

export const whatsappLink = (phone, text = '') => {
    const digits = (phone || '').replace(/[^\d]/g, '').replace(/^00/, '')
    if (!digits) return null
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const windowsFor = (hours, memberId, weekday) => {
    const own = memberId ? hours.filter((h) => h.staff_id === memberId) : []
    const source = own.length > 0 ? own : hours.filter((h) => !h.staff_id)
    return source
        .filter((h) => h.day_of_week === weekday)
        .map((h) => {
            const [sh, sm] = h.start_time.split(':').map(Number)
            const [eh, em] = h.end_time.split(':').map(Number)
            return [sh * 60 + sm, eh * 60 + em]
        })
        .sort((a, b) => a[0] - b[0])
}

export const blockMinutes = (block, dateKey) => {
    const dayStart = new Date(`${dateKey}T00:00:00`).getTime()
    const from = Math.max(0, (new Date(block.starts_at).getTime() - dayStart) / 60000)
    const to = Math.min(24 * 60, (new Date(block.ends_at).getTime() - dayStart) / 60000)
    return [from, to]
}

export const durationLabel = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (!h) return `${m} min`
    return m ? `${h} h ${m} min` : `${h} h`
}

export const pageSteps = ({ business, services, hours }) => [
    { done: true, label: 'Business details', hint: 'Name, category and city' },
    { done: Boolean(business.description?.trim()), label: 'Add a description', to: '/portal/page#about', hint: 'Two lines on what makes you worth the visit' },
    { done: Boolean(business.address?.trim()), label: 'Add your address', to: '/portal/page#location', hint: 'So clients can find you' },
    { done: Boolean(business.whatsapp?.trim()), label: 'Add your WhatsApp', to: '/portal/page#contact', hint: 'Clients can message you before they book' },
    { done: Boolean(business.logo_url), label: 'Add a logo', to: '/portal/page#photos', hint: 'A logo makes your page unmistakably yours' },
    { done: Boolean(business.banner_url), label: 'Add a cover photo', to: '/portal/page#photos', hint: 'A photo of your space is the first thing clients look at' },
    { done: services.some((s) => s.is_active), label: 'Add a service', to: '/portal/services', hint: 'Name, price and how long it takes' },
    { done: hours.some((h) => !h.staff_id), label: 'Set your opening hours', to: '/portal/hours', hint: 'When clients can book you' },
]

export const pageStrength = (workspace) => {
    const steps = pageSteps(workspace)
    const done = steps.filter((step) => step.done).length
    return {
        value: done / steps.length,
        percent: Math.round((done / steps.length) * 100),
        next: steps.find((step) => !step.done && !step.soon),
    }
}

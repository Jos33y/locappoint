import { supabase } from '../config/supabase'

// Every booking made with a business, as a list: upcoming, waiting for a yes, past, cancelled and
// no-shows, searched by client. The calendar shows time; this shows the record.

const FIELDS = 'id, staff_id, service_id, appointment_date, appointment_time, duration_minutes, status, source, client_name, client_phone, client_email, notes, price, mode, people, meeting_url, client_address, client_landmark, client_zone, travel_fee, payment_status, total, client_fee, currency, cancelled_by, rescheduled_from, addons, created_at, services(service_name, price)'

export const BOOKING_VIEWS = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'pending', label: 'To confirm' },
    { value: 'past', label: 'Past' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No-shows' },
]

export const PAGE = 50

// Commas and brackets would change the meaning of the search filter, so they are dropped.
const clean = (text) => String(text || '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 60)

const query = ({ businessId, view, today, search, staffId, columns = FIELDS, count = false }) => {
    let q = supabase.from('appointments').select(columns, count ? { count: 'exact', head: true } : undefined)
        .eq('business_id', businessId)
        .neq('payment_status', 'awaiting')
    if (view === 'upcoming') q = q.gte('appointment_date', today).in('status', ['pending', 'confirmed'])
    if (view === 'pending') q = q.gte('appointment_date', today).eq('status', 'pending')
    if (view === 'past') q = q.lt('appointment_date', today).in('status', ['confirmed', 'completed'])
    if (view === 'cancelled') q = q.eq('status', 'cancelled')
    if (view === 'no_show') q = q.eq('status', 'no_show')
    if (staffId) q = q.eq('staff_id', staffId)
    const s = clean(search)
    if (s) q = q.or(`client_name.ilike.%${s}%,client_email.ilike.%${s}%,client_phone.ilike.%${s}%`)
    return q
}

export const loadBookingList = async ({ businessId, view = 'upcoming', today, search = '', staffId = null, offset = 0, limit = PAGE }) => {
    const ahead = view === 'upcoming' || view === 'pending'
    const { data, error } = await query({ businessId, view, today, search, staffId })
        .order('appointment_date', { ascending: ahead })
        .order('appointment_time', { ascending: ahead })
        .range(offset, offset + limit - 1)
    if (error) throw error
    return data || []
}

// How many in each view, for the counts on the tabs.
export const loadBookingCounts = async ({ businessId, today, staffId = null }) => {
    const entries = await Promise.all(BOOKING_VIEWS.map(async ({ value }) => {
        const { count, error } = await query({ businessId, view: value, today, staffId, columns: 'id', count: true })
        if (error) throw error
        return [value, count || 0]
    }))
    return Object.fromEntries(entries)
}

// The current list as a spreadsheet file, for the owner's own records.
export const bookingsCsv = (rows, { staffName = () => '' } = {}) => {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['Date', 'Time', 'Client', 'Phone', 'Email', 'Service', 'With', 'Status', 'Price', 'Paid online', 'Booked']
    const lines = rows.map((b) => [
        b.appointment_date, String(b.appointment_time || '').slice(0, 5), b.client_name, b.client_phone, b.client_email,
        b.services?.service_name || '', staffName(b.staff_id), b.status, b.price ?? '',
        ['paid', 'refunded', 'partly_refunded'].includes(b.payment_status) ? 'yes' : 'no',
        b.created_at ? String(b.created_at).slice(0, 10) : '',
    ].map(cell).join(','))
    return [head.map(cell).join(','), ...lines].join('\r\n')
}

import { supabase } from '../config/supabase'

// Read-only views for Locappoint staff. Every function checks users.is_admin on the server (admin.sql).
const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const loadOverview = () => call('admin_overview')
export const loadAdminBusinesses = () => call('admin_businesses')
export const loadAdminBookings = ({ search = '', status = '', offset = 0, limit = 50 } = {}) =>
    call('admin_bookings', { p_search: search || null, p_status: status || null, p_limit: limit, p_offset: offset })
export const loadAdminPeople = ({ search = '', type = '', offset = 0, limit = 50 } = {}) =>
    call('admin_people', { p_search: search || null, p_type: type || null, p_limit: limit, p_offset: offset })

export const money = (value, currency = 'EUR') => {
    const n = Number(value)
    if (!Number.isFinite(n)) return ''
    return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

// "3 days ago", "today", or a date for anything older than a month.
export const ago = (iso) => {
    if (!iso) return ''
    const then = new Date(iso)
    const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 31) return `${days} days ago`
    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const shortDate = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '')

export const SOURCE_LABELS = { web: 'Booking page or app', manual: 'Added by the business', assistant: 'Assistant', ai_assistant: 'Assistant', whatsapp: 'WhatsApp', google: 'Google' }
export const BOOKING_STATUS = {
    pending: ['Waiting', 'warning'],
    confirmed: ['Confirmed', 'info'],
    completed: ['Done', 'success'],
    no_show: ['No-show', 'danger'],
    cancelled: ['Cancelled', 'muted'],
}

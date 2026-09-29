import { supabase } from '../config/supabase'
import { durationLabel } from './business'
import { parseDateKey } from './dates'

const FIELDS = 'id, kind, audience, appointment_id, business_id, payload, read_at, created_at'

export const loadInbox = async (audience, limit = 80) => {
    const { data, error } = await supabase
        .from('inbox')
        .select(FIELDS)
        .eq('audience', audience)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) throw error
    return data || []
}

export const countUnread = async (audience) => {
    const { count, error } = await supabase
        .from('inbox')
        .select('id', { count: 'exact', head: true })
        .eq('audience', audience)
        .is('read_at', null)
    if (error) throw error
    return count || 0
}

export const markInboxRead = async (audience, ids = null) => {
    const { error } = await supabase.rpc('mark_inbox_read', { p_audience: audience, p_ids: ids })
    if (error) throw error
}

// New items for this person, live. Returns the unsubscribe.
export const subscribeInbox = (userId, onInsert) => {
    const channel = supabase
        .channel(`inbox:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox', filter: `user_id=eq.${userId}` }, (change) => onInsert(change.new))
        .subscribe()
    return () => supabase.removeChannel(channel)
}

// Tue 29 Sep, the same way the emails write it.
export const shortDay = (dateKey) => {
    const date = parseDateKey(String(dateKey).slice(0, 10))
    if (!date) return ''
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
    const month = date.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)
    return `${weekday} ${date.getDate()} ${month}`
}

const priceLabel = (price, country) => {
    if (price === null || price === undefined || price === '') return ''
    const n = Number(price)
    if (!Number.isFinite(n)) return ''
    if (n === 0) return 'Free'
    const nigeria = country === 'NG'
    return new Intl.NumberFormat(nigeria ? 'en-NG' : 'en-IE', {
        style: 'currency',
        currency: nigeria ? 'NGN' : 'EUR',
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(n)
}

const KINDS = {
    business: {
        booking_new: () => ({ label: 'New booking', tone: 'success' }),
        booking_request: (p) => ({ label: p.moved_from ? 'Moved, needs your OK' : 'Waiting for you', tone: 'warning' }),
        booking_cancelled: () => ({ label: 'Cancelled by the client', tone: 'danger', off: true }),
        booking_moved: () => ({ label: 'Moved by the client', tone: 'info' }),
    },
    client: {
        booking_confirmed: () => ({ label: 'Confirmed', tone: 'success' }),
        booking_requested: () => ({ label: 'Request sent', tone: 'warning' }),
        booking_declined: () => ({ label: 'Not accepted', tone: 'danger', off: true }),
        booking_cancelled: () => ({ label: 'Cancelled by the business', tone: 'danger', off: true }),
        booking_moved: () => ({ label: 'New time from the business', tone: 'info' }),
        booking_reminder: () => ({ label: 'Coming up', tone: 'info' }),
    },
}

// What one inbox item says, for the list and for the live toast.
export const describeItem = (item) => {
    const p = item.payload || {}
    const kind = KINDS[item.audience]?.[item.kind]?.(p) || { label: 'Update', tone: 'info' }
    const forBusiness = item.audience === 'business'
    const price = priceLabel(p.price, p.country)
    const duration = p.duration_minutes ? durationLabel(Number(p.duration_minutes)) : ''
    const movedFrom = p.moved_from ? String(p.moved_from) : ''
    return {
        ...kind,
        time: String(p.time || '').slice(0, 5),
        day: p.date ? shortDay(p.date) : '',
        title: forBusiness ? p.client_name || 'A client' : p.service_name || 'Your booking',
        sub: (forBusiness
            ? [p.service_name, duration, price]
            : [p.business_name, p.staff_name ? `with ${p.staff_name}` : '', price]
        ).filter(Boolean).join(' · '),
        was: movedFrom ? `${shortDay(movedFrom)}, ${movedFrom.slice(11, 16)}` : '',
        href: item.appointment_id
            ? `${forBusiness ? '/portal/calendar' : '/client/appointments'}?booking=${item.appointment_id}`
            : null,
    }
}

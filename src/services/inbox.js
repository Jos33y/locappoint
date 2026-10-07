import { supabase } from '../config/supabase'
import { durationLabel } from './business'
import { parseDateKey } from './dates'
import { payMoney } from './payments'

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

// Paid online, the money line says so: what the client paid, or what came back. The business sees
// its price, marked paid.
const PAID = ['paid', 'refunded', 'partly_refunded']
const moneyLabel = (p, forBusiness) => {
    const price = priceLabel(p.price, p.country)
    if (!PAID.includes(p.payment_status) || !(Number(p.total) > 0)) return price
    const currency = p.currency || (p.country === 'NG' ? 'NGN' : 'EUR')
    if (Number(p.refund) > 0) return `${payMoney(p.refund, currency, true)} ${forBusiness ? 'refunded to the client' : 'back to you'}`
    return forBusiness ? `${price}, paid online` : `Paid ${payMoney(p.total, currency, true)}`
}

const KINDS = {
    business: {
        booking_new: () => ({ label: 'New booking', tone: 'success' }),
        booking_request: (p) => ({ label: p.moved_from ? 'Moved, needs your OK' : 'Waiting for you', tone: 'warning' }),
        booking_cancelled: () => ({ label: 'Cancelled by the client', tone: 'danger', off: true }),
        booking_moved: () => ({ label: 'Moved by the client', tone: 'info' }),
        referral_points: (p) => ({ label: `+${p.points} points`, tone: 'success' }),
        weekly_statement: () => ({ label: 'Weekly statement', tone: 'info' }),
        review_new: (p) => ({ label: `New review, ${p.rating} ${Number(p.rating) === 1 ? 'star' : 'stars'}`, tone: Number(p.rating) >= 4 ? 'success' : Number(p.rating) === 3 ? 'info' : 'warning' }),
        support_reply: (p) => ({ label: p.status === 'resolved' ? 'Support: resolved' : 'Support replied', tone: 'info' }),
        support_warning: () => ({ label: 'Warning from Locappoint', tone: 'danger' }),
        block_review: (p) => ({ label: p.decision === 'kept' ? 'Block kept' : 'Block lifted by Locappoint', tone: p.decision === 'kept' ? 'info' : 'warning' }),
        reliability: (p) => RELIABILITY[p.event] || { label: 'Reliability', tone: 'info' },
        verification: (p) => VERIFICATION[p.event] || { label: 'Verified badge', tone: 'info' },
    },
    client: {
        booking_confirmed: () => ({ label: 'Confirmed', tone: 'success' }),
        booking_requested: () => ({ label: 'Request sent', tone: 'warning' }),
        booking_declined: () => ({ label: 'Not accepted', tone: 'danger', off: true }),
        booking_cancelled: () => ({ label: 'Cancelled by the business', tone: 'danger', off: true }),
        booking_moved: () => ({ label: 'New time from the business', tone: 'info' }),
        booking_reminder: () => ({ label: 'Coming up', tone: 'info' }),
        visit_followup: (p) => ({ label: p.ask_review === false ? 'Book again' : 'How was it?', tone: 'success' }),
        review_reply: () => ({ label: 'Reply to your review', tone: 'info' }),
        trip_on_way: (p) => ({ label: p.minutes ? `On the way, about ${p.minutes} min` : 'On the way', tone: 'info' }),
        support_reply: (p) => ({ label: p.status === 'resolved' ? 'Support: resolved' : 'Support replied', tone: 'info' }),
        support_warning: () => ({ label: 'Warning from Locappoint', tone: 'danger' }),
    },
}

const RELIABILITY = {
    won: { label: 'Reliable badge earned', tone: 'success' },
    warning: { label: 'Reliability slipping', tone: 'warning' },
    lost: { label: 'Reliable badge lost', tone: 'danger' },
    removed: { label: 'Badge removed by Locappoint', tone: 'danger' },
}

const VERIFICATION = {
    approved: { label: 'Verified badge on', tone: 'success' },
    rejected: { label: 'Verification: not yet', tone: 'warning' },
    expired: { label: 'Verified badge needs a new video', tone: 'warning' },
    removed: { label: 'Verified badge removed', tone: 'danger' },
}

const verificationLine = (p) => {
    if (p.event === 'approved') return 'Clients now see the gold badge on your page and in search.'
    if (p.event === 'expired') return p.reason === 'address' ? 'Your address changed. Send a video of the new place.' : 'A year has passed. Send a new video of your place.'
    return p.note ? clip(p.note) : 'Open to see what to do next.'
}

const reliabilityLine = (p) => {
    if (p.event === 'removed') return p.note ? clip(p.note) : 'Reply in Support if you disagree.'
    if (p.event === 'won') return `Score ${p.score} of 100. Clients now see the blue badge.`
    if (p.event === 'lost') return 'It comes back once your score is 90 or more again.'
    return Number(p.score) < 85 ? `Score ${p.score}. Under 85 for 7 days and the badge goes.` : `Score ${p.score}. See what cost points.`
}

const clip = (text, n = 90) => { const t = String(text || '').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

const reviewLine = (item, p) => {
    if (item.kind === 'referral_points') return `${p.business_name || 'A business you invited'}: ${String(p.label || '').toLowerCase()}`
    if (item.kind === 'weekly_statement') {
        const n = (Number(p.online?.count) || 0) + (Number(p.added?.count) || 0)
        return `${n} ${n === 1 ? 'visit' : 'visits'}. You pay ${p.country === 'NG' ? '₦0' : '€0'}, free during the beta.`
    }
    if (item.kind === 'review_new') return p.body ? `“${clip(p.body)}”` : `${p.service_name || 'Visit'}, stars only`
    if (item.kind === 'review_reply') return `${p.business_name || 'The business'}: “${clip(p.reply)}”`
    if (item.kind === 'support_reply' || item.kind === 'support_warning') return clip(p.body)
    if (item.kind === 'block_review') return p.note ? clip(p.note) : p.decision === 'kept' ? 'Reviewed. They still cannot book you online.' : 'They can book you online again.'
    if (item.kind === 'reliability') return reliabilityLine(p)
    if (item.kind === 'verification') return verificationLine(p)
    return ''
}

const SUPPORT_KINDS = ['support_reply', 'support_warning']

const hrefFor = (item, forBusiness, p) => {
    if (SUPPORT_KINDS.includes(item.kind)) return `${forBusiness ? '/portal' : '/client'}/support${p.ticket_id ? `?t=${p.ticket_id}` : ''}`
    if (item.kind === 'block_review') return '/portal/clients'
    if (item.kind === 'reliability') return '/portal/insights?reliability=1'
    if (item.kind === 'verification') return '/portal/verified'
    if (item.kind === 'referral_points') return '/portal/invite'
    if (item.kind === 'weekly_statement') return `/portal/insights?statement=${p.from || ''}`
    if (item.kind === 'review_new') return p.review_id ? `/portal/reviews?review=${p.review_id}` : '/portal/reviews'
    if (!item.appointment_id) return null
    if (forBusiness) return `/portal/calendar?booking=${item.appointment_id}`
    if (item.kind === 'visit_followup') return `/client/appointments?${p.ask_review === false ? 'again' : 'rate'}=${item.appointment_id}`
    return `/client/appointments?booking=${item.appointment_id}`
}

// What one inbox item says, for the list and for the live toast.
export const describeItem = (item) => {
    const p = item.payload || {}
    const kind = KINDS[item.audience]?.[item.kind]?.(p) || { label: 'Update', tone: 'info' }
    const forBusiness = item.audience === 'business'
    const price = moneyLabel(p, forBusiness)
    const duration = p.duration_minutes ? durationLabel(Number(p.duration_minutes)) : ''
    const movedFrom = p.moved_from && (item.kind === 'booking_moved' || item.kind === 'booking_request') ? String(p.moved_from) : ''
    return {
        ...kind,
        time: SUPPORT_KINDS.includes(item.kind) || item.kind === 'block_review' || item.kind === 'reliability' || item.kind === 'verification' ? '' : String(p.time || '').slice(0, 5),
        day: SUPPORT_KINDS.includes(item.kind) || item.kind === 'block_review' || item.kind === 'reliability' || item.kind === 'verification' ? '' : p.date ? shortDay(p.date) : item.kind === 'weekly_statement' && p.from ? shortDay(p.from) : '',
        title: item.kind === 'verification' ? 'Your Verified badge' : item.kind === 'reliability' ? 'Your reliability' : item.kind === 'block_review' ? p.client_name || 'A client' : SUPPORT_KINDS.includes(item.kind) ? `${p.number ? `#${p.number} ` : ''}${p.subject || 'Locappoint support'}` : item.kind === 'referral_points' ? 'Points earned' : item.kind === 'weekly_statement' ? `Your week, ${shortDay(p.from)} to ${shortDay(p.to)}` : forBusiness ? p.client_name || 'A client' : p.service_name || 'Your booking',
        sub: reviewLine(item, p) || (forBusiness
            ? [p.service_name, duration, price]
            : [p.business_name, p.staff_name ? `with ${p.staff_name}` : '', price]
        ).filter(Boolean).join(' · '),
        was: movedFrom ? `${shortDay(movedFrom)}, ${movedFrom.slice(11, 16)}` : '',
        href: hrefFor(item, forBusiness, p),
    }
}

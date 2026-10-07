import { supabase } from '../config/supabase'

// The reliability score and the Reliable badge (reliability.sql). Worked out every night from the
// last 90 days. Clients see the badge and "Keeps 98% of bookings", never the number.
const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const PARTS = [
    { key: 'kept', label: 'Kept bookings', max: 40, says: 'Bookings you did not cancel. Late ones, under 24 hours before, cost double.' },
    { key: 'showed', label: 'Showed up', max: 25, says: 'Visits a client reported you missed, when we upheld it.' },
    { key: 'answers', label: 'Answers requests', max: 20, says: 'Requests you answered within 12 hours, yes or no.' },
    { key: 'clean', label: 'Clean record', max: 15, says: 'Reports about you we upheld. A safety report counts three times.' },
]

export const CHECKS = [
    { key: 'score', label: 'Score of 90 or more' },
    { key: 'completed', label: '10 completed visits in 90 days' },
    { key: 'email', label: 'Email confirmed' },
    { key: 'phone', label: 'Phone number on your page' },
    { key: 'safety', label: 'No upheld safety report in 180 days' },
    { key: 'active', label: 'Page live and taking bookings' },
]

export const ITEM_LABEL = {
    cancel: 'You cancelled',
    late_cancel: 'You cancelled under 24 hours before',
    no_show: 'Missed visit, upheld',
    late_request: 'Request waited over 12 hours',
    report: 'Report upheld',
    safety: 'Safety report upheld',
}

export const BADGE_MIN = 90
export const BADGE_KEEP = 85
export const MIN_BOOKINGS = 10

export const keptLine = (pct) => (pct === null || pct === undefined ? '' : `Keeps ${pct}% of bookings`)

export const loadMyReliability = (businessId) => call('my_reliability', { p_business: businessId })

// Every business with a badge or a score, for search and pages: Reliable (blue), Verified (gold). A failure never hides a business.
export const loadTrust = async () => {
    try {
        const rows = await call('business_trust')
        return new Map((rows || []).map((r) => [r.business_id, { reliable: Boolean(r.reliable), kept: r.kept_pct ?? null, verified: Boolean(r.verified) }]))
    } catch (err) {
        console.error('Trust failed:', err)
        return new Map()
    }
}

export const loadAdminReliability = ({ view = 'all', offset = 0, limit = 50 } = {}) =>
    call('admin_reliability', { p_view: view, p_limit: limit, p_offset: offset })
export const loadAdminReliabilityBusiness = (businessId) => call('admin_reliability_business', { p_business: businessId })
export const setBadge = ({ businessId, action, note }) => call('admin_badge', { p_business: businessId, p_action: action, p_note: note?.trim() || null })
export const excuseCancellation = ({ appointmentId, note }) => call('admin_excuse_cancellation', { p_appointment: appointmentId, p_note: note.trim() })

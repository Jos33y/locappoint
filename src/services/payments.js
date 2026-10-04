import { supabase } from '../config/supabase'
import { isNative } from './native'
import { parseDateKey } from './dates'

// Pay at booking: the quote the sheet shows, the payment page, and where a payment stands.
// Amounts are always worked out by the database; this only displays them.

const readError = async (error) => {
    try {
        const body = await error?.context?.json?.()
        if (body?.error) return body.error
    } catch { /* not JSON */ }
    return 'The payment page could not open. Check your connection and try again.'
}

export const loadQuote = async ({ businessId, serviceId, addonIds = [], mode = null }) => {
    const { data, error } = await supabase.rpc('payment_quote', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_addon_ids: addonIds.length ? addonIds : null,
        p_mode: mode,
    })
    if (error) throw error
    return data || { online: false }
}

export const startCheckout = async (appointmentId) => {
    const { data, error } = await supabase.functions.invoke('checkout', {
        body: { action: 'start', appointment_id: appointmentId, target: isNative() ? 'app' : 'web' },
    })
    if (error) throw new Error(await readError(error))
    if (data?.error) throw new Error(data.error)
    return data
}

export const paymentState = async (ref) => {
    const { data, error } = await supabase.rpc('payment_state', { p_checkout_ref: ref })
    if (error) throw error
    return data
}

// Turned back from the payment page: the held time is let go at once instead of in 35 minutes.
export const abandonPayment = async (ref) => {
    const { error } = await supabase.rpc('payment_abandon', { p_checkout_ref: ref })
    if (error) throw error
}

// Receipts keep every line to the same decimals: cents for euros, whole naira.
const formats = new Map()
export const payMoney = (value, currency = 'EUR', receipt = false) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return ''
    const decimals = currency === 'NGN' ? (Number.isInteger(n) ? 0 : 2) : receipt || !Number.isInteger(n) ? 2 : 0
    const key = `${currency}:${decimals}`
    if (!formats.has(key)) {
        formats.set(key, new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }))
    }
    return formats.get(key).format(n)
}

export const payWith = (quote) => {
    const methods = quote?.methods || []
    if (methods.includes('transfer') && methods.includes('card')) return 'by bank transfer or card'
    if (methods.includes('transfer')) return 'by bank transfer'
    return 'by card'
}

const half = (pct) => (Number(pct) === 50 ? 'half the price' : `${Number(pct)}% of the price`)

// "Free cancellation until Tue 6 Oct, 10:00." Worked out in the business's own time.
export const policyLine = ({ policy, dateKey, minutes, nowKey, nowMinutes }) => {
    if (!policy) return ''
    const hours = Number(policy.free_hours) || 0
    const kept = half(policy.keep_pct ?? 50)
    const start = parseDateKey(dateKey)
    if (!start) return ''
    start.setHours(0, minutes, 0, 0)
    const cutoff = new Date(start.getTime() - hours * 3_600_000)
    const now = parseDateKey(nowKey)
    if (now) now.setHours(0, nowMinutes, 0, 0)
    if (!hours || (now && cutoff <= now)) {
        return `This starts within ${hours || 0} hours: if you cancel, ${kept} is kept.`
    }
    const day = cutoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    const time = `${String(cutoff.getHours()).padStart(2, '0')}:${String(cutoff.getMinutes()).padStart(2, '0')}`
    return `Free cancellation until ${day}, ${time}. After that, ${kept} is kept.`
}

export const providerName = (provider) => (provider === 'paystack' ? 'Paystack' : 'Stripe')

// A booking paid online, wherever it is shown afterwards: the client's bookings, the manage page,
// the business's booking sheet. Refunds and the rule come from booking_money (or booking_by_link).
const PAID = ['paid', 'refunded', 'partly_refunded']
const SENT = ['refunded', 'partly_refunded']
const cents = (n, currency) => (currency === 'NGN' ? Math.round(n) : Math.round(n * 100) / 100)

export const paidOnline = (booking) => PAID.includes(booking?.payment_status) && Number(booking?.total) > 0

export const paidQuote = (booking) => (paidOnline(booking)
    ? { online: true, price: booking.price ?? booking.services?.price, client_fee: booking.client_fee, travel_fee: booking.travel_fee, total: booking.total, currency: booking.currency || 'EUR' }
    : null)

export const loadBookingMoney = async (ids) => {
    if (!ids.length) return new Map()
    const { data, error } = await supabase.rpc('booking_money', { p_ids: ids })
    if (error) throw error
    return new Map((data || []).map((row) => [row.id, row]))
}

// What has been given back so far. Sent once the provider confirms it; on its way before that.
export const refundOf = (booking) => {
    const amount = Number(booking?.refund) || 0
    if (!paidOnline(booking) || amount <= 0) return null
    const total = Number(booking.total)
    return { amount, kept: Math.max(cents(total - amount, booking.currency), 0), total, sent: SENT.includes(booking.payment_status), full: amount >= total }
}

// What cancelling now would give back, by the same rule as appointments_refund: everything before
// the free cancellation cutoff, after it the price less the share the business keeps. The service
// fee is only returned in full. "now" is the business's own time, as canChange uses it.
export const cancelRefund = (booking, { nowKey, nowMinutes }) => {
    const policy = booking?.policy
    if (!paidOnline(booking) || !policy) return null
    const currency = booking.currency || 'EUR'
    const total = Number(booking.total)
    const remaining = Math.max(total - (Number(booking.refund) || 0), 0)
    const hours = Number(policy.free_hours) || 0
    const [h = 0, m = 0] = String(booking.appointment_time || '').split(':').map(Number)
    const start = parseDateKey(String(booking.appointment_date).slice(0, 10))
    const today = parseDateKey(nowKey)
    if (!start || !today) return null
    const ahead = Math.round((start - today) / 86_400_000) * 1440 + h * 60 + m - nowMinutes
    const free = ahead >= hours * 60
    const price = Number(booking.price ?? booking.services?.price) || 0
    const keepPct = Number(policy.keep_pct ?? 50)
    const amount = Math.min(free ? remaining : cents((price * (100 - keepPct)) / 100, currency), remaining)
    start.setHours(h, m - hours * 60, 0, 0)
    return { amount, kept: cents(total - amount, currency), total, currency, free, keepPct, hours, cutoff: start }
}

export const cutoffLabel = (date) =>
    `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export const shareLabel = (pct) => (Number(pct) === 50 ? 'half the price' : `${Number(pct)}% of the price`)

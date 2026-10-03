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

export const loadQuote = async ({ businessId, serviceId, addonIds = [] }) => {
    const { data, error } = await supabase.rpc('payment_quote', {
        p_business_id: businessId,
        p_service_id: serviceId,
        p_addon_ids: addonIds.length ? addonIds : null,
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

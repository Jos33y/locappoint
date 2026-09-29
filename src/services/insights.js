import { supabase } from '../config/supabase'

export const loadInsights = async (businessId, days) => {
    const { data, error } = await supabase.rpc('business_insights', { p_business_id: businessId, p_days: days })
    if (error) throw error
    return data
}

const formats = new Map()

// Whole amounts without cents, cents only when there are cents. Naira for Nigeria, euro otherwise.
export const moneyFor = (country) => (value) => {
    const amount = Number(value) || 0
    const currency = country === 'NG' ? 'NGN' : 'EUR'
    const key = `${currency}:${Number.isInteger(amount) ? 0 : 2}`
    if (!formats.has(key)) {
        formats.set(key, new Intl.NumberFormat(country === 'NG' ? 'en-NG' : 'en-IE', {
            style: 'currency',
            currency,
            minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
            maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        }))
    }
    return formats.get(key).format(amount)
}

export const SOURCE_LABEL = {
    direct: 'Typed or saved link',
    locappoint: 'LocAppoint search',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    google: 'Google',
    qr: 'QR code',
    email: 'Email',
    other: 'Other sites',
}

// Change against the period before, as a whole percentage. Null when there is nothing to compare.
export const change = (now, before) => {
    const a = Number(now) || 0
    const b = Number(before) || 0
    if (!b) return a ? null : 0
    return Math.round(((a - b) / b) * 100)
}

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

export const leadLabel = (hours) => {
    if (hours === null || hours === undefined) return null
    const h = Number(hours)
    if (h < 1) return 'under an hour ahead'
    if (h < 36) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} ahead`
    const d = Math.round(h / 24)
    return `${d} days ahead`
}

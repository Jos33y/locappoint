// Stripe and Paystack calls for taking payment at booking, and the signature checks for their
// events. No Deno APIs, so the tests run it under Node.
//
// Stripe: Checkout on the business's own account (direct charge, Stripe-Account header) with
// Locappoint's fee as an application fee. Paystack: a transaction split to the business's
// subaccount, Locappoint's fee as a flat transaction charge, card and bank transfer.

export class ProviderError extends Error {
    status: number
    code: string
    constructor(message: string, status = 502, code = '') {
        super(message)
        this.status = status
        this.code = code
    }
}

type Params = Record<string, string | number | boolean | undefined>

const form = (params: Params) =>
    new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()

// Stripe v1, on a connected account when one is given.
export const stripeCall = async (key: string, path: string, params?: Params, account?: string, idempotency?: string) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: params ? 'POST' : 'GET',
        headers: {
            Authorization: `Bearer ${key}`,
            ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            ...(account ? { 'Stripe-Account': account } : {}),
            ...(idempotency ? { 'Idempotency-Key': idempotency } : {}),
        },
        body: params ? form(params) : undefined,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new ProviderError(body?.error?.message || `Stripe ${res.status}`, res.status >= 500 ? 502 : 400, String(body?.error?.code || ''))
    return body
}

// Stripe v1 DELETE on a connected account. A customer already gone counts as done.
export const stripeDelete = async (key: string, path: string, account: string) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}`, 'Stripe-Account': account },
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok || body?.error?.code === 'resource_missing') return true
    throw new ProviderError(body?.error?.message || `Stripe ${res.status}`, res.status >= 500 ? 502 : 400, String(body?.error?.code || ''))
}

export const paystackCall = async (key: string, path: string, body?: Record<string, unknown>, method = body ? 'POST' : 'GET') => {
    const res = await fetch(`https://api.paystack.co/${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok || out?.status === false) throw new ProviderError(out?.message || `Paystack ${res.status}`, res.status >= 500 ? 502 : 400)
    return out
}

// Euro cents and kobo: both two decimals.
export const minor = (amount: number | string) => Math.round(Number(amount) * 100)

export type Booking = {
    id: string
    name: string
    when: string
    price: number
    clientFee: number
    businessFee: number
    total: number
    currency: string
    email: string
}

// A signed-in client pays as a customer of the business's own Stripe account, so Stripe's page can
// offer to remember the card for next time (the client ticks it) and shows it, with a way to remove
// it, on the next booking there. Guests pay as today. Link, when switched on, remembers a card
// across every business through Stripe's own sign-in.
export type SessionOptions = { customer?: string | null; link?: boolean }

export const stripeSession = (b: Booking, site: string, app: boolean, o: SessionOptions = {}): Params => {
    const tail = app ? '&app=1' : ''
    const params: Params = {
        mode: 'payment',
        'payment_method_types[0]': 'card',
        ...(o.link ? { 'payment_method_types[1]': 'link' } : {}),
        ...(o.customer
            ? {
                customer: o.customer,
                'saved_payment_method_options[payment_method_save]': 'enabled',
                'saved_payment_method_options[payment_method_remove]': 'enabled',
            }
            : { customer_email: b.email || undefined }),
        locale: 'auto',
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': b.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': minor(b.price),
        'line_items[0][price_data][product_data][name]': b.name.slice(0, 250),
        'line_items[0][price_data][product_data][description]': b.when.slice(0, 250),
        'payment_intent_data[application_fee_amount]': minor(b.clientFee + b.businessFee),
        'payment_intent_data[description]': `${b.name}, ${b.when}`.slice(0, 350),
        'payment_intent_data[metadata][appointment_id]': b.id,
        'metadata[appointment_id]': b.id,
        // Checkout pages must live at least 30 minutes; the time is held for 35.
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${site}/pay/return?ref={CHECKOUT_SESSION_ID}${tail}`,
        cancel_url: `${site}/pay/return?ref=${b.id}&cancelled=1${tail}`,
    }
    if (b.clientFee > 0) {
        Object.assign(params, {
            'line_items[1][quantity]': 1,
            'line_items[1][price_data][currency]': b.currency.toLowerCase(),
            'line_items[1][price_data][unit_amount]': minor(b.clientFee),
            'line_items[1][price_data][product_data][name]': 'Locappoint service fee',
        })
    }
    return params
}

export const paystackReference = () => {
    const bytes = new Uint8Array(12)
    crypto.getRandomValues(bytes)
    return `lc_${[...bytes].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export const paystackInit = (b: Booking, subaccount: string, reference: string, site: string, app: boolean) => {
    const tail = app ? '?app=1' : ''
    return {
        email: b.email,
        amount: minor(b.total),
        currency: 'NGN',
        reference,
        channels: ['bank_transfer', 'card'],
        subaccount,
        transaction_charge: minor(b.clientFee + b.businessFee),
        bearer: 'subaccount',
        callback_url: `${site}/pay/return${tail}`,
        metadata: {
            appointment_id: b.id,
            cancel_action: `${site}/pay/return?ref=${reference}&cancelled=1${app ? '&app=1' : ''}`,
            custom_fields: [{ display_name: 'Booking', variable_name: 'booking', value: `${b.name}, ${b.when}`.slice(0, 200) }],
        },
    }
}

// ---------- Signatures ----------

const enc = new TextEncoder()

const hmacHex = async (algorithm: 'SHA-256' | 'SHA-512', secret: string, message: string) => {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: algorithm }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
    return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const same = (a: string, b: string) => {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

// Stripe-Signature: t=timestamp,v1=hex[,v1=hex]. Signed payload is "t.body". Five minutes' tolerance.
export const stripeSigned = async (raw: string, header: string | null, secret: string, now = Date.now()) => {
    if (!header || !secret) return false
    const parts = header.split(',').map((p) => p.split('=') as [string, string])
    const t = parts.find(([k]) => k === 't')?.[1]
    const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
    if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > 300) return false
    const expected = await hmacHex('SHA-256', secret, `${t}.${raw}`)
    return sigs.some((s) => same(s, expected))
}

// x-paystack-signature: HMAC-SHA512 of the raw body with the secret key.
export const paystackSigned = async (raw: string, header: string | null, secret: string) => {
    if (!header || !secret) return false
    return same(header, await hmacHex('SHA-512', secret, raw))
}

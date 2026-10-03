// Stripe and Paystack calls for payouts, and how their answers map onto business_payouts.
// No Deno APIs here, so the tests can run it under Node with a stubbed fetch.

export type Payout = {
    provider: 'stripe' | 'paystack'
    account_ref: string | null
    status: 'not_started' | 'pending' | 'active' | 'restricted'
    bank_name: string | null
    account_last4: string | null
    details_due: string[]
}

export class ProviderError extends Error {
    status: number
    constructor(message: string, status = 502) {
        super(message)
        this.status = status
    }
}

const form = (params: Record<string, string | number | boolean | undefined>) =>
    new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()

export const stripeCall = async (key: string, path: string, params?: Record<string, string | number | boolean | undefined>, idempotency?: string) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: params ? 'POST' : 'GET',
        headers: {
            Authorization: `Bearer ${key}`,
            ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            ...(idempotency ? { 'Idempotency-Key': idempotency } : {}),
        },
        body: params ? form(params) : undefined,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new ProviderError(body?.error?.message || `Stripe ${res.status}`, res.status >= 500 ? 502 : 400)
    return body
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

// A Stripe account as Locappoint sees it. Express-like: Stripe collects and keeps the identity and
// bank details, the provider gets the light Express pages if ever needed, Locappoint takes its fee.
export const newStripeAccount = (o: { country: string; email: string | null; name: string; url: string; businessId: string }) => ({
    'controller[stripe_dashboard][type]': 'express',
    'controller[fees][payer]': 'application',
    'controller[losses][payments]': 'application',
    'controller[requirement_collection]': 'stripe',
    country: o.country,
    email: o.email || undefined,
    'capabilities[card_payments][requested]': true,
    'capabilities[transfers][requested]': true,
    'business_profile[name]': o.name.slice(0, 100),
    'business_profile[url]': o.url,
    'business_profile[product_description]': 'Appointments booked and paid through Locappoint',
    'metadata[business_id]': o.businessId,
})

export const stripeState = (account: Record<string, any>): Omit<Payout, 'provider' | 'account_ref'> => {
    const req = account.requirements || {}
    const due = [...new Set([...(req.past_due || []), ...(req.currently_due || [])])].map(String)
    const bank = (account.external_accounts?.data || []).find((a: any) => a.object === 'bank_account') || null
    let status: Payout['status'] = 'pending'
    if (account.charges_enabled && account.payouts_enabled) status = 'active'
    else if (account.details_submitted && (req.disabled_reason || due.length > 0)) status = 'restricted'
    return {
        status,
        bank_name: bank?.bank_name ? String(bank.bank_name).slice(0, 100) : null,
        account_last4: bank?.last4 && /^\d{4}$/.test(bank.last4) ? bank.last4 : null,
        details_due: status === 'active' ? [] : due.slice(0, 20),
    }
}

export const nigerianAccount = (value: unknown) => {
    const digits = String(value ?? '').replace(/\D/g, '')
    return /^\d{10}$/.test(digits) ? digits : null
}

export const bankCode = (value: unknown) => {
    const code = String(value ?? '').trim()
    return /^[0-9A-Za-z]{2,12}$/.test(code) ? code : null
}

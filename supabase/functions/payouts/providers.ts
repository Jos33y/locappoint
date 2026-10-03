// Stripe and Paystack calls for payouts, and how their answers map onto business_payouts.
// No Deno APIs here, so the tests can run it under Node with a stubbed fetch.
//
// Stripe: Accounts v2 (/v2/core/accounts). Accounts v1 creation is closed to new Connect platforms.
// v2 account IDs still work on v1 endpoints, so the bank summary and the Express login link use v1.
//
// Managed Risk: Stripe carries fraud and negative-balance risk, so each payment is a direct charge
// on the business's own account (the business is the seller; client money never sits with
// Locappoint) and Locappoint takes an application fee. Express plus Managed Risk is in public
// preview, so account creation pins the preview version.

export type Payout = {
    provider: 'stripe' | 'paystack'
    account_ref: string | null
    status: 'not_started' | 'pending' | 'active' | 'restricted'
    bank_name: string | null
    account_last4: string | null
    details_due: string[]
}

export const STRIPE_VERSION = '2026-09-30.endive'
export const STRIPE_PREVIEW_VERSION = '2026-09-30.preview'

export class ProviderError extends Error {
    status: number
    code: string
    constructor(message: string, status = 502, code = '') {
        super(message)
        this.status = status
        this.code = code
    }
}

const form = (params: Record<string, string | number | boolean | undefined>) =>
    new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()

const fail = (body: any, status: number, who: string) => {
    const err = body?.error || {}
    return new ProviderError(err.message || `${who} ${status}`, status >= 500 ? 502 : 400, String(err.code || ''))
}

// v1: form-encoded. The bank summary, the Express login link, and (on the business's own account,
// with `account`) its balance, payouts and balance transactions for the Payments page.
export const stripeCall = async (key: string, path: string, params?: Record<string, string | number | boolean | undefined>, account?: string) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: params ? 'POST' : 'GET',
        headers: {
            Authorization: `Bearer ${key}`,
            ...(account ? { 'Stripe-Account': account } : {}),
            ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: params ? form(params) : undefined,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw fail(body, res.status, 'Stripe')
    return body
}

// v2: JSON in and out, the version pinned on every call.
export const stripeV2 = async (key: string, path: string, body?: Record<string, unknown>, idempotency?: string, version = STRIPE_VERSION) => {
    const res = await fetch(`https://api.stripe.com/v2/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
            Authorization: `Bearer ${key}`,
            'Stripe-Version': version,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(idempotency ? { 'Idempotency-Key': idempotency } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) throw fail(out, res.status, 'Stripe')
    return out
}

export const ACCOUNT_INCLUDE = ['configuration.merchant', 'requirements']
export const includeQuery = (fields = ACCOUNT_INCLUDE) => fields.map((f, i) => `include[${i}]=${encodeURIComponent(f)}`).join('&')

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

// A business account. Express dashboard, so Stripe collects and keeps the identity and bank
// details. Stripe collects its processing fees and carries losses (Managed Risk); the merchant
// configuration lets the business take card payments directly, paid out to its own bank.
export const newStripeAccount = (o: { country: string; currency: string; email: string | null; name: string; url: string; businessId: string }) => {
    const country = o.country.toLowerCase()
    return {
        contact_email: o.email || undefined,
        display_name: o.name.slice(0, 100),
        dashboard: 'express',
        identity: { country },
        defaults: {
            currency: o.currency.toLowerCase(),
            locales: country === 'pt' ? ['pt-PT', 'en-GB'] : ['en-GB'],
            profile: {
                business_url: o.url,
                doing_business_as: o.name.slice(0, 100),
                product_description: 'Appointments booked and paid through Locappoint',
            },
            responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
        },
        configuration: {
            merchant: { capabilities: { card_payments: { requested: true } } },
        },
        metadata: { business_id: o.businessId },
        include: ACCOUNT_INCLUDE,
    }
}

// Stripe works out what to collect from the account's own configuration; the 2026-09-30 API
// version rejects a configurations list here.
export const onboardingLink = (account: string, urls: { return_url: string; refresh_url: string }) => ({
    account,
    use_case: {
        type: 'account_onboarding',
        account_onboarding: {
            collection_options: { fields: 'eventually_due' },
            ...urls,
        },
    },
})

// What the owner should see. v2 has no "details submitted" flag, so an account that was ready
// before and now needs details is paused (restricted); one that never was ready is unfinished (pending).
export const stripeState = (account: Record<string, any>, wasReady = false): Omit<Payout, 'provider' | 'account_ref' | 'bank_name' | 'account_last4'> => {
    const merchant = account.configuration?.merchant?.capabilities || {}
    const caps = [merchant.card_payments?.status, merchant.stripe_balance?.payouts?.status].filter(Boolean) as string[]

    const entries: any[] = account.requirements?.entries || []
    const due = entries
        .filter((e) => e.awaiting_action_from === 'user' && ['currently_due', 'past_due'].includes(e.minimum_deadline?.status))
        .map((e) => String(e.description || 'details'))
    const unique = [...new Set(due)].slice(0, 20)

    // Ready means the business can take cards and Stripe can pay its bank.
    if (merchant.card_payments?.status === 'active' && caps.length >= 2 && caps.every((s) => s === 'active') && unique.length === 0) return { status: 'active', details_due: [] }
    if (caps.some((s) => s === 'rejected')) return { status: 'restricted', details_due: unique }
    if (unique.length === 0) return { status: 'pending', details_due: [] }
    return { status: wasReady ? 'restricted' : 'pending', details_due: unique }
}

export const bankSummary = (list: Record<string, any>) => {
    const bank = (list?.data || []).find((a: any) => a.object === 'bank_account') || null
    return {
        bank_name: bank?.bank_name ? String(bank.bank_name).slice(0, 100) : null,
        account_last4: bank?.last4 && /^\d{4}$/.test(bank.last4) ? bank.last4 : null,
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

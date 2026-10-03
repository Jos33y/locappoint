// Payouts: lets a business owner connect where their money goes. Stripe (Portugal) through Stripe's
// own onboarding page, on Accounts v2; Paystack (Nigeria) with a bank and account number on our
// screen. The only writer of public.business_payouts. Locappoint never stores an ID, an IBAN or a
// full account number.
//
// Deploy: npx supabase functions deploy payouts
// Secrets: STRIPE_SECRET_KEY, PAYSTACK_SECRET_KEY, optionally SITE_URL and STRIPE_API_VERSION.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
    ProviderError, STRIPE_VERSION, bankCode, bankSummary, includeQuery, newStripeAccount, nigerianAccount, onboardingLink,
    paystackCall, stripeCall, stripeState, stripeV2,
} from './providers.ts'

const SITE = (Deno.env.get('SITE_URL') || 'https://locappoint.com').replace(/\/$/, '')
const STRIPE = Deno.env.get('STRIPE_SECRET_KEY') || ''
const PAYSTACK = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const VERSION = Deno.env.get('STRIPE_API_VERSION') || STRIPE_VERSION
const STRIPE_TEST = STRIPE.startsWith('sk_test_') || STRIPE.startsWith('rk_test_')

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

let banksCache: { at: number; banks: { code: string; name: string }[] } | null = null

const loadBanks = async () => {
    if (banksCache && Date.now() - banksCache.at < 6 * 3_600_000) return banksCache.banks
    const banks: { code: string; name: string }[] = []
    let next = ''
    for (let page = 0; page < 10; page++) {
        const out = await paystackCall(PAYSTACK, `bank?country=nigeria&currency=NGN&perPage=100&use_cursor=true${next ? `&next=${encodeURIComponent(next)}` : ''}`)
        for (const b of out.data || []) if (b.active !== false && b.code) banks.push({ code: String(b.code), name: String(b.name) })
        next = out.meta?.next || ''
        if (!next) break
    }
    const seen = new Set<string>()
    const unique = banks.filter((b) => !seen.has(b.code) && seen.add(b.code)).sort((a, b) => a.name.localeCompare(b.name))
    banksCache = { at: Date.now(), banks: unique }
    return unique
}

const save = async (businessId: string, patch: Record<string, unknown>) => {
    const { data, error } = await db.from('business_payouts')
        .upsert({ business_id: businessId, ...patch }, { onConflict: 'business_id' })
        .select('provider, status, bank_name, account_last4, details_due, ready_at')
        .single()
    if (error) throw error
    return data
}

const view = (row: Record<string, any> | null, provider: string) => ({
    provider,
    status: row?.status || 'not_started',
    bank_name: row?.bank_name || null,
    account_last4: row?.account_last4 || null,
    details_due: row?.details_due || [],
    ready_at: row?.ready_at || null,
    test: provider === 'stripe' ? STRIPE_TEST : PAYSTACK.startsWith('sk_test_'),
})

const returnUrls = (target: unknown) => target === 'app'
    ? { return_url: `${SITE}/payouts/done`, refresh_url: `${SITE}/payouts/done?expired=1` }
    : { return_url: `${SITE}/portal/payments?payouts=return`, refresh_url: `${SITE}/portal/payments?payouts=expired` }

// Stripe's own wording helps while testing; owners in live mode get a plain sentence and we get the log.
const stripeProblem = (err: unknown) => {
    if (!(err instanceof ProviderError) || err.status !== 400) return err
    console.error('stripe refused:', err.code, err.message)
    return new ProviderError(STRIPE_TEST
        ? `Stripe test mode: ${err.message}${err.code ? ` (${err.code})` : ''}`
        : 'Payouts cannot be set up right now. We have been told and are on it.', 503)
}

const stripeAccount = (ref: string) => stripeV2(STRIPE, `core/accounts/${encodeURIComponent(ref)}?${includeQuery()}`, undefined, undefined, VERSION)

const stripeBank = async (ref: string) => {
    try {
        return bankSummary(await stripeCall(STRIPE, `accounts/${encodeURIComponent(ref)}/external_accounts?object=bank_account&limit=1`))
    } catch (err) {
        console.error('bank summary failed:', (err as Error).message)
        return { bank_name: null, account_last4: null }
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

    try {
        const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
        const { data: auth } = await db.auth.getUser(token)
        const user = auth?.user
        if (!user) return reply(401, { error: 'Sign in again to set up payouts' })

        const input = await req.json().catch(() => ({}))
        const action = String(input.action || '')

        const { data: business } = await db.from('businesses')
            .select('id, business_name, slug, country, currency, market, markets(payment_provider, country)')
            .eq('user_id', user.id)
            .maybeSingle()
        if (!business) return reply(403, { error: 'Only the owner of a business can set up payouts' })
        const market = (business as any).markets
        if (!market) return reply(409, { error: 'Payouts open for businesses in Porto, Lisbon and Lagos' })
        const provider = market.payment_provider as 'stripe' | 'paystack'

        const { data: current } = await db.from('business_payouts')
            .select('provider, account_ref, status, bank_name, account_last4, details_due, ready_at')
            .eq('business_id', business.id)
            .maybeSingle()

        if (provider === 'stripe') {
            if (!STRIPE) return reply(503, { error: 'Payouts are not switched on yet' })

            if (action === 'status') {
                if (!current?.account_ref) return reply(200, view(current, provider))
                const account = await stripeAccount(current.account_ref).catch((err) => { throw stripeProblem(err) })
                let state = stripeState(account, Boolean(current.ready_at))
                const bank = await stripeBank(current.account_ref)
                const bankName = bank.bank_name ?? current.bank_name ?? null
                const last4 = bank.account_last4 ?? current.account_last4 ?? null
                // Never say payouts are on until the owner can see which account the money goes to.
                if (state.status === 'active' && !last4) state = { status: 'pending', details_due: [] }
                const row = await save(business.id, {
                    provider, ...state,
                    bank_name: bankName,
                    account_last4: last4,
                    ready_at: state.status === 'active' ? current.ready_at || new Date().toISOString() : current.ready_at,
                })
                return reply(200, view(row, provider))
            }

            if (action === 'start') {
                try {
                    let ref = current?.account_ref as string | null
                    if (!ref) {
                        const account = await stripeV2(STRIPE, 'core/accounts', newStripeAccount({
                            country: market.country, currency: (business as any).currency || 'eur', email: user.email ?? null,
                            name: business.business_name, url: `${SITE}/${business.slug}`, businessId: business.id,
                        }), `payout-account-v2-${business.id}`, VERSION)
                        ref = account.id
                        await save(business.id, { provider, account_ref: ref, status: 'pending' })
                    }
                    const link = await stripeV2(STRIPE, 'core/account_links', onboardingLink(ref!, returnUrls(input.target)), undefined, VERSION)
                    return reply(200, { url: link.url })
                } catch (err) {
                    throw stripeProblem(err)
                }
            }

            if (action === 'manage') {
                if (!current?.account_ref || current.status === 'not_started') return reply(409, { error: 'Set up payouts first' })
                const link = await stripeCall(STRIPE, `accounts/${encodeURIComponent(current.account_ref)}/login_links`, {}).catch((err) => { throw stripeProblem(err) })
                return reply(200, { url: link.url })
            }

            return reply(400, { error: 'Unknown action' })
        }

        if (!PAYSTACK) return reply(503, { error: 'Payouts are not switched on yet' })

        if (action === 'status') return reply(200, view(current, provider))

        if (action === 'banks') return reply(200, { banks: await loadBanks() })

        if (action === 'resolve' || action === 'connect') {
            const account = nigerianAccount(input.account_number)
            const code = bankCode(input.bank_code)
            if (!account || !code) return reply(400, { error: 'Enter your 10-digit account number and pick your bank' })
            const resolved = await paystackCall(PAYSTACK, `bank/resolve?account_number=${account}&bank_code=${encodeURIComponent(code)}`)
            const accountName = String(resolved.data?.account_name || '').trim()
            if (!accountName) return reply(400, { error: 'We could not find that account. Check the number and the bank.' })
            if (action === 'resolve') return reply(200, { account_name: accountName })

            const bank = (await loadBanks()).find((b) => b.code === code)
            const fields = {
                business_name: business.business_name.slice(0, 100),
                settlement_bank: code,
                bank_code: code,
                account_number: account,
                percentage_charge: 0,
                description: `Locappoint business ${business.id}`,
                primary_contact_email: user.email ?? undefined,
                metadata: JSON.stringify({ business_id: business.id }),
            }
            const out = current?.account_ref
                ? await paystackCall(PAYSTACK, `subaccount/${encodeURIComponent(current.account_ref)}`, fields, 'PUT')
                : await paystackCall(PAYSTACK, 'subaccount', fields)
            const row = await save(business.id, {
                provider,
                account_ref: out.data?.subaccount_code || current?.account_ref,
                status: 'active',
                bank_name: bank?.name || out.data?.settlement_bank || null,
                account_last4: account.slice(-4),
                details_due: [],
                ready_at: current?.ready_at || new Date().toISOString(),
            })
            return reply(200, { ...view(row, provider), account_name: accountName })
        }

        return reply(400, { error: 'Unknown action' })
    } catch (err) {
        const status = err instanceof ProviderError ? err.status : 500
        console.error('payouts failed:', err)
        return reply(status, { error: status === 500 ? 'Something went wrong. Try again in a moment.' : (err as Error).message })
    }
})

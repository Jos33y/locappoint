// Checkout: opens the payment page for a time a client has just held with book_appointment.
// Card through Stripe Checkout on the business's own account (Portugal); bank transfer or card
// through Paystack (Nigeria). Amounts come only from the held booking in the database, never from
// the browser. Whether it was paid is decided by payments-webhook, never here.
//
// A signed-in client booking for themselves pays as a customer of the business's Stripe account,
// so Stripe can remember their card for that business (only if they tick it on Stripe's page).
// Never for guests: anyone can type an email, and a saved card must only ever show to its owner.
//
// Deploy: npx supabase functions deploy checkout
// Secrets: STRIPE_SECRET_KEY, PAYSTACK_SECRET_KEY, and optionally SITE_URL and STRIPE_CHECKOUT_LINK
// (set to on once Link is turned on for connected accounts in the Stripe dashboard).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ProviderError, paystackCall, paystackInit, paystackReference, stripeCall, stripeSession, type Booking } from '../_shared/pay.ts'

const SITE = (Deno.env.get('SITE_URL') || 'https://locappoint.com').replace(/\/$/, '')
const STRIPE = Deno.env.get('STRIPE_SECRET_KEY') || ''
const PAYSTACK = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const LINK = Deno.env.get('STRIPE_CHECKOUT_LINK') === 'on'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The signed-in person behind the request, or null for a guest (the anon key carries no user).
const signedIn = async (req: Request) => {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return null
    const { data } = await db.auth.getUser(token).catch(() => ({ data: null as any }))
    return data?.user || null
}

// The client as a customer of this business's Stripe account: made once, kept per account.
const stripeCustomer = async (o: { userId: string; businessId: string; account: string; email: string; name: string }) => {
    const { data: known } = await db.from('payment_customers')
        .select('customer_ref, account_ref')
        .eq('user_id', o.userId).eq('business_id', o.businessId).eq('provider', 'stripe')
        .maybeSingle()
    if (known?.customer_ref && known.account_ref === o.account) return known.customer_ref as string
    const customer = await stripeCall(STRIPE, 'customers', {
        email: o.email || undefined,
        name: o.name.slice(0, 200) || undefined,
        'metadata[locappoint_user]': o.userId,
    }, o.account)
    const { error } = await db.from('payment_customers').upsert({
        user_id: o.userId, business_id: o.businessId, provider: 'stripe', account_ref: o.account, customer_ref: customer.id,
    }, { onConflict: 'user_id,business_id,provider' })
    if (error) throw error
    return customer.id as string
}

const whenLabel = (date: string, time: string) => {
    const d = new Date(`${date}T12:00:00Z`)
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${day} at ${String(time).slice(0, 5)}`
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

    try {
        const input = await req.json().catch(() => ({}))
        if (input.action !== 'start') return reply(400, { error: 'Unknown action' })
        const id = String(input.appointment_id || '')
        if (!UUID.test(id)) return reply(400, { error: 'We could not find this booking' })
        const app = input.target === 'app'

        const { data: a } = await db.from('appointments')
            .select('id, business_id, client_id, client_name, payment_status, hold_until, price, client_fee, business_fee, travel_fee, total, currency, client_email, addons, appointment_date, appointment_time, services(service_name), businesses(business_name, market)')
            .eq('id', id)
            .maybeSingle()
        if (!a || a.payment_status !== 'awaiting' || !a.hold_until || new Date(a.hold_until).getTime() <= Date.now() + 60_000) {
            return reply(409, { error: 'This time is no longer held for you. Pick it again.' })
        }

        const [{ data: payout }, { data: market }] = await Promise.all([
            db.from('business_payouts').select('provider, account_ref, status').eq('business_id', a.business_id).maybeSingle(),
            db.from('markets').select('payment_provider').eq('code', (a as any).businesses?.market || '').maybeSingle(),
        ])
        if (!payout || payout.status !== 'active' || !payout.account_ref || !market || market.payment_provider !== payout.provider) {
            return reply(409, { error: 'This business cannot take payments right now. Try again later.' })
        }

        // Back from the payment page and trying again: the same page, while it is still open.
        const { data: open } = await db.from('payments')
            .select('checkout_ref, checkout_url, expires_at')
            .eq('appointment_id', id).eq('status', 'open')
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (open?.checkout_url && open.expires_at && new Date(open.expires_at).getTime() > Date.now() + 2 * 60_000) {
            return reply(200, { url: open.checkout_url, ref: open.checkout_ref })
        }

        const service = String((a as any).services?.service_name || 'Booking').trim()
        const extras = Array.isArray(a.addons) ? a.addons.map((x: any) => String(x?.name || '').trim()).filter(Boolean) : []
        const business = String((a as any).businesses?.business_name || 'Locappoint')
        const booking: Booking = {
            id,
            name: `${[service, ...extras].join(' + ')} at ${business}`,
            when: whenLabel(a.appointment_date, a.appointment_time),
            price: Number(a.price) || 0,
            clientFee: Number(a.client_fee) || 0,
            businessFee: Number(a.business_fee) || 0,
            travelFee: Number((a as any).travel_fee) || 0,
            total: Number(a.total) || 0,
            currency: String(a.currency || 'EUR'),
            email: String(a.client_email || ''),
        }
        if (booking.total <= 0) return reply(409, { error: 'There is nothing to pay for this booking' })

        const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('appointment_id', id)
        let ref: string
        let url: string
        let expires: string

        if (payout.provider === 'stripe') {
            if (!STRIPE) return reply(503, { error: 'Payments are not switched on yet' })
            const user = (a as any).client_id ? await signedIn(req) : null
            let customer: string | null = null
            if (user && user.id === (a as any).client_id) {
                customer = await stripeCustomer({
                    userId: user.id, businessId: a.business_id, account: payout.account_ref,
                    email: String(a.client_email || user.email || ''), name: String((a as any).client_name || ''),
                }).catch((err) => { console.error('customer failed, paying without a saved card:', err); return null })
            }
            // Remembering the card is a convenience: if Stripe refuses any part of it, the client
            // still gets today's payment page.
            const session = await stripeCall(STRIPE, 'checkout/sessions', stripeSession(booking, SITE, app, { customer, link: LINK }), payout.account_ref, `checkout-${id}-${count || 0}${customer ? '-c' : ''}`)
                .catch(async (err) => {
                    if (!customer || !(err instanceof ProviderError) || err.status !== 400) throw err
                    console.error('saved card refused, plain checkout:', err.code, err.message)
                    if (err.code === 'resource_missing') await db.from('payment_customers').delete().eq('customer_ref', customer)
                    return stripeCall(STRIPE, 'checkout/sessions', stripeSession(booking, SITE, app, { link: LINK }), payout.account_ref, `checkout-${id}-${count || 0}`)
                })
            ref = session.id
            url = session.url
            expires = new Date((session.expires_at || Math.floor(Date.now() / 1000) + 1800) * 1000).toISOString()
        } else {
            if (!PAYSTACK) return reply(503, { error: 'Payments are not switched on yet' })
            ref = paystackReference()
            const out = await paystackCall(PAYSTACK, 'transaction/initialize', paystackInit(booking, payout.account_ref, ref, SITE, app))
            url = out.data?.authorization_url
            expires = new Date(Date.now() + 30 * 60_000).toISOString()
        }
        if (!url || !/^https:\/\//.test(url)) throw new ProviderError('The payment page did not open', 502)

        const { error } = await db.from('payments').insert({
            appointment_id: id,
            business_id: a.business_id,
            provider: payout.provider,
            account_ref: payout.account_ref,
            checkout_ref: ref,
            checkout_url: url,
            amount: booking.total,
            currency: booking.currency,
            platform_fee: booking.clientFee + booking.businessFee,
            expires_at: expires,
        })
        if (error) throw error

        return reply(200, { url, ref, test: (payout.provider === 'stripe' ? STRIPE : PAYSTACK).startsWith('sk_test_') })
    } catch (err) {
        const status = err instanceof ProviderError ? err.status : 500
        console.error('checkout failed:', err)
        // In test mode the provider's own words help; clients in live mode get a plain sentence.
        const detail = err instanceof ProviderError && (STRIPE.startsWith('sk_test_') || PAYSTACK.startsWith('sk_test_')) ? ` (${err.message})` : ''
        return reply(status >= 500 ? 502 : status, { error: `The payment page could not open. Try again in a moment.${detail}` })
    }
})

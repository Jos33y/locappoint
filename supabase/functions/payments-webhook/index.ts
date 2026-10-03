// Payments webhook: the only way a booking becomes paid, and the sender of refunds.
//
// Three callers, each proven before anything happens:
// - Stripe (Stripe-Signature, signed with STRIPE_WEBHOOK_SECRET): checkout.session.completed marks
//   the booking paid; checkout.session.expired lets the held time go.
// - Paystack (x-paystack-signature, signed with PAYSTACK_SECRET_KEY): charge.success, checked again
//   with Paystack's verify endpoint before the booking is marked paid.
// - The database (x-notify-secret, same NOTIFY_SECRET as the notify function): sends queued refunds,
//   and deletes the Stripe customers (with their saved cards) of deleted accounts.
//
// JWT verification is off because Stripe and Paystack cannot send one; the signatures replace it.
// Deploy: npx supabase functions deploy payments-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYSTACK_SECRET_KEY, NOTIFY_SECRET.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { minor, paystackCall, paystackSigned, stripeCall, stripeDelete, stripeSigned } from '../_shared/pay.ts'

const STRIPE = Deno.env.get('STRIPE_SECRET_KEY') || ''
const STRIPE_HOOK = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const PAYSTACK = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const NOTIFY = Deno.env.get('NOTIFY_SECRET') || ''

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args)
    if (error) throw error
    return data
}

// ---------- Stripe ----------

const onStripe = async (raw: string, signature: string | null) => {
    if (!(await stripeSigned(raw, signature, STRIPE_HOOK))) return json(400, { error: 'Bad signature' })
    const event = JSON.parse(raw)
    const session = event?.data?.object || {}
    if (event.type === 'checkout.session.completed' && session.object === 'checkout.session') {
        if (session.payment_status !== 'paid') return json(200, { ignored: 'not paid yet' })
        const result = await rpc('payment_succeeded', {
            p_checkout_ref: session.id,
            p_payment_ref: String(session.payment_intent || ''),
            p_amount: Number(session.amount_total) / 100,
            p_currency: String(session.currency || '').toUpperCase(),
            p_method: 'card',
        })
        return json(200, { result })
    }
    if (event.type === 'checkout.session.expired' && session.object === 'checkout.session') {
        return json(200, { result: await rpc('payment_released', { p_checkout_ref: session.id }) })
    }
    return json(200, { ignored: event.type })
}

// ---------- Paystack ----------

const onPaystack = async (raw: string, signature: string | null) => {
    if (!(await paystackSigned(raw, signature, PAYSTACK))) return json(400, { error: 'Bad signature' })
    const event = JSON.parse(raw)
    if (event?.event !== 'charge.success') return json(200, { ignored: event?.event })
    const reference = String(event.data?.reference || '')
    if (!/^lc_[0-9a-f]{24}$/.test(reference)) return json(200, { ignored: 'not a Locappoint checkout' })

    // Ask Paystack again rather than trusting the event body alone.
    const checked = await paystackCall(PAYSTACK, `transaction/verify/${encodeURIComponent(reference)}`)
    const tx = checked.data || {}
    if (tx.status !== 'success') return json(200, { ignored: `status ${tx.status}` })
    const result = await rpc('payment_succeeded', {
        p_checkout_ref: reference,
        p_payment_ref: String(tx.id || ''),
        p_amount: Number(tx.amount) / 100,
        p_currency: String(tx.currency || '').toUpperCase(),
        p_method: tx.channel === 'bank_transfer' ? 'transfer' : 'card',
    })
    return json(200, { result })
}

// ---------- Refunds, sent when the database asks ----------

type Claim = { id: string; amount: number; reason: string; provider: string; account_ref: string; payment_ref: string | null; currency: string }

const sendRefunds = async () => {
    const claims = (await rpc('claim_refunds', { p_limit: 10 })) as Claim[] | null
    let sent = 0
    for (const r of claims || []) {
        try {
            if (!r.payment_ref) throw new Error('No payment reference to refund')
            let ref = ''
            if (r.provider === 'stripe') {
                const out = await stripeCall(STRIPE, 'refunds', {
                    payment_intent: r.payment_ref,
                    amount: minor(r.amount),
                    refund_application_fee: true,
                    reason: 'requested_by_customer',
                    'metadata[refund_id]': r.id,
                    'metadata[rule]': r.reason,
                }, r.account_ref, `refund-${r.id}`)
                ref = out.id
            } else {
                const out = await paystackCall(PAYSTACK, 'refund', {
                    transaction: r.payment_ref,
                    amount: minor(r.amount),
                    merchant_note: `Locappoint refund: ${r.reason}`,
                })
                ref = String(out.data?.id || '')
            }
            await rpc('refund_done', { p_refund: r.id, p_ok: true, p_provider_ref: ref, p_error: null })
            sent++
        } catch (err) {
            console.error('refund failed:', r.id, err)
            await rpc('refund_done', { p_refund: r.id, p_ok: false, p_provider_ref: null, p_error: String((err as Error)?.message || err).slice(0, 500) })
        }
    }
    return { claimed: claims?.length || 0, sent }
}

// ---------- Saved cards of deleted accounts ----------

type Cleanup = { id: string; provider: string; account_ref: string; customer_ref: string }

const sendCleanups = async () => {
    const claims = (await rpc('claim_cleanups', { p_limit: 10 })) as Cleanup[] | null
    let done = 0
    for (const c of claims || []) {
        try {
            if (c.provider !== 'stripe') throw new Error('Only Stripe customers are kept')
            await stripeDelete(STRIPE, `customers/${encodeURIComponent(c.customer_ref)}`, c.account_ref)
            await rpc('cleanup_done', { p_id: c.id, p_ok: true, p_error: null })
            done++
        } catch (err) {
            console.error('cleanup failed:', c.id, err)
            await rpc('cleanup_done', { p_id: c.id, p_ok: false, p_error: String((err as Error)?.message || err).slice(0, 500) })
        }
    }
    return { claimed: claims?.length || 0, done }
}

const sendQueued = async () => json(200, { refunds: await sendRefunds(), cleanups: await sendCleanups() })

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'Use POST' })
    try {
        const raw = await req.text()
        if (req.headers.get('stripe-signature')) return await onStripe(raw, req.headers.get('stripe-signature'))
        if (req.headers.get('x-paystack-signature')) return await onPaystack(raw, req.headers.get('x-paystack-signature'))
        const secret = req.headers.get('x-notify-secret')
        if (NOTIFY && secret && secret === NOTIFY) return await sendQueued()
        return json(401, { error: 'Not allowed' })
    } catch (err) {
        // A 500 makes Stripe and Paystack retry, which is what we want if the database hiccuped.
        console.error('payments-webhook failed:', err)
        return json(500, { error: 'Try again' })
    }
})

// Verify: the owner's ID check for the gold badge, through Stripe Identity (document and a matching
// selfie, taken live). Stripe keeps the images; we keep only the result. Locappoint pays per check.
//
// start: opens a check on Stripe's own page (or picks up one left half way, which costs no try).
// check: asks Stripe how it went and stores it. The page calls it when the owner comes back, and
// again while Stripe is still processing. Three tries per business, then Support.
//
// Deploy: npx supabase functions deploy verify
// Secrets: STRIPE_SECRET_KEY (the platform account, the same one as payouts), optionally SITE_URL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ProviderError, stripeCall } from '../_shared/pay.ts'

const SITE = (Deno.env.get('SITE_URL') || 'https://locappoint.com').replace(/\/$/, '')
const STRIPE = Deno.env.get('STRIPE_SECRET_KEY') || ''
const TEST = STRIPE.startsWith('sk_test_') || STRIPE.startsWith('rk_test_')

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args)
    if (error) throw new ProviderError(error.message, error.code === '22023' ? 400 : 500)
    return data
}

// Stripe's answer in our words. A check the owner left half way stays pending, with its link.
const outcome = (s: Record<string, any>) => {
    if (s.status === 'verified') return { status: 'verified', error: null }
    if (s.status === 'processing') return { status: 'pending', error: null }
    if (s.status === 'canceled') return { status: 'failed', error: 'The check was cancelled.' }
    if (s.last_error?.code) return { status: 'failed', error: String(s.last_error.reason || 'Stripe could not verify the document.').slice(0, 300) }
    return { status: 'pending', error: null }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

    try {
        const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
        const { data: auth } = await db.auth.getUser(token)
        const user = auth?.user
        if (!user) return reply(401, { error: 'Sign in again to get verified' })

        const input = await req.json().catch(() => ({}))
        const action = String(input.action || '')

        const { data: business } = await db.from('businesses').select('id, business_name').eq('user_id', user.id).maybeSingle()
        if (!business) return reply(403, { error: 'Only the owner of a business can get verified' })
        if (!STRIPE) return reply(503, { error: 'ID checks are not switched on yet' })

        const { data: row } = await db.from('business_verifications')
            .select('identity_status, identity_session, identity_attempts')
            .eq('business_id', business.id)
            .maybeSingle()

        if (action === 'check') {
            if (!row?.identity_session || row.identity_status === 'verified') return reply(200, await rpc('verification_view', { p_business: business.id }))
            const session = await stripeCall(STRIPE, `identity/verification_sessions/${encodeURIComponent(row.identity_session)}`)
            const o = outcome(session)
            return reply(200, await rpc('verification_identity', { p_business: business.id, p_session: session.id, p_status: o.status, p_error: o.error, p_new: false }))
        }

        if (action === 'start') {
            if (row?.identity_status === 'verified') return reply(409, { error: 'Your ID is already verified' })
            // A check left half way: carry on with it, no new try.
            if (row?.identity_session && row.identity_status === 'pending') {
                const open = await stripeCall(STRIPE, `identity/verification_sessions/${encodeURIComponent(row.identity_session)}`)
                if (open.status === 'requires_input' && !open.last_error?.code && open.url) return reply(200, { url: open.url })
                if (open.status === 'processing') return reply(409, { error: 'Stripe is still checking your ID. This page updates when it is done.' })
            }
            const attempt = Number(row?.identity_attempts || 0) + 1
            if (attempt > 3) return reply(400, { error: 'Three tries used. Write to us in Support and we will help.' })
            const session = await stripeCall(STRIPE, 'identity/verification_sessions', {
                type: 'document',
                'options[document][require_matching_selfie]': true,
                'options[document][require_live_capture]': true,
                return_url: `${SITE}/portal/verified?identity=return`,
                'metadata[business_id]': business.id,
            }, undefined, `identity-${business.id}-${attempt}`)
            await rpc('verification_identity', { p_business: business.id, p_session: session.id, p_status: 'pending', p_error: null, p_new: true })
            return reply(200, { url: session.url })
        }

        return reply(400, { error: 'Unknown action' })
    } catch (err) {
        const status = err instanceof ProviderError ? err.status : 500
        console.error('verify failed:', err)
        if (status === 400 && err instanceof ProviderError && /Three tries|already|still checking/.test(err.message)) return reply(400, { error: err.message })
        return reply(status >= 500 ? 500 : 400, { error: TEST && err instanceof ProviderError ? `Stripe test mode: ${err.message}` : 'The ID check could not start. Try again in a moment.' })
    }
})

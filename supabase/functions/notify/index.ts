// LocAppoint notification sender, the "notify" Edge Function.
// Claims rows from public.notification_queue and sends emails through Resend, pushes through Firebase,
// and booking news on WhatsApp: to owners and staff who switched it on, and to clients who booked there.
// Templates: emails/ (what each email says), layout.ts and blocks.ts (how every email looks).
//
// Deploy from the repo root: npx supabase functions deploy notify --no-verify-jwt
// Secrets (Edge Functions, Secrets): RESEND_API_KEY, NOTIFY_SECRET, FCM_SERVICE_ACCOUNT, WHATSAPP_TOKEN, and optionally SITE_URL.
// It checks NOTIFY_SECRET itself, which is why JWT verification is off.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { RENDER } from './emails/index.ts'
import { renderPush } from './push.ts'
import { fcmAccount, sendPush } from './fcm.ts'
import type { Message, Row } from './types.ts'
import { NO_TEMPLATE, OUTSIDE_WINDOW, UNREACHABLE, WA, WaError, send as sendWa } from '../_shared/wa.ts'
import { news } from '../_shared/wa-words.ts'
import { clientNews } from '../_shared/wa-client.ts'

const REPLY_TO = 'hello@locappoint.com'
const MAX_ATTEMPTS = 5
// News about a booking is stale after a few hours; the email already carried it.
const PUSH_FRESH_MS = 6 * 3_600_000
// Free messages only within 24 hours of their last message to us; a little margin for the clock.
const WA_WINDOW_MS = 23.5 * 3_600_000

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
})

const sendEmail = async (row: Row, msg: Message) => {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `notification-${row.id}`,
        },
        body: JSON.stringify({ ...msg, reply_to: REPLY_TO, tags: [{ name: 'kind', value: row.kind }] }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body).slice(0, 300)}`)
    return body.id as string
}

const finish = (id: string, patch: Record<string, unknown>) => db.from('notification_queue').update(patch).eq('id', id)

// Every phone the person has. Phones Firebase no longer knows are forgotten on the spot.
const deliverPush = async (row: Row) => {
    const account = fcmAccount()
    if (!account) return { skip: 'Push is not set up (FCM_SERVICE_ACCOUNT)' }
    if (row.created_at && Date.now() - new Date(row.created_at).getTime() > PUSH_FRESH_MS) return { skip: 'Too late to push' }
    const push = renderPush(row)
    if (!push) return { skip: `No push for ${row.kind}` }
    const { data: phones, error } = await db.from('push_tokens').select('token').eq('user_id', row.recipient_user)
    if (error) throw new Error(error.message)
    if (!phones?.length) return { skip: 'No phone' }
    const ids: string[] = []
    const errors: string[] = []
    for (const { token } of phones) {
        const sent = await sendPush(account, token, push, { kind: row.kind, tag: row.appointment_id || row.id })
        if (sent.ok) ids.push(sent.id)
        else if (sent.gone) await db.from('push_tokens').delete().eq('token', token)
        else errors.push(sent.error)
    }
    if (ids.length) return { id: ids[0] }
    if (errors.length) throw new Error(errors[0])
    return { skip: 'Every phone was gone' }
}

// Booking news on WhatsApp, to the phone the person linked. Inside the 24 hour window a message with
// buttons; outside it, the approved template. A phone that was unlinked or stopped since is skipped.
const deliverWhatsApp = async (row: Row) => {
    if (!WA.token()) return { skip: 'WhatsApp is not set up (WHATSAPP_TOKEN)' }
    if (row.created_at && Date.now() - new Date(row.created_at).getTime() > PUSH_FRESH_MS) return { skip: 'Too late for WhatsApp' }
    const p = (row.payload || {}) as Record<string, any>
    const phone = String(p.phone || '')
    const forClient = row.kind.startsWith('wa_client_')
    const { data: contact, error } = await db.from('wa_contacts').select('user_id, verified_at, stopped_at, last_inbound_at').eq('phone', phone).maybeSingle()
    if (error) throw new Error(error.message)
    // Owner and staff alerts go only to the phone still linked to that person; a client is the
    // number they booked from.
    if (!forClient && (!contact || contact.user_id !== row.recipient_user || !contact.verified_at)) return { skip: 'Phone no longer linked' }
    if (contact?.stopped_at) return { skip: 'They wrote STOP' }
    const inWindow = Boolean(contact?.last_inbound_at) && Date.now() - new Date(contact!.last_inbound_at).getTime() < WA_WINDOW_MS
    const event = String(p.event || row.kind.replace(/^wa_(client_)?/, ''))
    const make = (open: boolean) => (forClient ? clientNews(event, p as any, open) : news(event, p as any, open))
    let out = make(inWindow)
    if (!out) return { skip: `No WhatsApp for ${row.kind}${inWindow ? '' : ' outside the 24 hours'}` }
    let id: string
    try {
        id = await sendWa(phone, out)
    } catch (err) {
        // Meta's clock says the window closed: the template instead.
        if (!(err instanceof WaError) || err.code !== OUTSIDE_WINDOW || !inWindow) throw err
        const later = make(false)
        if (!later) return { skip: `No WhatsApp for ${row.kind} outside the 24 hours` }
        out = later
        id = await sendWa(phone, out)
    }
    await db.rpc('wa_log', { p_phone: phone, p_direction: 'out', p_kind: out.kind, p_body: out.text, p_wa_id: id })
    return { id }
}

Deno.serve(async (req) => {
    if (!Deno.env.get('NOTIFY_SECRET') || req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
        return new Response('Forbidden', { status: 403 })
    }

    const { data, error } = await db.rpc('claim_notifications', { p_limit: 20 })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const result = { sent: 0, skipped: 0, retry: 0, failed: 0 }
    for (const row of (data || []) as Row[]) {
        if (row.channel === 'push' || row.channel === 'whatsapp') {
            try {
                const out = row.channel === 'push' ? await deliverPush(row) : await deliverWhatsApp(row)
                if ('skip' in out) {
                    await finish(row.id, { status: 'skipped', last_error: out.skip, locked_at: null })
                    result.skipped++
                } else {
                    await finish(row.id, { status: 'sent', provider_id: out.id, sent_at: new Date().toISOString(), last_error: null, locked_at: null })
                    result.sent++
                }
            } catch (err) {
                // A template Meta has not approved yet, or a number not on WhatsApp: retrying will not help.
                if (err instanceof WaError && (NO_TEMPLATE.includes(err.code) || UNREACHABLE.includes(err.code))) {
                    await finish(row.id, { status: 'skipped', last_error: err.message.slice(0, 500), locked_at: null })
                    result.skipped++
                    continue
                }
                const last = row.attempts >= 3
                await finish(row.id, {
                    status: last ? 'failed' : 'pending',
                    last_error: String(err instanceof Error ? err.message : err).slice(0, 500),
                    send_after: new Date(Date.now() + row.attempts * 60_000).toISOString(),
                    locked_at: null,
                })
                last ? result.failed++ : result.retry++
            }
            continue
        }
        const render = row.channel === 'email' ? RENDER[row.kind] : undefined
        if (!render || !row.recipient_email) {
            await finish(row.id, { status: 'skipped', last_error: render ? 'No recipient email' : `No template for ${row.channel}/${row.kind}`, locked_at: null })
            result.skipped++
            continue
        }
        try {
            const providerId = await sendEmail(row, render(row)!)
            await finish(row.id, { status: 'sent', provider_id: providerId, sent_at: new Date().toISOString(), last_error: null, locked_at: null })
            result.sent++
        } catch (err) {
            const last = row.attempts >= MAX_ATTEMPTS
            await finish(row.id, {
                status: last ? 'failed' : 'pending',
                last_error: String(err instanceof Error ? err.message : err).slice(0, 500),
                send_after: new Date(Date.now() + row.attempts * row.attempts * 60_000).toISOString(),
                locked_at: null,
            })
            last ? result.failed++ : result.retry++
        }
    }
    return Response.json(result)
})

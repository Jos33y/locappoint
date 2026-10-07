// WhatsApp webhook, the "whatsapp" Edge Function. Meta calls it for every message to the Locappoint
// number. Part 3a, owners and staff: link a phone with the code from Settings, "today", Accept and
// Decline on requests, On my way and Arrived for visits at the client's place, STOP and START.
// Everything else gets "booking by WhatsApp is coming soon" until the client side (3b).
//
// Every change goes through the same database functions as the app, acting as that person.
//
// Deploy: npx supabase functions deploy whatsapp --no-verify-jwt
// Secrets: WHATSAPP_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, optionally WHATSAPP_PHONE_ID.
// Meta signs every call with the app secret, which is why JWT verification is off.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { WA, failures, inbound, missing, send, signed, text, type Inbound, type Outgoing } from '../_shared/wa.ts'
import * as W from '../_shared/wa-words.ts'
import { longDay } from '../notify/format.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CODE = /^loc[\s-]?(\d{6})$/i
const TODAY = ['today', 'hoje', 'hj', 'agenda', 'day', 'dia']
const STOP = ['stop', 'parar', 'unsubscribe', 'cancelar']
const START = ['start', 'comecar', 'começar', 'voltar']

const call = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn, args)
    if (error) throw error
    return data
}

// Logging never stops a reply.
const log = (phone: string, direction: 'in' | 'out', kind: string, body: string, waId: string | null) =>
    db.rpc('wa_log', { p_phone: phone, p_direction: direction, p_kind: kind, p_body: body, p_wa_id: waId }).then(({ data }) => data !== false, () => true)

const say = async (phone: string, out: Outgoing) => {
    try {
        const id = await send(phone, out)
        await log(phone, 'out', out.kind, out.text, id)
    } catch (err) {
        const why = err instanceof Error ? err.message : String(err)
        console.error(`whatsapp send to ...${phone.slice(-3)} failed: ${why}`)
        await log(phone, 'out', 'failed', `${out.text}\n[${why}]`, null)
    }
}

const problem = (err: any): Outgoing => {
    if (err?.code === '42501') return W.NOT_YOURS
    if (err?.code === 'P0002') return W.GONE
    if ((err?.code === '22023' || err?.code === 'P0001') && err?.message) return text(String(err.message))
    console.error('whatsapp action failed:', err?.message || err)
    return W.TRY_AGAIN
}

const localDate = (tz: string) => {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
    } catch {
        return new Date().toISOString().slice(0, 10)
    }
}

const firstName = (name: unknown) => String(name || '').trim().split(/\s+/)[0] || ''

const answer = async (phone: string, m: Inbound): Promise<Outgoing[]> => {
    const said = m.text.toLowerCase().replace(/[.!?]+$/, '').trim()
    const who = await call('wa_inbound', { p_phone: phone, p_name: m.name || null })
    if (who?.limited) return []

    if (START.includes(said)) {
        await call('wa_stop', { p_phone: phone, p_on: true })
        return [W.STARTED]
    }
    // A code from Settings links the phone and turns WhatsApp back on, even after STOP.
    const code = m.text.trim().match(CODE)
    if (code) {
        const res = await call('wa_link_confirm', { p_phone: phone, p_code: code[1] })
        return [res?.ok ? W.LINKED(firstName(res.name), Number(res.businesses) || 0) : W.BAD_CODE]
    }
    if (who?.stopped) return []
    if (STOP.includes(said)) {
        await call('wa_stop', { p_phone: phone, p_on: false })
        return [W.STOPPED]
    }

    if (!who?.user_id) return [W.UNKNOWN]

    const tap = W.readReply(m.reply)
    if (tap?.verb === 'day' || TODAY.includes(said)) {
        const list = (await call('wa_today', { p_phone: phone })) || []
        const tz = list[0]?.timezone || 'Europe/Lisbon'
        return W.today(list, `Today, ${longDay(localDate(tz))}`)
    }

    if (tap?.id) {
        const { verb, id, minutes } = tap
        try {
            if (verb === 'way') return [W.pickMinutes(id)]
            if (verb === 'min') {
                await call('wa_trip', { p_phone: phone, p_appointment: id, p_minutes: minutes })
                return [W.onWay(await call('wa_booking_view', { p_appointment: id }), minutes!)]
            }
            if (verb === 'arr') {
                await call('wa_arrived', { p_phone: phone, p_appointment: id })
                return [W.arrived(await call('wa_booking_view', { p_appointment: id }))]
            }
            const choice = verb === 'acc' ? 'confirm' : 'decline'
            return [W.answered(await call('wa_answer', { p_phone: phone, p_appointment: id, p_answer: choice }), choice)]
        } catch (err) {
            return [problem(err)]
        }
    }

    return [W.HELP(firstName(who.name))]
}

Deno.serve(async (req) => {
    const url = new URL(req.url)

    // Meta checks the webhook once, when it is registered.
    if (req.method === 'GET') {
        if (!WA.verifyToken()) {
            console.error('whatsapp: WHATSAPP_VERIFY_TOKEN is not set')
            return new Response('Not set up', { status: 500 })
        }
        const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === WA.verifyToken()
        return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('Forbidden', { status: 403 })
    }
    if (req.method !== 'POST') return new Response('Use POST', { status: 405 })

    const unset = missing(['token', 'appSecret'])
    if (unset.length) {
        console.error(`whatsapp: not set: ${unset.join(', ')}`)
        return new Response('Not set up', { status: 500 })
    }
    const raw = await req.text()
    if (!(await signed(raw, req.headers.get('x-hub-signature-256'), WA.appSecret()))) return new Response('Bad signature', { status: 401 })

    let payload: unknown
    try {
        payload = JSON.parse(raw)
    } catch {
        return new Response('ok')
    }

    for (const f of failures(payload)) await log(f.to, 'out', 'undelivered', f.error, null)

    for (const m of inbound(payload)) {
        try {
            const body = m.reply ? `${m.text} [${m.reply}]` : m.text || `(${m.type})`
            if (!(await log(m.from, 'in', m.type, body, m.id))) continue
            for (const out of await answer(m.from, m)) await say(m.from, out)
        } catch (err) {
            console.error('whatsapp message failed:', err instanceof Error ? err.message : err)
        }
    }
    // Always 200 once signed: Meta retries anything else for days.
    return new Response('ok')
})

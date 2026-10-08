// WhatsApp webhook, the "whatsapp" Edge Function. Meta calls it for every message to the Locappoint
// number.
// - Owners and staff (3a): link a phone with the code from Settings, "today", Accept and Decline on
//   requests, On my way and Arrived for visits at the client's place.
// - Clients (3b): the booking agent (_shared/agent.ts). It proposes; a booking, move or cancel happens
//   only when the client taps Yes (or answers yes), and then through the same database functions as
//   the website. Paid services get a Stripe Checkout link; the payment webhook confirms them.
// - Everyone: STOP and START.
//
// Deploy: npx supabase functions deploy whatsapp --no-verify-jwt
// Secrets: WHATSAPP_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, ANTHROPIC_API_KEY, optionally
// WHATSAPP_PHONE_ID and ANTHROPIC_MODEL. Meta signs every call with the app secret, which is why JWT
// verification is off.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { WA, failures, inbound, missing, send, signed, text, type Inbound, type Outgoing } from '../_shared/wa.ts'
import * as W from '../_shared/wa-words.ts'
import * as C from '../_shared/wa-client.ts'
import { runAgent, typedAnswer, type Thread } from '../_shared/agent.ts'
import { longDay } from '../notify/format.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const URL_BASE = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } })

const CODE = /^loc[\s-]?(\d{6})$/i
const TODAY = ['today', 'hoje', 'hj', 'agenda', 'day', 'dia']
const HELP = ['help', 'ajuda', 'menu']
// Not "cancelar": a client saying it means their booking.
const STOP = ['stop', 'parar', 'unsubscribe']
const START = ['start', 'comecar', 'começar', 'voltar']
const ENTRY = /\(([a-z0-9]+(?:-[a-z0-9]+)*)\)\s*$/
const AGENT_PER_HOUR = 30

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
    if ((err?.code === '22023' || err?.code === 'P0001' || err?.code === '23P01') && err?.message) return text(String(err.message))
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

const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')

const claude = async (body: Record<string, unknown>) => {
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Claude ${res.status}: ${String(json?.error?.message || '').slice(0, 300)}`)
    return json
}

// The payment page for a held booking, opened by the checkout function exactly as the website does.
const payPage = async (appointment: string): Promise<string> => {
    const res = await fetch(`${URL_BASE}/functions/v1/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', appointment_id: appointment, target: 'whatsapp' }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || !/^https:\/\//.test(String(json?.url || ''))) throw new Error(String(json?.error || `checkout ${res.status}`))
    return json.url
}

const holdLeft = (until: unknown) => Math.max(1, Math.round((new Date(String(until)).getTime() - Date.now()) / 60_000))

const sendPayLink = async (phone: string, booking: any, lang: C.Lang): Promise<Outgoing> => {
    try {
        return C.payLink(booking, await payPage(booking.id), holdLeft(booking.hold_until), lang)
    } catch (err) {
        console.error('pay link failed:', err instanceof Error ? err.message : err)
        return C.payFailed(booking.id, lang)
    }
}

const saveThread = (phone: string, t: { history: Thread['history']; business?: string | null; name?: string | null; email?: string | null; pending: unknown; lang?: string | null }) =>
    call('wa_thread_save', {
        p_phone: phone, p_history: t.history, p_business: t.business || null, p_name: t.name || null,
        p_email: t.email || null, p_pending: t.pending || null, p_lang: t.lang || null,
    })

// Yes or No to the summary waiting. The change runs here, from what was proposed, never from the model.
const settle = async (phone: string, thread: Thread, verb: 'yes' | 'no', code: string, label: string): Promise<Outgoing[]> => {
    const lang = C.langOf(thread.lang)
    const p = thread.pending
    if (!p || p.nonce !== code) return [C.expired(lang)]
    const done = (out: Outgoing[]) => saveThread(phone, {
        history: [...thread.history, { role: 'user', text: label }, { role: 'assistant', text: out.map((o) => o.text).join('\n') || '(booked)' }],
        pending: null, lang,
    }).then(() => out)
    if (verb === 'no') return done([C.dropped(lang)])
    const a = p.args as Record<string, any>
    try {
        if (p.kind === 'book') {
            const v = await call('wa_book', {
                p_phone: phone, p_business: a.business, p_service: a.service, p_date: a.date, p_time: a.time,
                p_name: a.name, p_email: a.email || null, p_mode: a.mode, p_people: a.people || 1,
            })
            // Paid online: the link. Paid at the visit: the "booked" or "request sent" message comes
            // from the queue a moment later, the same news the email carries.
            return done(v.payment_status === 'awaiting' ? [await sendPayLink(phone, v, lang)] : [])
        }
        if (p.kind === 'move') return done([C.moved(await call('wa_move', { p_phone: phone, p_appointment: a.booking, p_date: a.date, p_time: a.time }), lang)])
        return done([C.cancelled(await call('wa_cancel', { p_phone: phone, p_appointment: a.booking }), lang)])
    } catch (err) {
        return done([problem(err)])
    }
}

const agentTurn = async (phone: string, m: Inbound, who: any): Promise<Outgoing[]> => {
    let thread: Thread = await call('wa_thread', { p_phone: phone })
    const lang = C.langOf(thread.lang)

    // A typed yes or no while a summary waits.
    const typed = thread.pending ? typedAnswer(m.text) : null
    if (typed && thread.pending) return settle(phone, thread, typed, thread.pending.nonce, m.text)

    // "Book at Barbearia Rio (barbearia-rio)" from a business page: that business is in focus.
    const entry = m.text.match(ENTRY)
    if (entry) {
        const found = await call('wa_find', { p_query: entry[1] }).catch(() => [])
        const hit = (found || []).find((b: any) => b.slug === entry[1])
        if (hit) {
            await saveThread(phone, { history: thread.history, business: hit.business_id, pending: thread.pending })
            thread = await call('wa_thread', { p_phone: phone })
        }
    }

    const budget = await call('wa_agent_budget', {})
    if (!budget?.on || Number(budget.left) <= 0 || !Deno.env.get('ANTHROPIC_API_KEY')) return [C.pausedAgent(thread.business?.slug || null, lang)]
    const { count } = await db.from('wa_messages').select('id', { count: 'exact', head: true })
        .eq('phone', phone).eq('direction', 'in').gte('created_at', new Date(Date.now() - 3_600_000).toISOString())
    if ((count || 0) > AGENT_PER_HOUR) return [C.slowDown(lang)]

    try {
        const turn = await runAgent({ call, claude, nonce }, { phone, profileName: m.name || who?.name || '', message: m.text || `(${m.type})`, thread })
        await call('wa_agent_spent', { p_input: turn.usage.input, p_output: turn.usage.output, p_cost: Number(turn.usage.cost.toFixed(6)) }).catch(() => null)
        await saveThread(phone, { history: turn.history, business: turn.business, name: turn.name, email: turn.email, pending: turn.pending, lang: turn.lang })
        return turn.replies
    } catch (err) {
        console.error('agent failed:', err instanceof Error ? err.message : err)
        return [C.pausedAgent(thread.business?.slug || null, lang)]
    }
}

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

    const tap = W.readReply(m.reply)

    // A client's Yes or No to a summary, or the payment link again.
    if (tap?.verb === 'yes' || tap?.verb === 'no') {
        return settle(phone, await call('wa_thread', { p_phone: phone }), tap.verb, tap.nonce!, m.text || tap.verb)
    }
    if (tap?.verb === 'pay') {
        const thread: Thread = await call('wa_thread', { p_phone: phone })
        const mine: any[] = await call('wa_my', { p_phone: phone })
        const b = (mine || []).find((x) => x.id === tap.id && x.payment_status === 'awaiting')
        return [b ? await sendPayLink(phone, b, C.langOf(thread.lang)) : C.expired(C.langOf(thread.lang))]
    }

    // Owners and staff with a linked phone: their day and their buttons.
    if (who?.user_id) {
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
        if (HELP.includes(said)) return [W.HELP(firstName(who.name))]
    }

    // Everyone else, and owners booking somewhere themselves: the agent.
    return agentTurn(phone, m, who)
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

    const work = (async () => {
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
    })()
    // Meta wants a quick answer; the agent can take a few seconds, so it carries on after the reply.
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work)
    else await work
    // Always 200 once signed: Meta retries anything else for days.
    return new Response('ok')
})

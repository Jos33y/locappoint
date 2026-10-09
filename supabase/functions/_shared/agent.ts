// The WhatsApp booking agent for clients. Claude reads the message and calls tools; every fact comes
// from the database through those tools. Claude can only propose a booking, a move or a cancel: the
// summary with Yes and No is built here from database values, and the change happens only when the
// client taps Yes (or answers yes). No Deno APIs, so tests run it under Node with a fake model.

import { text, type Outgoing } from './wa.ts'
import { langOf, summary, type Lang, type Proposal } from './wa-client.ts'

declare const Deno: { env: { get(key: string): string | undefined } } | undefined
const env = (key: string) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : (globalThis as any).process?.env?.[key]) || ''

export const MODEL = () => env('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001'
// Price per million tokens in USD and the euro rate, for the daily cap. Check them against
// Anthropic's pricing page when the model changes.
const PRICE = () => ({
    input: Number(env('ANTHROPIC_PRICE_IN')) || 1,
    output: Number(env('ANTHROPIC_PRICE_OUT')) || 5,
    eur: Number(env('USD_TO_EUR')) || 0.93,
})
const MAX_ROUNDS = 6
const PENDING_MINUTES = 15

export type Deps = {
    call: (fn: string, args: Record<string, unknown>) => Promise<any>
    claude: (body: Record<string, unknown>) => Promise<any>
    nonce: () => string
}

export type Thread = {
    business: { business_id: string; name: string; slug: string; city: string } | null
    name: string | null
    email: string | null
    lang: string | null
    history: Array<{ role: 'user' | 'assistant'; text: string }>
    pending: (Proposal & { nonce: string; expires_at: string; args: Record<string, unknown> }) | null
}

export type Turn = {
    replies: Outgoing[]
    history: Thread['history']
    business: string | null
    name: string | null
    email: string | null
    lang: Lang
    pending: Thread['pending']
    usage: { input: number; output: number; cost: number }
}

const SYSTEM = `You are the Locappoint booking assistant on WhatsApp. Locappoint is a booking platform for local businesses (barbers, nails, beauty, wellness and more) in Porto and Lisbon, Portugal.

What you do: help a person book, move or cancel an appointment, and answer questions about a business's services, prices, hours and address. Nothing else. Politely decline anything off topic in one sentence.

Rules:
- Every fact (business, service, price, time, hours, address, availability) must come from a tool result in this conversation. Never guess or invent one. If a tool did not give it, say you do not know.
- Find the business with find_business, then business_details. To find who can do something, use search.
- Before proposing a time, check it with free_times for that exact service and date. Offer at most 4 times.
- To book, you need the service, date, time and the person's name. Ask for the name once if you do not have it. Email is optional: ask once, and accept "no".
- You never book, move or cancel anything yourself. Call propose_booking, propose_move or propose_cancel. The person then gets a summary with Yes and No buttons, built by the system. Do not repeat the summary and do not say it is booked.
- Payment never happens in the chat. If a service is paid online, the system sends a secure payment link after the person says yes. Never ask for card details.
- Visits at the person's own address are not booked on WhatsApp yet: give the business page link https://locappoint.com/<slug>.
- For anything about a specific business you cannot answer (a complaint, a special request), give the business phone from business_details. For problems with Locappoint itself, give hello@locappoint.com.
- If asked whether you are a person: you are an automated assistant.
- Reply in the person's language: European Portuguese or English. Set language on every propose call.
- WhatsApp style: short, plain, at most 5 short lines. No headings, no emojis, no long dashes. Use *bold* only for a key word. Times as 14:30. Dates in words ("Friday 10 October" or "sexta-feira, 10 de outubro").`

const TOOLS = [
    { name: 'find_business', description: 'Find a business by its name or page address (slug). Returns up to 5.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'business_details', description: 'One business: address, hours, services with price and minutes, whether it confirms automatically, cancellation cut-off, phone.', input_schema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
    { name: 'search', description: 'Find who can do something in a city, with free times. Use when the person has not named a business.', input_schema: { type: 'object', properties: { city: { type: 'string', enum: ['porto', 'lisbon'] }, what: { type: 'string', description: 'What they need, in their words, e.g. "haircut", "unhas de gel"' }, days: { type: 'array', items: { type: 'string', description: 'YYYY-MM-DD' }, maxItems: 3 }, part: { type: 'string', enum: ['any', 'morning', 'afternoon', 'evening'] }, around: { type: 'string', description: 'HH:MM, instead of part' }, people: { type: 'integer', minimum: 1 } }, required: ['city', 'what'] } },
    { name: 'free_times', description: 'Free start times for one service on one date at one business.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, people: { type: 'integer', minimum: 1 } }, required: ['business_id', 'service_id', 'date'] } },
    { name: 'my_bookings', description: 'The upcoming bookings this person made on WhatsApp.', input_schema: { type: 'object', properties: {} } },
    { name: 'propose_booking', description: 'Show the person a booking summary with Yes and No. Only after checking the time with free_times and knowing their name.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string', description: 'HH:MM' }, name: { type: 'string' }, email: { type: 'string' }, people: { type: 'integer', minimum: 1 }, online: { type: 'boolean', description: 'true only if the person wants the online version and the service offers it' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['business_id', 'service_id', 'date', 'time', 'name', 'language'] } },
    { name: 'propose_move', description: 'Show the person a summary to move one of their bookings (from my_bookings) to a new free time, with Yes and No.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['booking_id', 'date', 'time', 'language'] } },
    { name: 'propose_cancel', description: 'Show the person a summary to cancel one of their bookings (from my_bookings), with Yes and No.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['booking_id', 'language'] } },
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

class ToolError extends Error {}
const need = (ok: unknown, message: string) => { if (!ok) throw new ToolError(message) }

const lisbonNow = () => {
    const now = new Date()
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(now)
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'long' }).format(now)
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    return { date, day, time }
}

// Claude needs turns that alternate and start with the person.
const toMessages = (history: Thread['history'], latest: string) => {
    const out: Array<{ role: 'user' | 'assistant'; content: any }> = []
    for (const h of [...history, { role: 'user' as const, text: latest }]) {
        if (!h.text) continue
        const last = out[out.length - 1]
        if (last && last.role === h.role) last.content = `${last.content}\n${h.text}`
        else out.push({ role: h.role, content: h.text })
    }
    while (out.length && out[0].role !== 'user') out.shift()
    return out
}

export const runAgent = async (deps: Deps, o: { phone: string; profileName: string; message: string; thread: Thread }): Promise<Turn> => {
    const t = o.thread
    let business = t.business?.business_id || null
    let name = t.name
    let email = t.email
    let lang: Lang = langOf(t.lang)
    let pending = t.pending
    let proposed: Outgoing | null = null
    const usage = { input: 0, output: 0, cost: 0 }

    const now = lisbonNow()
    const context = [
        `Now in Portugal: ${now.day} ${now.date}, ${now.time}.`,
        t.business ? `Business in focus: ${t.business.name} (business_id ${t.business.business_id}, slug ${t.business.slug}, ${t.business.city}).` : 'No business in focus yet.',
        name ? `Their name: ${name}.` : (o.profileName ? `Their WhatsApp name is "${o.profileName}"; confirm their name before booking.` : 'Their name is not known yet.'),
        email ? `Their email: ${email}.` : 'No email given.',
        pending ? `A ${pending.kind} summary is waiting for their Yes or No; a new proposal replaces it.` : '',
    ].filter(Boolean).join('\n')

    const tools: Record<string, (input: any) => Promise<unknown>> = {
        find_business: async (i) => deps.call('wa_find', { p_query: String(i.query || '') }),
        business_details: async (i) => {
            need(UUID.test(String(i.business_id)), 'business_id must be an id from find_business or search')
            const r = await deps.call('wa_business', { p_business: i.business_id })
            need(r, 'That business is not taking bookings')
            business = r.business_id
            return r
        },
        search: async (i) => deps.call('wa_search', {
            p_market: i.city, p_query: String(i.what || ''),
            p_dates: Array.isArray(i.days) ? i.days.filter((d: string) => DATE.test(d)).slice(0, 3) : null,
            p_window: i.part || 'any', p_at: TIME.test(String(i.around || '')) ? i.around : null, p_people: Number(i.people) || 1,
        }),
        free_times: async (i) => {
            need(UUID.test(String(i.business_id)) && UUID.test(String(i.service_id)) && DATE.test(String(i.date)), 'Give business_id, service_id and date (YYYY-MM-DD)')
            return deps.call('wa_times', { p_business: i.business_id, p_service: i.service_id, p_date: i.date, p_ignore: null, p_people: Number(i.people) || 1 })
        },
        my_bookings: async () => deps.call('wa_my', { p_phone: o.phone }),
        propose_booking: async (i) => {
            need(UUID.test(String(i.business_id)) && UUID.test(String(i.service_id)) && DATE.test(String(i.date)) && TIME.test(String(i.time)), 'Give business_id, service_id, date (YYYY-MM-DD) and time (HH:MM)')
            const who = String(i.name || '').trim().slice(0, 120)
            need(who.length >= 2, 'Ask for their name first')
            const people = Math.max(1, Number(i.people) || 1)
            const times: string[] = await deps.call('wa_times', { p_business: i.business_id, p_service: i.service_id, p_date: i.date, p_ignore: null, p_people: people })
            need(Array.isArray(times) && times.includes(i.time), `${i.time} is not free. Free times that day: ${(times || []).slice(0, 8).join(', ') || 'none'}`)
            const info = await deps.call('wa_business', { p_business: i.business_id })
            need(info, 'That business is not taking bookings')
            const service = (info.services || []).find((s: any) => s.service_id === i.service_id)
            need(service, 'That service is not offered by this business')
            const ways: string[] = service.ways || []
            const mode = i.online && ways.includes('online') ? 'online' : ways.includes('at_business') ? 'at_business' : ways.includes('online') ? 'online' : 'at_client'
            need(mode !== 'at_client', `Visits at their address are booked on https://locappoint.com/${info.slug} for now`)
            const quote = await deps.call('wa_quote', { p_business: i.business_id, p_service: i.service_id, p_mode: mode, p_people: people })
            const mail = typeof i.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim()) ? i.email.trim().toLowerCase() : null
            lang = langOf(i.language)
            const price = quote?.online ? Number(quote.total) : service.price_per === 'person' ? Number(service.price) * people : Number(service.price)
            const p: Proposal = {
                kind: 'book', business_name: info.name, service_name: service.name, date: i.date, time: i.time, timezone: info.timezone,
                minutes: Number(service.minutes) || 0, people, total: Number.isFinite(price) ? price : null, currency: quote?.currency || info.currency || 'EUR',
                online: Boolean(quote?.online), confirms: Boolean(info.confirms_automatically), cutoff: Number(info.cancel_cutoff_minutes) || 0,
                name: who, email: mail, mode,
            }
            business = info.business_id
            name = who
            if (mail) email = mail
            const nonce = deps.nonce()
            pending = { ...p, nonce, expires_at: new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString(), args: { business: i.business_id, service: i.service_id, date: i.date, time: i.time, name: who, email: mail, mode, people } }
            proposed = summary(p, nonce, lang)
            return { ok: true, note: 'The summary with Yes and No has been sent. Stop now and do not repeat it.' }
        },
        propose_move: async (i) => {
            need(UUID.test(String(i.booking_id)) && DATE.test(String(i.date)) && TIME.test(String(i.time)), 'Give booking_id (from my_bookings), date and time')
            const mine: any[] = await deps.call('wa_my', { p_phone: o.phone })
            const b = (mine || []).find((x) => x.id === i.booking_id)
            need(b, 'That booking is not one of theirs. Use my_bookings.')
            const times: string[] = b.service_id ? await deps.call('wa_times', { p_business: b.business_id, p_service: b.service_id, p_date: i.date, p_ignore: b.id, p_people: b.people || 1 }) : []
            need(Array.isArray(times) && times.includes(i.time), `${i.time} is not free. Free times that day: ${(times || []).slice(0, 8).join(', ') || 'none'}`)
            lang = langOf(i.language)
            const p: Proposal = { kind: 'move', business_name: b.business_name, service_name: b.service_name, date: i.date, time: i.time, timezone: b.timezone, from_date: b.date, from_time: b.time }
            const nonce = deps.nonce()
            pending = { ...p, nonce, expires_at: new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString(), args: { booking: b.id, date: i.date, time: i.time } }
            proposed = summary(p, nonce, lang)
            return { ok: true, note: 'The summary with Yes and No has been sent. Stop now and do not repeat it.' }
        },
        propose_cancel: async (i) => {
            need(UUID.test(String(i.booking_id)), 'Give booking_id from my_bookings')
            const mine: any[] = await deps.call('wa_my', { p_phone: o.phone })
            const b = (mine || []).find((x) => x.id === i.booking_id)
            need(b, 'That booking is not one of theirs. Use my_bookings.')
            lang = langOf(i.language)
            const p: Proposal = { kind: 'cancel', business_name: b.business_name, service_name: b.service_name, date: b.date, time: b.time, timezone: b.timezone, paid: b.payment_status === 'paid', cutoff: Number(b.cancel_cutoff_minutes) || 0 }
            const nonce = deps.nonce()
            pending = { ...p, nonce, expires_at: new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString(), args: { booking: b.id } }
            proposed = summary(p, nonce, lang)
            return { ok: true, note: 'The summary with Yes and No has been sent. Stop now and do not repeat it.' }
        },
    }

    const messages: any[] = toMessages(t.history, o.message)
    let reply = ''
    for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await deps.claude({
            model: MODEL(),
            max_tokens: 700,
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }, { type: 'text', text: context }],
            tools: TOOLS.map((tool, n) => (n === TOOLS.length - 1 ? { ...tool, cache_control: { type: 'ephemeral' } } : tool)),
            messages,
        })
        const u = res?.usage || {}
        const p = PRICE()
        usage.input += Number(u.input_tokens) || 0
        usage.output += Number(u.output_tokens) || 0
        // OpenRouter says what a call cost; for Anthropic it is worked out from the token prices.
        usage.cost += typeof u.cost_usd === 'number' ? u.cost_usd * p.eur
            : (((Number(u.input_tokens) || 0) + (Number(u.cache_creation_input_tokens) || 0) * 1.25 + (Number(u.cache_read_input_tokens) || 0) * 0.1) * p.input
            + (Number(u.output_tokens) || 0) * p.output) / 1e6 * p.eur

        const blocks: any[] = Array.isArray(res?.content) ? res.content : []
        reply = blocks.filter((b) => b.type === 'text').map((b) => String(b.text || '')).join('\n').trim()
        const uses = blocks.filter((b) => b.type === 'tool_use')
        if (!uses.length || res?.stop_reason !== 'tool_use') break

        messages.push({ role: 'assistant', content: blocks })
        const results = []
        for (const use of uses) {
            let content: string
            let isError = false
            try {
                const run = tools[use.name]
                if (!run) throw new ToolError(`Unknown tool ${use.name}`)
                content = JSON.stringify(await run(use.input || {})).slice(0, 6000)
            } catch (err: any) {
                isError = true
                content = err instanceof ToolError ? err.message : String(err?.message || 'That did not work')
            }
            results.push({ type: 'tool_result', tool_use_id: use.id, content, ...(isError ? { is_error: true } : {}) })
        }
        messages.push({ role: 'user', content: results })
        // A summary went out: the system speaks next, not the model.
        if (proposed) { reply = ''; break }
    }

    const replies: Outgoing[] = []
    const said = reply.replace(/[\u2014\u2013]/g, ',').slice(0, 1500)
    if (said && !proposed) replies.push(text(said))
    if (proposed) replies.push(proposed)
    if (!replies.length) replies.push(text(lang === 'pt' ? 'Desculpe, não percebi. Pode dizer de outra forma?' : 'Sorry, I did not get that. Could you say it another way?'))

    const history = [...t.history, { role: 'user' as const, text: o.message.slice(0, 1000) }, { role: 'assistant' as const, text: replies.map((r) => r.text).join('\n').slice(0, 1500) }]
    return { replies, history, business, name, email, lang, pending, usage }
}

// A typed yes or no to the summary waiting, in English or Portuguese.
export const typedAnswer = (said: string): 'yes' | 'no' | null => {
    const s = said.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!?,]+/g, ' ').trim()
    if (s.length > 30) return null
    if (/^(yes|y|yeah|yep|ok|okay|sure|confirm|book it|go ahead|sim|s|claro|confirmo|pode ser|pode|isso|esta bem|ta bem)( please| por favor)?$/.test(s)) return 'yes'
    if (/^(no|n|nope|not now|nao|nao obrigado|nao obrigada|deixa|esquece)$/.test(s)) return 'no'
    return null
}

// The WhatsApp booking agent for clients. Claude reads the message and calls tools; every fact comes
// from the database through those tools. Claude can only propose a booking, a move or a cancel: the
// summary with Yes and No is built here from database values, and the change happens only when the
// client taps Yes (or answers yes). No Deno APIs, so tests run it under Node with a fake model.
//
// Round 3: the rules teach the whole conversation (reading messy messages, dates from a calendar in
// the context, matching a need to a business, the nearest free times, name and email in one ask);
// their bookings and their language are in the context; free_days answers "when are you free" in one
// call; tool results are trimmed; the last round must answer in words.
//
// Round 4: add_email puts an email on a booking (and emails it); free_days gives the first and last
// time of each day; system notes in the conversation are trusted; an empty answer is asked for again.
//
// Round 5 (from the 25-person evaluation): a yes in words to a waiting summary goes through
// answer_summary, so the model never says "booked" itself; each service says how it is paid and how
// groups work; groups show their real length; a reply cut off by the token limit is asked again with
// more room; rules against re-checking, invented checks, promises to pass messages, and long goodbyes.

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
const HISTORY = 12
const RESULT_CHARS = 4000
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
    // A yes or no in words to the summary waiting: the webhook settles it exactly as a tap.
    answer: 'yes' | 'no' | null
    usage: { input: number; output: number; cost: number }
}

const SYSTEM = `You are the Locappoint booking assistant on WhatsApp. Locappoint is where people book local businesses in Porto and Lisbon: barbers, salons, nails, beauty and wellness, and also studios, consultants, tutors, repairs and any other business listed. The businesses taking bookings right now are in the context, with what they offer.

Your job: get each person the booking they want in as few messages as possible. You find businesses, answer questions about them (services, prices, hours, address), and book, move and cancel.

Understanding people
- People write however they like: one word, long stories, typos, slang, voice-to-text, mixed languages, Nigerian Pidgin. Work out what they mean from the whole conversation, not only the last message. "Abeg I wan barb my hair tomorrow" is a haircut tomorrow.
- Several messages in a row from them are one request: answer all of it, including anything you did not answer before.
- They often describe the need, not the business ("someone to look at my website", "a fade", "gel nails"). Match it to the live list by meaning, not exact words: a website review comes from a web studio, a fade from a barber.
- Days and times: use the calendar in the context to turn "tomorrow", "Monday", "next week", "this weekend" into dates. "9pm" is 21:00, "morning" is before 12:00, "after work" is from 17:00. Never ask them for a format.
- When something is unclear but one reading is clearly most likely, go with it and say it ("Monday 12 October at 21:00"). Ask only when the choice really matters, such as which of two businesses.
- "(audio)", "(image)" or "(video)" means they sent something you cannot hear or see: ask them to type it.

Look before you answer
- Never say nobody offers something, or that you cannot help, before you have looked: check the live list, then business_details or search.
- They name a business: call find_business. Not found: say it is not taking bookings on Locappoint yet, and offer what is live that fits, by name.
- Nothing live fits: say so in one line and say what kinds of businesses they can book now in that city. Never send them to the phone of a business that is not on Locappoint.
- Every fact you state (business, service, price, duration, payment, time, hours, address, availability) comes from a tool result or the context. Never guess one.
- What you told them earlier in this conversation was checked at the time: do not re-check it, correct it or apologise for it unless they question it or a tool now says otherwise. Never say you checked something unless you called a tool for it in this reply.

Booking
1. Business and service. Always name the business ("The Brick Dev does website reviews in Porto, 60 min, €50"). When they want one service, do not list the others.
2. Time. "When are you free", "what suits me", "this week" or no day yet: call free_days and suggest 3 or 4 real times ("tomorrow at 10:00, 13:00 or 15:30"). free_days gives each day's first and last free start and a few examples; other times in between may be free too, so never describe a pattern of start times, and check free_times before confirming a time that is not listed. A specific day: call free_times. If that time is not free or the business is closed then, say so plainly and offer the nearest free times, at most 4.
3. Name, and email if they like. Ask in one message: if their WhatsApp name looks like a real name, "Shall I put it under Ana? And an email for the confirmation, if you like." Otherwise ask for their name. Email is optional; accept no. Ask once.
4. Call propose_booking. The system sends them a summary with Yes and No. Do not repeat it.
5. While a summary waits: if they agree in words, in any language ("yes", "book it", "that's the one", "sim", "pode ser", "abeg book am"), call answer_summary with yes. If they say no, answer_summary with no. If they want something changed, propose again with the change.
Never write that something is booked, moved, cancelled or paid: only the system says that, after their Yes.
Gather what is missing in one message, not one item per message. As soon as you have service, date, time and name, propose.
Groups: a service with a group note takes several people in one booking, served one after another by the same person. Pass people to free_days, free_times and propose_booking.

Their bookings
- Their upcoming WhatsApp bookings are in the context, with ids. To move one, check free_times for the new day, then propose_move. To cancel, propose_cancel. If it is not clear which booking, ask.
- To add or correct the email on a booking, call add_email: the booking is then emailed to them.
- Lines in the conversation that start with [Locappoint] were written by the system after they tapped a button, and are true. After a booking, "it" and "my booking" mean that booking: never offer to book it again unless they ask for another one, and never apologise for system messages.

Money
- Use price_text from business_details. A price of 0 is free: say "free", never €0.
- Each service's pay says how it is paid: online when booking, or at the visit. Never say how something is paid without it.
- Paid online: a secure payment link comes after they tap Yes and the time is held while they pay. Never ask for card details; payment never happens in the chat. Once they pay, the confirmation arrives here by itself; if they say they paid and nothing came, say it can take a minute, and if it still does not come, hello@locappoint.com.

Limits
- Visits at the person's own address are booked on the business page for now: https://locappoint.com/<slug>.
- Questions you cannot answer about a business: give its phone from business_details. Problems with Locappoint itself: hello@locappoint.com.
- Anything unrelated to businesses and bookings (general knowledge, homework, code): one friendly sentence that you only help with bookings, then offer to help.
- Asked if you are a person: you are Locappoint's automated assistant.
- You cannot pass messages to a business or its staff, or see more of their diary than free times. Special requests: give the business phone.
- When they say thanks or goodbye and nothing is waiting, answer in one short line. Do not repeat the details and do not offer anything else.
- The first reply of a conversation opens with a short hello that says you book businesses in Porto and Lisbon, then helps with what they asked.

Language and style
- Answer in the language of their latest message: English, or Portuguese from Portugal (você, not Brazilian forms). Pidgin or any other language: simple English. If they ask to switch, switch. Set language on every propose call.
- Sound like a helpful person at a front desk: warm, natural, short. At most 5 short lines, ending with one clear next step.
- Bold with single asterisks like *this*, never double. No headings, tables, emojis or long dashes. Times as 14:30. Dates in words ("Monday 12 October"), never 2026-10-12.`

const TOOLS = [
    { name: 'find_business', description: 'Find a business taking bookings by its name or page address (slug), even misspelt or partial. Returns up to 5.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'business_details', description: 'One business: address, opening hours (days not listed are closed), services with service_id, price_text, minutes, pay (online when booking, or at the visit) and group rules, whether it confirms automatically, cancellation cut-off, phone.', input_schema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
    { name: 'search', description: 'Find who can do something in a city, with free times. Use when the person has not named a business.', input_schema: { type: 'object', properties: { city: { type: 'string', enum: ['porto', 'lisbon'] }, what: { type: 'string', description: 'What they need, in their words, e.g. "haircut", "unhas de gel"' }, days: { type: 'array', items: { type: 'string', description: 'YYYY-MM-DD' }, maxItems: 3 }, part: { type: 'string', enum: ['any', 'morning', 'afternoon', 'evening'] }, around: { type: 'string', description: 'HH:MM, instead of part' }, people: { type: 'integer', minimum: 1 } }, required: ['city', 'what'] } },
    { name: 'free_days', description: 'The next days with free times for one service, from a date (today if left out): up to 5 days, times spread across each day. Use for "when are you free", "this week", "next available".', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, from: { type: 'string', description: 'YYYY-MM-DD' }, people: { type: 'integer', minimum: 1 } }, required: ['business_id', 'service_id'] } },
    { name: 'free_times', description: 'All free start times for one service on one date at one business.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, people: { type: 'integer', minimum: 1 } }, required: ['business_id', 'service_id', 'date'] } },
    { name: 'my_bookings', description: 'Their upcoming WhatsApp bookings, fresh (the context already lists them).', input_schema: { type: 'object', properties: {} } },
    { name: 'add_email', description: 'Add or correct the email on one of their upcoming bookings. The booking is then emailed to them.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, email: { type: 'string' } }, required: ['booking_id', 'email'] } },
    { name: 'propose_booking', description: 'Show the person a booking summary with Yes and No. Only after checking the time with free_times and knowing their name.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string', description: 'HH:MM' }, name: { type: 'string' }, email: { type: 'string' }, people: { type: 'integer', minimum: 1 }, online: { type: 'boolean', description: 'true only if the person wants the online version and the service offers it' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['business_id', 'service_id', 'date', 'time', 'name', 'language'] } },
    { name: 'answer_summary', description: 'They answered the summary waiting (book, move or cancel) in words: yes or no. The system then carries it out and tells them.', input_schema: { type: 'object', properties: { answer: { type: 'string', enum: ['yes', 'no'] } }, required: ['answer'] } },
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

// Two weeks of dates, so "Monday" or "next Friday" becomes a date without arithmetic.
const calendar = (today: string) => {
    const base = Date.parse(`${today}T12:00:00Z`)
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(base + i * 86_400_000)
        return `${fmt.format(d)} = ${d.toISOString().slice(0, 10)}${i === 0 ? ' (today)' : i === 1 ? ' (tomorrow)' : ''}`
    }).join('; ')
}

// Null and empty fields are left out of what the model reads: fewer tokens, same facts.
const compact = (v: any): any => {
    if (Array.isArray(v)) return v.map(compact)
    if (v && typeof v === 'object') {
        const o: Record<string, unknown> = {}
        for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined && x !== '') o[k] = compact(x)
        return o
    }
    return v
}

const SYMBOL: Record<string, string> = { EUR: '€', NGN: '₦', USD: '$', GBP: '£' }
export const priceText = (price: unknown, currency: unknown, per?: unknown) => {
    const n = Number(price)
    if (price === null || price === undefined || !Number.isFinite(n)) return null
    if (n === 0) return 'free'
    const cur = String(currency || 'EUR').toUpperCase()
    const amount = Number.isInteger(n) ? String(n) : n.toFixed(2)
    return `${SYMBOL[cur] || `${cur} `}${amount}${per === 'person' ? ' per person' : ''}`
}

// Their language from what they just wrote, when it is clear; otherwise the one we had.
export const guessLang = (said: string): Lang | null => {
    const s = ` ${said.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]+/g, ' ')} `
    const count = (words: string[]) => words.reduce((n, w) => n + (s.includes(` ${w} `) ? 1 : 0), 0)
    const pt = count(['ola', 'bom', 'boa', 'obrigado', 'obrigada', 'quero', 'queria', 'marcar', 'marcacao', 'amanha', 'hoje', 'sim', 'nao', 'favor', 'cabelo', 'unhas', 'corte', 'preciso', 'gostaria', 'qual', 'quando', 'onde', 'horario', 'voce', 'tem', 'uma', 'para', 'esta', 'semana', 'tarde', 'manha', 'cancelar', 'mudar'])
    const en = count(['hi', 'hello', 'hey', 'morning', 'thanks', 'thank', 'want', 'need', 'book', 'booking', 'tomorrow', 'today', 'yes', 'please', 'haircut', 'nails', 'for', 'with', 'when', 'where', 'what', 'can', 'would', 'like', 'available', 'the', 'my', 'is', 'are', 'free', 'cancel', 'move', 'week', 'help'])
    if (pt > en) return 'pt'
    if (en > pt) return 'en'
    return null
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

export const runAgent = async (deps: Deps, o: { phone: string; profileName: string; message: string; thread: Thread; directory?: Array<{ name: string; slug: string; city: string; category: string; services: string }> }): Promise<Turn> => {
    const t = o.thread
    let business = t.business?.business_id || null
    let name = t.name
    let email = t.email
    const guessed = guessLang(o.message)
    let lang: Lang = guessed || langOf(t.lang)
    let pending = t.pending
    let proposed: Outgoing | null = null
    let answer: 'yes' | 'no' | null = null
    const usage = { input: 0, output: 0, cost: 0 }

    const now = lisbonNow()
    const mine: any[] = await deps.call('wa_my', { p_phone: o.phone }).catch(() => [])
    const context = [
        `Now in Portugal: ${now.day} ${now.date}, ${now.time}.`,
        `Calendar: ${calendar(now.date)}.`,
        o.directory?.length ? `Businesses live on Locappoint now (name, slug, city, what they do):\n${o.directory.map((b) => `- ${b.name} (${b.slug}, ${b.city}): ${b.category}; ${b.services}`).join('\n')}` : 'No businesses are live on Locappoint right now.',
        t.business ? `Business in focus: ${t.business.name} (business_id ${t.business.business_id}, slug ${t.business.slug}, ${t.business.city}).` : 'No business in focus yet.',
        name ? `Their name: ${name}.` : (o.profileName ? `Their WhatsApp name is "${o.profileName}"; confirm their name before booking.` : 'Their name is not known yet.'),
        email ? `Their email: ${email}.` : 'No email given.',
        guessed ? `Their latest message looks ${guessed === 'pt' ? 'Portuguese' : 'English'}.` : '',
        Array.isArray(mine) && mine.length
            ? `Their upcoming WhatsApp bookings:\n${mine.map((b) => `- booking_id ${b.id}: ${b.service_name} at ${b.business_name}, ${b.date} ${b.time}, ${b.status}${b.payment_status === 'awaiting' ? ', waiting for payment' : b.payment_status === 'paid' ? ', paid' : ''}`).join('\n')}`
            : 'They have no upcoming WhatsApp bookings.',
        t.history.length ? '' : 'This is the start of the conversation.',
        pending ? `A ${pending.kind} summary is waiting for their Yes or No; a new proposal replaces it.` : '',
    ].filter(Boolean).join('\n')

    const tools: Record<string, (input: any) => Promise<unknown>> = {
        find_business: async (i) => deps.call('wa_find', { p_query: String(i.query || '') }),
        business_details: async (i) => {
            need(UUID.test(String(i.business_id)), 'business_id must be an id from find_business or search')
            const r = await deps.call('wa_business', { p_business: i.business_id })
            need(r, 'That business is not taking bookings')
            business = r.business_id
            const services = await Promise.all((r.services || []).map(async (s: any) => {
                const ways: string[] = s.ways || []
                const mode = ways.includes('at_business') ? 'at_business' : ways.includes('online') ? 'online' : null
                let pay: string | null = mode ? null : `booked on https://locappoint.com/${r.slug} (visit at their address)`
                if (mode) {
                    const q = await deps.call('wa_quote', { p_business: r.business_id, p_service: s.service_id, p_mode: mode, p_people: 1 }).catch(() => null)
                    if (q) pay = q.online ? 'online when booking (secure link after Yes)' : 'at the visit'
                }
                const extra = Number(s.extra_person_minutes) || Number(s.minutes)
                return {
                    ...s, price_text: priceText(s.price, r.currency, s.price_per), pay,
                    ...(Number(s.max_people) > 1 ? { group: `up to ${s.max_people} people in one booking, served one after another by the same person; each extra person adds ${extra} min${s.price_per === 'person' ? ', price per person' : ', one price for the group'}` } : {}),
                }
            }))
            return { ...r, services }
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
        free_days: async (i) => {
            need(UUID.test(String(i.business_id)) && UUID.test(String(i.service_id)), 'Give business_id and service_id from business_details')
            const days = await deps.call('wa_free_days', { p_business: i.business_id, p_service: i.service_id, p_from: DATE.test(String(i.from || '')) ? i.from : null, p_people: Number(i.people) || 1 })
            return Array.isArray(days) && days.length
                ? { days, note: 'first and last are the earliest and latest free starts that day; examples are only some of the free starts.' }
                : { days: [], note: 'No free times in the next 3 weeks. Give them the business phone, or offer another business.' }
        },
        my_bookings: async () => deps.call('wa_my', { p_phone: o.phone }),
        add_email: async (i) => {
            need(UUID.test(String(i.booking_id)), 'Give booking_id from their bookings in the context')
            const r = await deps.call('wa_set_email', { p_phone: o.phone, p_appointment: i.booking_id, p_email: String(i.email || '') })
            email = r?.email || email
            return { ok: true, email: r?.email, note: 'Saved on the booking and emailed to them.' }
        },
        answer_summary: async (i) => {
            need(pending && !proposed, 'Nothing is waiting for a Yes or No. Propose first.')
            need(i.answer === 'yes' || i.answer === 'no', 'answer is yes or no')
            answer = i.answer
            return { ok: true, note: 'The system carries this out now and tells them. Stop and write nothing.' }
        },
        propose_booking: async (i) => {
            need(!answer, 'They already answered the summary waiting.')
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
                minutes: (Number(service.minutes) || 0) + (people - 1) * (Number(service.extra_person_minutes) || Number(service.minutes) || 0), people, total: Number.isFinite(price) ? price : null, currency: quote?.currency || info.currency || 'EUR',
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

    const messages: any[] = toMessages(t.history.slice(-HISTORY), o.message)
    const ask = (wordsOnly: boolean, nudge = '', room = 1500) => deps.claude({
        model: MODEL(),
        max_tokens: room,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }, { type: 'text', text: nudge ? `${context}\n${nudge}` : context }],
        tools: TOOLS.map((tool, n) => (n === TOOLS.length - 1 ? { ...tool, cache_control: { type: 'ephemeral' } } : tool)),
        ...(wordsOnly ? { tool_choice: { type: 'none' } } : {}),
        messages,
    })
    const count = (res: any) => {
        const u = res?.usage || {}
        const p = PRICE()
        usage.input += Number(u.input_tokens) || 0
        usage.output += Number(u.output_tokens) || 0
        // OpenRouter says what a call cost; for Anthropic it is worked out from the token prices.
        usage.cost += typeof u.cost_usd === 'number' ? u.cost_usd * p.eur
            : (((Number(u.input_tokens) || 0) + (Number(u.cache_creation_input_tokens) || 0) * 1.25 + (Number(u.cache_read_input_tokens) || 0) * 0.1) * p.input
            + (Number(u.output_tokens) || 0) * p.output) / 1e6 * p.eur
    }
    const words = (res: any) => (Array.isArray(res?.content) ? res.content : []).filter((b: any) => b.type === 'text').map((b: any) => String(b.text || '')).join('\n').trim()
    let reply = ''
    for (let round = 0; round < MAX_ROUNDS; round++) {
        // The last round has to answer in words, so a long search never ends in silence.
        let res = await ask(round === MAX_ROUNDS - 1)
        count(res)
        // Cut off by the token limit (long thinking or a long list): the same question with more room.
        if (res?.stop_reason === 'max_tokens') {
            res = await ask(round === MAX_ROUNDS - 1, '', 4000)
            count(res)
        }

        const blocks: any[] = Array.isArray(res?.content) ? res.content : []
        reply = words(res)
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
                content = JSON.stringify(compact(await run(use.input || {}))).slice(0, RESULT_CHARS)
            } catch (err: any) {
                isError = true
                content = err instanceof ToolError ? err.message : String(err?.message || 'That did not work')
            }
            results.push({ type: 'tool_result', tool_use_id: use.id, content, ...(isError ? { is_error: true } : {}) })
        }
        messages.push({ role: 'user', content: results })
        // A summary went out, or they answered one: the system speaks next, not the model.
        if (proposed || answer) { reply = ''; break }
    }

    // A model that ended without a word: asked once more for an answer, without tools.
    if (!proposed && !answer && !tidy(reply)) {
        const res = await ask(true, 'Your last answer was empty. Answer the person now, in words, using what the tools returned.', 4000)
        count(res)
        reply = words(res)
    }

    // Answered in words: the webhook settles it and records the conversation, exactly as for a tap.
    if (answer) return { replies: [], history: t.history, business, name, email, lang, pending, answer, usage }

    const replies: Outgoing[] = []
    // WhatsApp bold is one asterisk; models often write Markdown.
    const said = tidy(reply).slice(0, 1500)
    if (said && !proposed) replies.push(text(said))
    if (proposed) replies.push(proposed)
    if (!replies.length) replies.push(text(lang === 'pt' ? 'Desculpe, não percebi. Pode dizer de outra forma?' : 'Sorry, I did not get that. Could you say it another way?'))

    const history = [...t.history, { role: 'user' as const, text: o.message.slice(0, 1000) }, { role: 'assistant' as const, text: replies.map((r) => r.text).join('\n').slice(0, 1500) }]
    return { replies, history, business, name, email, lang, pending, answer: null, usage }
}

// What the model writes, made WhatsApp-plain: single-asterisk bold, no headings, no long dashes,
// links as plain addresses, no space before a comma.
export const tidy = (said: string) => said
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '*$1*')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => (label === url ? url : `${label}: ${url}`))
    .replace(/[ \t]+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// A typed yes or no to the summary waiting, in English or Portuguese.
export const typedAnswer = (said: string): 'yes' | 'no' | null => {
    const s = said.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!?,]+/g, ' ').trim()
    if (s.length > 30) return null
    if (/^(yes|y|yeah|yep|ok|okay|sure|confirm|book it|go ahead|sim|s|claro|confirmo|pode ser|pode|isso|esta bem|ta bem)( please| por favor)?$/.test(s)) return 'yes'
    if (/^(no|n|nope|not now|nao|nao obrigado|nao obrigada|deixa|esquece)$/.test(s)) return 'no'
    return null
}

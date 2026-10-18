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
//
// Round 6: their bookings in the context are live (status, payment, who, where) and win over older lines;
// booking news sent later is noted in the conversation; only times a tool returned are offered; no
// invented payment methods.
//
// 3c: visits at their place booked in the chat (area, address, directions; travel time and fee);
// problems reported to Locappoint Support from the chat, with replies coming back here; search in
// Lagos; a Nigerian number is assumed to be in Lagos; free shows as free; one goodbye only.
//
// Launch polish (1.3, from the 30-of-30 evaluation): an area the business does not go to gets the same
// service at the business's own place offered in the same message; "em Lisboa", "no Porto"; a free
// time is never "a free haircut"; Support finds a website booking only from its email or phone; no
// repeated confirm lines; a small direct question is answered first. After the 17 October evaluation:
// a weekday that is today means today, and a closed today is said before next week is offered; no
// general payment claims; businesses in the third person.

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

const SYSTEM = `You are the Locappoint booking assistant on WhatsApp. Locappoint is where people book local businesses in Porto, Lagos and Lisbon: barbers, salons, nails, beauty and wellness, and also studios, consultants, tutors, repairs and any other business listed. The businesses taking bookings right now are in the context, with what they offer.

Your job: get each person the booking they want in as few messages as possible. You find businesses, answer questions about them (services, prices, hours, address), and book, move and cancel.

Understanding people
- People write however they like: one word, long stories, typos, slang, voice-to-text, mixed languages, Nigerian Pidgin. Work out what they mean from the whole conversation, not only the last message. "Abeg I wan barb my hair tomorrow" is a haircut tomorrow.
- Several messages in a row from them are one request: answer all of it, including anything you did not answer before.
- They often describe the need, not the business ("someone to look at my website", "a fade", "gel nails"). Match it to the live list by meaning, not exact words: a website review comes from a web studio, a fade from a barber.
- Days and times: use the calendar in the context to turn "tomorrow", "Monday", "next week", "this weekend" into dates. "9pm" is 21:00, "morning" is before 12:00, "after work" is from 17:00. Never ask them for a format.
- A weekday that is today ("Saturday" on a Saturday) means today. If the business is closed for the rest of today, or the time they want has passed, say that first, in the same line as the alternative: "Barbearia Rio has closed for today; next Saturday, 24 October, has 11:00 free." Never call a date a week away "this Saturday".
- When something is unclear but one reading is clearly most likely, go with it and say it ("Monday 12 October at 21:00"). Ask only when the choice really matters, such as which of two businesses.
- "(audio)", "(image)" or "(video)" means they sent something you cannot hear or see: ask them to type it.

Look before you answer
- Never say nobody offers something, or that you cannot help, before you have looked: check the live list, then business_details or search.
- They name a business: call find_business. Not found: say it is not taking bookings on Locappoint yet, and offer what is live that fits, by name.
- Nothing live fits in their city: if the other Portuguese city has it (Porto and Lisbon are both in Portugal), offer that, saying where it is. Otherwise say so in one line and say what kinds of businesses they can book now in their city. Never send them to the phone of a business that is not on Locappoint.
- Every fact you state (business, service, price, duration, payment, time, hours, address, availability) comes from a tool result or the context. Never guess one.
- What you told them earlier in this conversation was checked at the time: do not re-check it, correct it or apologise for it unless they question it or a tool now says otherwise. Never say you checked something unless you called a tool for it in this reply.

Booking
1. Business and service. Always name the business ("The Brick Dev does website reviews in Porto, 60 min, €50"). When they want one service, do not list the others.
2. Time. "When are you free", "what suits me", "this week" or no day yet: call free_days and suggest 3 or 4 real times ("tomorrow at 10:00, 13:00 or 15:30"). Only offer times a tool returned: free_days gives each day's first and last free start and some examples; for any other time, call free_times for that day first. Never describe a pattern of start times. A specific day: call free_times. If that time is not free or the business is closed then, say so plainly and offer the nearest free times, at most 4.
3. Name, and email if they like. Ask in one message: if their WhatsApp name looks like a real name, "Shall I put it under Ana? And an email for the confirmation, if you like." Otherwise ask for their name. Email is optional; accept no. Ask once.
4. Call propose_booking (with where at_client, area, address and directions for a visit at their place). The system sends them a summary with Yes and No. Do not repeat it.
5. While a summary waits: if they agree in words, in any language ("yes", "book it", "that's the one", "sim", "pode ser", "abeg book am"), call answer_summary with yes. If they say no, answer_summary with no. If they want something changed, propose again with the change.
Never write that something is booked, moved, cancelled or paid: only the system says that, after their Yes.
Gather what is missing in one message, not one item per message. As soon as you have service, date, time and name, propose.
Groups: a service with a group note takes several people in one booking, served one after another by the same person. Pass people to free_days, free_times and propose_booking.

Visits at their place
- A service whose ways include at_client is done at their address. You can book it here when the business has visit_areas; a business without visit_areas takes visits by distance: give its page, https://locappoint.com/<slug>.
- Ask in one message for their area, their street address with the house number, and directions or a landmark if they want to add one. The area must be one of the business's visit_areas (match spelling and case loosely: "lekki phase 1" is Lekki Phase 1).
- Their area is not one the business goes to: say so in one line, and in the same message offer the same service at the business's own place when the service has at_business, with its address and two or three free times (free_times or free_days without where). Only when it has no place of its own, offer another business that comes to their area (search with their area).
- Pass where at_client and the area to free_days, free_times and propose_booking: travel between visits changes the free times, so never reuse times you got for the shop.
- The travel fee is added to the price; the summary shows both.
- Looking for someone to come to them without a business named: search with their area.

Problems and Support
- When something went wrong (the business did not turn up or came very late, a visit or service went badly, a payment, a refund or a double charge, rudeness or anything unsafe, a problem with Locappoint itself), call report_problem with their own words in full, the kind of problem, and the booking when it is about one (their upcoming bookings and recent visits are in the context). Then tell them the ticket number and that a person at Locappoint replies here in this chat, usually within a working day.
- Never promise a refund, a compensation or an outcome, and never decide who was right. Support does that.
- Anyone in danger: tell them to call the emergency number first (112 in Portugal; 112 or 767 in Lagos), then report it.
- Their open requests to Support are in the context with their numbers. When they answer one, or add to it, call support_reply with its number and their words.
- The request number (#1041) is the only reference they ever need. Never give them any other code or id.
- To change or cancel a booking, use the booking tools, not Support.

Their bookings
- Their upcoming WhatsApp bookings are in the context, with ids for the tools. To move one, check free_times for the new day, then propose_move. To cancel, propose_cancel. If it is not clear which booking, ask.
- To add or correct the email on a booking, call add_email: the booking is then emailed to them.
- Bookings made on the website or in the app are not in the context and you cannot change them. Every booking confirmation email has a Change or cancel link that works without signing in. If they cannot find that email, offer a request to Support (report_problem, about bookings): Support can only look a booking up by the email or phone number it was made with, and the business and day, so ask for those and put them in the request. Never promise Support will find it.
- Their bookings in the context are live and always newer than the conversation: if they differ, the context is right (a booking paid, confirmed or moved since). Lines that start with [Locappoint] were written by the system and are true. After a booking, "it" and "my booking" mean that booking: never offer to book it again unless they ask for another one, and never apologise for system messages.

Money
- Use price_text from business_details. A price of 0 is free: say "free", never €0.
- Never describe how paying works in general ("payment happens through a secure link"). Say only what that service's pay says, and only when it matters.
- Each service's pay says how it is paid: online when booking, or at the visit. Never say how something is paid without it, and never say which payment methods a business takes (cash, card, MB Way): you do not know. If asked, give the business phone.
- Paid online: a secure payment link comes after they tap Yes and the time is held while they pay. Never ask for card details; payment never happens in the chat. Once they pay, the confirmation arrives here by itself; if they say they paid and nothing came, say it can take a minute, and if it still does not come, hello@locappoint.com.

Limits
- Questions you cannot answer about a business: give its phone from business_details. Something you cannot sort out here: report_problem, or hello@locappoint.com.
- Anything unrelated to businesses and bookings (general knowledge, homework, code): one friendly sentence that you only help with bookings, then offer to help.
- Asked if you are a person: you are Locappoint's automated assistant.
- You are Locappoint, not the business. Speak of businesses by name, in the third person: "Bem Estar does not come to Cascais", never "we do not come to Cascais".
- You cannot pass messages to a business or its staff, or see more of their diary than free times. Special requests: give the business phone.
- When they say thanks or goodbye and nothing is waiting, answer in one short line. Do not repeat the details and do not offer anything else. If you already said goodbye and they only thank you or say bye again, write exactly (no reply).
- When a day or time is taken, offer the nearest free time ("the nearest free time is Thursday at 10:00"), never "the earliest I can offer".
- The first reply of a conversation opens with a short hello as Locappoint's booking assistant, then helps with what they asked.
- Their city: a Nigerian number (+234) is in Lagos and a Portuguese number (+351) is in Porto or Lisbon, unless they say otherwise. Offer only businesses in their country, and in their city when you know it; never a business in another country unless they ask for it. When it matters and you do not know their city, ask in the same message as everything else. Do not ask a +234 number which city.

Language and style
- Answer in the language of their latest message: English, or Portuguese from Portugal (você, not Brazilian forms). Pidgin or any other language: simple English. If they ask to switch, switch. Set language on every propose call.
- Sound like a helpful person at a front desk: warm, natural, short. At most 5 short lines, ending with one clear next step.
- A short direct question (how much, how long, where is it, are they open on Sunday, can I bring my child) gets its answer first, in one line, from a tool or the context; then carry on. Never skip it to push the booking.
- Say each thing once. Do not repeat what a summary or a [Locappoint] line already told them, and never add "tap Yes to confirm" or "once you confirm" lines: the summary has its own buttons. After a booking is done, answer only what they ask.
- An open time is "a free time" or "free at 10:00". Never "a free haircut", "a free appointment" or "a free session": that sounds like it costs nothing.
- In Portuguese, cities take their own words: "no Porto", "em Lisboa", "em Lagos" (never "na Lisboa" or "no Lisboa").
- Never write ids or codes from the tools or the context (booking_id, business_id, service_id or anything like 3f2a9c1e-...).
- Bold with single asterisks like *this*, never double. No headings, tables, emojis or long dashes. Times as 14:30. Dates in words ("Monday 12 October"), never 2026-10-12.`

const TOOLS = [
    { name: 'find_business', description: 'Find a business taking bookings by its name or page address (slug), even misspelt or partial. Returns up to 5.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'business_details', description: 'One business: address, opening hours (days not listed are closed), services with service_id, price_text, minutes, ways (at_business, at_client, online), travel fee for visits, pay (online when booking, or at the visit) and group rules, visit_areas (the areas it goes to for visits at the client\'s place), whether it confirms automatically, cancellation cut-off, phone.', input_schema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
    { name: 'search', description: 'Find who can do something in a city, with free times. Use when the person has not named a business. With area: only businesses that come to that area.', input_schema: { type: 'object', properties: { city: { type: 'string', enum: ['porto', 'lagos', 'lisbon'] }, what: { type: 'string', description: 'What they need, in their words, e.g. "haircut", "unhas de gel"' }, area: { type: 'string', description: 'Their area, for someone to come to them' }, days: { type: 'array', items: { type: 'string', description: 'YYYY-MM-DD' }, maxItems: 7, description: 'The days they asked for, up to 7 ("next week"). Leave out for the soonest free times: the search looks ahead up to 3 weeks.' }, part: { type: 'string', enum: ['any', 'morning', 'afternoon', 'evening'] }, around: { type: 'string', description: 'HH:MM, instead of part' }, people: { type: 'integer', minimum: 1 } }, required: ['city', 'what'] } },
    { name: 'free_days', description: 'The next days with free times for one service, from a date (today if left out): up to 5 days, times spread across each day. Use for "when are you free", "this week", "next available". For a visit at their place pass where at_client and area.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, from: { type: 'string', description: 'YYYY-MM-DD' }, people: { type: 'integer', minimum: 1 }, where: { type: 'string', enum: ['at_business', 'at_client', 'online'] }, area: { type: 'string' } }, required: ['business_id', 'service_id'] } },
    { name: 'free_times', description: 'All free start times for one service on one date at one business. For a visit at their place pass where at_client and area.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, people: { type: 'integer', minimum: 1 }, where: { type: 'string', enum: ['at_business', 'at_client', 'online'] }, area: { type: 'string' } }, required: ['business_id', 'service_id', 'date'] } },
    { name: 'my_bookings', description: 'Their upcoming WhatsApp bookings, fresh (the context already lists them).', input_schema: { type: 'object', properties: {} } },
    { name: 'add_email', description: 'Add or correct the email on one of their upcoming bookings. The booking is then emailed to them.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, email: { type: 'string' } }, required: ['booking_id', 'email'] } },
    { name: 'propose_booking', description: 'Show the person a booking summary with Yes and No. Only after checking the time with free_times and knowing their name. For a visit at their place: where at_client, area, address and directions.', input_schema: { type: 'object', properties: { business_id: { type: 'string' }, service_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string', description: 'HH:MM' }, name: { type: 'string' }, email: { type: 'string' }, people: { type: 'integer', minimum: 1 }, where: { type: 'string', enum: ['at_business', 'at_client', 'online'], description: 'How it happens: at the business, at their place, or online. Leave out for the usual way.' }, online: { type: 'boolean', description: 'Same as where online' }, area: { type: 'string', description: 'For at_client: one of the business visit_areas' }, address: { type: 'string', description: 'For at_client: street and house number' }, directions: { type: 'string', description: 'For at_client: landmark or directions, optional' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['business_id', 'service_id', 'date', 'time', 'name', 'language'] } },
    { name: 'answer_summary', description: 'They answered the summary waiting (book, move or cancel) in words: yes or no. The system then carries it out and tells them.', input_schema: { type: 'object', properties: { answer: { type: 'string', enum: ['yes', 'no'] } }, required: ['answer'] } },
    { name: 'propose_move', description: 'Show the person a summary to move one of their bookings (from my_bookings) to a new free time, with Yes and No.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['booking_id', 'date', 'time', 'language'] } },
    { name: 'report_problem', description: 'Open a request to Locappoint Support for something that went wrong. A person replies in this chat. Returns the request number.', input_schema: { type: 'object', properties: { about: { type: 'string', enum: ['no_show', 'service', 'payment', 'safety', 'bookings', 'account', 'other'], description: 'no_show: the business did not turn up; service: the visit or service went badly; payment: charges, refunds; safety: anything unsafe or abusive; bookings: a booking problem the tools cannot fix; account; other' }, details: { type: 'string', description: 'What happened, in their own words, complete' }, booking_id: { type: 'string', description: 'The booking it is about, from their bookings or recent visits' } }, required: ['about', 'details'] } },
    { name: 'support_reply', description: 'Add their answer or more details to one of their open requests to Support, by its number.', input_schema: { type: 'object', properties: { number: { type: 'integer', description: 'The request number, e.g. 1041' }, message: { type: 'string' } }, required: ['number', 'message'] } },
    { name: 'propose_cancel', description: 'Show the person a summary to cancel one of their bookings (from my_bookings), with Yes and No.', input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, language: { type: 'string', enum: ['en', 'pt'] } }, required: ['booking_id', 'language'] } },
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const IDS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

class ToolError extends Error {}
const need = (ok: unknown, message: string) => { if (!ok) throw new ToolError(message) }

// The clock of the city the conversation is about: the business in focus, or else the person's
// own number (+234 is Lagos). Portugal and Lagos differ by an hour from late October to March.
const cityNow = (lagos: boolean) => {
    const timeZone = lagos ? 'Africa/Lagos' : 'Europe/Lisbon'
    const now = new Date()
    const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
    const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(now)
    const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    return { date, day, time, place: lagos ? 'Lagos' : 'Portugal' }
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

// The country of a WhatsApp number, for the search log (doc 35): the calling code, longest first.
// Numbers from anywhere else are kept without a country.
const CALLING: Array<[string, string]> = [
    ['234', 'NG'], ['351', 'PT'], ['233', 'GH'], ['254', 'KE'], ['225', 'CI'], ['250', 'RW'], ['256', 'UG'], ['255', 'TZ'],
    ['237', 'CM'], ['221', 'SN'], ['229', 'BJ'], ['228', 'TG'], ['244', 'AO'], ['258', 'MZ'], ['238', 'CV'], ['245', 'GW'],
    ['239', 'ST'], ['353', 'IE'], ['352', 'LU'], ['971', 'AE'], ['966', 'SA'], ['974', 'QA'],
    ['27', 'ZA'], ['20', 'EG'], ['44', 'GB'], ['33', 'FR'], ['34', 'ES'], ['39', 'IT'], ['49', 'DE'], ['31', 'NL'],
    ['32', 'BE'], ['41', 'CH'], ['46', 'SE'], ['47', 'NO'], ['55', 'BR'], ['91', 'IN'], ['86', 'CN'], ['61', 'AU'],
]
export const phoneCountry = (phone: string) => {
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits.startsWith('1')) return 'US'
    return CALLING.find(([code]) => digits.startsWith(code))?.[1] || null
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

    const now = cityNow(t.business ? /lagos/i.test(String(t.business.city || '')) : String(o.phone || '').replace(/\D/g, '').startsWith('234'))
    const mine: any[] = await deps.call('wa_my', { p_phone: o.phone }).catch(() => [])
    const recent: any[] = await deps.call('wa_recent', { p_phone: o.phone }).catch(() => [])
    const tickets: any[] = await deps.call('wa_tickets', { p_phone: o.phone }).catch(() => [])
    const digits = String(o.phone || '').replace(/\D/g, '')
    const nigerian = digits.startsWith('234')
    const portuguese = digits.startsWith('351')
    const visitAt = (b: any) => (b.mode === 'at_client' ? `at their place, ${[b.address, b.city].filter(Boolean).join(', ')}` : b.address)
    const context = [
        `Now in ${now.place}: ${now.day} ${now.date}, ${now.time}.`,
        `Calendar: ${calendar(now.date)}.`,
        nigerian ? 'Their number is Nigerian: they are in Lagos unless they say otherwise.' : portuguese ? 'Their number is Portuguese: they are in Porto or Lisbon unless they say otherwise.' : '',
        o.directory?.length ? `Businesses live on Locappoint now (name, slug, city, what they do):\n${o.directory.map((b) => `- ${b.name} (${b.slug}, ${b.city}): ${b.category}; ${b.services}`).join('\n')}` : 'No businesses are live on Locappoint right now.',
        t.business ? `Business in focus: ${t.business.name} (business_id ${t.business.business_id}, slug ${t.business.slug}, ${t.business.city}).` : 'No business in focus yet.',
        name ? `Their name: ${name}.` : (o.profileName ? `Their WhatsApp name is "${o.profileName}"; confirm their name before booking.` : 'Their name is not known yet.'),
        email ? `Their email: ${email}.` : 'No email given.',
        guessed ? `Their latest message looks ${guessed === 'pt' ? 'Portuguese' : 'English'}.` : '',
        Array.isArray(mine) && mine.length
            ? `Their upcoming WhatsApp bookings, live from the system and newer than anything in the conversation:\n${mine.map((b) => `- booking_id ${b.id}: ${b.service_name}${Number(b.people) > 1 ? ` for ${b.people}` : ''} at ${b.business_name}, ${b.date} ${b.time}${b.staff_name ? `, with ${b.staff_name}` : ''}${visitAt(b) ? `, ${visitAt(b)}` : ''}; ${b.status === 'confirmed' ? 'confirmed' : 'waiting for the business to confirm'}; ${b.payment_status === 'awaiting' ? 'waiting for payment (link sent)' : b.payment_status === 'paid' ? 'paid online' : 'paid at the visit'}`).join('\n')}`
            : 'They have no upcoming WhatsApp bookings.',
        Array.isArray(recent) && recent.length
            ? `Their recent visits (can be reported to Support up to 48 hours after):\n${recent.map((b) => `- booking_id ${b.id}: ${b.service_name} at ${b.business_name}, ${b.date} ${b.time}; ${b.status}`).join('\n')}`
            : '',
        Array.isArray(tickets) && tickets.length
            ? `Their requests to Locappoint Support:\n${tickets.map((x) => `- #${x.number}: ${x.subject}; ${x.status === 'waiting' ? 'Support replied and waits for them' : x.status === 'resolved' ? 'resolved' : 'open, with Support'}${x.last_reply ? `; Support's last reply: "${x.last_reply}"` : ''}`).join('\n')}`
            : '',
        t.history.length ? '' : 'This is the start of the conversation.',
        pending ? `A ${pending.kind} summary is waiting for their Yes or No; a new proposal replaces it.` : '',
    ].filter(Boolean).join('\n')

    // How and where it happens, for free times: a visit at their place carries its area, so travel counts.
    const place = (i: any) => {
        const where = i.where === 'at_client' || i.where === 'online' || i.where === 'at_business' ? i.where : i.online ? 'online' : null
        return where ? { p_mode: where, p_zone: where === 'at_client' ? String(i.area || '').trim() || null : null } : {}
    }

    const tools: Record<string, (input: any) => Promise<unknown>> = {
        find_business: async (i) => deps.call('wa_find', { p_query: String(i.query || '') }),
        business_details: async (i) => {
            need(UUID.test(String(i.business_id)), 'business_id must be an id from find_business or search')
            const r = await deps.call('wa_business', { p_business: i.business_id })
            need(r, 'That business is not taking bookings')
            business = r.business_id
            const services = await Promise.all((r.services || []).map(async (s: any) => {
                const ways: string[] = s.ways || []
                const visits = ways.includes('at_client') && Array.isArray(r.visit_areas) && r.visit_areas.length > 0
                const mode = ways.includes('at_business') ? 'at_business' : ways.includes('online') ? 'online' : visits ? 'at_client' : null
                let pay: string | null = mode ? null : `booked on https://locappoint.com/${r.slug} (visit at their address, by distance)`
                if (mode) {
                    const q = await deps.call('wa_quote', { p_business: r.business_id, p_service: s.service_id, p_mode: mode, p_people: 1 }).catch(() => null)
                    if (q) pay = q.online ? 'online when booking (secure link after Yes)' : 'at the visit'
                }
                const extra = Number(s.extra_person_minutes) || Number(s.minutes)
                return {
                    ...s, price_text: priceText(s.price, r.currency, s.price_per), pay,
                    ...(ways.includes('at_client') ? { travel_fee_text: priceText(s.travel_fee || 0, r.currency) } : {}),
                    ...(Number(s.max_people) > 1 ? { group: `up to ${s.max_people} people in one booking, served one after another by the same person; each extra person adds ${extra} min${s.price_per === 'person' ? ', price per person' : ', one price for the group'}` } : {}),
                }
            }))
            return { ...r, services }
        },
        search: async (i) => {
            const found = await deps.call('wa_search', {
                p_market: i.city, p_query: String(i.what || ''), p_zone: String(i.area || '').trim() || null,
                p_dates: Array.isArray(i.days) ? i.days.filter((d: string) => DATE.test(d)).slice(0, 7) : null,
                p_window: i.part || 'any', p_at: TIME.test(String(i.around || '')) ? i.around : null, p_people: Number(i.people) || 1,
            })
            // Kept for Demand in /admin; never in the way of the answer.
            await Promise.resolve(deps.call('search_note', {
                p_channel: 'whatsapp', p_query: String(i.what || ''), p_market: i.city, p_zone: String(i.area || '').trim() || null,
                p_people: Number(i.people) || 1, p_origin_country: phoneCountry(o.phone),
                p_options: Array.isArray(found?.options) ? found.options.length : 0, p_later: Array.isArray(found?.later) ? found.later.length : 0,
                p_matched: Number(found?.matched) || 0, p_offered: found?.offered == null ? null : Number(found.offered),
            })).catch(() => {})
            return found
        },
        free_times: async (i) => {
            need(UUID.test(String(i.business_id)) && UUID.test(String(i.service_id)) && DATE.test(String(i.date)), 'Give business_id, service_id and date (YYYY-MM-DD)')
            return deps.call('wa_times', { p_business: i.business_id, p_service: i.service_id, p_date: i.date, p_ignore: null, p_people: Number(i.people) || 1, ...place(i) })
        },
        free_days: async (i) => {
            need(UUID.test(String(i.business_id)) && UUID.test(String(i.service_id)), 'Give business_id and service_id from business_details')
            const days = await deps.call('wa_free_days', { p_business: i.business_id, p_service: i.service_id, p_from: DATE.test(String(i.from || '')) ? i.from : null, p_people: Number(i.people) || 1, ...place(i) })
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
            const info = await deps.call('wa_business', { p_business: i.business_id })
            need(info, 'That business is not taking bookings')
            const service = (info.services || []).find((s: any) => s.service_id === i.service_id)
            need(service, 'That service is not offered by this business')
            const ways: string[] = service.ways || []
            const asked = i.where === 'at_client' || i.where === 'online' || i.where === 'at_business' ? i.where : i.online ? 'online' : null
            const mode = asked && ways.includes(asked) ? asked
                : ways.includes('at_business') ? 'at_business' : ways.includes('online') ? 'online' : 'at_client'
            need(!asked || asked === mode, `This service is not offered that way. Ways: ${ways.join(', ')}`)
            // A visit at their place: an area the business goes to, and an address.
            const areas: string[] = Array.isArray(info.visit_areas) ? info.visit_areas : []
            const fold = (x: unknown) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
            const area = mode === 'at_client' ? areas.find((a) => fold(a) === fold(i.area)) || null : null
            const address = mode === 'at_client' ? String(i.address || '').trim().slice(0, 300) : ''
            const directions = mode === 'at_client' ? String(i.directions || '').trim().slice(0, 200) || null : null
            if (mode === 'at_client') {
                need(areas.length, `${info.name} takes visits by distance: book on https://locappoint.com/${info.slug}`)
                need(area, `${String(i.area || 'That area')} is not one of the areas ${info.name} goes to: ${areas.join(', ')}.${ways.includes('at_business') ? ` Offer the same service at ${info.name}'s own place${info.address ? `, ${info.address}` : ''}: check free_times without where.` : ' Offer another business that comes to their area (search with area).'}`)
                need(address.length >= 5, 'Ask for their street address with the house number')
            }
            const times: string[] = await deps.call('wa_times', { p_business: i.business_id, p_service: i.service_id, p_date: i.date, p_ignore: null, p_people: people, p_mode: mode, p_zone: area })
            need(Array.isArray(times) && times.includes(i.time), `${i.time} is not free${mode === 'at_client' ? ` for a visit in ${area} (travel counts)` : ''}. Free times that day: ${(times || []).slice(0, 8).join(', ') || 'none'}`)
            const quote = await deps.call('wa_quote', { p_business: i.business_id, p_service: i.service_id, p_mode: mode, p_people: people })
            const mail = typeof i.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim()) ? i.email.trim().toLowerCase() : null
            lang = langOf(i.language)
            const travel = mode === 'at_client' ? Number(service.travel_fee) || 0 : 0
            const price = quote?.online ? Number(quote.total) : (service.price_per === 'person' ? Number(service.price) * people : Number(service.price)) + travel
            const p: Proposal = {
                kind: 'book', business_name: info.name, service_name: service.name, date: i.date, time: i.time, timezone: info.timezone,
                minutes: (Number(service.minutes) || 0) + (people - 1) * (Number(service.extra_person_minutes) || Number(service.minutes) || 0), people, total: Number.isFinite(price) ? price : null, currency: quote?.currency || info.currency || 'EUR',
                online: Boolean(quote?.online), confirms: Boolean(info.confirms_automatically), cutoff: Number(info.cancel_cutoff_minutes) || 0,
                name: who, email: mail, mode,
                ...(mode === 'at_client' ? { travel, address, area: area!, directions } : {}),
            }
            business = info.business_id
            name = who
            if (mail) email = mail
            const nonce = deps.nonce()
            pending = { ...p, nonce, expires_at: new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString(), args: { business: i.business_id, service: i.service_id, date: i.date, time: i.time, name: who, email: mail, mode, people, ...(mode === 'at_client' ? { address, landmark: directions, zone: area } : {}) } }
            proposed = summary(p, nonce, lang)
            return { ok: true, note: 'The summary with Yes and No has been sent. Stop now and do not repeat it.' }
        },
        report_problem: async (i) => {
            const about = ['no_show', 'service', 'payment', 'safety', 'bookings', 'account', 'other'].includes(i.about) ? i.about : 'other'
            const details = String(i.details || '').trim()
            need(details.length >= 10, 'Ask them what happened, in a sentence or two')
            const booking = UUID.test(String(i.booking_id || '')) ? i.booking_id : null
            const r = await deps.call('wa_report', { p_phone: o.phone, p_category: about, p_message: details.slice(0, 4000), p_appointment: booking, p_name: name, p_email: email })
            return { ok: true, number: r?.number, added: r?.added, note: r?.added ? 'Added to their open request.' : 'Request opened. A person at Locappoint replies in this chat, usually within a working day.' }
        },
        support_reply: async (i) => {
            // The model only ever sees request numbers; the id stays here. A request opened in this
            // same turn is not in the context yet, so the list is read again.
            const number = Number(String(i.number ?? '').replace(/\D/g, ''))
            let ticket = (tickets || []).find((x) => Number(x.number) === number)
            if (!ticket && number) ticket = ((await deps.call('wa_tickets', { p_phone: o.phone }).catch(() => [])) || []).find((x: any) => Number(x.number) === number)
            need(ticket, 'Give the number of one of their open requests in the context')
            const message = String(i.message || '').trim()
            need(message.length >= 2, 'What should be added?')
            const r = await deps.call('wa_support_reply', { p_phone: o.phone, p_ticket: ticket.ticket_id, p_message: message.slice(0, 4000) })
            return { ok: true, number: r?.number, note: 'Added to the request. Support sees it now.' }
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

    // A model that ended without a word: asked again for an answer, without tools, up to twice.
    for (let again = 0; again < 2 && !proposed && !answer && !tidy(reply); again++) {
        const res = await ask(true, again === 0
            ? 'Your last answer was empty. Answer the person now, in words, using what the tools returned.'
            : `Your answer was empty again. Reply to their latest message now, in one to three short lines: "${o.message.slice(0, 300)}"`, 4000)
        count(res)
        reply = words(res)
    }

    // An internal id in the reply (a booking, business, service or request id): asked once more
    // without it; if one is still there, it is cut out. The request number is the only reference.
    if (!proposed && !answer && ID.test(reply)) {
        const res = await ask(true, 'Your answer showed an internal id. Write the same answer again without any id or code. The request number (#1041) is the only reference the person needs.', 2000)
        count(res)
        const again = words(res)
        reply = tidy(again) && !ID.test(again) ? again : reply.replace(IDS, '').replace(/\(\s*\)/g, '')
    }

    // Answered in words: the webhook settles it and records the conversation, exactly as for a tap.
    if (answer) return { replies: [], history: t.history, business, name, email, lang, pending, answer, usage }

    // A second goodbye after the first: nothing to send.
    if (!proposed && /^\(?no reply\)?\.?$/i.test(tidy(reply))) {
        return { replies: [], history: [...t.history, { role: 'user' as const, text: o.message.slice(0, 1000) }], business, name, email, lang, pending, answer: null, usage }
    }

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

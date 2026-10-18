// R1b (doc 36): a sentence into search fields, for when the rules cannot read it all ("something for my
// son on Saturday after football"). The model only fills fields; the engine finds real businesses and
// free times. Its answer is checked here against what is allowed before anything uses it: a day inside
// the next 90 days, a real time, 1 to 10 people, one of the four ways, a short "what". No Deno APIs, so
// tests run it in Node.

declare const Deno: { env: { get(key: string): string | undefined } } | undefined
const env = (key: string) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : (globalThis as any).process?.env?.[key]) || ''

export const MODEL = () => env('SEARCH_AI_MODEL') || env('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001'
// USD per million tokens, for the daily cap. Check against Anthropic's pricing when the model changes.
export const PRICE = () => ({ input: Number(env('ANTHROPIC_PRICE_IN')) || 1, output: Number(env('ANTHROPIC_PRICE_OUT')) || 5 })

export type Context = { timezone: string | null; services: string[]; categories: Array<{ key: string; words: string }> }

const DAY = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const todayIn = (timeZone: string | null, now = new Date()) => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) } catch { return now.toISOString().slice(0, 10) }
}
const addDays = (key: string, n: number) => {
    const d = new Date(`${key}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
}

export const TOOL = {
    name: 'search_fields',
    description: 'The search, read from what the person typed.',
    input_schema: {
        type: 'object',
        properties: {
            understood: { type: 'boolean', description: 'false when this is not a request for a local service or appointment' },
            what: { type: 'string', description: 'The service in a few words. Copy a name from the services list exactly when one fits; otherwise the plain name of the service. Empty when no service is named.' },
            for_kids: { type: 'boolean', description: 'true when it is for a child (son, daughter, kids, crianca, filho)' },
            people: { type: 'integer', minimum: 1, maximum: 10, description: 'How many people are booked together. 1 unless they say more.' },
            day: { type: 'string', description: 'soonest, today, tomorrow, weekend, nextweek, or a date YYYY-MM-DD. soonest when no day is said.' },
            time: { type: 'string', description: 'any, morning, afternoon, evening, HH:MM (around that time) or HH:MM-HH:MM (a range, e.g. 17:00-23:59 for after 5). any when no time is said.' },
            where: { type: 'string', enum: ['any', 'at_business', 'at_client', 'online'], description: 'at_client for home service or come to me; online for video. any when not said.' },
            max_price: { type: ['number', 'null'], description: 'Highest price they will pay, in the local money, or null. "10k" is 10000.' },
            cheapest: { type: 'boolean', description: 'true when they ask for the cheapest or a cheap one' },
            place: { type: ['string', 'null'], description: 'A town, city or area they name for where it should be (Lekki, Abeokuta, Braga), as written. null when none.' },
        },
        required: ['understood', 'what', 'people', 'day', 'time', 'where'],
    },
}

export const buildRequest = (text: string, market: string, ctx: Context, now = new Date()) => {
    const today = todayIn(ctx.timezone, now)
    const week = Array.from({ length: 14 }, (_, i) => {
        const key = addDays(today, i)
        return `${WEEKDAY[new Date(`${key}T12:00:00Z`).getUTCDay()]} ${key}${i === 0 ? ' (today)' : i === 1 ? ' (tomorrow)' : ''}`
    }).join('\n')
    // A country (geo1) or one of our cities, by name.
    const city = ({ ng: 'Nigeria', pt: 'Portugal' } as Record<string, string>)[market] || market.charAt(0).toUpperCase() + market.slice(1)
    const system = `You read searches on Locappoint, where people book local businesses (barbers, salons, nails, beauty, wellness, cleaners, tutors and more) in ${city}. People write in English, Portuguese or Nigerian English. Fill the search_fields tool from what they typed. Never invent a business, a time or a price.

Days (the city's calendar):
${week}
"Next week" is Monday to Sunday after this week; "next week Friday" is the Friday of that week. A weekday alone is the next one, today included.

Services offered in ${city} now:
${ctx.services.slice(0, 300).join('; ') || '(none listed yet)'}

Categories and their words:
${ctx.categories.map((c) => `${c.key}: ${c.words}`).join('\n')}

Rules:
- "what": copy a service name from the list when one fits what they mean, even in another language ("haircut for my son" fits "Kids cut (under 12)" or "Corte júnior"). If none fits, the plain name of the service in their words, a few words at most. Barbing and low cut mean a haircut.
- Leave out greetings, names, reasons and the day, time, people, price and place from "what".
- place: a town, city or area named for where it happens ("at Abeokuta", "in Lekki", "em Braga"). Not their home.
- people: only when they say more than one person is booked.
- Unsure about a field: leave it at its default (soonest, any, 1, any).`
    return {
        model: MODEL(),
        max_tokens: 300,
        system,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'search_fields' },
        messages: [{ role: 'user', content: text.slice(0, 300) }],
    }
}

// The model's answer, checked. Anything not allowed is dropped, never passed on.
export const checkFields = (raw: any, timezone: string | null, now = new Date()) => {
    if (!raw || typeof raw !== 'object') return null
    const today = todayIn(timezone, now)
    const out: Record<string, unknown> = { understood: raw.understood !== false }
    const what = String(raw.what || '').replace(/[<>{}\[\]\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (what) out.what = what
    if (raw.for_kids === true) out.kids = true
    const people = Math.round(Number(raw.people))
    if (people >= 2 && people <= 10) out.people = String(people)
    const day = String(raw.day || '').trim().toLowerCase()
    if (['today', 'tomorrow', 'weekend', 'nextweek'].includes(day)) out.when = day
    else if (DAY.test(day) && day >= today && day <= addDays(today, 90)) out.when = day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : `d:${day}`
    const time = String(raw.time || '').trim().toLowerCase()
    if (['morning', 'afternoon', 'evening'].includes(time)) out.time = time
    else if (HHMM.test(time)) out.time = `at:${time}`
    else if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(time)) {
        const [a, b] = time.split('-')
        if (HHMM.test(a) && HHMM.test(b) && a < b) out.time = `r:${a}-${b}`
    }
    if (['at_business', 'at_client', 'online'].includes(raw.where)) out.mode = raw.where
    const price = Number(raw.max_price)
    if (raw.max_price !== null && raw.max_price !== undefined && price > 0 && price < 10_000_000) out.max_price = price
    if (raw.cheapest === true) out.cheapest = true
    const place = String(raw.place || '').replace(/[^\p{L}\p{N} '.-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (place && !/^(home|my place|online|null|none)$/i.test(place)) out.place = place
    return out
}

export const fieldsFrom = (response: any) => (response?.content || []).find((b: any) => b.type === 'tool_use' && b.name === 'search_fields')?.input || null

export const costOf = (usage: any) => {
    if (typeof usage?.cost_usd === 'number') return usage.cost_usd
    const p = PRICE()
    return ((Number(usage?.input_tokens) || 0) * p.input + (Number(usage?.output_tokens) || 0) * p.output) / 1e6
}

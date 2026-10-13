// The WhatsApp agent against 25 simulated people. Each conversation runs the real agent code
// (supabase/functions/_shared/agent.ts) with the real model, against a frozen copy of the business data
// (fixtures.mjs), so nothing touches Supabase or WhatsApp. A second model plays the person; a third
// reviews each conversation. Writes tests/agent-eval/out/report.md.
//
//   $env:ANTHROPIC_API_KEY = Read-Host "Anthropic key"
//   npm run eval:agent                                  all 25
//   npm run eval:agent -- --only pidgin                 the personas whose id contains "pidgin"
//   npm run eval:agent -- --model claude-sonnet-5-5     another model for the agent
//   npm run eval:agent -- --parallel 1                  one at a time (slower, kinder to rate limits)
//
// The key stays in that PowerShell window: never in a file, never in the repo.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { PERSONAS } from './personas.mjs'
import { addDays, dayName, lisbonNow, makeFixtures } from './fixtures.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const fns = path.join(root, 'supabase', 'functions', '_shared')

// ---------- options ----------
const argv = process.argv.slice(2)
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback }
const MODEL = opt('model', process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5')
const SIM_MODEL = opt('sim-model', 'claude-haiku-5-5')
const JUDGE_MODEL = opt('judge-model', 'claude-sonnet-5-5')
const PARALLEL = Math.max(1, Number(opt('parallel', 2)) || 2)
const MAX_TURNS = Math.max(2, Number(opt('max-turns', 10)) || 10)
const ONLY = opt('only', '')
const KEY = process.env.ANTHROPIC_API_KEY || ''

if (!KEY) {
    console.log('\n  ANTHROPIC_API_KEY is not set in this window. First run:\n')
    console.log('    $env:ANTHROPIC_API_KEY = Read-Host "Anthropic key"\n')
    process.exit(1)
}
const personas = PERSONAS.filter((p) => !ONLY || p.id.includes(ONLY))
if (!personas.length) { console.log(`  No persona id contains "${ONLY}".`); process.exit(1) }

// The agent reads these through _shared/llm.ts, exactly as the Edge Function does.
process.env.AGENT_PROVIDER = 'anthropic'
process.env.ANTHROPIC_MODEL = MODEL

// USD per million tokens, input and output. Unknown models show tokens only.
const PRICES = { 'claude-haiku-5-5': [0.10, 0.50], 'claude-haiku-4-5-20251001': [1, 5], 'claude-haiku-4-5': [1, 5] }
const spend = {}
const addUse = (model, input, output) => { const s = (spend[model] ||= { input: 0, output: 0 }); s.input += input || 0; s.output += output || 0 }

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- the simulated person and the judge, straight to Anthropic ----------
const anthropic = async (body) => {
    for (let attempt = 0; ; attempt++) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok) {
            addUse(body.model, json.usage?.input_tokens, json.usage?.output_tokens)
            return json
        }
        if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 5) {
            await wait(Math.min(60, Number(res.headers.get('retry-after')) || 10 * (attempt + 1)) * 1000)
            continue
        }
        throw Object.assign(new Error(`Anthropic ${res.status}: ${json?.error?.message || 'no message'}`), { status: res.status })
    }
}
const textOf = (json) => (json?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()

// ---------- load the real agent ----------
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
const agent = await server.ssrLoadModule(path.join(fns, 'agent.ts'))
const llm = await server.ssrLoadModule(path.join(fns, 'llm.ts'))
const C = await server.ssrLoadModule(path.join(fns, 'wa-client.ts'))

const nonce = () => Math.random().toString(16).slice(2, 14).padEnd(12, '0')
const buttonsOf = (out) => (out?.message?.interactive?.action?.buttons || []).map((b) => ({ id: b.reply?.id, title: b.reply?.title }))

// ---------- one conversation, the way whatsapp/index.ts runs it ----------
const play = async (p) => {
    const phone = p.phone || '351900000999'
    const fx = makeFixtures({ phone })
    const now = lisbonNow()
    const x = { fx, today: now.date, tomorrow: addDays(now.date, 1), log: [], agentText: '', problems: [] }
    if (p.seed) x.seeded = p.seed(fx, x)

    let thread = { business: null, name: null, email: null, lang: null, history: [], pending: null }
    const save = (t) => {
        const history = (t.history || []).slice(-16)
        thread = {
            business: t.business ? (fx.businesses.find((b) => b.id === t.business) ? { business_id: t.business, ...(({ name, slug, city }) => ({ name, slug, city }))(fx.businesses.find((b) => b.id === t.business)) } : thread.business) : thread.business,
            name: (t.name && String(t.name).trim()) || thread.name,
            email: t.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(t.email).trim()) ? String(t.email).trim().toLowerCase() : thread.email,
            lang: ['en', 'pt'].includes(t.lang) ? t.lang : thread.lang,
            history, pending: t.pending ?? null,
        }
    }
    const problem = (err) => (['22023', 'P0001', '23P01'].includes(err?.code) && err?.message ? { text: String(err.message), message: {} }
        : err?.code === '42501' ? { text: 'That booking is not yours to change.', message: {} }
            : err?.code === 'P0002' ? { text: 'That booking is no longer there.', message: {} } : { text: 'That did not work. Try again in a minute.', message: {} })

    // A Yes or No to the summary waiting: the change runs from what was proposed, never from the model.
    const settle = async (verb, code, label) => {
        const lang = C.langOf(thread.lang)
        const pend = thread.pending
        if (!pend || pend.nonce !== code) return [C.expired(lang)]
        const done = (out, note = '') => {
            save({ ...thread, business: null, history: [...thread.history, { role: 'user', text: label }, { role: 'assistant', text: [note, out.map((o) => o.text).join('\n')].filter(Boolean).join('\n') }], pending: null, lang })
            return out
        }
        const said = (v, what) => `[Locappoint] ${what}: ${v.service_name} at ${v.business_name}, ${v.date} ${v.time}, booking_id ${v.id}, ${v.status}${v.payment_status === 'awaiting' ? ', waiting for payment' : ''}. The details were sent in this chat.`
        if (verb === 'no') return done([C.dropped(lang)], '[Locappoint] They said no to the summary. Nothing was booked or changed.')
        const a = pend.args
        try {
            if (pend.kind === 'book') {
                const v = await fx.call('wa_book', { p_phone: phone, p_business: a.business, p_service: a.service, p_date: a.date, p_time: a.time, p_name: a.name, p_email: a.email || null, p_mode: a.mode, p_people: a.people || 1, ...(a.mode === 'at_client' ? { p_address: a.address || null, p_landmark: a.landmark || null, p_zone: a.zone || null } : {}) })
                // Paid online: the payment link. Otherwise the booking news the queue sends a moment later.
                const out = v.payment_status === 'awaiting'
                    ? [C.payLink(v, 'https://checkout.stripe.com/c/pay/cs_test_eval', 35, lang)]
                    : [C.clientNews(v.status === 'confirmed' ? 'booking_confirmed' : 'booking_requested', { ...v, lang }, true)].filter(Boolean)
                return done(out, said(v, v.status === 'pending' ? 'Request sent' : 'Booked'))
            }
            if (pend.kind === 'move') {
                const v = await fx.call('wa_move', { p_phone: phone, p_appointment: a.booking, p_date: a.date, p_time: a.time })
                return done([C.moved(v, lang)], said(v, 'Moved'))
            }
            const v = await fx.call('wa_cancel', { p_phone: phone, p_appointment: a.booking })
            return done([C.cancelled(v, lang)], said(v, 'Cancelled'))
        } catch (err) {
            const out = problem(err)
            return done([out], `[Locappoint] That did not go through: ${out.text}`)
        }
    }

    // Paying on the Stripe page: the webhook marks it paid and the booking news follows, as live.
    const pay = () => {
        const a = fx.bookings.find((b) => b.payment_status === 'awaiting')
        if (!a) return [{ text: '(nothing to pay)', message: {} }]
        a.payment_status = 'paid'
        const v = fx.view(a)
        const out = [C.clientNews(a.status === 'confirmed' ? 'booking_confirmed' : 'booking_requested', { ...v, lang: C.langOf(thread.lang) }, true)].filter(Boolean)
        // As notify does through wa_thread_note: the conversation learns what was sent.
        for (const o of out) save({ ...thread, business: null, history: [...thread.history, { role: 'assistant', text: `[Locappoint] Sent to them: ${o.text}` }] })
        return out
    }

    let lastButtons = []
    // What the system did on the agent's word, shown to the reviewer (the agent's tool results are not).
    const call = async (fn, args) => {
        const r = await fx.call(fn, args)
        if (fn === 'wa_set_email') x.log.push({ who: 'system', text: `The system saved ${r.email} on the booking and emailed the booking there.` })
        if (fn === 'wa_report') x.log.push({ who: 'system', text: r.added ? `The system added this to Support request #${r.number}.` : `The system opened Support request #${r.number} (${args.p_category}): "${args.p_message}".` })
        if (fn === 'wa_support_reply') x.log.push({ who: 'system', text: `The system added their words to Support request #${r.number}.` })
        return r
    }
    const respond = async (said) => {
        if (/\[pay\]/i.test(said)) return pay()
        // A tap is its own event on WhatsApp: any words around it are dropped.
        const tap = said.match(/\[tap\]\s*([^\n\[]+)/i)
        if (tap) {
            const b = lastButtons.find((x) => x.title.toLowerCase() === tap[1].trim().toLowerCase())
            if (b && /^(yes|no):/.test(b.id)) return settle(b.id.split(':')[0], b.id.split(':')[1], b.title)
            said = tap[1].trim()
        }
        const typed = thread.pending ? agent.typedAnswer(said) : null
        if (typed) return settle(typed, thread.pending.nonce, said)
        for (let attempt = 0; ; attempt++) {
            try {
                const turn = await agent.runAgent({ call, claude: llm.callModel, nonce }, {
                    phone, profileName: p.profileName || '', message: said, thread, directory: await fx.call('wa_directory', {}),
                })
                addUse(MODEL, turn.usage.input, turn.usage.output)
                // A yes or no in words to the summary waiting: settled as a tap, as whatsapp/index.ts does.
                if (turn.answer && thread.pending) { thread = { ...thread, lang: turn.lang }; return settle(turn.answer, thread.pending.nonce, said) }
                save({ history: turn.history, business: turn.business, name: turn.name, email: turn.email, pending: turn.pending, lang: turn.lang })
                return turn.replies
            } catch (err) {
                if (err instanceof llm.BusyError && attempt < 3) { await wait(20_000); continue }
                x.problems.push(`agent error: ${err?.message || err}`)
                return [C.pausedAgent(null, C.langOf(thread.lang))]
            }
        }
    }

    const sim = [{ role: 'user', content: '(You open WhatsApp and start a chat with Locappoint.)' }]
    const system = [
        'You are role-playing a real person writing on WhatsApp to Locappoint, an automated assistant that books local businesses in Porto and Lagos, with Lisbon next.',
        `Who you are: ${p.who}`,
        `What you want: ${p.goal}`,
        `How you write: ${p.style}`,
        `If asked your name: ${p.name}. ${p.email ? `If asked for an email: ${p.email}.` : 'You prefer not to give an email.'}`,
        `Today is ${dayName(x.today)} ${x.today}.`,
        'Rules:',
        '- Write only your next WhatsApp message. Stay in character, in your own language and style, the whole time.',
        p.words
            ? '- Messages with buttons show them as [Buttons: A | B]. You never tap buttons: you always answer in your own words, for example "yes, book it" in your own style.'
            : '- Messages with buttons show them as [Buttons: A | B]. To tap one, write only this and nothing else: [tap] A',
        '- When you get a payment link and want to pay, write only this and nothing else: [pay]',
        '- When the assistant offers something that fits what you want, accept it. If you are asked to confirm, confirm.',
        '- When what you want is done (booked, cancelled, moved, or you got your answer), or it is clearly impossible and you were told so, write only this and nothing else: [done]',
        '- Never say you are role-playing or testing.',
    ].join('\n')

    let said = typeof p.opening === 'function' ? p.opening(x) : p.opening
    for (let turn = 0; turn < MAX_TURNS; turn++) {
        x.log.push({ who: 'client', text: said })
        sim.push({ role: 'assistant', content: said })
        const outs = await respond(said)
        const shown = []
        for (const o of outs) {
            const buttons = buttonsOf(o)
            if (buttons.length) lastButtons = buttons
            x.log.push({ who: 'agent', text: o.text, buttons })
            shown.push(buttons.length ? `${o.text}\n[Buttons: ${buttons.map((b) => b.title).join(' | ')}]` : o.text)
        }
        sim.push({ role: 'user', content: shown.join('\n\n') || '(no reply)' })
        const next = textOf(await anthropic({ model: SIM_MODEL, max_tokens: 1500, system, messages: sim })).replace(/^["']|["']$/g, '').trim()
        if (!next || /\[done\]/i.test(next)) break
        said = next
    }
    if (x.log.at(-1)?.who === 'client') x.log.pop()
    x.agentText = x.log.filter((m) => m.who === 'agent').map((m) => m.text).join('\n')
    return x
}

// ---------- checks every reply must pass ----------
const NAMES = makeFixtures({ phone: '0' }).businesses.flatMap((b) => [b.name, b.slug, b.address, b.staff, ...b.services.map((s) => s.name)]).filter(Boolean).sort((a, b) => b.length - a.length)
const plain = (t) => NAMES.reduce((s, n) => s.split(n).join(' '), String(t).replace(/https?:\/\/\S+/g, ' '))
const LANG = { en: 'English', pt: 'Portuguese' }

const general = (p, x) => {
    const out = []
    let lastClient = ''
    for (const m of x.log) {
        if (m.who === 'client') { lastClient = m.text; continue }
        if (m.who !== 'agent') continue
        const t = m.text
        const first = t.split('\n')[0].slice(0, 60)
        if (/[\u2014\u2013]/.test(t)) out.push(`long dash in "${first}"`)
        if (/\*\*/.test(t)) out.push(`double-asterisk bold in "${first}"`)
        if (/^#{1,6}\s/m.test(t)) out.push(`a heading in "${first}"`)
        if (/\p{Extended_Pictographic}/u.test(t)) out.push(`an emoji in "${first}"`)
        if (t.length > 1000) out.push(`a reply of ${t.length} characters`)
        if (/€\s?0(?:[.,]00)?(?![\d.,])/.test(t)) out.push(`"€0" instead of free in "${first}"`)
        if (/\b20\d\d-\d\d-\d\d\b/.test(plain(t))) out.push(`a date written as YYYY-MM-DD in "${first}"`)
        if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t)) out.push(`an internal id in "${first}"`)
        if (/I cannot chat right now|consigo responder aqui|Lots of messages right now|did not get that|não percebi/i.test(t)) out.push(`a fallback reply: "${first}"`)
        const want = p.lang && p.lang !== 'follow' ? p.lang : agent.guessLang(lastClient)
        const got = agent.guessLang(plain(t))
        if (want && got && got !== want) out.push(`answered in ${LANG[got]} to ${LANG[want]}: "${first}"`)
    }
    const lastAgent = [...x.log].reverse().find((m) => m.who === 'agent')
    x.lastAgentLang = lastAgent ? agent.guessLang(plain(lastAgent.text)) : null
    return [...new Set(out)]
}

// ---------- the review ----------
let judgeModel = JUDGE_MODEL
const judge = async (p, x, found) => {
    const transcript = x.log.map((m) => `${m.who === 'client' ? 'CLIENT' : m.who === 'system' ? 'SYSTEM ACTION (not shown to the client)' : 'LOCAPPOINT'}: ${m.text}${m.buttons?.length ? `\n[Buttons: ${m.buttons.map((b) => b.title).join(' | ')}]` : ''}`).join('\n\n')
    const prompt = [
        "You review one WhatsApp conversation between a client and Locappoint's booking assistant, an AI agent. Messages that start with a bold title such as *Book this?*, *Request sent* or *You are booked* are built by the system from the database, not written by the agent.",
        `Today in Portugal is ${dayName(x.today)} ${x.today}.`,
        `The client: ${p.who}\nWhat they wanted: ${p.goal}`,
        `Everything the agent could know about the businesses (it must not state anything else as fact):\n${JSON.stringify(x.fx.facts(), null, 1)}`,
        'Also true, beyond the data: Locappoint can be reached at hello@locappoint.com; every business has a page at https://locappoint.com/<slug>; the agent can save an email on a booking, after which the system emails the booking there; the agent sees the client\'s upcoming bookings with their status, staff and payment. It can book visits at the client\'s place in the chat when the business lists the client\'s area (travel fee added; a business without areas is booked on its page). It can open a request to Locappoint Support (a person replies in the chat, usually within a working day) and add to it; it must not promise refunds or outcomes. A Nigerian number (+234) is taken to be in Lagos, a Portuguese one (+351) in Porto or Lisbon. It cannot pass messages to businesses and does not know which payment methods a business accepts. Locappoint is live in Porto, Lagos and Lisbon. Every booking confirmation email has a Change or cancel link that works without signing in; bookings made on the website are not visible to the agent.',
        `Automatic checks already found: ${found.length ? found.join('; ') : 'nothing'}`,
        `Transcript:\n${transcript}`,
        'Judge the assistant only, on: understood the person, including slang, typos and vague dates; reached their goal, or said honestly why not and offered the closest alternative; stated no fact that is not in the data above; answered in the language of the person (European Portuguese for Portuguese speakers; English for English and Pidgin); warm, short WhatsApp style; asked only what it needed and did not repeat questions; never said something was booked, moved or cancelled before the client tapped Yes; stayed polite and stayed in its role.',
        'Reply with JSON only, no other text: {"score": 1 to 5, "verdict": "pass" or "fail", "problems": ["short sentence", ...], "good": ["short sentence", ...]}. Fail only for problems a real client would notice.',
    ].join('\n\n')
    const using = judgeModel
    try {
        for (let tries = 0; ; tries++) {
            const res = await anthropic({ model: using, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
            const raw = textOf(res)
            try {
                return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
            } catch (err) {
                if (tries >= 1) throw new Error(`the review did not return JSON (${res?.stop_reason || 'no reason'})`)
            }
        }
    } catch (err) {
        if (err.status === 404 && using !== MODEL) {
            if (judgeModel === using) console.log(`  (review model ${using} is not available, ${MODEL} reviews instead)`)
            judgeModel = MODEL
            return judge(p, x, found)
        }
        return { score: null, verdict: 'not judged', problems: [`review failed: ${err.message}`], good: [] }
    }
}

// ---------- run ----------
console.log(`\n  WhatsApp agent: ${personas.length} conversations, agent ${MODEL}, client ${SIM_MODEL}, review ${JUDGE_MODEL}, ${PARALLEL} at a time\n`)
const started = Date.now()
const results = []
const queue = [...personas]
const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
        let r
        try {
            const x = await play(p)
            const checks = [...x.problems, ...general(p, x), ...p.expect(x)]
            const review = await judge(p, x, checks)
            const pass = !checks.length && review.verdict !== 'fail'
            r = { p, x, checks, review, pass }
            console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${p.id.padEnd(22)} ${String(x.log.filter((m) => m.who === 'client').length).padStart(2)} messages${review.score ? `, review ${review.score}/5` : ''}${pass ? '' : `: ${[...checks, ...(review.verdict === 'fail' ? review.problems : [])][0] || ''}`}`)
        } catch (err) {
            r = { p, x: null, checks: [`the run broke: ${err.message}`], review: { verdict: 'not judged', problems: [], good: [] }, pass: false }
            console.log(`  FAIL ${p.id.padEnd(22)} the run broke: ${err.message}`)
        }
        results.push(r)
    }
}
await Promise.all(Array.from({ length: Math.min(PARALLEL, personas.length) }, worker))
await server.close()
results.sort((a, b) => personas.indexOf(a.p) - personas.indexOf(b.p))

// ---------- report ----------
const passed = results.filter((r) => r.pass).length
const minutes = ((Date.now() - started) / 60_000).toFixed(1)
const costLine = Object.entries(spend).map(([m, s]) => {
    const pr = PRICES[m]
    return `${m}: ${s.input.toLocaleString('en-GB')} in, ${s.output.toLocaleString('en-GB')} out${pr ? `, about USD ${((s.input * pr[0] + s.output * pr[1]) / 1e6).toFixed(3)}` : ''}`
}).join('; ')
const md = [
    `# WhatsApp agent evaluation, ${dayName(lisbonNow().date)} ${lisbonNow().date} ${lisbonNow().time}`,
    '',
    `**${passed} of ${results.length} passed.** Agent ${MODEL}, client played by ${SIM_MODEL}, reviewed by ${judgeModel}. ${minutes} minutes.`,
    '',
    `Tokens: ${costLine}. Agent input counts exclude cached tokens.`,
    '',
    '| | Persona | Messages | Review | First problem |',
    '|---|---|---|---|---|',
    ...results.map((r) => `| ${r.pass ? 'ok' : 'FAIL'} | ${r.p.id}: ${r.p.title} | ${r.x ? r.x.log.filter((m) => m.who === 'client').length : 0} | ${r.review.score ? `${r.review.score}/5` : r.review.verdict} | ${(r.checks[0] || (r.review.verdict === 'fail' ? r.review.problems[0] : '') || '').replace(/\|/g, '/')} |`),
    '',
    ...results.flatMap((r) => [
        `## ${r.pass ? 'ok' : 'FAIL'}: ${r.p.id}`,
        '',
        `${r.p.title}. Wanted: ${r.p.goal}`,
        '',
        ...(r.checks.length ? ['**Checks failed**', '', ...r.checks.map((c) => `- ${c}`), ''] : []),
        ...(r.review.problems?.length ? [`**Review (${r.review.verdict}${r.review.score ? `, ${r.review.score}/5` : ''})**`, '', ...r.review.problems.map((c) => `- ${c}`), ''] : []),
        ...(r.review.good?.length ? ['**Went well**', '', ...r.review.good.map((c) => `- ${c}`), ''] : []),
        ...(r.x ? ['**Conversation**', '', ...r.x.log.map((m) => m.who === 'system' ? `_System: ${m.text}_\n` : `${m.who === 'client' ? '> **Client:** ' : '**Locappoint:** '}${m.text.replace(/\n/g, m.who === 'client' ? '\n> ' : '  \n')}${m.buttons?.length ? `  \n[${m.buttons.map((b) => b.title).join('] [')}]` : ''}\n`)] : []),
        `Bookings at the end: ${r.x ? (r.x.fx.bookings.map((a) => `${a.date} ${a.time} ${a.status}${a.email ? ` ${a.email}` : ''}${a.seeded ? ' (made before)' : ''}`).join('; ') || 'none') : 'none'}`,
        '',
    ]),
].join('\n')
const out = path.join(here, 'out')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'report.md'), md)
console.log(`\n  ${passed} of ${results.length} passed in ${minutes} min. ${costLine}`)
console.log(`  Report: ${path.join(out, 'report.md')}\n`)
process.exit(passed === results.length ? 0 : 1)

// WhatsApp for owners and staff: what the messages say, the templates Meta approves, the webhook
// signature and parsing, linking a phone from Settings, the switch per business, and the badge's
// phone check once WhatsApp is live.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, server, root }) => {
    const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
    const fns = path.join(root, 'supabase', 'functions')
    const wa = await server.ssrLoadModule(path.join(fns, '_shared', 'wa.ts'))
    const words = await server.ssrLoadModule(path.join(fns, '_shared', 'wa-words.ts'))
    const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', 'whatsapp.sql'), 'utf8')
    const hook = fs.readFileSync(path.join(fns, 'whatsapp', 'index.ts'), 'utf8')
    const notify = fs.readFileSync(path.join(fns, 'notify', 'index.ts'), 'utf8')
    const clean = (s) => !/[\u2014\u2013]/.test(s) && !/undefined|null|NaN|\[object/.test(s)

    // The news the database queues has words, and only those
    const kinds = (sql.match(/NEW\.kind NOT IN \(([^)]+)\)/) || [])[1]?.match(/'([a-z_]+)'/g)?.map((k) => k.slice(1, -1)) || []
    check(kinds.length === 4, `four kinds go to WhatsApp: ${kinds.join(', ')}`)
    const day = (offset) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date(Date.now() + offset * 86_400_000))
    const view = (extra = {}) => ({ id: '11111111-2222-3333-4444-555555555555', status: 'pending', date: day(1), time: '10:30', minutes: 30, client_name: 'Rui Costa', service_name: 'Haircut and beard', mode: 'at_business', staff_name: 'Rita', business_name: 'Femtos Barbearia', timezone: 'Europe/Lisbon', trip: null, ...extra })
    for (const kind of kinds) {
        for (const inWindow of [true, false]) {
            const out = words.news(kind, view(), inWindow)
            const shown = out ? JSON.stringify(out.message) + out.text : ''
            check(Boolean(out) && clean(shown), `${kind} ${inWindow ? 'inside' : 'outside'} the window reads cleanly: ${out?.text}`)
        }
        const t = words.news(kind, view(), false)
        check(t?.message.type === 'template' && Object.prototype.hasOwnProperty.call(words.TEMPLATES, t.message.template.name), `${kind} outside the window uses an approved template: ${t?.message.template?.name}`)
    }
    const req = words.news('booking_request', view(), true)
    check(req.message.interactive.action.buttons.map((b) => b.reply.id).join() === 'acc:11111111-2222-3333-4444-555555555555,dec:11111111-2222-3333-4444-555555555555', 'a request comes with Accept and Decline')
    check(/Rui Costa asked for Haircut and beard, tomorrow at 10:30/.test(req.text), `it says who, what and when: ${req.text}`)
    const tReq = words.news('booking_request', view(), false).message.template
    check(tReq.components.filter((c) => c.type === 'button').map((c) => c.parameters[0].payload).join() === 'acc:11111111-2222-3333-4444-555555555555,dec:11111111-2222-3333-4444-555555555555', 'the template answers the same way')
    check(tReq.components[0].parameters.map((p) => p.text).join('|') === 'Femtos Barbearia|Rui Costa|Haircut and beard|tomorrow at 10:30', 'template values in order: business, client, service, when')
    check(words.news('booking_request', view({ client_name: 'A\nB' }), false).message.template.components[0].parameters[1].text === 'A B', 'no new lines inside a template value (Meta refuses them)')

    // The templates themselves, as Meta wants them
    for (const [name, t] of Object.entries(words.TEMPLATES)) {
        const vars = t.body.match(/\{\{\d\}\}/g) || []
        check(/^lc_[a-z_]+$/.test(name) && vars.length === t.sample.length && !/^\{\{|\}\}$/.test(t.body.trim()) && t.body.length <= 1024 && t.buttons.every((b) => b.length <= 25) && clean(t.body), `${name} is a valid utility template`)
    }

    // The day, and the buttons that follow it
    const list = [view({ time: '09:00', status: 'confirmed' }), view({ id: '22222222-2222-3333-4444-555555555555', time: '11:00' }), view({ id: '33333333-2222-3333-4444-555555555555', time: '14:00', status: 'confirmed', mode: 'at_client', zone: 'Bonfim' })]
    const msgs = words.today(list, 'Today, Tuesday 7 October')
    check(msgs.length === 3 && /3 bookings/.test(msgs[0].text) && /11:00 \*Rui Costa\*.*needs your OK/.test(msgs[0].text), `today lists the day and marks what waits: ${msgs[0].text.replace(/\n/g, ' / ')}`)
    check(msgs[1].message.interactive.action.buttons[0].reply.id.startsWith('acc:22222222') && msgs[2].message.interactive.action.buttons[0].reply.id === 'way:33333333-2222-3333-4444-555555555555', 'then Accept for the request and On my way for the home visit')
    check(/Nothing booked today/.test(words.today([], 'Today').map((m) => m.text).join()), 'an empty day says so')
    const pick = words.pickMinutes('33333333-2222-3333-4444-555555555555').message.interactive
    check(pick.type === 'list' && pick.action.sections[0].rows.map((r) => r.id.split(':')[2]).join() === words.MINUTES.join() && words.MINUTES.join() === '10,15,20,30,45', 'On my way offers the minutes the database accepts')
    check(!JSON.stringify(pick).includes('Rui'), 'the minutes prompt names nobody before the booking is checked')
    const ids = [...req.message.interactive.action.buttons.map((b) => b.reply.id), 'way:33333333-2222-3333-4444-555555555555', pick.action.sections[0].rows[0].id, 'arr:33333333-2222-3333-4444-555555555555']
    check(ids.every((id) => words.readReply(id)) && /W\.readReply\(m\.reply\)/.test(hook), 'every button the messages send is one the webhook understands')
    check(words.readReply('min:33333333-2222-3333-4444-555555555555:15')?.minutes === 15 && words.readReply('acc:not-an-id') === null && words.readReply('drop table') === null, 'and nothing else gets through')
    const long = words.news('booking_new', view({ client_name: 'X'.repeat(2000) }), true)
    check(long.message.interactive.body.text.length <= 1024, 'long names are cut to what Meta accepts')

    // The webhook: Meta's signature, and what arrived
    const secret = 'test-secret'
    const raw = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: {
        contacts: [{ wa_id: '351912345678', profile: { name: 'Rita' } }],
        messages: [
            { from: '351912345678', id: 'wamid.A', type: 'text', text: { body: ' today ' } },
            { from: '351912345678', id: 'wamid.B', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'acc:11111111-2222-3333-4444-555555555555', title: 'Accept' } } },
            { from: '351912345678', id: 'wamid.C', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'min:11111111-2222-3333-4444-555555555555:15', title: 'About 15 min' } } },
            { from: '351912345678', id: 'wamid.D', type: 'button', button: { payload: 'day', text: 'Today' } },
        ],
        statuses: [{ id: 'wamid.X', status: 'failed', recipient_id: '351900000000', errors: [{ code: 131026, title: 'Message undeliverable' }] }],
    } }] }] })
    const sig = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`
    check(await wa.signed(raw, sig, secret), 'a message Meta signed is accepted')
    check(!(await wa.signed(raw.replace('today', 'hoje'), sig, secret)) && !(await wa.signed(raw, null, secret)) && !(await wa.signed(raw, sig, 'other')), 'a changed, unsigned or wrongly signed message is refused')
    const got = wa.inbound(JSON.parse(raw))
    check(got.length === 4 && got[0].text === 'today' && got[0].name === 'Rita', 'a text arrives with the sender name')
    check(got[1].reply.startsWith('acc:') && got[2].reply.endsWith(':15') && got[3].reply === 'day', 'buttons, list picks and template buttons all arrive as replies')
    check(wa.failures(JSON.parse(raw))[0]?.error.startsWith('131026'), 'failed deliveries are noticed')
    check(hook.indexOf('signed(raw') > 0 && hook.indexOf('signed(raw') < hook.indexOf('JSON.parse(raw)'), 'the webhook checks the signature before reading anything')
    check(/if \(!\(await log\(m\.from, 'in', [^\n]+, m\.id\)\)\) continue/.test(hook) && /wa_messages_in_once/.test(sql), 'a message Meta delivers twice is answered once')
    check(/OUTSIDE_WINDOW/.test(notify) && /NO_TEMPLATE/.test(notify) && /'whatsapp'/.test(notify), 'notify sends WhatsApp, falls back to the template, and does not retry a template Meta has not approved')
    check(!/(EAA[A-Za-z0-9]{20,})/.test(hook + notify), 'no token in the code')

    // Settings: link the phone
    const open = async (extra = '', vw = 1272, vh = 900) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal/settings')}${extra}`, { waitUntil: 'networkidle0' })
        await page.waitForFunction(() => document.querySelector('.lc-wa'), { timeout: 5000 }).catch(() => {})
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel)
    const click = (p, sel, label) => p.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); el?.click(); return Boolean(el) }, sel, label)
    const calls = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n), name)

    let p = await open('', 390, 844)
    check(!/Soon/.test(await text(p, '#alerts-title + *, .biz-st__card:has(#alerts-title)')), 'WhatsApp is no longer marked Soon')
    check(/Link WhatsApp/.test(await text(p, '.lc-wa')) && /in testing/.test(await text(p, '.lc-wa')), 'not linked: one button, and it says WhatsApp is in testing')
    await click(p, '.lc-wa .ui-btn', 'Link WhatsApp'); await wait(400)
    check((await calls(p, 'wa_link_start')).length === 1 && /LOC-482913/.test(await text(p, '.lc-wa-code')) && /\+1 555 646 1337/.test(await text(p, '.lc-wa-code')), 'the code and the number to send it to')
    check((await p.evaluate(() => document.querySelector('.lc-wa a.ui-btn')?.getAttribute('href'))) === 'https://wa.me/15556461337?text=LOC-482913', 'Open WhatsApp opens the chat with the code typed')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the code fits a phone')
    await p.evaluate(() => window.__waLink())
    await p.waitForFunction(() => /ending in/.test(document.querySelector('.lc-wa')?.textContent || ''), { timeout: 8000 }).catch(() => {})
    check(/ending in 678/.test(await text(p, '.lc-wa')), 'it notices the message on its own and shows the link')
    check(p.errors.length === 0, `settings errors ${p.errors}`)
    await p.close()

    // Linked: switch bookings on, then unlink
    p = await open('&wa=code')
    check(/Waiting for your message/.test(await text(p, '.lc-wa')), 'a code already out shows on return')
    await p.close()
    p = await open('&wa=linked')
    check((await p.evaluate(() => document.querySelector('.lc-wa .ui-switch')?.getAttribute('aria-checked'))) === 'true', 'linked: the business switch shows on')
    await p.evaluate(() => document.querySelector('.lc-wa .ui-switch').click()); await wait(400)
    check((await calls(p, 'wa_set_alerts')).some((c) => c[2].p_member === 'm1' && c[2].p_on === false), 'switching off saves for that business')
    await click(p, '.lc-wa .ui-btn', 'Unlink'); await wait(400)
    check((await calls(p, 'wa_unlink')).length === 1 && /Link WhatsApp/.test(await text(p, '.lc-wa')), 'unlink goes back to the start')
    await p.close()
    p = await open('&wa=stopped')
    check(/wrote STOP/.test(await text(p, '.lc-wa')) && (await p.evaluate(() => document.querySelector('.lc-wa .ui-switch')?.disabled)), 'after STOP it says how to turn it back on, and the switch waits')
    await p.close()

    // The blue badge asks for WhatsApp once it is live
    p = await browser.newPage()
    await p.setViewport({ width: 1272, height: 900 })
    await p.goto(`${url}/?path=${encodeURIComponent('/portal/insights')}&walive=1`, { waitUntil: 'networkidle0' })
    await p.waitForFunction(() => document.querySelector('.lc-rel-checks'), { timeout: 5000 }).catch(() => {})
    check(/WhatsApp linked in Settings/.test(await text(p, '.lc-rel-checks')), 'live: the phone check says WhatsApp')
    await p.close()
    p = await browser.newPage()
    await p.goto(`${url}/?path=${encodeURIComponent('/portal/insights')}`, { waitUntil: 'networkidle0' })
    await p.waitForFunction(() => document.querySelector('.lc-rel-checks'), { timeout: 5000 }).catch(() => {})
    check(/Phone number on your page/.test(await text(p, '.lc-rel-checks')), 'before live: a phone on the page')
    await p.close()

    // ---------- 3b: the agent for clients ----------
    const client = await server.ssrLoadModule(path.join(fns, '_shared', 'wa-client.ts'))
    const agent = await server.ssrLoadModule(path.join(fns, '_shared', 'agent.ts'))
    const agentSql = fs.readFileSync(path.join(root, 'supabase', 'migrations', 'agent.sql'), 'utf8')

    // Client booking news: every kind the database queues has words, in both languages, and a template when needed.
    const clientKinds = (agentSql.match(/p_kind NOT IN \(([^)]+)\)/) || [])[1]?.match(/'([a-z_]+)'/g)?.map((k) => k.slice(1, -1)) || []
    check(clientKinds.length === 6, `six kinds of client news on WhatsApp: ${clientKinds.join(', ')}`)
    const cb = { business_name: 'Femtos Barbearia', service_name: 'Haircut', date: day(1), time: '10:30', timezone: 'Europe/Lisbon', address: 'Rua da Rosa 12', city: 'Lisbon', manage_token: 'tok123', payment_status: 'paid', total: 20.49, currency: 'EUR', staff_name: 'Rui' }
    for (const kind of clientKinds) {
        for (const lang of ['en', 'pt']) {
            const out = client.clientNews(kind, { ...cb, lang }, true)
            check(Boolean(out) && clean(out.text), `${kind} in ${lang} reads cleanly: ${out?.text.replace(/\n/g, ' / ')}`)
        }
        const later = client.clientNews(kind, cb, false)
        check(kind === 'booking_requested' ? later === null : later?.message.type === 'template' && Object.prototype.hasOwnProperty.call(client.CLIENT_TEMPLATES, later.message.template.name), `${kind} after 24 hours: ${later ? later.message.template.name : 'not sent (they just wrote)'}`)
    }
    check(/amanhã às 10:30/.test(client.clientNews('booking_confirmed', { ...cb, lang: 'pt' }, true).text) && /tomorrow at 10:30/.test(client.clientNews('booking_confirmed', cb, true).text), 'when, in their language')
    check(/locappoint\.com\/b\/tok123/.test(client.clientNews('booking_confirmed', cb, true).text) && /Paid: .*20\.49/.test(client.clientNews('booking_confirmed', cb, true).text), 'confirmed: the manage link and what was paid')
    for (const [name, t] of Object.entries(client.CLIENT_TEMPLATES)) {
        const vars = t.body.match(/\{\{\d\}\}/g) || []
        check(/^lc_client_[a-z]+$/.test(name) && vars.length === t.sample.length && !/^\{\{|\}\}$/.test(t.body.trim()) && clean(t.body), `${name} is a valid utility template`)
    }

    // The summary is built from database values, with Yes and No.
    const prop = { kind: 'book', business_name: 'Femtos Barbearia', service_name: 'Haircut', date: day(1), time: '10:30', timezone: 'Europe/Lisbon', minutes: 30, people: 1, total: 20.49, currency: 'EUR', online: true, confirms: false, cutoff: 1440, name: 'Ana Silva', email: null, mode: 'at_business' }
    const sum = client.summary(prop, 'abcdef012345', 'en')
    check(sum.message.interactive.action.buttons.map((b) => b.reply.id).join() === 'yes:abcdef012345,no:abcdef012345', 'a summary answers with Yes or No')
    check(/paid now online/.test(sum.text) && /confirms the request/.test(sum.text) && /up to 1 day before/.test(sum.text), `it says how it is paid, who confirms and the cut-off: ${sum.text.replace(/\n/g, ' / ')}`)
    check(words.readReply('yes:abcdef012345')?.nonce === 'abcdef012345' && words.readReply('pay:11111111-2222-3333-4444-555555555555')?.verb === 'pay' && words.readReply('yes:zz') === null, 'Yes, No and Pay again are understood, nothing else')
    check(agent.typedAnswer('Sim') === 'yes' && agent.typedAnswer('não') === 'no' && agent.typedAnswer('yes but tomorrow instead please') === null, 'typed yes and no, in both languages')
    const pay = client.payLink({ ...cb, payment_status: 'awaiting' }, 'https://checkout.stripe.com/c/pay/cs_test_1', 35, 'en')
    check(/held for 35 min/.test(pay.text) && /https:\/\/checkout\.stripe\.com/.test(pay.text), 'the payment link says how long the time is held')

    // The agent loop, with a model that makes things up: tools refuse, and only a proposal waits for a yes.
    const BIZ = '11111111-1111-1111-1111-111111111111', SVC = '22222222-2222-2222-2222-222222222222'
    const fakeCall = async (fn, args) => {
        if (fn === 'wa_times') return ['10:00', '10:30', '11:00']
        if (fn === 'wa_business') return { business_id: BIZ, name: 'Femtos Barbearia', slug: 'femtos-barbearia', timezone: 'Europe/Lisbon', currency: 'EUR', confirms_automatically: true, cancel_cutoff_minutes: 120, services: [{ service_id: SVC, name: 'Haircut', minutes: 30, price: 18, price_per: 'booking', ways: ['at_business'] }] }
        if (fn === 'wa_quote') return { online: false }
        if (fn === 'wa_my') return []
        return null
    }
    const script = (steps) => { let n = 0; const f = async (body) => { f.seen.push(body); return steps[n++] }; f.seen = []; return f }
    const use = (name, input) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `t${name}`, name, input }], usage: { input_tokens: 800, output_tokens: 40 } })
    const thread = { business: { business_id: BIZ, name: 'Femtos Barbearia', slug: 'femtos-barbearia', city: 'Lisbon' }, name: null, email: null, lang: null, history: [], pending: null }
    let model = script([use('propose_booking', { business_id: BIZ, service_id: SVC, date: day(1), time: '03:00', name: 'Ana', language: 'en' }), { stop_reason: 'end_turn', content: [{ type: 'text', text: '03:00 is not free. 10:30?' }], usage: {} }])
    let turn = await agent.runAgent({ call: fakeCall, claude: model, nonce: () => 'abcdef012345' }, { phone: '351911222333', profileName: 'Ana', message: 'Book 3am', thread })
    check(!turn.pending && model.seen[1].messages.at(-1).content[0].is_error, 'an invented time is refused, nothing waits')
    model = script([use('propose_booking', { business_id: BIZ, service_id: SVC, date: day(1), time: '10:30', name: 'Ana Silva', language: 'pt' }), { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Booked!' }], usage: {} }])
    turn = await agent.runAgent({ call: fakeCall, claude: model, nonce: () => 'abcdef012345' }, { phone: '351911222333', profileName: 'Ana', message: '10:30', thread })
    check(turn.pending?.args.time === '10:30' && turn.replies.length === 1 && /Confirma esta marcação/.test(turn.replies[0].text) && !/Booked!/.test(turn.replies.map((r) => r.text).join()), 'a real time: the Portuguese summary from the database, never the model saying "booked"')
    check(model.seen.length === 1 && model.seen[0].system[0].cache_control, 'one model call, with the rules cached')

    // OpenRouter: the same conversation in OpenAI's format and back.
    const llm = await server.ssrLoadModule(path.join(fns, '_shared', 'llm.ts'))
    const orReq = llm.toOpenAI({ system: [{ text: 'Rules' }, { text: 'Context' }], max_tokens: 700, tools: [{ name: 'free_times', description: 'd', input_schema: { type: 'object' } }],
        messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'c1', name: 'free_times', input: { date: '2026-10-10' } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'c1', content: '["10:00"]' }] }] })
    check(orReq.messages[0].role === 'system' && /Rules/.test(orReq.messages[0].content) && orReq.tools[0].function.name === 'free_times' && orReq.messages[2].tool_calls[0].function.arguments === '{"date":"2026-10-10"}' && orReq.messages[3].role === 'tool', 'OpenRouter requests carry the rules, the tools and the tool results')
    const orBack = llm.fromOpenAI({ choices: [{ message: { content: null, tool_calls: [{ id: 'c2', function: { name: 'my_bookings', arguments: '{}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0.001 } })
    check(orBack.stop_reason === 'tool_use' && orBack.content[0].name === 'my_bookings' && orBack.usage.cost_usd === 0.001, 'and OpenRouter answers come back as tool calls with their cost')
    const groqReq = llm.toOpenAI({ system: [], max_tokens: 10, tools: [], messages: [{ role: 'user', content: 'hi' }] }, 'groq')
    check(!('usage' in groqReq) && groqReq.model, 'Groq requests carry no OpenRouter-only fields and always name a model')

    // Round 2: the live businesses reach the model, and Markdown bold becomes WhatsApp bold.
    let seenBody
    const mdModel = async (b) => { seenBody = b; return { stop_reason: 'end_turn', content: [{ type: 'text', text: '## Hi\nFound **Femtos Barbearia**.' }], usage: {} } }
    const mdTurn = await agent.runAgent({ call: fakeCall, claude: mdModel, nonce: () => 'abcdef012345' }, { phone: '351911222333', profileName: '', message: 'a fade', thread: { ...thread, business: null },
        directory: [{ name: 'Femtos Barbearia', slug: 'femtos-barbearia', city: 'Lisbon', category: 'barbershop', services: 'Haircut, Fade' }] })
    check(/Femtos Barbearia \(femtos-barbearia, Lisbon\): barbershop; Haircut, Fade/.test(seenBody.system[1].text), 'the model is told which businesses are live and what they offer')
    check(mdTurn.replies[0].text === 'Hi\nFound *Femtos Barbearia*.', `WhatsApp bold and no headings: ${JSON.stringify(mdTurn.replies[0].text)}`)
    check(/before you have looked/.test(seenBody.system[0].text), 'the rules forbid refusing a booking before looking')

    // Business page: Book on WhatsApp only once WhatsApp is live.
    p = await browser.newPage()
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await p.goto(`${url}/?path=${encodeURIComponent('/femtos-barbearia')}&guest=1&nobiz=1`, { waitUntil: 'networkidle0' })
    await wait(800)
    check(!(await p.$('.lc-pub__wabook')), 'no Book on WhatsApp before WhatsApp is live')
    await p.close()
    p = await browser.newPage()
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await p.goto(`${url}/?path=${encodeURIComponent('/femtos-barbearia')}&guest=1&nobiz=1&wabook=1`, { waitUntil: 'networkidle0' })
    await p.waitForFunction(() => document.querySelector('.lc-pub__wabook'), { timeout: 5000 }).catch(() => {})
    const href = await p.evaluate(() => document.querySelector('.lc-pub__wabook a')?.getAttribute('href') || '')
    check(/^https:\/\/wa\.me\/15556461337\?text=Book%20at%20/.test(href) && /\(femtos-barbearia\)$/.test(decodeURIComponent(href)), `live: Book on WhatsApp names the business: ${decodeURIComponent(href)}`)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page still fits a phone')
    await p.close()

    // Admin: every conversation, opened in place.
    p = await browser.newPage()
    await p.setViewport({ width: 1272, height: 900 })
    p.errors = []
    p.on('pageerror', (e) => p.errors.push(e.message))
    await p.goto(`${url}/?path=${encodeURIComponent('/admin-view/whatsapp')}&guest=1`, { waitUntil: 'networkidle0' })
    await p.waitForFunction(() => document.querySelector('.adm-wa__head'), { timeout: 5000 }).catch(() => {})
    check((await p.evaluate(() => document.querySelectorAll('.adm-wa').length)) === 2, 'admin lists the conversations')
    await p.evaluate(() => document.querySelector('.adm-wa__head').click()); await wait(500)
    check((await p.evaluate(() => document.querySelectorAll('.adm-wa-thread .adm-sup-msg').length)) === 4 && /Femtos Barbearia/.test(await text(p, '.adm-wa-bookings')), 'and opens one with its messages and bookings')
    check(p.errors.length === 0, `no admin errors ${p.errors.join(' | ')}`)
    await p.close()

}

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
}

// Support: the inbox for businesses and clients, Help pointing to it, a paused business, and the
// admin queue with its actions. The database rules are tested in supabase/queries/support-desk-verify.sql.

export default async ({ browser, url, check }) => {
    const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 900, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(600)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel)
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const click = (p, sel, label) => p.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); el?.click(); return Boolean(el) }, sel, label)
    const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

    // Support has its own row in the sidebar, under a line, with replies not yet read
    let p = await open('/portal')
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-sidebar .biz-navgroup--support a[href="/portal/support"]'))), 'Support is in the sidebar on its own')
    await p.close()

    // Bookings: every booking as a list, tap one to open the same sheet as the calendar
    p = await open('/portal/bookings')
    check(/Jameson/.test(await text(p, '.biz-bkl__days')) && /Rui/.test(await text(p, '.biz-bkl__days')), 'upcoming bookings are listed')
    check(/Today/.test(await text(p, '.biz-bkl__date')), 'grouped under the day')
    await click(p, '.ui-seg button', 'To confirm'); await wait(500)
    check(!/Jameson/.test(await text(p, '.biz-bkl__days')) && /Rui/.test(await text(p, '.biz-bkl__days')), 'To confirm shows only the ones waiting')
    await click(p, '.biz-bkl-row', '15:00'); await wait(500)
    check(/Rui/.test(await text(p, '.ui-sheet')), 'a row opens the booking sheet')
    check(p.errors.length === 0, `bookings errors ${p.errors}`)
    await p.close()
    p = await open('/portal/bookings', 390, 844)
    check(await fits(p), 'bookings fit a phone')
    await p.close()

    // Business: its own Support page, separate from Help
    p = await open('/portal/support')
    check((await rpcs(p, 'my_tickets')).some((a) => a.p_side === 'business' && a.p_business), 'the business inbox asks for the business tickets')
    check(/Clients cannot see Saturday/.test(await text(p, '.lc-sup__rows')) && /Resolved/.test(await text(p, '.lc-sup__rows')), 'tickets list with their status')
    check(/We are (online|away)/.test(await text(p, '.lc-sup-desk__title')) && (await p.evaluate(() => document.querySelectorAll('.lc-sup-start').length)) === 3, 'the desk says if we are in, with three ways to start')
    check(await click(p, '.lc-sup-row', 'Clients cannot see Saturday'), 'a ticket opens')
    await wait()
    check(/Locappoint support/.test(await text(p, '.lc-sup-msgs')), 'our reply shows as Locappoint support')
    await p.type('.lc-sup-reply textarea', 'Thanks, all good now')
    await click(p, '.lc-sup-reply .ui-btn', 'Send'); await wait()
    check((await rpcs(p, 'reply_ticket')).some((a) => a.p_id === 'st2' && a.p_body === 'Thanks, all good now'), 'a reply goes to that ticket')
    await click(p, '.lc-sup-start', 'Something else'); await wait()
    await click(p, '.ui-sheet .ui-chip', 'My business page')
    await p.type('.ui-sheet input', 'Photos do not upload')
    await p.type('.ui-sheet textarea', 'The cover photo fails every time I try.')
    await click(p, '.ui-sheet .ui-btn', 'Send'); await wait()
    check((await rpcs(p, 'open_ticket')).some((a) => a.p_side === 'business' && a.p_category === 'business_page' && a.p_subject === 'Photos do not upload' && a.p_appointment === null), 'a new ticket from the business')
    check(p.errors.length === 0, `support page errors ${p.errors}`)
    await p.close()

    p = await open('/portal/support', 1272, 900, '&paused=1')
    check(/paused by Locappoint/.test(await text(p, '.lc-sup-paused')) && /Two reports/.test(await text(p, '.lc-sup-paused')), 'a paused business sees why')
    await p.close()

    p = await open('/portal/support', 390, 844, '&notickets=1')
    check(/No tickets yet/.test(await text(p, '.lc-sup-empty')), 'empty inbox explains itself')
    check(await p.evaluate(() => !document.querySelector('.lc-sup__pane')), 'no empty conversation pane when there are no tickets')
    check(await fits(p), 'support fits a phone')
    await p.close()

    p = await open('/portal/help')
    check(/1 reply from us|open ticket|Write to us/.test(await text(p, '.lc-help__inbox')), `Help shows the Support inbox: ${await text(p, '.lc-help__inbox')}`)
    await p.close()

    // Client: the same inbox, client side, opening on ?t=
    p = await open('/client/support?t=st1', 390, 844)
    check((await rpcs(p, 'my_ticket')).some((a) => a.p_id === 'st1'), 'a link with ?t opens that ticket')
    check(/Waiting on you/.test(await text(p, '.lc-sup-thread__state')) && /Haircut, Femtos Barbearia/.test(await text(p, '.lc-sup-thread__booking')), 'the ticket shows its status and booking')
    await click(p, '.lc-sup-reply .ui-btn', 'This is sorted'); await wait()
    check((await rpcs(p, 'close_ticket')).some((a) => a.p_id === 'st1'), 'the client can close it')
    check(await fits(p), 'client ticket fits a phone')
    check(p.errors.length === 0, `client support errors ${p.errors}`)
    await p.close()

    // Admin: money and safety first, then the full picture and actions
    p = await open('/admin-view/support', 1272, 900, '&guest=1')
    const first = await p.evaluate(() => document.querySelector('.adm-sup-table tbody tr')?.textContent || '')
    check(/#1042/.test(first) && /Money or safety/.test(first), `payment first in the queue: ${first.slice(0, 80)}`)
    check(await click(p, '.adm-sup-table .adm-link', '#1042'), 'a ticket opens from the queue')
    await wait(500)
    check(/Stripe shows one capture/.test(await text(p, '.adm-sup-msgs')), 'staff notes show to staff')
    check(/€18\.49/.test(await text(p, '.adm-sup__side')), 'the money is shown to the cent')
    await click(p, '.adm-sup-actions .btn', 'Refund'); await wait()
    check(await p.evaluate(() => document.querySelector('.adm-sup-form input[type=number]')?.value) === '18.49', 'refund starts from what is left')
    await p.evaluate(() => { const i = document.querySelector('.adm-sup-form input[type=number]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '5'); i.dispatchEvent(new Event('input', { bubbles: true })) })
    await click(p, '.adm-sup-form button', 'Send refund'); await wait()
    check((await rpcs(p, 'admin_refund')).some((a) => a.p_ticket === 'st1' && a.p_amount === 5), 'refund asks the server for that amount')
    await click(p, '.adm-sup-reply .adm-chip', 'Note'); await p.type('.adm-sup-reply textarea', 'Refunded 5 as goodwill'); await click(p, '.adm-sup-reply .btn', 'Save note'); await wait()
    check((await rpcs(p, 'admin_reply')).some((a) => a.p_note === true && a.p_status === null), 'a note keeps the status')
    check(p.errors.length === 0, `admin support errors ${p.errors}`)
    await p.close()
}

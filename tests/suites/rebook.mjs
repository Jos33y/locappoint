// One-tap rebooking: client Home, past bookings, the bell item and the manage link from an email.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(500)
        return page
    }
    const rpc = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent?.trim() || '', sel)
    const clickText = (p, sel, label) => p.evaluate((s, l) => {
        const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim() === l)
        el?.click()
        return Boolean(el)
    }, sel, label)

    let p = await open('/client')
    const cards = await p.evaluate(() => [...document.querySelectorAll('.lc-again')].map((el) => ({
        name: el.querySelector('.lc-again__id strong')?.textContent,
        due: el.querySelector('.lc-again__due')?.textContent || '',
        what: el.querySelector('.lc-again__what')?.textContent,
        visits: el.querySelectorAll('.lc-again__visit').length,
        dueDot: Boolean(el.querySelector('.lc-again__due-dot')),
        label: el.querySelector('.lc-again__line')?.getAttribute('aria-label') || '',
        action: el.querySelector('.lc-again__foot .ui-btn:last-child, .lc-again__foot .btn:last-child')?.textContent?.trim(),
    })))
    check(cards.length === 2, `two places to book again: ${cards.length}`)
    check(cards[0]?.name === 'Femtos Barbearia' && /^Due /.test(cards[0]?.due), `soonest due first, with when: ${JSON.stringify(cards[0])}`)
    check(cards[0]?.what === 'Haircut with Rita', `same service and person as last time: ${cards[0]?.what}`)
    check(cards[0]?.visits === 3 && cards[0]?.dueDot && /Next due/.test(cards[0]?.label), 'rhythm line shows the visits and the next due date')
    check(cards[1]?.visits === 0 && cards[1]?.action === 'See services', `a place whose service is gone sends you to its page: ${JSON.stringify(cards[1])}`)
    check(p.errors.length === 0, `no page errors on Home: ${p.errors.join(' | ')}`)

    await clickText(p, '.lc-again .ui-btn, .lc-again .btn', 'Book again')
    await wait(900)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again'))), 'Book again opens the time picker straight away')
    check(/with Rita/.test(await text(p, '.lc-bk-again__line')), 'the sheet says it is the same as last time')
    check(/every 4 weeks/.test(await text(p, '.lc-bk-again__rhythm')), `the sheet explains the suggested day: ${await text(p, '.lc-bk-again__rhythm')}`)
    check(await p.evaluate(() => {
        const usual = document.querySelector('.lc-bk-day.is-usual')
        return Boolean(usual) && usual.getAttribute('aria-pressed') === 'true' && usual.querySelector('.lc-bk-day__sub')?.textContent === 'Usual'
    }), 'the usual day is picked and marked')
    let slotCalls = await rpc(p, 'get_available_slots')
    check(slotCalls.length > 0 && slotCalls.every((a) => a.p_staff_id === 'm2' && a.p_service_id === 's1'), `free times are Rita's: ${JSON.stringify(slotCalls.at(-1))}`)
    check(await text(p, '.lc-bk-slot') === '14:00', `first free time is Rita's: ${await text(p, '.lc-bk-slot')}`)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-bk-slot')].every((b) => /:(00|30)$/.test(b.textContent))), 'times stay on the half hour')
    await clickText(p, '.ui-seg__btn', 'Anyone free')
    await wait(600)
    slotCalls = await rpc(p, 'get_available_slots')
    check(slotCalls.at(-1)?.p_staff_id === null && await text(p, '.lc-bk-slot') === '09:00', 'Anyone free widens the times')
    const sheetFits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    check(sheetFits, 'rebook sheet fits a phone')
    check(p.errors.length === 0, `no page errors in the sheet: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client', 390, 844, '&noplaces=1')
    check(await p.evaluate(() => !document.querySelector('.lc-again')), 'no Book again section before a first visit')
    await p.close()

    p = await open('/client/appointments')
    await clickText(p, '.ui-seg__btn', 'Past 4')
    await wait(300)
    const rows = await p.evaluate(() => [...document.querySelectorAll('.lc-cl-past')].map((el) => ({
        id: el.id,
        action: el.querySelector('.lc-cl-past__again')?.textContent?.trim() || '',
        tag: el.querySelector('.lc-cl-past__again')?.tagName,
    })))
    check(rows.length === 4, `four past bookings: ${rows.length}`)
    check(rows.filter((r) => r.action === 'Book again' && r.tag === 'BUTTON').length === 3, `past rows book again in place: ${JSON.stringify(rows)}`)
    check(rows.some((r) => r.action === 'See services' && r.tag === 'A'), 'a service that is gone links to the page instead')
    await p.evaluate(() => document.querySelector('#booking-c2 .lc-cl-past__again')?.click())
    await wait(800)
    check(await text(p, '.lc-bk-service__name') === 'Beard trim', 'a past row books its own service')
    check(!/with/.test(await text(p, '.lc-bk-again__line')), 'and does not force last visit\'s person onto a different service')
    check((await rpc(p, 'get_available_slots')).at(-1)?.p_staff_id === null, 'so any free person is shown')
    check(p.errors.length === 0, `no page errors on bookings: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client/appointments?again=c3')
    await wait(600)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again'))), 'the bell item opens Book again for that visit')
    await p.close()

    p = await open('/client/notifications')
    const item = await p.evaluate(() => {
        const el = [...document.querySelectorAll('.lc-ibx__item')].find((e) => e.querySelector('.lc-ibx__label')?.textContent === 'Book again')
        return el && { href: el.getAttribute('href'), title: el.querySelector('.lc-ibx__title')?.textContent }
    })
    check(item?.href === '/client/appointments?again=c3' && item?.title === 'Haircut', `follow-up bell item: ${JSON.stringify(item)}`)
    await p.close()

    p = await open('/b/tok-1234567890abcdef1234567890abcdef', 390, 844, '&guest=1')
    check(/Book your next visit/.test(await text(p, '.lc-again-mb')), 'manage link for a past visit offers Book again')
    check(/every 4 weeks/.test(await text(p, '.lc-again-mb')), 'with the rhythm')
    await clickText(p, '.lc-again-mb .ui-btn, .lc-again-mb .btn', 'Book again')
    await wait(900)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again'))), 'manage link opens the sheet')
    await p.evaluate(() => document.querySelector('.lc-bk-slot')?.click())
    await clickText(p, '.ui-btn, .btn', 'Continue')
    await wait(400)
    const prefilled = await p.evaluate(() => [...document.querySelectorAll('.lc-bk-details input')].map((i) => i.value))
    check(prefilled.includes('Ana Guest') && prefilled.includes('ana@guest.pt'), `guest details are filled in: ${JSON.stringify(prefilled)}`)
    await clickText(p, '.ui-btn, .btn', 'Confirm booking')
    await wait(700)
    const booked = (await rpc(p, 'book_appointment')).at(-1)
    check(booked?.p_staff_id === 'm2' && booked?.p_service_id === 's1' && booked?.p_client_email === 'ana@guest.pt' && /911111111/.test(booked?.p_client_phone || ''), `books the same service with the same person: ${JSON.stringify(booked)}`)
    check(p.errors.length === 0, `no page errors on the manage page: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/b/tok-1234567890abcdef1234567890abcdef?again=1', 390, 844, '&guest=1')
    await wait(500)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again'))), 'the email button opens Book again directly')
    await p.close()

    p = await open('/b/tok-1234567890abcdef1234567890abcdef?stop=1', 390, 844, '&guest=1')
    check(await text(p, '.lc-again-stop__title') === 'Stop follow-up emails?', 'stop link asks first')
    await clickText(p, '.lc-again-stop .ui-btn, .lc-again-stop .btn', 'Stop them')
    await wait(500)
    check((await rpc(p, 'stop_emails_by_link')).length === 1 && /^Done\./.test(await text(p, '.lc-again-stop')), 'one tap stops them and says so')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/client', w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            clipped: [...document.querySelectorAll('.lc-again')].some((el) => el.scrollWidth > el.clientWidth + 1),
            touch: [...document.querySelectorAll('.lc-again .ui-btn, .lc-again .btn')].every((el) => el.getBoundingClientRect().height >= 36),
        }))
        check(!r.overflow && !r.clipped, `Book again cards fit at ${w}px`)
        check(r.touch, `Book again buttons are tappable at ${w}px`)
        await p.close()
    }
}

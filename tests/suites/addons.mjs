// Extras: offered from Services, added in the booking sheet as one booking, shown whole on the calendar.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.trim() || '', sel)
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)

    // Services: the switch and the tag
    let p = await open('/portal/services', 1272, 900, '&extras=1')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-svc__item')].some((li) => /Beard trim/.test(li.textContent) && /Extra/.test(li.textContent))), 'an extra is tagged on the price board')
    await p.evaluate(() => [...document.querySelectorAll('.biz-svc__open')].find((b) => /Beard trim/.test(b.textContent))?.click())
    await wait(400)
    check(await p.evaluate(() => [...document.querySelectorAll('.ui-switchrow')].some((r) => /Offer as an extra/.test(r.textContent) && r.querySelector('[role=switch]')?.getAttribute('aria-checked') === 'true')), 'the service editor offers the extra switch')
    await p.close()

    // Booking with an extra
    p = await open('/femtos-barbearia', 390, 844, '&extras=1&guest=1&nobiz=1')
    await p.evaluate(() => [...document.querySelectorAll('.lc-pub__svc')].find((b) => /Haircut/.test(b.textContent))?.click())
    await wait(900)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-bk-extras .ui-chip')].some((c) => /\+ Beard trim/.test(c.textContent))), 'the extra is offered with the cut')
    await p.evaluate(() => document.querySelector('.lc-bk-extras .ui-chip').click())
    await wait(900)
    check(await text(p, '.lc-bk-service__name') === 'Haircut + Beard trim', `one booking names both: ${await text(p, '.lc-bk-service__name')}`)
    check(/50 min/.test(await text(p, '.lc-bk-service__meta')), `times add up: ${await text(p, '.lc-bk-service__meta')}`)
    check(/30/.test(await text(p, '.lc-bk-service__price')), `prices add up: ${await text(p, '.lc-bk-service__price')}`)
    const slots = await rpcs(p, 'get_available_slots')
    check(JSON.stringify(slots.at(-1)?.p_addon_ids) === '["s2"]', `free times ask for the whole booking: ${JSON.stringify(slots.at(-1))}`)
    await p.close()

    p = await open('/femtos-barbearia', 390, 844, '&extras=1&guest=1&nobiz=1')
    await p.evaluate(() => [...document.querySelectorAll('.lc-pub__svc')].find((b) => /Beard trim/.test(b.textContent))?.click())
    await wait(900)
    check(await p.evaluate(() => !document.querySelector('.lc-bk-extras')), 'an extra booked on its own is not offered to itself')
    await p.close()

    p = await open('/femtos-barbearia', 390, 844, '&extras=1&guest=1&nobiz=1')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-pub__svc')].some((b) => /Beard trim/.test(b.textContent) && /Can be added to any service/.test(b.textContent))), 'the menu says which services can be added')
    check(await p.evaluate(() => ![...document.querySelectorAll('.lc-pub__svc')].some((b) => /Haircut/.test(b.textContent) && /Can be added/.test(b.textContent))), 'and only those')
    await p.close()

    // Book again offers the extras too
    p = await open('/client', 390, 844, '&extras=1')
    await p.evaluate(() => [...document.querySelectorAll('.lc-again .ui-btn, .lc-again .btn')].find((b) => /Book again/.test(b.textContent))?.click())
    await wait(1200)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again')) && [...document.querySelectorAll('.lc-bk-extras .ui-chip')].some((c) => /\+ Beard trim/.test(c.textContent))), 'Book again offers the extras')
    await p.close()

    // The calendar shows the whole booking
    p = await open('/portal/calendar', 390, 844, '&extras=1')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-agenda__what')].some((e) => /Haircut \+ Beard trim/.test(e.textContent))), 'the calendar shows the extra with the service')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client/profile', 390, 844)
    check(await p.evaluate(() => /two hours before/.test(document.body.textContent)), 'client settings name the 2-hour reminder')
    await p.close()

    for (const w of [320, 390]) {
        p = await open('/femtos-barbearia', w, 740, '&extras=1&guest=1&nobiz=1')
        await p.evaluate(() => [...document.querySelectorAll('.lc-pub__svc')].find((b) => /Haircut/.test(b.textContent))?.click())
        await wait(800)
        check(await p.evaluate(() => { const s = document.querySelector('.ui-sheet, [role="dialog"]'); return !s || s.scrollWidth <= s.clientWidth + 1 }), `the booking sheet with extras fits at ${w}px`)
        await p.close()
    }
}

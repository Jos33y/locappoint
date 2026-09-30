// Time: several breaks, time between bookings, closed dates, the month view and blocking time from the calendar.

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
    const clickText = (p, sel, re) => p.evaluate((s, src) => { const el = [...document.querySelectorAll(s)].find((b) => new RegExp(src).test(b.textContent.trim())); el?.click(); return Boolean(el) }, sel, re)
    const calls = (p, kind, table) => p.evaluate((k, t) => window.__calls.filter((c) => c[0] === k && c[1] === t).map((c) => c[2]), kind, table)
    const setInput = (p, sel, index, value) => p.evaluate((s, i, v) => { const el = document.querySelectorAll(s)[i]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, sel, index, value)

    // Several breaks
    let p = await open('/portal/hours', 1272, 900, '&lunch=1&blocks=1')
    check(await p.evaluate(() => document.querySelectorAll('.biz-sched__brk').length === 1 && /Lunch/.test(document.querySelector('.biz-sched__brk').textContent)), 'a midday break reads as lunch')
    check(await clickText(p, '.biz-sched .ui-btn', '^Add another break'), 'another break can be added')
    await wait(300)
    check(await p.evaluate(() => document.querySelectorAll('.biz-sched__brk').length === 2), 'two breaks on the same days')
    check(await p.evaluate(() => document.querySelectorAll('.biz-sched__brk')[1].textContent.startsWith('Break')), 'a short afternoon break reads as a break')
    check(await p.evaluate(() => document.querySelectorAll('.biz-wk__bar').length === 18), 'the week draws both breaks as gaps')
    check(await p.evaluate(() => /lunch 13:00 to 14:00, break 16:00 to 16:15/.test(document.querySelector('.biz-sched > p.ui-visually-hidden').textContent)), 'the summary names each break')
    await p.evaluate(() => document.querySelectorAll('.biz-sched__brk .biz-sched__brkx')[1].click())
    await wait(300)
    check(await p.evaluate(() => document.querySelectorAll('.biz-sched__brk').length === 1), 'a break can be removed')

    // Time between bookings
    await clickText(p, '.lc-hx [role="radio"], .lc-hx button', '^15$')
    await wait(400)
    const bufferSaves = await calls(p, 'update', 'businesses')
    check(bufferSaves.some((v) => v.buffer_minutes === 15), `time between bookings saves: ${JSON.stringify(bufferSaves)}`)

    // Closed dates
    check(await p.evaluate(() => /Holiday/.test(document.querySelector('.lc-hx__list')?.textContent || '')), 'closed dates coming up are listed')
    await clickText(p, '.lc-hx .ui-btn', '^Add$')
    await wait(500)
    const future = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })
    await setInput(p, '.lc-blk input[type="date"]', 0, future)
    await setInput(p, '.lc-blk input[type="date"]', 1, future)
    await wait(300)
    await clickText(p, '.lc-blk .ui-btn', '^Close these days')
    await wait(600)
    const closed = await calls(p, 'insert', 'time_blocks')
    check(closed.some((v) => v.starts_at === `${future}T00:00:00` && !v.staff_id), `closing a day blocks the whole day for everyone: ${JSON.stringify(closed)}`)
    await p.evaluate(() => document.querySelector('.lc-hx__x')?.click())
    await wait(500)
    check((await p.evaluate(() => window.__calls.filter((c) => c[0] === 'delete' && c[1] === 'time_blocks').length)) > 0, 'a closed date can be opened again')
    check(p.errors.length === 0, `no page errors on Hours: ${p.errors.join(' | ')}`)
    await p.close()

    // Month view
    p = await open('/portal/calendar', 1272, 900, '&blocks=1')
    await clickText(p, '.biz-seg__btn', '^Month$')
    await wait(800)
    const cells = await p.evaluate(() => document.querySelectorAll('.lc-month__day').length)
    check(cells === 35 || cells === 42, `the month is whole weeks: ${cells} days`)
    check(await p.evaluate(() => document.querySelectorAll('.lc-month__day.is-today').length === 1), 'today stands out in the month')
    check(await p.evaluate(() => document.querySelectorAll('.lc-month__day.is-closed').length >= 4), 'days off read as off')
    await p.evaluate(() => document.querySelector('.lc-month__day.is-today').click())
    await wait(800)
    check(await p.evaluate(() => document.querySelector('.biz-seg__btn.is-selected')?.textContent === 'Day'), 'a day in the month opens that day')

    // Block time
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-rail__block'))), 'blocked time shows on the day')
    await p.evaluate(() => document.querySelector('.biz-rail__block').click())
    await wait(500)
    check(await p.evaluate(() => /Blocked time/.test(document.querySelector('.ui-sheet, [role="dialog"]')?.textContent || '')), 'tapping blocked time opens it')
    await clickText(p, '.lc-blk .ui-btn', '^Open this time again')
    await wait(500)
    check((await p.evaluate(() => window.__calls.filter((c) => c[0] === 'delete' && c[1] === 'time_blocks').length)) > 0, 'blocked time can be opened again')
    await p.evaluate(() => document.querySelector('.biz-datenav__block').click())
    await wait(500)
    await clickText(p, '.lc-blk .ui-btn', '^Block this time')
    await wait(600)
    check((await calls(p, 'insert', 'time_blocks')).length === 1, 'time can be blocked from the calendar')
    check(p.errors.length === 0, `no page errors on Calendar: ${p.errors.join(' | ')}`)
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/portal/hours', w, h, '&lunch=1&blocks=1')
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `hours fit at ${w}px`)
        await p.close()
        p = await open('/portal/calendar', w, h, '&blocks=1')
        await clickText(p, '.biz-seg__btn', '^Month$')
        await wait(500)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `the month fits at ${w}px`)
        await p.close()
    }
}

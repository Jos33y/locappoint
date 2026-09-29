// The bell and the notifications page in the portal, and booking links from emails.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 588, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(500)
        return page
    }
    const rpcs = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'mark_inbox_read').map((c) => c[2]))

    let p = await open('/portal')
    check(await p.evaluate(() => document.querySelector('.lc-ibx-bell .lc-ibx-bell__count')?.textContent) === '3', 'bell shows the unread count')
    check(/3 new/.test(await p.evaluate(() => document.querySelector('.lc-ibx-bell')?.getAttribute('aria-label'))), 'bell label says how many are new')
    await p.click('.lc-ibx-bell')
    await wait(600)
    check(await p.evaluate(() => window.__path) === '/portal/notifications', 'bell opens notifications')
    check(!(await p.evaluate(() => document.querySelector('.lc-ibx-bell__count'))), 'count clears once seen')
    check((await rpcs(p)).some((a) => a.p_audience === 'business' && a.p_ids === null), 'marks the business side read')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/notifications')
    check(!(await p.evaluate(() => document.querySelector('.lc-ibx-bell__count'))), 'landing straight on the page leaves no stale count')
    const rows = await p.evaluate(() => [...document.querySelectorAll('.lc-ibx__item')].map((el) => ({
        label: el.querySelector('.lc-ibx__label')?.textContent,
        time: el.querySelector('.lc-ibx__when b')?.textContent,
        title: el.querySelector('.lc-ibx__title')?.textContent,
        fresh: el.classList.contains('is-fresh'),
        link: el.getAttribute('href'),
        was: el.querySelector('.lc-ibx__was')?.textContent || '',
    })))
    check(rows.length === 3, `three items: ${rows.length}`)
    check(rows[0]?.label === 'New booking' && rows[0]?.time === '10:00' && rows[0]?.title === 'Jameson', `newest first: ${JSON.stringify(rows[0])}`)
    check(rows[0]?.fresh && rows[1]?.fresh && !rows[2]?.fresh, 'unread items stay highlighted for this visit')
    check(rows[1]?.label === 'Moved, needs your OK' && /^Was/.test(rows[1]?.was), `moved request shows the old time: ${JSON.stringify(rows[1])}`)
    check(rows[2]?.link === null, 'an item without a booking is not a link')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-ibx__daylabel')].map((e) => e.textContent).join()) === 'Today,Yesterday', 'grouped by day')
    check(await p.evaluate(() => {
        const row = document.querySelector('.lc-ibx__item')
        const size = (sel) => parseFloat(getComputedStyle(row.querySelector(sel)).fontSize)
        return size('.lc-ibx__when b') > size('.lc-ibx__title') && size('.lc-ibx__when b') > size('.lc-ibx__label')
    }), 'the booking time is the loudest thing in a row')

    await p.click('.lc-ibx__item[href]')
    await wait(900)
    check(await p.evaluate(() => window.__path) === '/portal/calendar', 'item opens the calendar')
    check(await p.evaluate(() => document.body.innerText.includes('Jameson') && Boolean(document.querySelector('.ui-sheet, [role="dialog"]'))), 'and the booking itself')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/calendar?booking=missing')
    await wait(400)
    check(await p.evaluate(() => document.querySelector('.biz-toast__msg')?.textContent) === 'That booking is no longer in your calendar', 'unknown booking link says so')
    await p.close()

    p = await open('/portal/notifications', 390, 844, '&noinbox=1')
    check(await p.evaluate(() => document.querySelector('.lc-ibx-empty h2')?.textContent) === 'Nothing new', 'empty state')
    check(await p.evaluate(() => !document.querySelector('.lc-ibx-bell__count')), 'no count when there is nothing')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/portal/notifications', w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            clipped: [...document.querySelectorAll('.lc-ibx__item')].some((el) => el.scrollWidth > el.clientWidth + 1),
            touch: [...document.querySelectorAll('a.lc-ibx__item')].every((el) => el.getBoundingClientRect().height >= 44),
        }))
        check(!r.overflow && !r.clipped, `notifications fit at ${w}px`)
        check(r.touch, `rows are big enough to tap at ${w}px`)
        await p.close()
    }
}

// Business-side audit fixes: honest states, visit actions in the right order, controls sized for fingers.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}`, { waitUntil: 'networkidle0' })
        await wait(600)
        return page
    }
    const lisbonMinutes = () => {
        const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number)
        return h * 60 + m
    }

    let p = await open('/portal')
    await p.evaluate(() => [...document.querySelectorAll('.biz-agenda *')].find((e) => e.textContent.trim() === 'Jameson')?.click())
    await wait(500)
    const sheet = await p.evaluate(() => [...document.querySelectorAll('.biz-actions .btn')].map((b) => ({ label: b.textContent.trim(), primary: b.classList.contains('btn--primary') })))
    const started = lisbonMinutes() >= 10 * 60
    if (started) {
        check(sheet.some((b) => b.label === 'Completed') && sheet.some((b) => b.label === 'No-show'), `after the start, completed and no-show are offered: ${JSON.stringify(sheet)}`)
    } else {
        check(!sheet.some((b) => ['Completed', 'No-show'].includes(b.label)), `before the start, no completed or no-show: ${JSON.stringify(sheet)}`)
        check(sheet[0]?.label === 'Move' && sheet[0]?.primary, 'before the start, Move leads')
        check(await p.evaluate(() => /open once it starts at 10:00/.test(document.body.textContent)), 'and it says when they open')
    }
    check(!(await p.evaluate(() => /Sept\b/.test(document.querySelector('.biz-facts')?.textContent || ''))), 'dates say Sep, as the emails do')
    check(p.errors.length === 0, `no page errors on Today: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/channels')
    const channels = await p.evaluate(() => ({
        text: document.body.textContent,
        planned: [...document.querySelectorAll('.lc-channel')].filter((c) => /Planned/.test(c.textContent)).length,
        link: document.querySelector('.lc-channel .lc-channel__main')?.getBoundingClientRect().width || 0,
    }))
    check(!/Setting up|Applying to Google|answers and books for you/.test(channels.text) && channels.planned === 3, 'channels claim only what is live')
    check(channels.link > 250, `booking link card uses the phone width: ${Math.round(channels.link)}px`)
    await p.close()

    for (const [path, fab] of [['/portal', true], ['/portal/calendar', true], ['/portal/page', false], ['/portal/hours', false], ['/portal/settings', false]]) {
        p = await open(path)
        check((await p.evaluate(() => Boolean(document.querySelector('.biz-fab')))) === fab, `${path} ${fab ? 'has' : 'has no'} floating + button`)
        await p.close()
    }

    p = await open('/portal/hours')
    check(await p.evaluate(() => {
        const cards = document.querySelector('.biz-sched__cards')
        const week = document.querySelector('.biz-wk')
        return Boolean(cards && week) && (cards.compareDocumentPosition(week) & Node.DOCUMENT_POSITION_FOLLOWING) > 0
    }), 'on a phone the hours editor comes before the week preview')
    await p.close()

    p = await open('/portal/calendar')
    const sizes = await p.evaluate(() => [...document.querySelectorAll('.biz-seg__btn, .biz-datenav .btn')].map((b) => Math.round(b.getBoundingClientRect().height)))
    check(sizes.length > 0 && sizes.every((h) => h >= 44), `calendar controls are finger sized: ${sizes}`)
    await p.close()

    p = await open('/portal/insights')
    const segs = await p.evaluate(() => [...document.querySelectorAll('.ui-seg__btn')].map((b) => Math.round(b.getBoundingClientRect().height)))
    check(segs.length > 0 && segs.every((h) => h >= 44), `segmented controls are finger sized: ${segs}`)
    await p.close()

    p = await open('/portal/calendar', 1272, 588)
    check(/1 booking waits for you/.test(await p.evaluate(() => document.querySelector('.biz-cal-needs')?.textContent || '')), 'calendar says what waits for the owner')
    await p.evaluate(() => document.querySelector('.biz-cal-needs__item')?.click())
    await wait(500)
    check(await p.evaluate(() => /Rui/.test(document.querySelector('.ui-sheet, [role="dialog"]')?.textContent || '')), 'and opens it in one click')
    const soon = await p.evaluate(() => [...document.querySelectorAll('.biz-soon')].map((e) => parseFloat(getComputedStyle(e).fontSize)))
    check(soon.every((s) => s >= 12), `Soon badges are readable: ${soon}`)
    check(p.errors.length === 0, `no page errors on Calendar: ${p.errors.join(' | ')}`)
    await p.close()
}

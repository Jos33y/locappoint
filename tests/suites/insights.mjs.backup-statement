// Insights: the headline number, the period switch, charts with hover and keyboard, the empty state, and fit.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (vw = 1272, vh = 588, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal/insights')}${extra}`, { waitUntil: 'networkidle0' })
        await wait(600)
        return page
    }
    const rpcDays = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'business_insights').map((c) => c[2].p_days))

    let p = await open()
    check((await rpcDays(p))[0] === 7, 'opens on the last 7 days')
    check(await p.evaluate(() => document.querySelector('.lc-ins-hero__value')?.textContent) === '€448', 'earned is the headline')
    check(await p.evaluate(() => {
        const hero = parseFloat(getComputedStyle(document.querySelector('.lc-ins-hero__value')).fontSize)
        return [...document.querySelectorAll('.lc-ins-tile__value, .lc-ins-card h2')].every((el) => parseFloat(getComputedStyle(el).fontSize) < hero)
    }), 'nothing on the page is louder than the earned figure')
    check(/25%/.test(await p.evaluate(() => document.querySelector('.lc-ins-hero .lc-ins-delta')?.textContent)), 'earned compares with the period before')
    check(await p.evaluate(() => document.querySelectorAll('.lc-ins-cols__col').length) === 7, 'a column per day')
    check(await p.evaluate(() => document.querySelectorAll('.lc-ins-funnel__step').length) === 4, 'four funnel steps')
    check(await p.evaluate(() => document.querySelector('.lc-ins-bars__label')?.textContent) === 'Instagram', 'sources are named, biggest first')
    check(await p.evaluate(() => !document.querySelector('.biz-navlink .biz-soon') || ![...document.querySelectorAll('.biz-navlink')].some((a) => a.textContent.startsWith('Insights') && a.querySelector('.biz-soon'))), 'Insights is no longer marked Soon')

    const col = await p.$('.lc-ins-cols__col:nth-child(2)')
    await col.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await wait(100)
    const box = await col.boundingBox()
    await p.mouse.move(box.x + box.width / 2, box.y + box.height - 10)
    await wait(150)
    check(/booking/.test(await p.evaluate(() => document.querySelector('.lc-ins-tip')?.textContent || '')), 'hovering a column shows its numbers')
    await p.mouse.move(0, 0)
    await p.focus('.lc-ins-heat__cell[tabindex="0"]')
    await wait(100)
    check(/at|:00/.test(await p.evaluate(() => document.querySelector('.lc-ins-heat .lc-ins-tip')?.textContent || '')), 'keyboard focus on a busy hour shows its numbers')

    await p.evaluate(() => [...document.querySelectorAll('[role="radio"], .ui-seg button, button')].find((b) => b.textContent.trim() === '90 days')?.click())
    await wait(700)
    check((await rpcDays(p)).includes(90), 'switching period reloads')
    check(await p.evaluate(() => document.querySelectorAll('.lc-ins-cols__col').length) === 13, '90 days fold into weekly columns')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open(390, 844, '&noinsights=1')
    check(await p.evaluate(() => document.querySelector('.lc-ins-empty h2')?.textContent) === 'Your numbers land here', 'empty state for a new business')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588], [1920, 1080]]) {
        p = await open(w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            clipped: [...document.querySelectorAll('.lc-ins-tile__value, .lc-ins-hero__value, .lc-ins-bars__label, .lc-ins-funnel__label')].some((el) => el.scrollWidth > el.clientWidth + 1),
            gaps: (() => {
                const k = document.querySelector('.lc-ins-kpis').getBoundingClientRect()
                return [...document.querySelectorAll('.lc-ins-kpis > *')].reduce((a, el) => a + el.getBoundingClientRect().width * el.getBoundingClientRect().height, 0) < k.width * k.height * 0.97
            })(),
        }))
        check(!r.overflow && !r.clipped, `insights fit at ${w}px`)
        check(!r.gaps, `headline tiles leave no empty box at ${w}px`)
        await p.close()
    }
}

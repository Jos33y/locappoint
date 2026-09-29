// Today as the overview: the Day Ring, this week as rings, reviews and page cards, lunch and closing on the timeline.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 800, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(1200)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent?.trim() || '', sel)

    let p = await open('/portal')
    const ring = await p.evaluate(() => ({
        label: document.querySelector('.biz-ring svg')?.getAttribute('aria-label') || '',
        arcs: document.querySelectorAll('.biz-ring__booked').length,
        pending: document.querySelectorAll('.biz-ring__booked.is-pending').length,
        pct: document.querySelector('.biz-ring__pct')?.textContent,
        money: document.querySelector('.biz-ring__money')?.textContent || '',
    }))
    check(/booked/.test(ring.label) && /earned/.test(ring.label), `the ring says how full the day is and the money: ${ring.label}`)
    check(ring.arcs === 2 && ring.pending === 1, `each booking is an arc, waiting ones marked: ${ring.arcs}/${ring.pending}`)
    check(/earned/.test(ring.money) && /to come/.test(ring.money), 'earned and still to come are shown apart')
    check(/1 booking waits for you/.test(await text(p, '.biz-ov__needs')), 'what needs the owner sits beside the ring')
    check(await p.evaluate(() => document.querySelectorAll('.biz-weekrings__day').length === 7), 'this week as seven rings')
    check(/Closed/.test(await p.evaluate(() => [...document.querySelectorAll('.biz-weekrings__day')].pop()?.textContent || '')), 'a closed day says so')
    check(/3\.3/.test(await text(p, '.biz-ovcard--link')) && /2 waiting/.test(await text(p, '.biz-ovcard--link')), 'reviews card: average and replies waiting')
    check(/visits/.test(await text(p, '.biz-ov__side')) && /Copy link/.test(await text(p, '.biz-ov__side')), 'page card: visits and the share link')
    check(/Closes/.test(await text(p, '.biz-agenda')), 'the timeline ends with closing time')
    await p.evaluate(() => [...document.querySelectorAll('.biz-weekrings__day')][2]?.click())
    await wait(700)
    check(await p.evaluate(() => window.__path) === '/portal/calendar', 'a day ring opens that day in the calendar')
    check(p.errors.length === 0, `no page errors on the overview: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal', 1272, 800, '&nohours=1')
    check(/Closed/.test(await text(p, '.biz-ring')), 'no hours today: the ring says closed')
    await p.close()

    p = await open('/portal/calendar')
    await p.evaluate(() => [...document.querySelectorAll('.biz-seg__btn')].find((b) => b.textContent === 'Week')?.click())
    await wait(600)
    check(await p.evaluate(() => document.querySelectorAll('.biz-weekrings__day').length === 7), 'the calendar week opens with the seven rings')
    await p.close()

    p = await open('/portal', 1272, 800)
    check(!(await p.evaluate(() => [...document.querySelectorAll('.biz-navlink')].some((a) => a.textContent.includes('Loca AI')))), 'Loca AI is out of the navigation until it exists')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/portal', w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            ring: document.querySelector('.biz-ring')?.getBoundingClientRect().right <= window.innerWidth,
            clipped: [...document.querySelectorAll('.biz-ovpanel, .biz-ovcard')].some((el) => el.scrollWidth > el.clientWidth + 1),
            tabs: [...document.querySelectorAll('.biz-tab')].map((t) => t.textContent.trim()).join('|'),
        }))
        check(!r.overflow && r.ring && !r.clipped, `overview fits at ${w}px`)
        if (w < 1024) check(r.tabs === 'Today|Calendar|Clients|More', `phone tabs: ${r.tabs}`)
        await p.close()
    }
}

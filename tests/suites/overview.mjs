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

    // A page at a set Lisbon time, so what Today shows does not depend on when the tests run.
    const at = async (iso, extra, vw = 1272, vh = 800) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.evaluateOnNewDocument((when) => {
            const shift = new Date(when).getTime() - Date.now()
            const Real = Date
            class Fake extends Real { constructor(...a) { if (a.length) super(...a); else super(Real.now() + shift) } static now() { return Real.now() + shift } }
            window.Date = Fake
        }, iso)
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal')}${extra}`, { waitUntil: 'networkidle0' })
        await wait(1400)
        return page
    }
    // The ring and the timeline need an open day; the test business is closed on Sundays, so today is opened.
    let p = await at('2026-10-16T14:20:00+01:00', '&opentoday=1')
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
    check(/Closes/.test(await text(p, '.biz-agenda')), 'the timeline ends with closing time')
    await p.close()

    p = await open('/portal')
    check(/1 booking waits for you/.test(await text(p, '.biz-ov__needs')), 'what needs the owner sits beside the ring')
    check(await p.evaluate(() => document.querySelectorAll('.biz-weekrings__day').length === 7), 'this week as seven rings')
    check(/Closed/.test(await p.evaluate(() => [...document.querySelectorAll('.biz-weekrings__day')].pop()?.textContent || '')), 'a closed day says so')
    check(/3\.3/.test(await text(p, '.biz-ovcard--link')) && /2 waiting/.test(await text(p, '.biz-ovcard--link')), 'reviews card: average and replies waiting')
    check(/visits/.test(await text(p, '.biz-ov__side')) && /Copy link/.test(await text(p, '.biz-ov__side')), 'page card: visits and the share link')
    await p.evaluate(() => [...document.querySelectorAll('.biz-weekrings__day')][2]?.click())
    await wait(700)
    check(await p.evaluate(() => window.__path) === '/portal/calendar', 'a day ring opens that day in the calendar')
    check(p.errors.length === 0, `no page errors on the overview: ${p.errors.join(' | ')}`)
    await p.close()

    // The greeting uses the owner's first name and the sky follows the real sun over the shop.
    p = await open('/portal', 1272, 800, '&opentoday=1')
    const head = await p.evaluate(() => ({
        hello: document.querySelector('.biz-dayhead__hello')?.textContent || '',
        line: document.querySelector('.biz-dayhead__line')?.textContent || '',
        sky: [...(document.querySelector('.biz-main')?.classList || [])].join(' '),
    }))
    check(/^Good (morning|afternoon|evening), Miles$/.test(head.hello), `greets the owner by first name: ${head.hello}`)
    check(/October|January|February|March|April|May|June|July|August|September|November|December/.test(head.line) && /\./.test(head.line), `the line under says the date and the day: ${head.line}`)
    check(/biz-main--(night|dawn|day|golden|dusk)/.test(head.sky) && /is-today/.test(head.sky), `the sky is set from the sun: ${head.sky}`)
    await p.close()

    // A business with no booking ever: no zeros, the open day on the ring and the way to a first booking.
    p = await open('/portal', 1272, 800, '&opentoday=1&fresh=1')
    const fresh = await p.evaluate(() => ({
        centre: document.querySelector('.biz-ring__centre')?.textContent || '',
        label: document.querySelector('.biz-ring svg')?.getAttribute('aria-label') || '',
        first: document.querySelector('.biz-first')?.textContent || '',
        week: Boolean(document.querySelector('.biz-ov__week')),
        reviews: Boolean(document.querySelector('.biz-ovcard--link')),
        shares: document.querySelectorAll('.biz-share').length,
        money: /€\s?0|0%/.test(document.querySelector('.biz-ov__grid')?.textContent || ''),
    }))
    check(/Open today/.test(fresh.centre) && /first booking lands here/.test(fresh.centre), `the ring shows the open day, not zeros: ${fresh.centre}`)
    check(/No bookings yet/.test(fresh.label) && !/earned/.test(fresh.label), `the ring's label says so too: ${fresh.label}`)
    check(/Get your first booking/.test(fresh.first) && /Copy link/.test(fresh.first) && /QR poster/.test(fresh.first), 'the first-booking card has the link and the poster')
    check(!fresh.week && !fresh.reviews && fresh.shares === 1, 'no week of zeros, no empty reviews, the link once')
    check(!fresh.money, 'no zero money and no 0% anywhere on the first day')
    await p.evaluate(() => [...document.querySelectorAll('.biz-first button')].find((b) => /QR poster/.test(b.textContent))?.click())
    await wait(700)
    check(await p.evaluate(() => Boolean(document.querySelector('[role="dialog"]'))), 'the QR poster opens from Today')
    check(p.errors.length === 0, `no page errors on the first day: ${p.errors.join(' | ')}`)
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844]]) {
        p = await open('/portal', w, h, '&opentoday=1&fresh=1')
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            clipped: [...document.querySelectorAll('.biz-ovpanel, .biz-first, .biz-share')].some((el) => el.scrollWidth > el.clientWidth + 1),
        }))
        check(!r.overflow && !r.clipped, `the first day fits at ${w}px`)
        await p.close()
    }

    // After closing, at a set evening hour: the day goes on paper and tomorrow comes forward.
    p = await at('2026-10-16T20:30:00+01:00', '&tomorrow=1')
    const eve = await p.evaluate(() => ({
        slip: document.querySelector('.biz-slip')?.textContent || '',
        money: document.querySelector('.biz-slip__money')?.textContent || document.querySelector('.biz-slip__money number-flow-react')?.getAttribute('aria-label') || '',
        bigRing: Boolean(document.querySelector('.biz-ring:not(.is-small)')),
        tomorrow: document.querySelector('.biz-tomorrow')?.textContent || '',
        share: document.querySelector('.biz-tomorrow a[href*="wa.me"]')?.getAttribute('href') || '',
        sky: document.querySelector('.biz-main')?.className || '',
        line: document.querySelector('.biz-dayhead__line')?.textContent || '',
    }))
    check(/Today, in full/.test(eve.slip) && /earned from 1 visit/.test(eve.slip) && /Booked online/.test(eve.slip) && /No-shows/.test(eve.slip), `the evening slip: ${eve.slip}`)
    check(!eve.bigRing, 'after closing the big ring gives way to the slip')
    check(/2 booked/.test(eve.tomorrow) && /First at 09:00 with Ana Ferreira/.test(eve.tomorrow) && /Still free 09:50 to 19:00/.test(eve.tomorrow), `tomorrow: ${eve.tomorrow}`)
    check(/Free%20tomorrow/.test(eve.share) && /src%3Dwa/.test(eve.share), 'tomorrow\'s free times go out on WhatsApp with the link')
    check(/biz-main--(dusk|night)/.test(eve.sky) && /Closed for the day/.test(eve.line), `evening sky and line: ${eve.sky} / ${eve.line}`)
    check(p.errors.length === 0, `no page errors in the evening: ${p.errors.join(' | ')}`)
    await p.close()

    p = await at('2026-10-16T08:10:00+01:00', '')
    const morning = await p.evaluate(() => ({ hello: document.querySelector('.biz-dayhead__hello')?.textContent || '', line: document.querySelector('.biz-dayhead__line')?.textContent || '', sky: document.querySelector('.biz-main')?.className || '' }))
    check(/^Good morning/.test(morning.hello) && /You open at 09:00/.test(morning.line) && /Sunrise \d\d:\d\d in Porto/.test(morning.line), `morning: ${morning.hello} / ${morning.line}`)
    check(/biz-main--dawn/.test(morning.sky), `first light is dawn: ${morning.sky}`)
    await p.close()

    p = await at('2026-10-18T12:00:00+01:00', '&tomorrow=1')
    check(/Closed today/.test(await text(p, '.biz-dayhead__line')) && /Tomorrow/.test(await text(p, '.biz-tomorrow')), 'a closed day says so and shows tomorrow')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844]]) {
        p = await at('2026-10-16T20:30:00+01:00', '&tomorrow=1', w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            clipped: [...document.querySelectorAll('.biz-slip, .biz-tomorrow')].some((el) => el.scrollWidth > el.clientWidth + 1),
        }))
        check(!r.overflow && !r.clipped, `the evening fits at ${w}px`)
        await p.close()
    }

    p = await open('/portal', 1272, 800, '&nohours=1')
    check(/Closed/.test(await text(p, '.biz-ring')), 'no hours today: the ring says closed')
    await p.close()

    // Calendar: the date is the title, one line says what the day holds, free time can be booked from the rail.
    p = await at('2026-10-16T14:20:00+01:00', '', 1272, 800)
    await p.goto(`${url}/?path=${encodeURIComponent('/portal/calendar')}`, { waitUntil: 'networkidle0' })
    await wait(1000)
    const cal = await p.evaluate(() => ({
        title: document.querySelector('.biz-calhead__title')?.textContent || '',
        sum: document.querySelector('.biz-calhead__sum')?.textContent || '',
        picker: document.querySelector('.biz-datenav__input')?.type || '',
        shown: document.querySelector('.biz-datenav__input')?.getBoundingClientRect().width || 0,
        free: [...document.querySelectorAll('.biz-rail__free')].map((b) => b.getAttribute('aria-label')),
    }))
    check(cal.title === 'Friday 16 October', `the date is the title: ${cal.title}`)
    check(/^Open 09:00 to 19:00\. 2 bookings, 1 to confirm/.test(cal.sum), `the day in one line: ${cal.sum}`)
    check(cal.picker === 'date' && cal.shown <= 1, 'the date picker sits behind its icon, no US-format field')
    check(cal.free.some((l) => /Free 15:20 to 19:00/.test(l)) && !cal.free.some((l) => /09:00/.test(l)), `free time from now on, bookable: ${cal.free.join(' | ')}`)
    await p.evaluate(() => [...document.querySelectorAll('.biz-rail__free')].pop()?.click())
    await wait(700)
    check(await p.evaluate(() => Boolean(document.querySelector('[role="dialog"]'))), 'tapping free time opens a new booking')
    await p.close()

    p = await open('/portal/calendar')
    await p.evaluate(() => [...document.querySelectorAll('.biz-seg__btn')].find((b) => b.textContent === 'Week')?.click())
    await wait(600)
    check(await p.evaluate(() => document.querySelectorAll('.biz-wb__day').length === 7), 'the calendar week is seven days, each headed by its ring')
    check(/Closed/.test(await p.evaluate(() => [...document.querySelectorAll('.biz-wb__day')].pop()?.textContent || '')), 'a closed day in the week says so')
    check(!/\b0%/.test(await text(p, '.biz-wb')), 'empty days say Open or No visits, never 0%')
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

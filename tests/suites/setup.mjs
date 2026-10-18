// Setup: no "Demo" anywhere; before an owner has a page, the real public page of a business like theirs in
// their city, labelled as an example, with the ticket its client keeps; the city's pattern behind the phone;
// still marks, no looping motion; text at 12px or more; the go-live card with the tile, name, link and stamp.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (extra, vw = 1280, vh = 860) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal/setup')}${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    // Text under 12px in setup's own parts (the public page inside the phone has its own kit).
    const small = (p) => p.evaluate(() => [...document.querySelectorAll('.lc-setup *')]
        .filter((e) => !e.closest('.lc-pub') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12)
        .map((e) => e.textContent.trim().slice(0, 24)))
    const looping = (p) => p.evaluate(() => [...document.querySelectorAll('.lc-setup, .lc-setup *')]
        .filter((e) => !e.closest('.lc-pub') && getComputedStyle(e).animationIterationCount === 'infinite').length)

    // geo1: a visitor from Lisbon is in Portugal, so they see Portugal's example, the same as Porto.
    for (const [city, name, wall] of [['lagos', 'Ada Braids Studio', 'is-lagos'], ['porto', 'Barbearia do Bonfim', 'is-porto'], ['lisbon', 'Barbearia do Bonfim', 'is-porto']]) {
        const p = await open(`&newowner=1&city=${city}`)
        const view = await p.evaluate(() => ({
            text: document.body.innerText,
            cap: document.querySelector('.lc-example__cap')?.textContent,
            page: document.querySelector('.lc-example .lc-pub__name')?.textContent,
            preview: Boolean(document.querySelector('.lc-example .lc-pub--preview')),
            walls: [...document.querySelectorAll('.lc-wall')].map((w) => w.className),
            stamp: document.querySelector('.lc-example__ticket .lc-home-ticket__stamp')?.textContent,
            who: document.querySelector('.lc-example__ticket .lc-home-ticket__who')?.textContent,
            grid: Boolean(document.querySelector('.lc-setup__grid, .lc-demo')),
        }))
        check(!/\bdemo\b/i.test(view.text), `${city}: setup never says Demo`)
        check(!/in a few minutes/i.test(view.text), `${city}: no timing promise on welcome`)
        check(view.cap === 'How your page will look', `${city}: the example is labelled as how your page will look (${view.cap})`)
        check(view.page === name && view.preview, `${city}: the real public page shows ${name} as a preview (${view.page})`)
        check(view.who === name && view.stamp === 'Confirmed', `${city}: the ticket is from ${name}, stamped Confirmed`)
        check(view.walls.length > 0 && view.walls.every((c) => c.includes(wall)), `${city}: the city's pattern is behind the phone (${view.walls.join(', ')})`)
        check(!view.grid, `${city}: the old street grid and demo are gone`)
        check((await small(p)).length === 0, `${city}: setup text is 12px or more`)
        check(await looping(p) === 0, `${city}: nothing loops on welcome`)
        check(p.errors.length === 0, `${city}: welcome has no errors (${p.errors[0] || ''})`)
        await p.close()
    }

    // A phone: the example sits below the welcome, inside the page width.
    let p = await open('&newowner=1&city=lagos', 390, 844)
    let view = await p.evaluate(() => ({
        over: document.documentElement.scrollWidth > window.innerWidth,
        showcase: Boolean(document.querySelector('.lc-setup__showcase .lc-example')),
        ticketIn: (() => { const t = document.querySelector('.lc-example__ticket')?.getBoundingClientRect(); return Boolean(t && t.left >= 0 && t.right <= window.innerWidth) })(),
    }))
    check(view.showcase && !view.over && view.ticketIn, 'phone: the example shows below the welcome with nothing off the edge')
    await p.close()

    // Steps: the wall follows the business's city.
    p = await open('&newowner=1&city=porto')
    await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === "Let's start")?.click())
    await wait(500)
    view = await p.evaluate(() => ({ walls: [...document.querySelectorAll('.lc-wall')].map((w) => w.className), head: document.querySelector('.lc-setup__title')?.textContent }))
    check(view.head === 'Tell us about your business' && view.walls.some((c) => c.includes('is-porto')), `steps: the Porto wall stays behind the live preview (${view.walls.join(', ')})`)
    check((await small(p)).length === 0, 'steps: setup text is 12px or more')
    await p.close()

    // Going live: the card with the tile, name, where, link and the Live stamp.
    p = await open('&setup=1&city=lisbon')
    await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Go live')?.click())
    await wait(1200)
    view = await p.evaluate(() => ({
        hero: document.querySelector('#lc-setup-live')?.textContent,
        card: Boolean(document.querySelector('.lc-golive')),
        name: document.querySelector('.lc-golive__name')?.textContent,
        tile: Boolean(document.querySelector('.lc-golive__badge .lc-tile, .lc-golive__badge img')),
        stamp: document.querySelector('.lc-golive__stamp')?.textContent,
        link: document.querySelector('.lc-golive .lc-live__slug')?.textContent,
        band: Boolean(document.querySelector('.lc-golive__band .lc-pattern, .lc-golive__band img')),
        beacon: Boolean(document.querySelector('.lc-live__beacon, .lc-live__badge')),
        qr: Boolean(document.querySelector('.lc-live__sticker')),
        today: [...document.querySelectorAll('button, a')].some((b) => b.textContent.trim() === 'Go to Today'),
        nameColour: (() => { const n = document.querySelector('.lc-golive__name'); return n ? getComputedStyle(n).color : '' })(),
    }))
    check(view.hero === "You're live." && view.card, 'live: the go-live card shows')
    check(view.name === 'Femtos Barbearia' && view.link === 'femtos-barbearia', `live: the card names the business and its link (${view.name}, ${view.link})`)
    check(view.tile && view.band && view.stamp === 'Live', 'live: tile or logo, the city band or cover, and the Live stamp')
    check(view.nameColour !== 'rgb(255, 255, 255)' && view.nameColour !== '', `live: the name reads on paper (${view.nameColour})`)
    check(!view.beacon && view.qr && view.today, 'live: no beacon; the QR and Go to Today stay')
    check((await small(p)).length === 0, `live: setup text is 12px or more (${(await small(p)).join(', ')})`)
    check(await looping(p) === 0, 'live: nothing loops')
    check(p.errors.length === 0, `live: no errors (${p.errors[0] || ''})`)
    await p.close()
}

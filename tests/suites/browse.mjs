// Browse (browse2, the approved board): the country's four worlds as doorways beside the search, no
// "cohort" and no "2 of 10" counter, a short search with the rest behind More options, "Just joined"
// with real free times, "Asked for this week, not here yet" as trades and places only, and cards whose
// "from" price ignores extras and whose online-only places say so.

import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (extra, vw = 1280, vh = 900) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent('/businesses')}&guest=1${extra}`, { waitUntil: 'networkidle0' })
        await wait(700)
        return page
    }
    const look = (p) => p.evaluate(() => ({
        text: document.body.innerText,
        doors: [...document.querySelectorAll('.lc-br-door .lc-pattern')].map((e) => e.getAttribute('class')),
        sky: document.querySelector('.lc-br-doors__time')?.textContent || '',
        title: document.querySelector('.lc-br-hero__title')?.textContent || '',
        lede: document.querySelector('.lc-br-hero__lede')?.textContent || '',
        counter: Boolean(document.querySelector('.lc-br-count, .lc-br-slots')),
        joined: [...document.querySelectorAll('.lc-br-new strong')].map((e) => e.textContent),
        times: [...document.querySelectorAll('.lc-br-new__time')].map((e) => e.textContent),
        seeAll: document.querySelector('.lc-br-seeall')?.textContent || '',
        asked: document.querySelector('.lc-br-asked h2')?.textContent || '',
        askedRows: [...document.querySelectorAll('.lc-br-asked__list li')].map((e) => e.textContent),
        strip: document.querySelectorAll('.lc-br-strip .lc-pattern').length,
        optionsHidden: document.querySelector('.lc-eng__row')?.hidden,
        more: document.querySelector('.lc-eng__more')?.textContent || '',
        price: document.querySelector('.lc-cl-result__price')?.textContent || '',
        what: document.querySelector('.lc-cl-result__what')?.textContent || '',
        amber: [...document.querySelectorAll('.lc-br-top *, .lc-br-join *, .lc-br-asked *')].filter((e) => getComputedStyle(e).color === 'rgb(232, 154, 62)').length,
        over: document.documentElement.scrollWidth > window.innerWidth,
        small: [...document.querySelectorAll('.lc-br *')].filter((e) => !e.closest('footer') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent.trim().slice(0, 20)),
    }))

    let p = await open('&city=porto')
    let v = await look(p)
    check(!/cohort/i.test(v.text) && !v.counter && !/of 10\b/.test(v.text), 'no cohort and no "of 10" counter for clients')
    check(v.doors.length === 4 && ['azulejo', 'calcada', 'minho', 'arraiolos'].every((w) => v.doors.some((c) => c.includes(`lc-pattern--${w}`))), `the four worlds of Portugal as doorways: ${v.doors.join(' | ')}`)
    check(v.title === 'The good ones near you, with the real free times.' && v.lede === '', `the board's title, no line under it: ${v.title}`)
    check(/^\d\d:\d\d in Lisbon$/.test(v.sky), `the sun or moon at Portugal's time: ${v.sky}`)
    check(v.strip === 4, 'the four worlds end to end above the footer')
    check(v.joined.length === 0 && v.asked === '', 'one place: no "Just joined", nothing asked: no strip')
    const sw = await p.evaluate(() => ({ text: document.querySelector('.lc-country .ui-picker-trigger')?.textContent.trim() || '', disc: document.querySelector('.lc-country__disc .lc-pattern')?.getAttribute('class') || '' }))
    check(/Portugal/.test(sw.text) && /lc-pattern--(azulejo|calcada|minho|arraiolos)\b/.test(sw.disc), `geo1: the header switch says the country, with a disc of one of its worlds, no flag: ${JSON.stringify(sw)}`)
    check(v.optionsHidden === true && /^More options/.test(v.more) && /Soonest/.test(v.more), `the search is one line; the options wait behind More options (${v.more})`)
    await p.evaluate(() => document.querySelector('.lc-eng__more').click())
    await wait(200)
    check(await p.evaluate(() => document.querySelector('.lc-eng__row').hidden === false && document.querySelector('.lc-eng__more').getAttribute('aria-expanded') === 'true'), 'More options opens them')
    check(v.amber === 0, 'no amber in the hero or the join card')
    check(v.small.length === 0, `text is 12px or more (${v.small.join(', ')})`)
    check(p.errors.length === 0, `no errors (${p.errors[0] || ''})`)
    await p.close()

    // A country with nothing live yet says it is opening, everywhere on the page.
    p = await open('&country=ng', 390, 844)
    v = await look(p)
    check(/Nigeria is opening/.test(v.title) && /Opening soon in Nigeria/.test(v.text) && !v.over, `an empty country says it is opening: ${v.title}`)
    check(v.doors.length === 4 && ['adire', 'uli', 'arewa', 'benin'].every((w) => v.doors.some((c) => c.includes(`lc-pattern--${w}`))), 'Nigeria wears its own four')
    await p.close()

    // Five places in Nigeria: the four newest just joined, with free times; what was asked, as trades.
    for (const [vw, vh] of [[1280, 900], [390, 844]]) {
        p = await open('&country=ng&joined=1&asked=1', vw, vh)
        await wait(600)
        v = await look(p)
        check(v.joined.join('|') === 'Fade Republic|Osaro Braids|Nkem Nails|Amina Lashes' && v.seeAll === 'See all 5', `${vw}: the four newest, and the way to all: ${v.joined.join('|')} / ${v.seeAll}`)
        check(v.times.length >= 4 && v.times.every((t) => /^\d\d:\d\d$/.test(t)), `${vw}: each card shows its real free times: ${v.times.slice(0, 4).join(' ')}`)
        check(v.asked === 'Lashes and brows in Ibadan' && v.askedRows.length === 3 && /Barbershop, Abeokuta\s*14/.test(v.askedRows[1]), `${vw}: asked for, said as a trade and a place: ${v.asked} / ${v.askedRows.join(' | ')}`)
        check(/23 searches, nobody to book\./.test(v.text) && /List your business/.test(v.text), `${vw}: the count and one way in`)
        check(!v.over && v.small.length === 0 && v.amber === 0, `${vw}: no sideways scroll, text 12px or more, no amber text (${v.small.join(', ')})`)
        check(p.errors.length === 0, `${vw}: no errors (${p.errors[0] || ''})`)
        await p.close()
    }

    // An extra never sets the "from" price.
    p = await open('&city=porto&extras=1')
    v = await look(p)
    check(/from\s*€18/.test(v.price), `the "from" price is the cheapest service on its own, not an extra: ${v.price}`)
    await p.close()

    // A business that only meets by video call.
    p = await open('&city=porto&online=all')
    v = await look(p)
    check(/online from Lisbon/.test(v.what) && !/Arroios/.test(v.what), `an online-only card says where it works from, not a neighbourhood: ${v.what}`)
    await p.close()

    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
    check(!/[Cc]ohort/.test(read('src/pages/app/Contact.jsx')) && !/cohort/i.test(read('src/pages/app/Businesses.jsx').replace(/services\/cohort/g, '')), 'no cohort in the words on Browse or Contact')
}

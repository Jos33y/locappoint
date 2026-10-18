// Browse: the city first. Its pattern across the top, a title and line that say what is really there,
// no "cohort" and no "2 of 10" counter, city cards in their patterns, a short search with the rest behind
// More options, and cards whose "from" price ignores extras and whose online-only places say so.

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
        band: document.querySelector('.lc-br-hero__band .lc-pattern')?.getAttribute('class') || '',
        title: document.querySelector('.lc-br-hero__title')?.textContent || '',
        lede: document.querySelector('.lc-br-hero__lede')?.textContent || '',
        counter: Boolean(document.querySelector('.lc-br-count, .lc-br-slots')),
        straps: [...document.querySelectorAll('.lc-br-city__strap .lc-pattern')].map((e) => e.getAttribute('class')),
        cityText: [...document.querySelectorAll('.lc-br-city span:not(.lc-br-city__strap)')].map((e) => e.textContent),
        optionsHidden: document.querySelector('.lc-eng__row')?.hidden,
        more: document.querySelector('.lc-eng__more')?.textContent || '',
        price: document.querySelector('.lc-cl-result__price')?.textContent || '',
        what: document.querySelector('.lc-cl-result__what')?.textContent || '',
        amber: [...document.querySelectorAll('.lc-br-hero *, .lc-br-join *')].filter((e) => getComputedStyle(e).color === 'rgb(232, 154, 62)').length,
        over: document.documentElement.scrollWidth > window.innerWidth,
        small: [...document.querySelectorAll('.lc-br *')].filter((e) => !e.closest('footer') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent.trim().slice(0, 20)),
    }))

    let p = await open('&city=porto')
    let v = await look(p)
    check(!/cohort/i.test(v.text) && !v.counter && !/of 10\b/.test(v.text), 'no cohort and no "of 10" counter for clients')
    check(/lc-pattern--(azulejo|calcada|minho|arraiolos)\b/.test(v.band) && v.title === 'Book a free time in Portugal.', `geo1: the country first, one of its worlds and its name (${v.title})`)
    const sw = await p.evaluate(() => ({ text: document.querySelector('.lc-country .ui-picker-trigger')?.textContent.trim() || '', disc: document.querySelector('.lc-country__disc .lc-pattern')?.getAttribute('class') || '' }))
    check(/Portugal/.test(sw.text) && /lc-pattern--(azulejo|calcada|minho|arraiolos)\b/.test(sw.disc), `geo1: the header switch says the country, with a disc of one of its worlds, no flag: ${JSON.stringify(sw)}`)
    check(/^Barbershops taking bookings on Locappoint\./.test(v.lede), `the line says what is really there: ${v.lede}`)
    check(v.straps.length === 8 && ['adire', 'uli', 'arewa', 'benin', 'azulejo', 'calcada', 'minho', 'arraiolos'].every((w, i) => v.straps[i].includes(`lc-pattern--${w}`)), 'each country card wears its four worlds')
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
    check(/Nigeria is opening/.test(v.title) && v.cityText[0] === 'Opening soon' && !v.over, `an empty country says it is opening: ${v.title} / ${v.cityText[0]}`)
    await p.close()

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

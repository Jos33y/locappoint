// The home page: owner-first ("Get found. Get booked."), the problem then the fix, no business
// counts until businesses are onboarded, two ways in (sign up, or set it up with us on WhatsApp),
// prices in the picked city's money, amber kept for the booking, fits every phone, the one scroll
// moment folds the chat into a ticket, and the speed work stays in place.

import fs from 'node:fs'
import path from 'node:path'

const SETUP = 'https://wa.me/2348068007905'

export default async ({ browser, url, check, root }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (city, vw = 1272, vh = 800, reduced = false) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.evaluateOnNewDocument((c) => { try { localStorage.setItem('lc.city', c) } catch { /* private mode */ } }, city)
        if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1272 })
        await page.goto(`${url}/`, { waitUntil: 'networkidle0' })
        await page.waitForSelector('.lc-home-hero', { timeout: 15000 }).catch(() => {})
        await wait(1800)
        return page
    }

    let p = await open('porto')
    const text = await p.evaluate(() => document.querySelector('.lc-home main')?.innerText || '')
    const h1 = await p.evaluate(() => document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim())
    check(h1 === 'Get found. Get booked.', `the page speaks to businesses first: ${h1}`)
    check(/Porto, Lagos and Lisbon/.test(text), 'it names the three live cities')
    check(/Sound familiar\?/.test(text) && /Then the chair fills itself\./.test(text), 'it names the problem, then the fix')
    check(!/first ten|Cohort 1|\d+\s*\/\s*\d+\s*live|ten minutes|trial|\bSoon\b/i.test(text), 'no business counts, timing claims, trial wording or Soon tags')
    check(!/[\u2014\u2013]/.test(text), 'no long dashes on the page')
    check((text.match(/Free during the beta/g) || []).length <= 2, 'free during the beta is said where it matters, not everywhere')
    const actions = await p.evaluate(() => [...document.querySelectorAll('.lc-home-actions')].map((a) => [...a.querySelectorAll('a, button')].map((b) => ({ text: b.textContent.trim(), href: b.getAttribute('href'), target: b.getAttribute('target') }))))
    check(actions.length === 2 && actions.every((a) => a[0].text === 'Get your booking page' && a[1].text === 'Set it up with us'), `two ways in, the same wording top and bottom: ${JSON.stringify(actions.map((a) => a.map((b) => b.text)))}`)
    const wa = actions[0]?.[1]
    check(wa?.href?.startsWith(SETUP) && /Porto/.test(decodeURIComponent(wa.href)) && wa.target === '_blank', `Set it up with us opens WhatsApp with the city in the message: ${wa?.href}`)
    check(!/Browse businesses/.test(text), 'owners are not sent to the business list from the page body')
    check(/€0/.test(text) && /€18/.test(text), 'Porto prices are in euro')
    check(/Booking on WhatsApp/.test(text), 'booking on WhatsApp is listed as working')

    // Amber is for the booking: the second headline line and the stamp, nothing else in text.
    const amber = await p.evaluate(() => {
        const signal = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim()
        const probe = document.createElement('i')
        probe.style.color = signal
        document.body.appendChild(probe)
        const want = getComputedStyle(probe).color
        probe.remove()
        return [...document.querySelectorAll('.lc-home main *')]
            .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(e).color === want)
            .map((e) => (e.closest('h1') ? 'h1' : e.className || e.tagName))
    })
    check(amber.length === 1 && amber[0] === 'h1', `amber text only on Get booked: ${amber.join(', ')}`)

    // The visitor's city is marked among the three.
    const cities = await p.evaluate(() => [...document.querySelectorAll('.lc-home-city')].map((c) => ({ name: c.querySelector('h3')?.textContent, picked: c.classList.contains('is-picked') })))
    check(cities.length === 3 && cities.filter((c) => c.picked).map((c) => c.name).join() === 'Porto', `three city worlds, Porto marked: ${JSON.stringify(cities)}`)

    // The notification never covers the owner's greeting.
    const cover = await p.evaluate(() => {
        const a = document.querySelector('.lc-home-phone__alert')?.getBoundingClientRect()
        const g = document.querySelector('.lc-home-phone__hello')?.getBoundingClientRect()
        return !!a && !!g && (a.bottom <= g.top || a.top >= g.bottom)
    })
    check(cover, 'the new-booking notification leaves the greeting readable')
    check(!p.errors.length, `no script errors: ${p.errors.join(' | ')}`)

    // The scroll moment: the chat is shown first, and folds into a ticket once scrolled to.
    const before = await p.evaluate(() => document.querySelector('.lc-home-fold')?.classList.contains('is-folded'))
    await p.evaluate(() => { const e = document.querySelector('.lc-home-fold'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.15) })
    await wait(1200)
    const after = await p.evaluate(() => {
        const fold = document.querySelector('.lc-home-fold')
        const op = (s) => Number(getComputedStyle(fold.querySelector(s)).opacity)
        return { folded: fold.classList.contains('is-folded'), ticket: op('.lc-home-fold__booked'), stamp: op('.lc-home-ticket__stamp'), chat: op('.lc-home-msg') }
    })
    check(before === false && after.folded && after.ticket === 1 && after.stamp === 1 && after.chat === 0, `the chat folds into a confirmed ticket on scroll: ${JSON.stringify({ before, ...after })}`)
    await p.evaluate(() => window.scrollTo(0, 0))
    await wait(900)
    check(await p.evaluate(() => !document.querySelector('.lc-home-fold').classList.contains('is-folded')), 'and unfolds when scrolled back')
    await p.close()

    p = await open('porto', 390, 844, true)
    await p.evaluate(() => { const e = document.querySelector('.lc-home-fold'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.15) })
    await wait(900)
    const calm = await p.evaluate(() => {
        const t = getComputedStyle(document.querySelector('.lc-home-fold__booked')).transform
        return { folded: document.querySelector('.lc-home-fold').classList.contains('is-folded'), still: t === 'none' }
    })
    check(calm.folded && calm.still, 'with reduced motion the ticket fades in without moving')
    await p.close()

    p = await open('lagos')
    const lagos = await p.evaluate(() => document.querySelector('.lc-home main')?.innerText || '')
    check(/₦0/.test(lagos) && /₦25,000/.test(lagos) && !/€/.test(lagos), 'Lagos prices are in naira, with no euro left over')
    check(/Get found in Lagos\./.test(lagos), 'the closer follows the picked city')
    check(await p.evaluate(() => /Lagos/.test(decodeURIComponent(document.querySelector('.lc-home-actions a').href))), 'the WhatsApp message names Lagos')
    await p.close()

    for (const [vw, vh] of [[320, 640], [390, 844], [820, 1180], [1272, 588], [1920, 1080]]) {
        p = await open('lisbon', vw, vh)
        const fit = await p.evaluate(() => {
            const inside = (inner, outer) => {
                const a = document.querySelector(inner)?.getBoundingClientRect()
                const b = document.querySelector(outer)?.getBoundingClientRect()
                return !!a && !!b && a.left >= b.left - 0.5 && a.right <= b.right + 0.5
            }
            const sel = '.lc-home main h1, .lc-home main h2, .lc-home main h3, .lc-home main p, .lc-home main li, .lc-home main span, .lc-home main b, .lc-home main a, .lc-home main dt, .lc-home main dd'
            const tiny = [...document.querySelectorAll(sel)].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className)
            const names = [...document.querySelectorAll('.lc-home-city__name')].map((n) => Math.round(n.getBoundingClientRect().top))
            return {
                overflow: document.documentElement.scrollWidth > innerWidth,
                ticket: inside('.lc-home-fold__ticket', '.lc-home-fold'),
                phone: inside('.lc-home-phone__screen', '.lc-home-hero__world'),
                tiny,
                names,
                wide: innerWidth >= 820,
            }
        })
        check(!fit.overflow, `${vw}px: nothing runs off the side`)
        check(fit.ticket && fit.phone, `${vw}px: the ticket and the phone stay inside their panels`)
        check(!fit.tiny.length, `${vw}px: no text under 12px: ${[...new Set(fit.tiny)].join(', ')}`)
        if (fit.wide) check(new Set(fit.names).size === 1, `${vw}px: the three city names line up: ${fit.names.join(', ')}`)
        await p.close()
    }

    // Speed: fonts as woff2 through the build, and a manifest for the server's preload tags.
    const tokens = read('src/styles/tokens.css')
    const fonts = [...tokens.matchAll(/url\('\.\.\/assets\/fonts\/(Switzer-\w+\.woff2)'\)/g)].map((m) => m[1])
    check(fonts.length === 4 && !/\.otf/.test(tokens) && fonts.every((f) => fs.existsSync(path.join(root, 'src', 'assets', 'fonts', f))), 'Switzer loads as woff2 from the build, all four weights')
    check(/manifest:\s*true/.test(read('vite.config.js')), 'the build writes the manifest the server reads')
    check(!fs.existsSync(path.join(root, 'src', 'pages', 'app', 'home', 'BuiltFor.jsx')), 'the old category grid is gone')
}

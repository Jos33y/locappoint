// The status page: today's facts, the waves, the launch slip, the city worlds, tiles, contrast and fit.

import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, server, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (vw = 1272, vh = 588) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1272 })
        await page.goto(`${url}/?status=1`, { waitUntil: 'networkidle0' })
        await page.waitForSelector('.lc-st', { timeout: 15000 }).catch(() => {})
        await page.evaluate(() => {
            document.documentElement.style.scrollBehavior = 'auto'
            document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in-view'))
        })
        await wait(300)
        return page
    }

    let p = await open()
    const text = await p.evaluate(() => document.body.innerText || '')
    check(/Two countries live/.test(text) && !/Three cities|Porto, Lagos and Lisbon/.test(text), 'the page leads with two countries live, not three cities')
    check(!/Porto beta|95%|Phase 2|of 4\b|Five Porto owners/.test(text), 'nothing from the 7 October page comes back')
    check(!/[\u2014\u2013]/.test(text), 'no long dashes on the page')
    check(!/waitlist\.locappoint\.com/.test(text), 'the retired waitlist is not offered as a live link')
    const waves = await p.evaluate(() => [...document.querySelectorAll('.lc-st-wave')].map((w) => ({ now: w.classList.contains('is-now'), title: w.querySelector('.lc-st-wave__title')?.textContent })))
    check(waves.length === 6 && waves.filter((w) => w.now).length === 1, `six waves, one marked now: ${waves.length}`)
    check(waves[0]?.title === 'The launch product' && waves.findIndex((w) => w.now) === 1, 'Wave 1 is done and the launch fixes are the current step')

    const slip = await p.evaluate(() => {
        const part = (k) => document.querySelector(`.lc-st-slip__part--${k}`)
        const done = (k) => part(k)?.querySelectorAll('.lc-st-stamp').length
        const lines = (k) => part(k)?.querySelectorAll('.lc-st-slip__line').length
        const totals = [...document.querySelectorAll('.lc-st-slip:not(.lc-st-costs) .lc-st-slip__total b')].map((b) => b.textContent)
        return { code: [done('code'), lines('code')], sw: [done('switch'), lines('switch')], wait: lines('wait'), totals, hero: [...document.querySelectorAll('.lc-st-stat b')].map((b) => b.textContent) }
    })
    check(slip.code[1] === 11 && slip.totals[0] === `${slip.code[0]} of ${slip.code[1]}`, `the slip counts its own stamps: ${slip.totals[0]}`)
    check(slip.sw[1] === 5 && slip.totals[1] === `${slip.sw[0]} of ${slip.sw[1]}`, `switch-ons counted from the slip: ${slip.totals[1]}`)
    check(slip.hero[1] === String(slip.code[0]), 'the headline fix count is the slip\'s count')
    check(slip.hero[2] === String(slip.sw[0]), 'the headline switch-on count is the slip\'s count')

    const cities = await p.evaluate(() => [...document.querySelectorAll('.lc-world__name')].map((n) => n.textContent))
    check(cities.join() === 'Nigeria,Portugal', `countries in order: ${cities.join(', ')}`)
    const chips = await p.evaluate(() => document.querySelectorAll('.lc-world__chip.is-pattern .lc-pattern').length)
    check(chips === 8, `each country shows its four worlds: ${chips}`)

    // Every text on paper and in the city worlds clears 4.5:1 against what is really behind it.
    const low = await p.evaluate(() => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number)
        const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
        const ground = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c } return [16, 20, 29] }
        const out = []
        for (const el of document.querySelectorAll('.lc-st-slip *, .lc-world__body *, .lc-world__label *')) {
            if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
            const a = lum(rgb(getComputedStyle(el).color)), b = lum(ground(el))
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
            if (ratio < 4.5) out.push(`${el.textContent.trim().slice(0, 24)} ${ratio.toFixed(2)}`)
        }
        return out
    })
    check(low.length === 0, `text contrast on paper and city colours: ${low.slice(0, 5).join(' | ')}`)
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    const tile = await server.ssrLoadModule(path.join(root, 'src', 'components', 'brand', 'tile.js'))
    const a = JSON.stringify(tile.tileCells('Barbearia do Sr. António'))
    check(a === JSON.stringify(tile.tileCells('  barbearia   do sr. antónio ')), 'the same name always draws the same tile')
    check(a !== JSON.stringify(tile.tileCells('Barbearia do Sr. Antonio')) && a !== JSON.stringify(tile.tileCells('Barbearia do Sr. António', 1)), 'another name or "Try another" draws a different tile')
    const cells = tile.tileCells('Adeola\'s Hair, Nails and Lash Studio, Lekki Phase 1')
    check(cells.length > 8 && cells.length <= 16 && cells.every((c) => c.role >= 1 && c.role <= 3 && tile.TILE_SHAPES[c.kind]), `a tile is up to sixteen cells cut from the mark: ${cells.length}`)
    check(/<title>A &lt;b&gt; &amp; co<\/title>/.test(tile.tileSvg('x', ['#000', '#111', '#222', '#333'], { title: 'A <b> & co' })), 'names are escaped in the server tile')

    const css = fs.readFileSync(path.join(root, 'src', 'styles', 'status', 'status.css'), 'utf8')
    check(!/#[0-9a-f]{3,8}\b/i.test(css) && !/linear-gradient/.test(css), 'status.css takes every colour from the tokens; no linear gradients')
    check((css.match(/radial-gradient/g) || []).length === 2 && /\.lc-st-hero__glow \{[^}]*radial-gradient/.test(css), 'the only gradient is the dawn light behind the hero')

    for (const [w, h] of [[320, 640], [390, 844], [820, 1180], [1024, 768], [1272, 588], [1920, 1080]]) {
        p = await open(w, h)
        const r = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            small: [...document.querySelectorAll('.lc-st a')].filter((a) => a.getBoundingClientRect().height < 44).map((a) => a.textContent.trim().slice(0, 20)),
            wrapped: [...document.querySelectorAll('.lc-st-tag, .lc-st-stamp')].filter((e) => e.getBoundingClientRect().height > 40).map((e) => e.textContent),
            names: [...document.querySelectorAll('.lc-st-slip__n')].filter((e) => e.getBoundingClientRect().height > 26).map((e) => e.textContent),
        }))
        check(!r.overflow, `status page fits at ${w}px`)
        check(r.small.length === 0, `links are tap-sized at ${w}px: ${r.small.join(', ')}`)
        check(r.wrapped.length === 0 && r.names.length === 0, `tags, stamps and names stay on one line at ${w}px: ${[...r.wrapped, ...r.names].join(', ')}`)
        await p.close()
    }
}

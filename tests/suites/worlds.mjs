// Country worlds (doc 30): eight patterns, two countries, random but stable. The rule is pure
// (src/components/brand/worlds.js) and the pages wear what it picks.

import path from 'node:path'
import { pathToFileURL } from 'node:url'

export default async ({ browser, url, check, root }) => {
    const load = (rel) => import(pathToFileURL(path.join(root, ...rel.split('/'))).href)
    const w = await load('src/components/brand/worlds.js')
    const { PT_MUNICIPALITIES } = await load('src/constants/locations.js')
    const pick = (b) => w.pickWorld(b, { municipalities: PT_MUNICIPALITIES })

    check(w.ALL_WORLDS.length === 8 && w.COUNTRY_WORLDS.NG.length === 4 && w.COUNTRY_WORLDS.PT.length === 4, 'four worlds per country, eight in all')
    check(Object.keys(w.WORLD_COLOURS).length === 8 && Object.values(w.WORLD_COLOURS).every((c) => c.length === 4 && c.every((v) => /^var\(--lc-/.test(v))), 'each world has four colours, tokens only')

    // 1. Home regions always wear their pattern.
    const homes = [
        [{ city: 'Lagos', country: 'NG' }, 'adire'], [{ city: 'Abeokuta', country: 'NG' }, 'adire'], [{ city: 'Ibadan', country: 'NG' }, 'adire'],
        [{ city: 'Enugu', country: 'NG' }, 'uli'], [{ city: 'Onitsha', country: 'NG' }, 'uli'], [{ city: 'Owerri', country: 'NG' }, 'uli'],
        [{ city: 'Kano', country: 'NG' }, 'arewa'], [{ city: 'Kaduna', country: 'NG' }, 'arewa'],
        [{ city: 'Benin City', country: 'NG' }, 'benin'], [{ city: 'Port Harcourt', country: 'NG' }, 'benin'], [{ city: 'Warri', country: 'NG' }, 'benin'],
        [{ city: 'Porto', country: 'PT' }, 'azulejo'], [{ city: 'Matosinhos', country: 'PT' }, 'azulejo'], [{ city: 'Vila Nova de Gaia', country: 'PT' }, 'azulejo'],
        [{ city: 'Lisbon', country: 'PT' }, 'calcada'], [{ city: 'Cascais', country: 'PT' }, 'calcada'], [{ city: 'Almada', country: 'PT' }, 'calcada'],
        [{ city: 'Braga', country: 'PT' }, 'minho'], [{ city: 'Guimarães', country: 'PT' }, 'minho'], [{ city: 'Viana do Castelo', country: 'PT' }, 'minho'],
        [{ city: 'Évora', country: 'PT' }, 'arraiolos'], [{ city: 'Beja', country: 'PT' }, 'arraiolos'],
        [{ region: 'Kano', country: 'NG', city: 'Somewhere' }, 'arewa'], [{ region: 'Braga', country: 'PT' }, 'minho'],
        [{ market: 'lagos' }, 'adire'], [{ market: 'porto' }, 'azulejo'], [{ market: 'lisbon' }, 'calcada'],
    ]
    const wrong = homes.filter(([b, want]) => pick({ id: 'x1', ...b }) !== want).map(([b, want]) => `${JSON.stringify(b)} gave ${pick({ id: 'x1', ...b })}, not ${want}`)
    check(wrong.length === 0, `home regions wear their own pattern (${wrong.join('; ')})`)

    // 2. No home pattern: a stable pick from the country's four, by id.
    const abuja = (id) => pick({ id, city: 'Abuja', country: 'NG' })
    const coimbra = (id) => pick({ id, city: 'Coimbra', country: 'PT' })
    check(abuja('b-1') === abuja('b-1') && coimbra('b-9') === coimbra('b-9'), 'the same business gets the same world every time')
    const ngPicks = new Set(Array.from({ length: 60 }, (_, i) => abuja(`id-${i}`)))
    const ptPicks = new Set(Array.from({ length: 60 }, (_, i) => coimbra(`id-${i}`)))
    check([...ngPicks].every((x) => w.COUNTRY_WORLDS.NG.includes(x)) && ngPicks.size === 4, `Abuja businesses spread over Nigeria's four (${[...ngPicks]})`)
    check([...ptPicks].every((x) => w.COUNTRY_WORLDS.PT.includes(x)) && ptPicks.size === 4, `Coimbra businesses spread over Portugal's four (${[...ptPicks]})`)
    check(pick({ id: 'z', city: 'Faro', country: 'PT', market: null }) === pick({ id: 'z', city: 'Faro', country: 'PT', business_name: 'Other name' }), 'the pick follows the id, not the name')
    check(w.COUNTRY_WORLDS.PT.includes(pick({ id: 'q', city: 'Lagos', country: 'PT' })) && pick({ id: 'q', city: 'Lagos', country: 'PT' }) === pick({ id: 'q', city: 'Lagos', country: 'PT' }), 'Lagos in the Algarve is Portuguese, not adire')
    check(w.COUNTRY_WORLDS.NG.includes(pick({ id: 'n', country: 'NG' })), 'a Nigerian business with no city yet still wears a Nigerian world')

    // 3. Generic screens rotate per view, stable within it.
    check(w.rotateWorld('NG', '/search?q=x') === w.rotateWorld('NG', '/search?q=x') && w.COUNTRY_WORLDS.NG.includes(w.rotateWorld('NG', 'a')), 'a generic view keeps its world on re-render')

    // The pages wear it: the business page footer band and the door strap, for an Enugu business.
    const open = async (path, vw = 1272, vh = 800) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent(path.split('&')[0])}&${path.split('&').slice(1).join('&')}`, { waitUntil: 'networkidle0' })
        await new Promise((r) => setTimeout(r, 500))
        return page
    }
    const worldsOn = (p) => p.evaluate(() => ({
        band: document.querySelector('.lc-pub__city .lc-pub__cityband .lc-pattern')?.getAttribute('class') || '',
        door: document.querySelector('.lc-door__strap .lc-pattern')?.getAttribute('class') || '',
        cover: document.querySelector('.lc-pub .lc-face.lc-pattern, .lc-pub svg.lc-face')?.getAttribute('class') || '',
        footClass: document.querySelector('.lc-pub__city')?.className || '',
        fill: (() => { const r = document.querySelector('.lc-pub__cityband .lc-pattern pattern rect'); return r ? getComputedStyle(r).fill : '' })(),
    }))
    for (const [place, want, light, fill] of [['Enugu,NG', 'uli', true, 'rgb(232, 210, 174)'], ['Kano,NG', 'arewa', false, 'rgb(185, 119, 63)'], ['Benin City,NG', 'benin', false, 'rgb(140, 90, 40)'], ['Braga,PT', 'minho', false, 'rgb(142, 27, 43)'], ['Évora,PT', 'arraiolos', true, 'rgb(241, 230, 209)']]) {
        const p = await open(`/femtos-barbearia&place=${encodeURIComponent(place)}`)
        const v = await worldsOn(p)
        check(v.band.includes(`lc-pattern--${want}`) && v.door.includes(`lc-pattern--${want}`), `${place}: the page band and the door strap wear ${want} (${v.band} | ${v.door})`)
        check(v.fill === fill, `${place}: ${want} draws in its own ground colour (${v.fill})`)
        check(v.footClass.includes('is-light') === light, `${place}: ${light ? 'a light ground is dimmed' : 'a dark ground is not dimmed'} (${v.footClass})`)
        check(p.errors.length === 0, `${place}: no page errors (${p.errors.join('; ')})`)
        await p.close()
    }
    const p = await open('/femtos-barbearia&place=Lagos,NG')
    const v = await worldsOn(p)
    check(v.band.includes('lc-pattern--adire'), `a Lagos business still wears adire (${v.band})`)
    await p.close()
}

// Cities: Porto, Lagos and Lisbon live. The launch area takes both Portuguese metros and Lagos,
// the picked city drives Businesses, Home and Search, prices follow the business currency, and no
// screen, email or search title still puts Lisbon first.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LISBON_FIRST = [
    /Lisbon,? (and )?Porto\b/,
    /Lisbon (&middot;|·) Porto\b/,
    /(?<!and )Lisbon first|Lisbon beta|Greater Lisbon first/,
    /first ten in Lisbon|Cohort 1 (in|·) Lisbon|Lisbon cohort|Lisbon, first cohort/,
    /Lisbon time/,
    /LISBON BUSINESSES|FIRST \d+ LISBON/,
]

const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full, out) }
        else if (/\.(jsx?|mjs|ts|html|webmanifest)$/.test(entry.name)) out.push(full)
    }
    return out
}

export default async ({ check, root, server }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')

    const { inLaunchArea, PT_GROUPS } = await import(pathToFileURL(path.join(root, 'src', 'constants', 'locations.js')).href)
    check(['Porto', 'Matosinhos', 'Vila Nova de Gaia'].every((city) => inLaunchArea('PT', city)), 'Greater Porto is in the launch area')
    check(['Lisbon', 'Cascais'].every((city) => inLaunchArea('PT', city)), 'Greater Lisbon stays in the launch area')
    check(inLaunchArea('NG', 'Lagos'), 'Lagos is in the launch area')
    check(!inLaunchArea('PT', 'Faro') && !inLaunchArea('NG', 'Abuja'), 'places outside the live cities are told we are coming later')
    check(PT_GROUPS[0] === 'Greater Porto', 'the city picker lists Greater Porto first')

    const files = ['src', 'server', 'public', 'supabase/functions', 'supabase/email-templates', 'supabase/templates']
        .flatMap((dir) => walk(path.join(root, ...dir.split('/'))))
        .concat(path.join(root, 'index.html'))
    const stale = []
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8')
        for (const pattern of LISBON_FIRST) {
            const hit = text.match(pattern)
            if (hit) stale.push(`${path.relative(root, file)}: "${hit[0]}"`)
        }
    }
    check(stale.length === 0, `nothing still puts Lisbon first (${stale.join('; ')})`)

    const cohort = read('src/services/cohort.js')
    check(/export const CITIES = \[\s*\{ name: 'Porto'/.test(cohort), 'the first cohort is counted in Porto')
    check(!/is_demo/.test(cohort), 'the cohort count includes the demo business, as Browse does')
    for (const file of ['src/pages/app/auth/AuthShell.jsx']) {
        const text = read(file)
        check(/useCohort\(/.test(text) && !/COHORT_ONBOARDED/.test(text), `${file} shows the live cohort count, not a typed-in number`)
        check(/useCity\(\)/.test(text), `${file} follows the picked city`)
    }
    // The home page shows no business counts until businesses are onboarded; it still speaks to the picked city.
    const cta = read('src/pages/app/home/Cta.jsx')
    check(/useCity\(\)/.test(cta) && !/useCohort|COHORT_ONBOARDED|first ten/i.test(cta), 'the home page closer follows the picked city and shows no business count')

    const engine = read('src/services/engine.js')
    check(/code: 'porto'[^\n]*live: true/.test(engine) && /code: 'lagos'[^\n]*live: true/.test(engine) && /code: 'lisbon'[^\n]*live: true/.test(engine), 'Porto, Lagos and Lisbon are live')
    check(/Africa\/Lagos/.test(engine) && /lc:city/.test(engine), 'the first city comes from the time zone and a change reaches every page')
    check(/<CitySwitcher/.test(read('src/components/common/AppHeader.jsx')) && /<CitySwitcher/.test(read('src/pages/client/ClientLayout.jsx')), 'the city switcher is in the site header and the client app')
    for (const file of ['src/pages/app/Businesses.jsx', 'src/pages/client/Home.jsx', 'src/pages/client/Search.jsx']) {
        const text = read(file)
        check(/useCity\(\)/.test(text) && /inMarket\(/.test(text), `${file} lists places in the picked city`)
    }

    // These modules read the fake Supabase, which looks at the page address once on load.
    const hadWindow = 'window' in globalThis
    if (!hadWindow) globalThis.window = { location: { search: '' } }
    const { inMarket } = await server.ssrLoadModule(path.join(root, 'src', 'services', 'cohort.js'))
    check(inMarket({ market: 'lagos', city: 'Ikeja' }, 'lagos') && !inMarket({ market: 'porto', city: 'Porto' }, 'lagos'), 'a place belongs to its market')
    check(inMarket({ city: 'Lisboa' }, 'lisbon') && inMarket({ city: 'Porto' }, 'porto'), 'a place with no market falls back to its city name')

    const { formatMoney, menuPrice, currencySign } = await server.ssrLoadModule(path.join(root, 'src', 'services', 'business.js'))
    const naira = formatMoney(15000, 'NGN')
    check(naira.includes('\u20a6') && /15,000/.test(naira), `a Lagos price is written in naira (${naira})`)
    check(formatMoney(25, 'EUR').includes('\u20ac') && formatMoney(25).includes('\u20ac'), 'a Porto price stays in euro')
    check(menuPrice(15000, 'NGN').includes('\u20a6') && currencySign('NGN') === '\u20a6' && currencySign('EUR') === '\u20ac', 'menus and price fields use the business currency')
    if (!hadWindow) delete globalThis.window
    check(!/prefix="\u20ac"/.test(read('src/components/business/ServiceEditor.jsx')), 'the service price field shows the business currency')
    const editor = read('src/components/business/ServiceEditor.jsx')
    check(/TRAVEL_MAX = \{ EUR: 500, NGN: 200000 \}/.test(editor) && /serviceProblems\(service, currency\)/.test(editor) && /servicesValid\(services, details\.country === 'NG' \? 'NGN' : 'EUR'\)/.test(read('src/pages/business/Setup.jsx')), 'a Lagos travel fee is checked in naira, not capped at 500')
    check(/country: 'PT',\s*city: 'Porto'/.test(read('src/pages/business/Setup.jsx')), 'a new Portuguese business starts on Porto')
    check(/useState\(startDetails\)/.test(read('src/pages/business/Setup.jsx')) && /city === 'lagos'\) return \{ \.\.\.emptyDetails, country: 'NG', city: 'Lagos', phoneCountry: 'NG' \}/.test(read('src/pages/business/Setup.jsx')), 'a new business starts in the city picked in the header')
    check(/Portugal time/.test(read('src/constants/support.js')), 'support hours are given in Portugal time')
    check(/Porto, Lagos and Lisbon/.test(read('server/seo.mjs')), 'search titles name the live cities first')
}

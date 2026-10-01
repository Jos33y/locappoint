// Cities: Porto first, then Lisbon, then Lagos. The launch area takes both Portuguese metros,
// the first cohort of ten is Porto's, and no screen, email or search title still puts Lisbon first.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LISBON_FIRST = [
    /Lisbon,? (and )?Porto\b/,
    /Lisbon (&middot;|·) Porto\b/,
    /(?<!and )Lisbon first|Lisbon beta|Greater Lisbon first/,
    /first ten in Lisbon|Cohort 1 (in|·) Lisbon|Lisbon cohort|Lisbon, first cohort/,
    /Lisbon time/,
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

export default async ({ check, root }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')

    const { inLaunchArea, PT_GROUPS } = await import(pathToFileURL(path.join(root, 'src', 'constants', 'locations.js')).href)
    check(['Porto', 'Matosinhos', 'Vila Nova de Gaia'].every((city) => inLaunchArea('PT', city)), 'Greater Porto is in the launch area')
    check(['Lisbon', 'Cascais'].every((city) => inLaunchArea('PT', city)), 'Greater Lisbon stays in the launch area')
    check(!inLaunchArea('PT', 'Faro') && !inLaunchArea('NG', 'Lagos'), 'places outside both metros are told we are coming later')
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

    const businesses = read('src/pages/app/Businesses.jsx')
    check(/const CITIES = \[\s*\{ name: 'Porto'/.test(businesses), 'Browse counts the first cohort in Porto')
    check(/country: 'PT',\s*city: 'Porto'/.test(read('src/pages/business/Setup.jsx')), 'a new Portuguese business starts on Porto')
    check(/Portugal time/.test(read('src/constants/support.js')), 'support hours are given in Portugal time')
    check(/Porto, Lisbon and Lagos/.test(read('server/seo.mjs')), 'search titles name Porto first')
}

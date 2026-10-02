// Pricing: no figures anywhere until online payments are live. Free during the beta, a small fee only on
// bookings paid online, the first month of it free, walk-ins never charged, 30 days' notice in the Terms.

import fs from 'node:fs'
import path from 'node:path'

const OLD = [
    /twelve months free|first twelve months|12 months free|first 12 months|12 mo\b/i,
    /€\s?19|19\/mo|nineteen euros|19 euro/i,
    /0% commission|no commission|commission on bookings/i,
    /founder-tier pricing|free trial/i,
]

const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full, out) }
        else if (/\.(jsx?|mjs|ts|html|css|webmanifest)$/.test(entry.name)) out.push(full)
    }
    return out
}

export default async ({ check, root }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
    const files = ['src', 'server', 'public', 'supabase/functions'].flatMap((dir) => walk(path.join(root, ...dir.split('/')))).concat(path.join(root, 'index.html'))
    const stale = []
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8')
        for (const pattern of OLD) {
            const hit = text.match(pattern)
            if (hit) stale.push(`${path.relative(root, file)}: "${hit[0]}"`)
        }
    }
    check(stale.length === 0, `no old pricing anywhere (${stale.join('; ')})`)

    for (const file of ['src/components/common/Appfooter.jsx', 'src/pages/app/Contact.jsx']) {
        const text = read(file)
        check(text.includes('+351 934 695 914') && text.includes('tel:+351934695914') && !/tel:\+351912345678|wa\.me\/351912345678/.test(text), `${file} gives the real phone number`)
    }

    const pricing = read('src/pages/app/home/Pricing.jsx')
    check(/during the beta/i.test(pricing) && /first month/i.test(pricing) && /Walk-ins/.test(pricing), 'the Pricing section says free now, first month free, walk-ins never')
    check(!/\d+(\.\d+)?\s?%/.test(pricing) && !/€\s?[1-9]/.test(pricing), 'the Pricing section shows no fee figures')

    const terms = read('src/pages/app/legal/Terms.jsx')
    check(/at least 30 days before any fee applies/.test(terms) && /It is not an invoice/.test(terms), 'the Terms promise 30 days of notice and say the statement is not an invoice')
    check(!/subscription at any time|billing period/.test(terms), 'the Terms no longer describe a subscription')
}

// Every email the notify function can send: renders, reads right, and passes WCAG AAA at phone and laptop width.
// Adding an email kind without a sample here fails the run.

import path from 'node:path'

const SAMPLE = {
    name: 'Ana & Co',
    business_name: 'Femtos <Barbers>',
    slug: 'femtos',
    address: 'Rua da Rosa 12',
    city: 'Lisbon',
    country: 'PT',
    timezone: 'Europe/Lisbon',
    business_phone: '+351 912 345 678',
    business_whatsapp: '+351 912 345 678',
    auto_confirm: true,
    cancel_cutoff_minutes: 120,
    service_name: 'Skin fade & beard trim with hot towel finish',
    staff_name: 'Rui',
    date: '2026-10-01',
    time: '10:30',
    duration_minutes: 75,
    price: 18.5,
    status: 'confirmed',
    client_name: 'Joe <script>alert(1)</script> Silva',
    client_phone: '+351 911 222 333',
    has_account: false,
    manage_token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
}

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

const CASES = [
    ['welcome_client', {}],
    ['welcome_business', {}],
    ['business_live', {}],
    ['business_live', { auto_confirm: false, name: null }],
    ['booking_confirmed', { audience: 'client' }],
    ['booking_confirmed', { audience: 'client', has_account: true, manage_token: null }],
    ['booking_confirmed', { audience: 'client', country: 'NG', timezone: 'Africa/Lagos', price: 15000, staff_name: null, address: null, city: null, business_whatsapp: null, business_phone: null }],
    ['booking_requested', { audience: 'client', status: 'pending' }],
    ['booking_declined', { audience: 'client', status: 'cancelled' }],
    ['booking_cancelled', { audience: 'client', status: 'cancelled', cancelled_by: 'business' }],
    ['booking_cancelled', { audience: 'business', status: 'cancelled', cancelled_by: 'client' }],
    ['booking_moved', { audience: 'client', moved_from: '2026-09-30T11:00' }],
    ['booking_moved', { audience: 'business', moved_from: '2026-09-30T11:00' }],
    ['booking_reminder', { audience: 'client', date: tomorrow() }],
    ['booking_new', { audience: 'business', price: 0 }],
    ['booking_request', { audience: 'business', status: 'pending' }],
    ['booking_request', { audience: 'business', status: 'pending', moved_from: '2026-09-30T11:00' }],
]

const audit = () => {
    const lum = (c) => {
        const v = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    }
    const bg = (el) => {
        for (; el; el = el.parentElement) {
            const c = getComputedStyle(el).backgroundColor
            if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c
        }
        return 'rgb(255, 255, 255)'
    }
    const fails = []
    let smallest = 99
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
        const node = walker.currentNode
        const el = node.parentElement
        if (!node.textContent.trim() || el.closest('[style*="display:none"]')) continue
        const cs = getComputedStyle(el)
        const size = parseFloat(cs.fontSize)
        smallest = Math.min(smallest, size)
        const a = lum(cs.color)
        const b = lum(bg(el))
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
        if (ratio < (large ? 4.5 : 7)) fails.push(`"${node.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`)
    }
    return { fails, smallest, overflow: document.documentElement.scrollWidth > window.innerWidth }
}

export default async ({ browser, check, server, root }) => {
    const { RENDER } = await server.ssrLoadModule(path.join(root, 'supabase', 'functions', 'notify', 'emails', 'index.ts'))

    const covered = new Set(CASES.map(([kind]) => kind))
    for (const kind of Object.keys(RENDER)) check(covered.has(kind), `${kind} has a sample in tests/suites/emails.mjs`)

    for (const [kind, extra] of CASES) {
        const label = `${kind}${extra.audience ? ` (${extra.audience})` : ''}`
        const row = { id: 'n1', kind, channel: 'email', recipient_email: 'client@example.com', appointment_id: 'appt-1', attempts: 1, payload: { ...SAMPLE, ...extra } }
        let msg = null
        try { msg = RENDER[kind](row) } catch (e) { check(false, `${label} renders: ${e.message}`); continue }
        check(Boolean(msg?.subject) && !/[\r\n]/.test(msg.subject) && msg.subject.length <= 120, `${label} has a one-line subject`)
        check(/^(?:"[^"]+" )?(?:LocAppoint )?<(accounts|bookings)@relay\.locappoint\.com>$/.test(msg.from), `${label} sends from the relay domain: ${msg.from}`)
        const all = `${msg.subject}\n${msg.html}\n${msg.text}`
        check(!/undefined|NaN|\[object |\bnull\b/.test(all), `${label} has no undefined, null or NaN`)
        check(!/[\u2013\u2014]/.test(all), `${label} has no long dashes`)
        check(!msg.html.includes('<script>'), `${label} escapes names`)
        check(![...msg.html.matchAll(/href="([^"]+)"/g)].some(([, href]) => !/^(https:\/\/|mailto:)/.test(href)), `${label} links are https`)
        check(!/<\/?(p|span|td|tr|table|a|br|strong)\b|&[a-z]+;|&#\d+;/i.test(msg.text), `${label} plain text has no markup or entities`)
        if (['booking_confirmed', 'booking_moved'].includes(kind) && extra.audience === 'client') {
            const ics = msg.attachments?.[0] ? Buffer.from(msg.attachments[0].content, 'base64').toString('utf8') : ''
            check(/BEGIN:VEVENT/.test(ics) && /DTSTART:20261001T0930\d{2}Z/.test(ics), `${label} carries a calendar invite at the right UTC time`)
            check(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(msg.html), `${label} offers Google Calendar`)
        }
        if (kind === 'booking_confirmed' && extra.audience === 'client') {
            const guest = extra.has_account !== true
            check(guest === /\/b\/[a-f0-9]{32,}/.test(msg.html), `${label} links to the manage page when it has a link`)
            check(guest === /Create a free account/.test(msg.html), `${label} invites guests to make an account, and only guests`)
        }

        for (const width of [375, 620]) {
            const page = await browser.newPage()
            await page.setViewport({ width, height: 900 })
            await page.setContent(msg.html)
            const r = await page.evaluate(audit)
            await page.close()
            check(r.fails.length === 0, `${label} at ${width}px passes AAA contrast ${r.fails.join(', ')}`)
            check(r.smallest >= 12, `${label} at ${width}px has no text under 12px (smallest ${r.smallest}px)`)
            check(!r.overflow, `${label} at ${width}px does not scroll sideways`)
        }
    }
}

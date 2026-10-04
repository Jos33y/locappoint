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

const WEEK = { from: '2026-09-21', to: '2026-09-27', online: { count: 12, value: 286.5 }, added: { count: 4, value: 72 }, fee: 10.71, due: 0, beta: true }

const RECEIPT = {
    kind: 'payment',
    number: 'FEM-00012',
    token: 'a'.repeat(32),
    business: { name: 'Femtos <Barbers>', address: 'Rua da Rosa 12', city: 'Lisbon' },
    booking: { service: 'Skin fade & beard trim', date: '2026-10-01', time: '10:30' },
    lines: [{ label: 'Skin fade & beard trim', amount: 18.5 }, { label: 'Locappoint service fee', amount: 0.49 }],
    total: 18.99,
    currency: 'EUR',
    method: 'card',
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
    ['booking_confirmed', { audience: 'client', price: 0 }],
    ['booking_requested', { audience: 'client', status: 'pending' }],
    ['booking_declined', { audience: 'client', status: 'cancelled' }],
    ['booking_cancelled', { audience: 'client', status: 'cancelled', cancelled_by: 'business' }],
    ['booking_cancelled', { audience: 'business', status: 'cancelled', cancelled_by: 'client' }],
    ['booking_moved', { audience: 'client', moved_from: '2026-09-30T11:00' }],
    ['booking_moved', { audience: 'business', moved_from: '2026-09-30T11:00' }],
    ['booking_reminder', { audience: 'client', date: tomorrow() }],
    ['booking_new', { audience: 'business', price: 0 }],
    ['visit_followup', { audience: 'client', date: '2026-09-28', suggested_date: '2026-10-26', gap_days: 28, visits: 3 }],
    ['visit_followup', { audience: 'client', suggested_date: null, gap_days: null, visits: 1, staff_name: null, manage_token: null, has_account: true }],
    ['visit_followup', { audience: 'client', date: '2026-09-28', suggested_date: '2026-10-26', gap_days: 28, ask_review: false }],
    ['visit_followup', { audience: 'client', date: '2026-09-28', booked_again: true }],
    ['review_new', { audience: 'business', rating: 4, review_id: '0f6c2b8e-4d1a-4c8e-9b7a-2f1e3d4c5b6a', body: 'Great <b>fade</b>, and on time.\nWould book again.' }],
    ['review_new', { audience: 'business', rating: 1, body: null }],
    ['review_reply', { audience: 'client', rating: 5, body: 'Best cut in Lisbon & worth it.', reply: 'Thank you <Ana>, see you next month.' }],
    ['review_reply', { audience: 'client', rating: 3, body: null, reply: 'Thanks for coming.', manage_token: null }],
    ['booking_request', { audience: 'business', status: 'pending' }],
    ['booking_request', { audience: 'business', status: 'pending', moved_from: '2026-09-30T11:00' }],
    ['weekly_statement', { audience: 'business', ...WEEK }],
    ['weekly_statement', { audience: 'business', ...WEEK, online: { count: 0, value: 0 }, fee: 0, name: null }],
    ['weekly_statement', { audience: 'business', ...WEEK, from: '2026-09-28', to: '2026-10-04', country: 'NG', fee: null, online: { count: 1, value: 15000 }, added: { count: 0, value: 0 } }],
    ['booking_confirmed', { audience: 'client', mode: 'online', meeting_url: 'https://meet.example.com/femtos-rui' }],
    ['booking_requested', { audience: 'client', mode: 'online', status: 'pending', meeting_url: 'https://meet.example.com/femtos-rui' }],
    ['booking_confirmed', { audience: 'client', mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12, 2 Esq', client_landmark: 'Blue door', travel_fee: 5 }],
    ['booking_new', { audience: 'business', mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12, 2 Esq', client_landmark: 'Blue door', travel_fee: 5 }],
    ['booking_request', { audience: 'business', mode: 'at_client', status: 'pending', client_zone: 'Matosinhos', travel_fee: 5 }],
    ['receipt', { audience: 'client', ...RECEIPT }],
    ['receipt', { audience: 'client', ...RECEIPT, kind: 'refund', number: 'FEM-00013', refund_of: 'FEM-00012', lines: [{ label: 'Cancelled after free cancellation closed', amount: 9.25 }], total: 9.25 }],
    ['receipt', { audience: 'client', ...RECEIPT, kind: 'visit', number: 'FEM-00014', method: 'at_visit', lines: [{ label: 'Skin fade', amount: 18.5 }], total: 18.5, client_name: null }],
    ['trip_on_way', { audience: 'client', mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12, 2 Esq', minutes: 14, eta: '10:16', by: 'Rui' }],
    ['trip_on_way', { audience: 'client', mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12, 2 Esq', minutes: 0, eta: null, by: null, manage_token: null, client_name: null }],
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
        check(/hello@locappoint\.com/.test(msg.html) && /hello@locappoint\.com/.test(msg.text) && !/support@/.test(all), `${label} gives hello@ as the contact, never support@`)
        check(/41\.1579&deg;N/.test(msg.html), `${label} is stamped with Porto`)
        check(![...msg.html.matchAll(/href="([^"]+)"/g)].some(([, href]) => !/^(https:\/\/|mailto:)/.test(href)), `${label} links are https`)
        check(!/<\/?(p|span|td|tr|table|a|br|strong)\b|&[a-z]+;|&#\d+;/i.test(msg.text), `${label} plain text has no markup or entities`)
        if (['booking_confirmed', 'booking_moved'].includes(kind) && extra.audience === 'client') {
            const ics = msg.attachments?.[0] ? Buffer.from(msg.attachments[0].content, 'base64').toString('utf8') : ''
            check(/BEGIN:VEVENT/.test(ics) && /DTSTART:20261001T0930\d{2}Z/.test(ics), `${label} carries a calendar invite at the right UTC time`)
            check(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(msg.html), `${label} offers Google Calendar`)
        }
        if (kind === 'visit_followup') {
            const linked = Boolean(extra.manage_token !== null)
            const ask = extra.ask_review !== false
            const offer = extra.booked_again !== true
            check(!linked || !offer || /\/b\/[a-f0-9]{32,}\?again=1/.test(msg.html), `${label} books again through the manage link`)
            check(!linked || /\/b\/[a-f0-9]{32,}\?stop=1/.test(msg.html), `${label} stops emails through the manage link`)
            check(ask === ([1, 2, 3, 4, 5].every((n) => msg.html.includes(`rate=${n}"`)) || (!linked && /rate=appt-1/.test(msg.html))), `${label} asks for stars only when there is no review yet`)
            check(offer === /Book again/.test(msg.html), `${label} offers Book again only when nothing is booked`)
            check(ask ? /^How was/.test(msg.subject) : /^Book your next/.test(msg.subject), `${label} subject leads with the ask: ${msg.subject}`)
            check(/Stop follow-up emails/.test(msg.html) && /Stop follow-up emails/.test(msg.text), `${label} always offers a way to stop`)
            check(!extra.gap_days || !offer || /every 4 weeks/.test(msg.html), `${label} explains the suggested day`)
            check(!msg.attachments, `${label} carries no calendar invite`)
        }
        if (extra.mode === 'online') {
            const confirmed = extra.status !== 'pending'
            check(!msg.html.includes('Rua da Rosa') && /Online/.test(msg.html), `${label} online: no address, says it is online`)
            check(msg.html.includes('meet.example.com/femtos-rui') === confirmed && msg.text.includes('meet.example.com/femtos-rui') === confirmed, `${label} online: the join link ${confirmed ? 'is there once confirmed' : 'waits for the confirmation'}`)
            if (confirmed) {
                const ics = msg.attachments?.[0] ? Buffer.from(msg.attachments[0].content, 'base64').toString('utf8') : ''
                check(/LOCATION:https:\/\/meet\.example\.com\/femtos-rui/.test(ics), `${label} online: the calendar invite opens the meeting`)
            }
        }
        if (extra.mode === 'at_client') {
            check(!msg.html.includes('Rua da Rosa') && /Matosinhos/.test(msg.html), `${label} home visit: the client's area, never the business address`)
            check(msg.html.includes('Rua das Flores') === Boolean(extra.client_address), `${label} home visit: the address ${extra.client_address ? 'once confirmed' : 'waits for the confirmation'}`)
        }
        if (kind === 'receipt') {
            check(/not a tax invoice/.test(msg.html) && /not a tax invoice/.test(msg.text), `${label} says it is proof of payment, not a tax invoice`)
            check(msg.html.includes(`/r/${'a'.repeat(32)}`) && msg.text.includes(`/r/${'a'.repeat(32)}`), `${label} links to the receipt page`)
            check(msg.subject.includes(extra.number), `${label} has its number in the subject: ${msg.subject}`)
            check(!msg.html.includes('<Barbers>'), `${label} escapes the business name`)
            if (extra.kind === 'refund') check(/Refunded/.test(msg.html) && /FEM-00012/.test(msg.html), `${label} says what it refunds`)
        }
        if (kind === 'trip_on_way') {
            const linked = extra.manage_token !== null
            check(/is on the way, about \d+ min$/.test(msg.subject), `${label} subject says how long: ${msg.subject}`)
            check(linked ? /\/b\/[a-f0-9]{32,}/.test(msg.html) && /\/b\/[a-f0-9]{32,}/.test(msg.text) : /\/client\/appointments\?booking=appt-1/.test(msg.html), `${label} follows live on the booking`)
            check(/never where they are/.test(msg.html) && /never where they are/.test(msg.text), `${label} says only minutes are shared`)
            check(!extra.eta || (msg.html.includes(extra.eta) && msg.text.includes(extra.eta)), `${label} gives the arrival time`)
            check(!msg.attachments, `${label} carries no calendar invite`)
        }
        if (kind === 'weekly_statement') {
            const online = extra.online.count > 0
            const priced = extra.fee !== null
            check(/You pay/.test(msg.html) && /Free during the beta/.test(msg.html) && /statement, not a bill/.test(msg.text), `${label} says there is nothing to pay and that it is not a bill`)
            check((online && priced) === /line-through;[^>]*>\s*LocAppoint fee/.test(msg.html), `${label} strikes the fee only when there is one`)
            check(extra.added.count > 0 === /Never a fee/.test(msg.html), `${label} lists walk-ins as never carrying a fee`)
            check(new RegExp(`/portal/insights\\?statement=${extra.from}`).test(msg.html), `${label} opens the statement in Insights`)
            check(/to pay$/.test(msg.subject) && (extra.country === 'NG' ? /NGN|\u20A6/.test(msg.subject) : /\u20AC0 to pay/.test(msg.subject)), `${label} subject ends on what is owed: ${msg.subject}`)
            check(!msg.attachments, `${label} carries no calendar invite`)
        }
        if (kind === 'review_new') {
            check(/\/portal\/reviews/.test(msg.html) && !msg.html.includes('<b>fade</b>'), `${label} links to Reviews and escapes the review`)
            check(msg.subject.includes(`${extra.rating} out of 5`), `${label} subject has the rating`)
        }
        if (kind === 'review_reply') {
            check(!msg.html.includes('<Ana>') && /Stop follow-up emails/.test(msg.html), `${label} escapes the reply and offers a way to stop`)
        }
        if (['booking_confirmed', 'booking_requested', 'booking_moved', 'booking_reminder'].includes(kind) && extra.audience === 'client') {
            const priced = extra.price !== 0
            check(priced === /Nothing is charged online/.test(msg.html), `${label} says the visit is paid there, and only for a priced service`)
            check(priced === /Pay at your visit\. Nothing is charged online\./.test(msg.text), `${label} plain text says how the visit is paid`)
        }
        if (extra.audience === 'business') check(!/Nothing is charged online/.test(msg.html), `${label} does not tell the owner how clients pay`)
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

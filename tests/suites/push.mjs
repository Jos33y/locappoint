// Push notifications: what each one says, how it reaches Firebase, the ask in the app, the Settings switch,
// taps that open the booking, and phones forgotten on sign-out.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, server, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const fn = (file) => path.join(root, 'supabase', 'functions', 'notify', file)

    // What they say
    const { renderPush, PUSH_KINDS } = await server.ssrLoadModule(fn('push.ts'))
    const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', 'push.sql'), 'utf8')
    const listed = (audience) => (sql.match(new RegExp(`NEW.audience = '${audience}' AND NEW.kind IN \\(([^)]+)\\)`)) || [])[1]?.match(/'([a-z_]+)'/g)?.map((k) => k.slice(1, -1)) || []
    for (const audience of ['business', 'client']) {
        const queued = listed(audience)
        check(queued.length > 0 && queued.every((k) => PUSH_KINDS[audience].includes(k)) && PUSH_KINDS[audience].every((k) => queued.includes(k)), `every ${audience} push the database queues has words, and no others: ${queued.join(', ')}`)
    }

    const day = (offset) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date(Date.now() + offset * 86_400_000))
    const row = (kind, audience, extra = {}) => ({
        id: 'q1', kind, channel: 'push', recipient_email: null, appointment_id: 'appt-1', attempts: 1,
        payload: { audience, business_name: 'Femtos Barbearia', client_name: 'Rui Costa', service_name: 'Haircut and beard', date: day(1), time: '10:30:00', timezone: 'Europe/Lisbon', address: 'Rua da Rosa 112', city: 'Lisbon', ...extra },
    })
    for (const audience of ['business', 'client']) {
        for (const kind of PUSH_KINDS[audience]) {
            const p = renderPush(row(kind, audience))
            const all = p ? `${p.title} ${p.body}` : ''
            check(Boolean(p?.title && p?.body) && p.title.length <= 60 && p.body.length <= 180 && !/[—–]/.test(all) && !/undefined|null|NaN/.test(all), `${audience} ${kind} reads cleanly: ${all}`)
            check(p?.link === (audience === 'business' ? '/portal/calendar?booking=appt-1' : '/client/appointments?booking=appt-1'), `${audience} ${kind} opens the booking: ${p?.link}`)
        }
    }
    check(renderPush(row('booking_new', 'business')).body === 'Rui Costa booked Haircut and beard, tomorrow at 10:30.', `a new booking says who, what and when: ${renderPush(row('booking_new', 'business')).body}`)
    check(renderPush(row('booking_reminder', 'client')).title === 'Tomorrow at 10:30', 'the day-before reminder leads with when')
    check(renderPush(row('booking_reminder', 'client', { date: day(0) })).title === 'Today at 10:30', 'the two-hour reminder says today')
    check(/on [A-Z][a-z]+day \d+ [A-Z]/.test(renderPush(row('booking_declined', 'client', { date: day(5) })).body), `a later day reads naturally: ${renderPush(row('booking_declined', 'client', { date: day(5) })).body}`)
    check(renderPush(row('booking_request', 'business', { moved_from: '2026-10-01T10:00' })).title === 'Moved, needs your OK', 'a move that needs approval says so')
    const { TRIP_KINDS } = await server.ssrLoadModule(fn('push.ts'))
    for (const kind of TRIP_KINDS) {
        const p = renderPush(row(kind, 'client', { minutes: 12, by: 'Rui' }))
        const all = p ? `${p.title} ${p.body}` : ''
        check(Boolean(p?.title && p?.body) && p.title.length <= 60 && !/[\u2013\u2014]/.test(all) && !/undefined|null|NaN/.test(all), `trip ${kind} reads cleanly: ${all}`)
    }
    check(renderPush(row('trip_close', 'client', { minutes: 3 })).title === 'Almost there' && renderPush(row('trip_close', 'client', { minutes: 10 })).title === 'About 10 min away', 'a trip says how many minutes, then almost there')
    check(renderPush(row('trip_on_way', 'client', { minutes: 15, by: 'Rui' })).body === 'Rui from Femtos Barbearia is on the way, about 15 min.', 'on the way says who and how long')
    check(renderPush(row('review_new', 'business')) === null && renderPush(row('booking_requested', 'client')) === null, 'kinds without a push send none')

    // How it reaches Firebase
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
    const account = { project_id: 'locappoint-test', client_email: 'push@locappoint-test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }
    const realFetch = globalThis.fetch
    const hadDeno = 'Deno' in globalThis
    const sent = []
    let fcmReply = { status: 200, body: { name: 'projects/locappoint-test/messages/1' } }
    globalThis.Deno = { env: { get: (k) => (k === 'FCM_SERVICE_ACCOUNT' ? JSON.stringify(account) : undefined) } }
    globalThis.fetch = async (to, init) => {
        sent.push({ to: String(to), init })
        if (String(to).startsWith('https://oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 'ya29.test', expires_in: 3600 }), { status: 200 })
        return new Response(JSON.stringify(fcmReply.body), { status: fcmReply.status })
    }
    try {
        const { fcmAccount, sendPush } = await server.ssrLoadModule(fn('fcm.ts'))
        const acct = fcmAccount()
        check(acct?.project_id === 'locappoint-test', 'the service account secret is read')
        const push = renderPush(row('booking_new', 'business'))
        const first = await sendPush(acct, 'phone-token-1', push, { kind: 'booking_new', tag: 'appt-1' })
        const auth = sent.find((s) => s.to.startsWith('https://oauth2'))
        const assertion = auth ? new URLSearchParams(auth.init.body).get('assertion') : ''
        const [head, claim, sig] = assertion.split('.')
        const claims = claim ? JSON.parse(Buffer.from(claim, 'base64url').toString()) : {}
        const verified = sig ? crypto.verify('sha256', Buffer.from(`${head}.${claim}`), crypto.createPublicKey(privateKey), Buffer.from(sig, 'base64url')) : false
        check(verified && claims.scope === 'https://www.googleapis.com/auth/firebase.messaging' && claims.iss === account.client_email, 'Google gets a correctly signed request for messaging only')
        const msg = sent.find((s) => s.to.includes('fcm.googleapis.com'))
        const body = msg ? JSON.parse(msg.init.body).message : {}
        check(msg?.to === 'https://fcm.googleapis.com/v1/projects/locappoint-test/messages:send' && msg.init.headers.Authorization === 'Bearer ya29.test', 'the push goes to this project with the token')
        check(body.token === 'phone-token-1' && body.notification.title === 'New booking' && body.data.link === '/portal/calendar?booking=appt-1', 'it carries the words and the link to open')
        check(body.android.notification.channel_id === 'bookings' && body.android.notification.icon === 'ic_stat_locappoint' && body.android.notification.tag === 'appt-1' && body.android.priority === 'HIGH', 'Android shows it on the Bookings channel with our icon, one per booking')
        check(first.ok === true, 'a delivered push reports success')
        await sendPush(acct, 'phone-token-2', push, { kind: 'booking_new', tag: 'appt-1' })
        check(sent.filter((s) => s.to.startsWith('https://oauth2')).length === 1, 'the Google token is reused, not fetched per push')
        fcmReply = { status: 404, body: { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } }
        const gone = await sendPush(acct, 'phone-token-3', push, { kind: 'booking_new', tag: 'appt-1' })
        check(gone.ok === false && gone.gone === true, 'a phone that removed the app is marked for forgetting')
        fcmReply = { status: 503, body: { error: { status: 'UNAVAILABLE' } } }
        const busy = await sendPush(acct, 'phone-token-4', push, { kind: 'booking_new', tag: 'appt-1' })
        check(busy.ok === false && busy.gone === false, 'a Firebase hiccup is retried, the phone kept')
    } finally {
        globalThis.fetch = realFetch
        if (!hadDeno) delete globalThis.Deno
    }

    // In the app
    const open = async (route, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(route)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    const sheet = (p) => p.evaluate(() => document.querySelector('.ui-sheet')?.textContent || '')
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const sheetBtn = (p, label) => p.evaluate((l) => [...document.querySelectorAll('.ui-sheet .ui-btn')].find((b) => b.textContent.trim() === l)?.click(), label)

    let p = await open('/portal', 390, 844, '&native=android&push=prompt')
    await wait(1800)
    check(/Turn on notifications/.test(await sheet(p)) && /New bookings, requests, moves and cancellations/.test(await sheet(p)), 'the Android app asks an owner once, in our words first')
    check((await p.evaluate(() => window.__pushCalls)).length === 0, 'the phone prompt waits for a yes')
    await sheetBtn(p, 'Turn on')
    await wait(500)
    check((await p.evaluate(() => window.__pushCalls.join(','))) === 'request,channel:bookings,register', `then the phone asks, the Bookings channel is made, and the phone signs up: ${await p.evaluate(() => window.__pushCalls.join(','))}`)
    const saved = await rpcs(p, 'register_push_token')
    check(saved.length === 1 && saved[0].p_token === 'fake-fcm-token-0123456789abcdef' && saved[0].p_platform === 'android', 'the phone is saved to the account')
    check(!(await sheet(p)), 'and the ask closes')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal', 390, 844, '&native=android&push=prompt')
    await wait(1800)
    await sheetBtn(p, 'Not now')
    await wait(300)
    check((await p.evaluate(() => window.__pushCalls.length)) === 0 && (await p.evaluate(() => localStorage.getItem('locappoint_push_asked'))) === '1', 'Not now leaves the phone alone and is remembered')
    await p.close()

    p = await open('/portal', 390, 844, '&native=android&push=prompt&asked=1')
    await wait(1800)
    check(!(await sheet(p)), 'once asked, never nagged')
    await p.close()

    p = await open('/portal', 390, 844, '&native=android&push=prompt&tour=1')
    await wait(1800)
    check(!/Turn on notifications/.test(await sheet(p)), 'the ask waits while the first-run tour is open')
    await p.close()

    p = await open('/client', 390, 844, '&native=android&push=prompt&nobiz=1')
    await wait(1800)
    check(/a reminder the day before and two hours before/.test(await sheet(p)), 'clients are asked in their own words')
    await p.close()

    for (const [extra, label] of [['&push=prompt', 'the website'], ['&native=ios&push=prompt', 'the iPhone app, until Apple push is set up']]) {
        p = await open('/portal', 390, 844, extra)
        await wait(1800)
        check(!(await sheet(p)) && !(await p.evaluate(() => (window.__pushCalls || []).length)), `${label} never asks`)
        await p.close()
    }

    // Already allowed: connects quietly, and a tap opens the booking
    p = await open('/portal', 390, 844, '&native=android&push=granted')
    await wait(400)
    check(!(await sheet(p)) && (await rpcs(p, 'register_push_token')).length === 1, 'with permission already given, the phone connects without asking')
    await p.evaluate(() => window.__pushTap('/portal/calendar?booking=a1'))
    await wait(700)
    check(await p.evaluate(() => window.__path === '/portal/calendar'), 'tapping a notification opens the booking in the calendar')
    await p.evaluate(() => window.__pushTap('https://evil.example/x'))
    await wait(300)
    check(await p.evaluate(() => window.__path === '/portal/calendar'), 'links that leave the app are ignored')
    await p.close()

    // Settings
    const setRow = (p) => p.evaluate(() => {
        const t = [...document.querySelectorAll('.biz-st__rowtitle')].find((e) => /Phone notifications/.test(e.textContent))
        const r = t?.closest('.biz-st__row')
        const s = r?.querySelector('[role="switch"]')
        return r ? { text: r.textContent, on: s?.getAttribute('aria-checked'), disabled: s?.disabled, link: r.querySelector('a')?.getAttribute('href') } : null
    })
    p = await open('/portal/settings', 390, 844, '&native=android&push=granted&asked=1')
    let r = await setRow(p)
    check(r?.on === 'true' && /on this phone/.test(r.text), 'Settings shows notifications on for this phone')
    await p.evaluate(() => [...document.querySelectorAll('.biz-st__row [role="switch"]')].find((s) => s.getAttribute('aria-label') === 'Phone notifications').click())
    await wait(400)
    r = await setRow(p)
    check(r?.on === 'false' && (await rpcs(p, 'set_push_enabled')).some((a) => a.p_on === false), 'switching off saves it to the account')
    await p.evaluate(() => [...document.querySelectorAll('.biz-st__row [role="switch"]')].find((s) => s.getAttribute('aria-label') === 'Phone notifications').click())
    await wait(400)
    check((await setRow(p))?.on === 'true' && (await rpcs(p, 'set_push_enabled')).some((a) => a.p_on === true), 'and back on')
    await p.close()

    p = await open('/portal/settings', 390, 844, '&native=android&push=prompt&asked=1&pushoff=1')
    r = await setRow(p)
    check(r?.on === 'false', 'someone who switched it off sees it off')
    await p.evaluate(() => [...document.querySelectorAll('.biz-st__row [role="switch"]')].find((s) => s.getAttribute('aria-label') === 'Phone notifications').click())
    await wait(500)
    check((await p.evaluate(() => window.__pushCalls.join(','))).startsWith('request') && (await setRow(p))?.on === 'true', 'switching on from Settings asks the phone, then turns on')
    await p.close()

    p = await open('/portal/settings', 390, 844, '&native=android&push=denied&asked=1')
    r = await setRow(p)
    check(r?.disabled === true && /Blocked on this phone/.test(r.text), 'blocked in the phone settings says where to fix it')
    await p.close()

    p = await open('/client/profile', 390, 844, '&nobiz=1')
    r = await setRow(p)
    check(r?.link === '/app' && !r.on, 'the website points to the app instead of a switch')
    await p.close()
    p = await open('/client/profile', 390, 844, '&nobiz=1&native=ios')
    r = await setRow(p)
    check(/Soon/.test(r?.text || '') && !r.link, 'the iPhone app says it is coming')
    await p.close()

    // Signing out everywhere forgets every phone
    p = await open('/portal/settings', 390, 844, '&native=android&push=granted&asked=1')
    await p.evaluate(() => [...document.querySelectorAll('.biz-st .ui-btn')].find((b) => /Sign out everywhere/.test(b.textContent))?.click())
    await wait(500)
    await sheetBtn(p, 'Sign out everywhere')
    await wait(500)
    check((await rpcs(p, 'forget_push_token')).some((a) => a.p_token === null), 'signing out everywhere forgets every phone')
    await p.close()

    for (const w of [320, 390]) {
        p = await open('/portal', w, 640, '&native=android&push=prompt')
        await wait(1800)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && Boolean(document.querySelector('.lc-sys-push__acts'))), `the ask fits at ${w}px`)
        await p.close()
    }
}

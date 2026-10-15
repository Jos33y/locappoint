// Sign-up and sign-in: one sign-up with no client-or-business question (where people came from says
// it), Google first, a show-password button, the city's phone format, no business count, the side panel
// in the visitor's city, and a form that fits every phone without iPhone zoom.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 900, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}&guest=1&nobiz=1${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    const fill = async (p, values) => {
        for (const [name, value] of Object.entries(values)) await p.type(`.auth-form input[name="${name}"]`, value)
    }

    // An owner arriving from the home page or Browse (?as=business, or userType: 'business' in state).
    let p = await open('/auth?tab=signup&as=business')
    let view = await p.evaluate(() => ({
        title: document.querySelector('.auth-head__title')?.textContent,
        choice: Boolean(document.querySelector('input[name="userType"], .auth-toggle')),
        googleFirst: (() => {
            const g = document.querySelector('.auth-oauth--google')
            const f = document.querySelector('.auth-form')
            return Boolean(g && f && (g.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING))
        })(),
        scene: document.querySelector('.auth-brand')?.className,
        text: document.body.innerText,
    }))
    check(/Get found and booked/.test(view.title || ''), `an owner sees the owner headline: ${view.title}`)
    check(!view.choice, 'nobody is asked whether they are a client or a business')
    check(view.googleFirst, 'Google comes before the email form')
    check(/is-owner/.test(view.scene || ''), `the side panel shows the owner's day: ${view.scene}`)
    check(!/Cohort 1|\d+\s*(\/|of)\s*\d+\s*(businesses)?\s*live/i.test(view.text), 'no business count on sign-up')
    await fill(p, { full_name: 'Ada Okafor', phone: '+234 803 123 4567', email: 'ada@example.com', password: 'secret12', confirmPassword: 'secret12' })
    await p.click('.auth-submit')
    await wait(500)
    let sent = await p.evaluate(() => window.__signup)
    check(sent?.data?.user_type === 'business', `an owner's account is saved as a business, for the welcome email and first screen: ${JSON.stringify(sent?.data)}`)
    await p.close()

    // Anyone else signing up: a neutral account that lands in the client area.
    p = await open('/auth?tab=signup', 1272, 900, '&city=lagos')
    view = await p.evaluate(() => ({
        title: document.querySelector('.auth-head__title')?.textContent,
        scene: document.querySelector('.auth-brand')?.className,
        phone: document.querySelector('.auth-form input[name="phone"]')?.placeholder,
    }))
    check(/Create your Locappoint account/.test(view.title || ''), `a neutral sign-up has a neutral headline: ${view.title}`)
    check(/is-ticket/.test(view.scene || ''), 'and shows the ticket a client keeps')
    check(view.phone === '+234 803 123 4567', `the phone example follows the city: ${view.phone}`)
    await fill(p, { full_name: 'Tolu Bello', phone: '+234 803 000 0000', email: 'tolu@example.com', password: 'secret12', confirmPassword: 'secret12' })
    await p.click('.auth-submit')
    await wait(500)
    sent = await p.evaluate(() => window.__signup)
    check(sent?.data?.user_type === 'client', `a neutral sign-up is saved as a client account: ${JSON.stringify(sent?.data)}`)
    await p.close()

    // Sign in: the owner's day waiting, the password can be shown, Forgot is easy to find.
    p = await open('/auth?tab=signin')
    check(/is-welcome/.test(await p.evaluate(() => document.querySelector('.auth-brand')?.className)), 'sign-in shows the day waiting')
    await p.type('.auth-form input[name="password"]', 'secret12')
    const before = await p.evaluate(() => document.querySelector('.auth-form input[name="password"]').type)
    await p.click('.auth-field__eye')
    const after = await p.evaluate(() => ({ type: document.querySelector('.auth-form input[name="password"]').type, pressed: document.querySelector('.auth-field__eye').getAttribute('aria-pressed'), label: document.querySelector('.auth-field__eye').getAttribute('aria-label') }))
    check(before === 'password' && after.type === 'text' && after.pressed === 'true' && after.label === 'Show password', `the password can be shown and hidden again: ${JSON.stringify(after)}`)
    const forgot = await p.evaluate(() => { const a = document.querySelector('.auth-field__aux'); return a ? parseFloat(getComputedStyle(a).fontSize) : 0 })
    check(forgot >= 14, `Forgot is full size: ${forgot}px`)
    check(!p.errors.length, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    // Every phone: no side panel, the city row on top, nothing off the side, no text under 12px,
    // and inputs at 16px so iPhones do not zoom in.
    for (const [vw, vh] of [[320, 640], [390, 844], [820, 1180]]) {
        p = await open('/auth?tab=signup&as=business', vw, vh, '&city=porto')
        const fit = await p.evaluate(() => {
            const shown = (e) => e && e.getBoundingClientRect().height > 0
            const sel = '.auth-page h1, .auth-page p, .auth-page label, .auth-page button, .auth-page a, .auth-page span, .auth-page input'
            const tiny = [...document.querySelectorAll(sel)].filter((e) => shown(e) && (e.tagName === 'INPUT' || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className || e.tagName)
            const inputs = [...document.querySelectorAll('.auth-form input')].map((i) => parseFloat(getComputedStyle(i).fontSize))
            return {
                overflow: document.documentElement.scrollWidth > innerWidth,
                panel: shown(document.querySelector('.auth-brand')),
                band: shown(document.querySelector('.auth-mobile-band')),
                tiny,
                inputs: Math.min(...inputs),
            }
        })
        check(!fit.overflow && !fit.panel && fit.band, `${vw}px: the form fills the screen with the city row on top: ${JSON.stringify({ ...fit, tiny: undefined })}`)
        check(!fit.tiny.length, `${vw}px: no text under 12px: ${fit.tiny.join(', ')}`)
        if (vw <= 480) check(fit.inputs >= 16, `${vw}px: fields are 16px, so iPhones do not zoom: ${fit.inputs}px`)
        await p.close()
    }
}

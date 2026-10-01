// Apps: inside the phone apps links point at the website, files go to the share sheet, and the download page offers the Android file.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    const openPoster = (p) => p.evaluate(() => [...document.querySelectorAll('.lc-channel__action .ui-btn')].find((b) => /QR poster/.test(b.textContent))?.click())

    // In the app, shared links and the poster point at locappoint.com, never at the app's local address
    let p = await open('/portal/channels', 390, 844, '&native=1')
    check(await p.evaluate(() => /^locappoint\.com\/femtos-barbearia$/.test(document.querySelector('.lc-channel__detail')?.textContent || '')), `the booking link is the website link: ${await p.evaluate(() => document.querySelector('.lc-channel__detail')?.textContent)}`)
    await openPoster(p)
    await wait(600)
    check(await p.evaluate(() => /locappoint\.com\/femtos-barbearia/.test(document.querySelector('.lc-poster-sheet .lc-poster__link')?.textContent || '')), 'the poster prints the website link')
    const buttons = await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .lc-poster-sheet__acts .ui-btn')].map((b) => b.textContent.trim()))
    check(!buttons.some((t) => /^Print$/.test(t)) && buttons.some((t) => /Save or print the poster/.test(t)), `the app offers save or print instead of a print button it cannot use: ${buttons.join(', ')}`)
    check(p.errors.length === 0, `no page errors in app mode: ${p.errors.join(' | ')}`)
    await p.close()

    // The website keeps its print button and local links
    p = await open('/portal/channels', 1272, 900)
    await openPoster(p)
    await wait(600)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-btn')].some((b) => /^Print$/.test(b.textContent.trim()))), 'the website still prints directly')
    await p.close()

    // The share sheet in the app has the phone's own share option
    p = await open('/portal', 390, 844, '&native=1')
    await p.evaluate(() => document.querySelector('.biz-topbar__share')?.click())
    await wait(500)
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-share__actions button')].some((b) => /More/.test(b.textContent))), 'the app adds the phone share sheet next to copy and WhatsApp')
    await p.close()
    p = await open('/portal', 390, 844)
    await p.evaluate(() => document.querySelector('.biz-topbar__share')?.click())
    await wait(500)
    check(await p.evaluate(() => ![...document.querySelectorAll('.biz-share__actions button')].some((b) => /More/.test(b.textContent))), 'the website keeps copy and WhatsApp only')
    await p.close()

    // Download page
    p = await open('/app', 390, 844, '&guest=1&nobiz=1&release=1')
    const android = await p.evaluate(() => {
        const a = [...document.querySelectorAll('.lc-dl-card a')].find((l) => /Download for Android/.test(l.textContent))
        return { href: a?.getAttribute('href') || '', text: document.querySelector('.lc-dl-card')?.textContent || '' }
    })
    check(/\/storage\/v1\/object\/public\/downloads\/locappoint-1\.0\.7\.apk$/.test(android.href), `Android downloads the published file: ${android.href}`)
    check(/Version 1\.0\.7, 6\.0 MB/.test(android.text), 'the version and size are shown')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-dl-card a')].some((l) => /Ask for an invite/.test(l.textContent) && l.getAttribute('href').startsWith('mailto:hello@locappoint.com'))), 'iPhone asks for a TestFlight invite')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the download page fits a phone')
    check(p.errors.length === 0, `no page errors on the download page: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/app', 390, 844, '&guest=1&nobiz=1&release=none')
    check(await p.evaluate(() => /on its way/.test(document.querySelector('.lc-dl-card')?.textContent || '') && !document.querySelector('.lc-dl-card a[href$=".apk"]')), 'before the first build it says the Android app is coming, with no dead link')
    await p.close()

    p = await open('/app', 1272, 900, '&guest=1&nobiz=1&release=1')
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.lc-dl__scan')).display !== 'none' && Boolean(document.querySelector('.lc-dl__scan svg path'))), 'on a computer a code opens the page on the phone')
    await p.close()

    // The phone reading the page decides which button leads
    p = await open('/app', 390, 844, '&guest=1&nobiz=1&release=1&device=ios')
    check(await p.evaluate(() => /Ask for an iPhone invite/.test(document.querySelector('.lc-dl-hero__ctas .ui-btn')?.textContent || '') && document.querySelectorAll('.lc-dl-card')[1].classList.contains('is-lead')), 'on an iPhone the invite leads')
    await p.close()
    p = await open('/app', 320, 700, '&guest=1&nobiz=1&release=1&device=android')
    check(await p.evaluate(() => /Download for Android/.test(document.querySelector('.lc-dl-hero__ctas .ui-btn')?.textContent || '') && /\.apk$/.test(document.querySelector('.lc-dl-hero__ctas .ui-btn')?.getAttribute('href') || '')), 'on Android the download leads, straight to the file')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the download page fits at 320px')
    await p.evaluate(() => document.querySelector('.lc-dl-faq__item summary').click())
    await wait(200)
    check(await p.evaluate(() => document.querySelector('.lc-dl-faq__item').open && /signed with Locappoint/.test(document.querySelector('.lc-dl-faq__item p').textContent)), 'questions open in place')
    await p.close()

    p = await open('/app', 390, 844, '&native=1&release=1')
    await wait(300)
    check(await p.evaluate(() => window.__path === '/me'), 'inside the app the download page steps aside')
    await p.close()

    // Sign in with Google: on for the website and Android; Apple stays hidden until it is set up
    p = await open('/auth?tab=signin', 390, 844, '&guest=1&nobiz=1')
    const oauth = await p.evaluate(() => [...document.querySelectorAll('.auth-oauth')].map((b) => b.textContent.trim()))
    check(oauth.length === 1 && /Continue with Google/.test(oauth[0]), `Google is offered and Apple is not yet: ${oauth.join(', ')}`)
    await p.evaluate(() => document.querySelector('.auth-oauth--google').click())
    await wait(300)
    check(await p.evaluate(() => window.__oauth === 'google'), 'Continue with Google starts Google sign-in')
    await p.close()

    p = await open('/auth?tab=signup&next=/femtos-barbearia', 390, 844, '&guest=1&nobiz=1')
    await p.evaluate(() => document.querySelector('.auth-oauth--google').click())
    await wait(300)
    check(await p.evaluate(() => sessionStorage.getItem('locappoint_next')) === '/femtos-barbearia', 'after Google, people return to where they were going')
    await p.close()

    p = await open('/auth?tab=signin', 390, 844, '&guest=1&nobiz=1&native=android')
    check(await p.evaluate(() => Boolean(document.querySelector('.auth-oauth--google'))), 'the Android app offers Google')
    await p.close()
    p = await open('/auth?tab=signin', 390, 844, '&guest=1&nobiz=1&native=ios')
    check(await p.evaluate(() => !document.querySelector('.auth-oauth')), 'the iPhone app waits for Apple before offering Google, as Apple requires')
    check(p.errors.length === 0, `no page errors on sign-in: ${p.errors.join(' | ')}`)
    await p.close()
}

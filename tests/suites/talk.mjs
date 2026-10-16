// Contact and Partnership: the visitor's city across the top, no capitals-only labels, no single
// accented word in the title, no "cohort", fields that say optional instead of asterisks, errors next
// to the field with focus on the first, and the message saved.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, extra = '', vw = 1280, vh = 900) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}&guest=1${extra}`, { waitUntil: 'networkidle0' })
        await wait(600)
        return page
    }
    const look = (p) => p.evaluate(() => {
        const root = document.querySelector('.lc-talk')
        const texts = [...root.querySelectorAll('main *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length)
        return {
            text: root.innerText,
            band: root.querySelector('.lc-talk__band .lc-pattern')?.getAttribute('class') || '',
            titleParts: root.querySelector('.lc-talk__title')?.children.length ?? -1,
            upper: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length,
            small: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent.trim().slice(0, 20)),
            stars: /\*/.test(root.querySelector('main').innerText),
            over: document.documentElement.scrollWidth > window.innerWidth,
        }
    })
    const inserts = (p, table) => p.evaluate((t) => window.__calls.filter((c) => c[0] === 'insert' && c[1] === t).length, table)

    for (const [path, city] of [['/contact', 'lagos'], ['/partnership', 'lisbon']]) {
        const p = await open(path, `&city=${city}`)
        const v = await look(p)
        check(v.band.includes(`lc-pattern--${city}`) && v.titleParts === 0, `${path}: the ${city} pattern across the top, a plain title`)
        check(v.upper === 0 && !v.stars && !/cohort/i.test(v.text), `${path}: no capitals-only labels, no asterisks, no cohort`)
        check(v.small.length === 0, `${path}: text is 12px or more (${v.small.join(', ')})`)
        check(p.errors.length === 0, `${path}: no errors (${p.errors[0] || ''})`)
        await p.close()
    }

    // Contact: an empty send says what is missing beside each field and moves to the first one.
    let p = await open('/contact')
    await p.evaluate(() => [...document.querySelectorAll('.lc-talk button[type="submit"]')][0].click())
    await wait(300)
    let v = await p.evaluate(() => ({
        errors: [...document.querySelectorAll('.lc-talk .ui-field__error')].map((e) => e.textContent),
        focus: document.activeElement?.getAttribute('aria-invalid'),
    }))
    check(v.errors.length === 3 && v.focus === 'true', `empty send: errors beside name, email and message, focus on the first (${v.errors.join(', ')})`)
    const type = async (index, text) => { const inputs = await p.$$('.lc-talk input, .lc-talk textarea'); await inputs[index].type(text) }
    await type(0, 'Ana Costa')
    await type(1, 'ana@example.com')
    await type(4, 'Can my salon in Yaba join?')
    await p.evaluate(() => document.querySelector('.lc-talk button[type="submit"]').click())
    await wait(500)
    check(await inserts(p, 'contact_messages') === 1 && /Message sent/.test(await p.evaluate(() => document.querySelector('.lc-talk__done')?.textContent || '')), 'a message saves once and says it was sent')
    await p.close()

    // Partnership on a phone: fits, and the kind of business is picked from our own picker.
    p = await open('/partnership', '', 390, 844)
    v = await look(p)
    check(!v.over && await p.evaluate(() => !document.querySelector('.lc-talk select') && Boolean(document.querySelector('.lc-talk .ui-picker, .lc-talk [aria-haspopup]'))), 'partnership fits a phone and uses the picker, not a native select')
    await p.close()
}

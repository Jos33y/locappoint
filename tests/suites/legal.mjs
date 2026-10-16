// Legal pages: no "based in" a city we are not registered in; sentence case labels; text at 12px or more;
// the visitor's city as a thin band along the top; nothing past the edge of a phone.

export default async ({ browser, url, check }) => {
    const open = async (path, extra = '', vw = 1280, vh = 860) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}&guest=1${extra}`, { waitUntil: 'networkidle0' })
        await new Promise((r) => setTimeout(r, 600))
        return page
    }
    const look = (p) => p.evaluate(() => {
        const page = document.querySelector('.legal-page')
        const texts = [...page.querySelectorAll('main *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length)
        return {
            text: page.innerText,
            band: document.querySelector('.legal__hero .legal__band')?.getAttribute('class') || '',
            upper: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').map((e) => e.textContent.trim().slice(0, 20)),
            small: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent.trim().slice(0, 20)),
            over: document.documentElement.scrollWidth > window.innerWidth,
            canvas: getComputedStyle(page).backgroundColor === getComputedStyle(document.documentElement).getPropertyValue('--lc-canvas').trim().replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`),
            painted: [...page.querySelectorAll('.legal__hero, .legal__body')].map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)'),
        }
    })

    for (const [path, city] of [['/legal/notice', 'porto'], ['/privacy', 'lagos'], ['/terms', 'lisbon']]) {
        const p = await open(path, `&city=${city}`)
        const v = await look(p)
        check(!/based in/i.test(v.text), `${path}: no "based in" line`)
        check(v.band.includes(`lc-pattern--${city}`), `${path}: the ${city} band runs along the top (${v.band})`)
        check(v.canvas && v.painted.length === 0, `${path}: the page sits on the brand canvas, no old section fill (${v.painted.join(', ')})`)
        check(v.upper.length === 0, `${path}: no capitals-only labels (${v.upper.join(', ')})`)
        check(v.small.length === 0, `${path}: text is 12px or more (${v.small.join(', ')})`)
        check(p.errors.length === 0, `${path}: no errors (${p.errors[0] || ''})`)
        await p.close()
    }

    const p = await open('/privacy', '&city=porto', 390, 844)
    const v = await look(p)
    check(!v.over && v.small.length === 0, 'phone: the privacy policy fits and reads at 12px or more')
    await p.close()
}

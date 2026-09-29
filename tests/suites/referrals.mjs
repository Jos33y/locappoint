// Invite a business: points, the six-step ladder, the link, and who was invited.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal/invite')}${extra}`, { waitUntil: 'networkidle0' })
        await wait(1200)
        return page
    }

    let p = await open()
    check(await p.evaluate(() => document.querySelector('.lc-inv__big')?.textContent.trim() === '70'), 'points total counts up to 70')
    check(await p.evaluate(() => /perks/.test(document.querySelector('.lc-inv__points')?.textContent || '')), 'points say they have no set use yet')
    check(await p.evaluate(() => /\/join\/ab12cd34$/.test(document.querySelector('.lc-inv__url')?.getAttribute('title') || '')), 'invite link carries the code')
    check(await p.evaluate(() => document.querySelectorAll('.lc-inv-ladder:not(.is-compact) .lc-inv-ladder__step').length === 6), 'ladder has six steps')
    const pts = await p.evaluate(() => [...document.querySelectorAll('.lc-inv-ladder:not(.is-compact) .lc-inv-ladder__pts')].map((e) => e.textContent).join(' '))
    check(pts === '+10 +20 +30 +50 +75 +100', `ladder points: ${pts}`)
    check(await p.evaluate(() => document.querySelectorAll('.lc-inv__row').length === 2), 'both invited businesses listed')
    check(await p.evaluate(() => document.querySelectorAll('.lc-inv__row')[0].querySelectorAll('.lc-inv-ladder__step.is-on').length === 3), 'first one shows three steps reached')
    check(await p.evaluate(() => /not live yet/.test(document.querySelectorAll('.lc-inv__row')[1].textContent)), 'second one is marked not live yet')
    check(await p.evaluate(() => /wa\.me/.test([...document.querySelectorAll('.lc-inv__actions a')].map((a) => a.href).join(' '))), 'WhatsApp share is a link')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open(390, 844, '&noinvites=1')
    check(await p.evaluate(() => /No one yet/.test(document.querySelector('.lc-inv__none')?.textContent || '')), 'empty state tells them what to do')
    check(await p.evaluate(() => document.querySelector('.lc-inv__big')?.textContent.trim() === '0'), 'zero points shown plainly')
    await p.close()

    p = await open(390, 844, '&staff=1')
    check(await p.evaluate(() => window.__path === '/portal' && !document.querySelector('.lc-inv__url')), 'staff are sent back to their day, no link')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open(w, h)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `invite fits at ${w}px`)
        const small = await p.evaluate(() => [...document.querySelectorAll('.lc-inv .ui-btn')].filter((b) => b.getBoundingClientRect().height < 44).length)
        check(small === 0, `invite buttons are tap-sized at ${w}px`)
        await p.close()
    }
}

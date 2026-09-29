// Team: the rota, adding a person, services, own hours, a login link, removal rules, the join page, and what staff can reach.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(1000)
        return page
    }
    const clickText = (p, sel, re) => p.evaluate((s, src) => { const el = [...document.querySelectorAll(s)].find((b) => new RegExp(src).test(b.textContent.trim())); el?.click(); return Boolean(el) }, sel, re)
    const type = (p, sel, value) => p.evaluate((s, v) => { const i = document.querySelector(s); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })) }, sel, value)

    let p = await open('/portal/team', 1272, 900, '&lunch=1')
    check(await p.evaluate(() => document.querySelectorAll('.lc-team-row').length === 3), 'the whole team is listed')
    check(await p.evaluate(() => document.querySelectorAll('.lc-team-row')[0].querySelectorAll('.lc-team-rota__day').length === 7), 'each person has a week in the rota')
    check(await p.evaluate(() => document.querySelectorAll('.lc-team-row')[0].querySelectorAll('.lc-team-rota__bar').length === 12), 'lunch splits each working day in two')
    check(await p.evaluate(() => document.querySelectorAll('.lc-team-row')[0].querySelectorAll('.lc-team-rota__day.is-closed').length === 1), 'the closed day reads as off')
    check(await p.evaluate(() => /Not bookable/.test(document.querySelectorAll('.lc-team-row')[2].textContent)), 'someone off the booking page is marked')
    check(await p.evaluate(() => !document.querySelector('.lc-team-warn')), 'no warning while every service has someone')

    await p.evaluate(() => document.querySelectorAll('.lc-team-row')[1].click())
    await wait(600)
    check(await p.evaluate(() => document.querySelectorAll('.ui-chip').length === 2 && document.querySelector('.ui-chip.is-selected')?.textContent === 'Haircut'), 'services show what Ana does')
    await clickText(p, '.ui-seg button, [role="radio"]', '^Own hours')
    await wait(300)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-team-sheet .biz-sched, .lc-team-sheet [class*="biz-sched"]'))), 'own hours opens the hours editor')
    check(await clickText(p, '.lc-team-sheet .ui-btn', '^Save hours'), 'and offers to save them')
    await wait(400)
    await clickText(p, '.lc-team-sheet .ui-btn', '^Create a login link')
    await wait(500)
    check(await p.evaluate(() => /\/team\/a{40}$/.test(document.querySelector('.lc-team-login__url')?.getAttribute('title') || '')), 'a login link appears')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-team-login__acts a')].some((a) => /wa\.me/.test(a.href) && /Femtos/.test(decodeURIComponent(a.href)))), 'WhatsApp carries the link and the business')
    await clickText(p, '.lc-team-link', '^Remove Ana')
    await wait(200)
    await clickText(p, '.lc-team-sheet .ui-btn', '^Remove$')
    await wait(500)
    check(await p.evaluate(() => /2 bookings ahead/.test(document.querySelector('.lc-team-danger .lc-team-err')?.textContent || '')), 'removal waits until their bookings move')
    check(p.errors.length === 0, `no page errors on Team: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/team', 390, 844)
    await clickText(p, '.lc-team .ui-btn', '^Add person')
    await wait(500)
    await type(p, '.lc-team-form input', 'Joana Reis')
    await clickText(p, '.lc-team-form .ui-btn', '^Add to the team')
    await wait(900)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-team-row strong')].some((s) => /Joana Reis/.test(s.textContent))), 'a new person joins the list')
    check(await p.evaluate(() => /Joana Reis/.test(document.querySelector('.ui-sheet, [role="dialog"]')?.textContent || '')), 'and their sheet opens to set them up')
    await p.close()

    p = await open('/portal/team', 390, 844, '&solo=1')
    check(await p.evaluate(() => /Working alone/.test(document.querySelector('.lc-team-solo')?.textContent || '')), 'working alone gets a calm note, not an empty page')
    await p.close()

    p = await open('/team/' + 'a'.repeat(40), 390, 844, '&guest=1')
    check(await p.evaluate(() => /Join Femtos Barbearia/.test(document.querySelector('.lc-tj__title')?.textContent || '')), 'the join page names the business')
    check(await p.evaluate(() => /Create your account/.test(document.querySelector('.lc-tj__acts')?.textContent || '')), 'and a new person can make an account')
    await p.close()
    p = await open('/team/' + 'b'.repeat(40), 390, 844, '&guest=1')
    check(await p.evaluate(() => /no longer works/.test(document.querySelector('.lc-tj__title')?.textContent || '')), 'a dead link says so')
    await p.close()
    p = await open('/team/' + 'a'.repeat(40), 390, 844, '&nobiz=1')
    await clickText(p, '.lc-tj__acts .ui-btn', '^Join as')
    await wait(800)
    check(await p.evaluate(() => window.__path.startsWith('/portal') && window.__refreshed >= 1), 'joining reloads the account and goes to the portal')
    await p.close()
    p = await open('/team/' + 'a'.repeat(40), 390, 844)
    check(await p.evaluate(() => /runs its own business/.test(document.querySelector('.lc-tj__err')?.textContent || '')), 'an owner account is told to use another one')
    await p.close()

    p = await open('/portal/page', 1272, 900, '&staff=1')
    check(await p.evaluate(() => window.__path === '/portal'), 'staff cannot open the business settings')
    check(await p.evaluate(() => ![...document.querySelectorAll('.biz-sidebar a')].some((a) => /Your business|Grow/.test(a.textContent))), 'staff do not see Your business or Grow')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/portal/team', w, h, '&lunch=1')
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `team fits at ${w}px`)
        const small = await p.evaluate(() => [...document.querySelectorAll('.lc-team .ui-btn, .lc-team-row')].filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.className))
        check(small.length === 0, `tap targets hold at ${w}px: ${small.join(', ')}`)
        await p.close()
    }
}

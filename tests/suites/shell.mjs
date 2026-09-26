export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 588, extra = '', touch = false) => {
      const page = await browser.newPage()
      page.errors = []
      page.on('pageerror', (e) => page.errors.push(e.message))
      await page.setViewport({ width: vw, height: vh, hasTouch: touch, isMobile: touch })
      await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
      await wait(300)
      return page
    }
    const path = (page) => page.evaluate(() => window.__path)
    const clickText = async (page, sel, text) => {
      const ok = await page.evaluate((sel, text) => {
        const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(text))
        if (!el) return false
        el.click()
        return true
      }, sel, text)
      await wait()
      return ok
    }
    const active = (page) => page.evaluate(() => [...document.querySelectorAll('.biz-sidebar .biz-navlink.active')].map((e) => e.textContent.trim()))
    const menuOpen = (page) => page.evaluate(() => Boolean(document.querySelector('.biz-acctmenu')))
    const focused = (page) => page.evaluate(() => document.activeElement?.textContent.trim())

    let p = await open('/portal')
    check(await clickText(p, '.biz-sidebar .biz-navlink', 'Your business'), 'hub row clickable')
    check(await path(p) === '/portal/page', `hub row goes to page: ${await path(p)}`)
    check((await active(p)).join() === 'Your business', `hub active on page: ${await active(p)}`)
    check(await clickText(p, '.biz-hubnav__tab', 'Hours'), 'hours tab')
    check(await path(p) === '/portal/hours', 'tab goes to hours')
    check((await active(p)).join() === 'Your business', 'hub stays active on hours')
    check(await p.evaluate(() => document.querySelector('.biz-hubnav__tab.active').textContent) === 'Hours', 'hours tab active')
    check(await p.evaluate(() => document.querySelector('.biz-hubnav__tab.active').getAttribute('aria-current')) === 'page', 'tab aria-current')
    check(await p.evaluate(() => document.querySelector('.biz-sidebar .biz-navlink.active').getAttribute('aria-current')) === 'page', 'hub aria-current')
    check(await clickText(p, '.biz-sidebar .biz-navlink', 'Grow'), 'grow row')
    check(await path(p) === '/portal/channels', 'grow goes to channels')
    check(await clickText(p, '.biz-hubnav__tab', 'Insights'), 'insights tab')
    check(await p.evaluate(() => document.querySelector('.lc-planned__status')?.textContent) === 'In build', 'insights shows in build')
    check((await active(p)).join() === 'Grow', 'grow stays active')
    check(await clickText(p, '.biz-sidebar .biz-navlink', 'Today'), 'today row')
    check(await p.evaluate(() => !document.querySelector('.biz-hubnav')), 'no hub nav on today')

    await p.focus('.biz-account__btn')
    await p.keyboard.press('Enter'); await wait()
    check(await menuOpen(p), 'menu opens with Enter')
    check(await p.evaluate(() => document.querySelector('.biz-account__btn').getAttribute('aria-expanded')) === 'true', 'aria-expanded true')
    check(await focused(p) === 'Settings', 'first item focused')
    await p.keyboard.press('ArrowDown'); check(await focused(p) === 'Help and support', 'arrow down')
    await p.keyboard.press('End'); check(await focused(p) === 'Sign out', 'end')
    await p.keyboard.press('ArrowDown'); check(await focused(p) === 'Settings', 'wraps to first')
    await p.keyboard.press('ArrowUp'); check(await focused(p) === 'Sign out', 'wraps to last')
    await p.keyboard.press('Escape'); await wait()
    check(!(await menuOpen(p)), 'escape closes')
    check(await p.evaluate(() => document.activeElement.classList.contains('biz-account__btn')), 'focus back on button')
    await p.keyboard.press('ArrowUp'); await wait()
    check(await menuOpen(p), 'arrow up opens menu')
    await p.mouse.click(900, 300); await wait()
    check(!(await menuOpen(p)), 'outside click closes')
    await p.click('.biz-account__btn'); await wait()
    check(await clickText(p, '.biz-acctmenu__item', 'Settings'), 'settings item')
    check(await path(p) === '/portal/settings', 'settings navigates')
    check(!(await menuOpen(p)), 'menu closed after navigate')
    check(await p.evaluate(() => document.querySelector('.biz-account__btn').classList.contains('is-current')), 'account row current on settings')
    check((await active(p)).length === 0, 'no nav row active on settings')
    await p.click('.biz-account__btn'); await wait()
    await clickText(p, '.biz-acctmenu__item', 'Help and support')
    check(await path(p) === '/portal/help', 'help navigates')
    await p.click('.biz-account__btn'); await wait()
    await clickText(p, '.biz-acctmenu__item', 'Switch to Booking')
    check(await path(p) === '/client', 'switch goes to client')
    check(p.errors.length === 0, `errors ${p.errors}`)
    await p.close()

    p = await open('/portal')
    await p.click('.biz-account__btn'); await wait()
    await clickText(p, '.biz-acctmenu__item', 'Sign out')
    check(await p.evaluate(() => window.__signedOut === true), 'sign out called')
    await p.close()

    p = await open('/portal')
    await p.click('.biz-account__btn'); await wait()
    await clickText(p, '.biz-acctmenu__item', 'Replay the tour'); await wait(500)
    const steps = []
    for (let i = 0; i < 10; i++) {
      const s = await p.evaluate(() => { const c = document.querySelector('.lc-tour__card'); if (!c) return null; const r = c.getBoundingClientRect(); return { t: c.querySelector('.lc-tour__title').textContent, n: c.querySelector('.lc-tour__count').textContent, ok: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight } })
      if (!s) break
      steps.push(s.t); check(s.ok, `tour card on screen: ${s.t}`)
      await p.keyboard.press('ArrowRight'); await wait(300)
    }
    check(steps.join('|') === 'Today is your home|Add a booking in seconds|Plan ahead|Your business|Get booked in more places|Help is under your name', `desktop tour ${steps.join('|')}`)
    await p.close()

    p = await open('/portal')
    await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await wait()
    await p.keyboard.type('hours'); await wait()
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cmd__item')].map((e) => e.textContent.trim()).join()) === 'Opening hours', 'palette finds opening hours')
    await p.keyboard.press('Enter'); await wait()
    check(await path(p) === '/portal/hours', 'palette navigates to hours')
    await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await wait()
    await p.keyboard.type('logo'); await wait()
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cmd__item')].map((e) => e.textContent.trim()).join()) === 'Business page', 'palette keyword logo')
    await p.close()

    p = await open('/portal', 1272, 588, '&logo=1')
    check(await p.evaluate(() => !document.querySelector('.biz-startrow')), 'getting started row gone at 100%')
    await p.close()
    p = await open('/portal')
    check(await p.evaluate(() => document.querySelector('.biz-startrow .biz-startrow__pct')?.textContent) === '88%', 'getting started row at 88%')
    await p.close()

    p = await open('/portal', 390, 844, '', true)
    await p.click('[data-tour="more"]'); await wait(500)
    const sheet = await p.evaluate(() => [...document.querySelectorAll('.biz-more .biz-navgroup__label')].map((e) => e.textContent))
    check(sheet.join('|') === 'Your business|Grow|Help|Account', `more sheet groups ${sheet}`)
    check(await clickText(p, '.biz-more .biz-navlink', 'Services'), 'more sheet services')
    check(await path(p) === '/portal/services', 'more sheet navigates')
    check(await p.evaluate(() => document.querySelector('.biz-hubnav__tab.active')?.textContent) === 'Services', 'phone hub tab active')
    check(p.errors.length === 0, `phone errors ${p.errors}`)
    await p.close()

    p = await open('/portal', 390, 844, '&tour=1', true)
    await wait(1200)
    const ph = []
    for (let i = 0; i < 8; i++) {
      const t = await p.evaluate(() => document.querySelector('.lc-tour__title')?.textContent)
      if (!t) break
      ph.push(t); await p.keyboard.press('ArrowRight'); await wait(300)
    }
    check(ph.join('|') === 'Today is your home|Add a booking in seconds|Plan ahead|Everything else lives here', `phone tour ${ph.join('|')}`)
    await p.close()
}

// Reliability and the Reliable badge: the owner's card in Insights, what clients see on the page, in
// search and in "What do you need?", and the admin list with excuses and badge removal.

export default async ({ browser, url, check }) => {
    const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, extra = '', vw = 1272, vh = 900) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(800)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel)
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const click = (p, sel, label) => p.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); el?.click(); return Boolean(el) }, sel, label)

    // Insights: the score, its parts, what cost points and the badge checks
    let p = await open('/portal/insights')
    await p.waitForFunction(() => document.querySelector('.lc-rel'), { timeout: 5000 }).catch(() => {})
    check((await rpcs(p, 'my_reliability')).some((a) => a.p_business === 'b1'), 'Insights asks for the reliability of this business')
    check((await text(p, '.lc-rel-score__value')) === '96', 'the score shows')
    check(/Reliable/.test(await text(p, '.lc-rel-status')) && /Clients see/.test(await text(p, '.lc-rel-sees')) && /Keeps 98% of bookings/.test(await text(p, '.lc-rel-sees')), 'it says the badge is held and what clients see')
    check((await p.evaluate(() => document.querySelectorAll('.lc-rel-part').length)) === 4, 'four parts, each with its points')
    check(/You cancelled/.test(await text(p, '.lc-rel-items')) && /waited 19 hours/.test(await text(p, '.lc-rel-items')), 'what cost points, in plain words')
    check((await p.evaluate(() => document.querySelectorAll('.lc-rel-checks li.is-ok').length)) === 6, 'every badge check is ticked')
    check((await p.evaluate(() => document.querySelectorAll('.lc-rel-trend__col').length)) === 8, 'weeks of history')
    check(await p.evaluate(() => {
        const hero = document.querySelector('.lc-ins-hero__value')
        const score = document.querySelector('.lc-rel-score__value')
        return !hero || !score || parseFloat(getComputedStyle(score).fontSize) < parseFloat(getComputedStyle(hero).fontSize)
    }), 'the score is quieter than what was earned')
    check(p.errors.length === 0, `insights errors ${p.errors}`)
    await p.close()

    p = await open('/portal/insights', '&rel=risk', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-rel'), { timeout: 5000 }).catch(() => {})
    check(/at risk/.test(await text(p, '.lc-rel-status')), 'under 85 the owner is told the badge is at risk, with the date')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the card fits a phone')
    await p.close()

    p = await open('/portal/insights', '&rel=new', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-rel'), { timeout: 5000 }).catch(() => {})
    check(/New on Locappoint/.test(await text(p, '.lc-rel-new')) && /6 of 10/.test(await text(p, '.lc-rel-new')), 'under 10 bookings: new, with the count to go')
    check(!(await p.$('.lc-rel-score__value')), 'and no score yet')
    await p.close()

    // Clients: the badge and the kept line on the page, never the number
    p = await open('/femtos-barbearia', '&guest=1&nobiz=1', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-pub .lc-trust'), { timeout: 5000 }).catch(() => {})
    check(/Reliable/.test(await text(p, '.lc-pub .lc-trust-badge:not(.is-gold)')) && /Keeps 98% of bookings/.test(await text(p, '.lc-pub .lc-trust')), 'the page shows Reliable and keeps 98% of bookings')
    check(!/96/.test(await text(p, '.lc-pub__id')), 'clients never see the score')
    check(p.errors.length === 0, `page errors ${p.errors}`)
    await p.close()

    p = await open('/client/search', '', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-cl-result'), { timeout: 5000 }).catch(() => {})
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cl-result')].some((r) => /Femtos/.test(r.textContent) && r.querySelector('.lc-trust-badge') && /Keeps 98%/.test(r.textContent))), 'search results carry the badge')
    await p.close()

    p = await open('/client', '&nobiz=1', 390, 844)
    await p.type('.lc-eng__what input', 'haircut')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    const first = await p.evaluate(() => { const o = document.querySelector('.lc-eng__opt'); return { badge: Boolean(o?.querySelector('.lc-trust-badge')), why: o?.querySelector('.lc-eng__why')?.textContent || '' } })
    check(first.badge && /Keeps 98% of bookings/.test(first.why), `"What do you need?" shows the badge and why: ${first.why}`)
    await p.close()

    // Admin: the list, what counted, excuse a cancellation, remove the badge with a note
    p = await open('/admin-view/reliability', '&guest=1')
    check(/Femtos Barbearia/.test(await text(p, '.adm-rel')) && (await text(p, '.adm-rel-score')) === '96', 'admin lists businesses with their score')
    check(/New/.test(await p.evaluate(() => document.querySelectorAll('.adm-rel')[1]?.textContent || '')), 'a business under 10 bookings shows as new')
    await click(p, '.adm-rel-toggle', 'What counted'); await wait(500)
    check(/You cancelled/.test(await text(p, '.adm-rel-detail')), 'staff see what counted')
    await click(p, '.adm-rel-detail .btn', 'Excuse it'); await wait()
    await p.type('.adm-rel-detail textarea', 'Hospital stay, letter seen in ticket 1042')
    await click(p, '.adm-rel-detail .btn--primary', 'Excuse it'); await wait(500)
    check((await rpcs(p, 'admin_excuse_cancellation')).some((a) => a.p_appointment === 'p1' && /Hospital/.test(a.p_note)), 'staff excuse a cancellation with a reason')
    await click(p, '.adm-rel-detail .btn', 'Remove the badge'); await wait()
    await p.evaluate(() => { const t = [...document.querySelectorAll('.adm-rel-badge textarea')].pop(); if (t) t.focus() })
    await p.keyboard.type('Charging clients outside Locappoint')
    await click(p, '.adm-rel-badge .btn--danger', 'Remove the badge'); await wait(500)
    check((await rpcs(p, 'admin_badge')).some((a) => a.p_action === 'remove' && a.p_business === 'b1' && /Charging/.test(a.p_note)), 'staff remove the badge with a note the owner reads')
    check(p.errors.length === 0, `admin errors ${p.errors}`)
    await p.close()
}

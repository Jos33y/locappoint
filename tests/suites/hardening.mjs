// Hardening: a crashing screen shows a way out and is reported, a stale deploy reloads once, offline is said plainly,
// admins can read app errors, the demo business is labelled, and QR codes are tagged so scans count as QR.

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
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)

    // A screen that crashes inside the portal: the shell stays, the crash is reported, the way out works
    let p = await open('/portal/crash', 1272, 900)
    check(await p.evaluate(() => /This screen did not load/.test(document.querySelector('.lc-sys-crash')?.textContent || '')), 'a crashed screen says so instead of going blank')
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-sidebar')) && !document.querySelector('.lc-sys-crash.is-full')), 'the rest of the portal stays usable')
    const reported = await rpcs(p, 'report_client_error')
    check(reported.some((r) => r.p_message === 'Test crash in a screen' && r.p_path && r.p_release && r.p_app === 'app'), `the crash is reported: ${JSON.stringify(reported[0] || null).slice(0, 160)}`)
    check(reported.filter((r) => r.p_message === 'Test crash in a screen').length === 1, 'and reported once, not on every render')
    await p.evaluate(() => [...document.querySelectorAll('.biz-sidebar a')].find((a) => /Calendar/.test(a.textContent))?.click())
    await wait(900)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-crash') && Boolean(document.querySelector('.biz-seg__btn'))), 'moving to another screen leaves the crash behind')
    await p.close()

    // A stale deploy: one reload, then an honest screen instead of a loop
    p = await open('/portal/crash', 390, 844, '&chunk=1')
    await wait(1500)
    check(await p.evaluate(() => { try { return Number(sessionStorage.getItem('locappoint_reloaded_at')) > 0 } catch { return false } }), 'a stale file reloads the page once')
    check(await p.evaluate(() => /A new version of Locappoint is ready/.test(document.querySelector('.lc-sys-crash')?.textContent || '')), 'if it fails again, it says a new version is ready')
    check((await rpcs(p, 'report_client_error')).filter((r) => /dynamically imported/.test(r.p_message)).length === 1, 'the first stale file is fixed quietly; only a file still missing after the reload is reported')
    await p.close()

    // Offline
    p = await open('/portal', 390, 844)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-net__pill')), 'nothing shows while online')
    await p.setOfflineMode(true)
    await wait(400)
    check(await p.evaluate(() => /You are offline/.test(document.querySelector('.lc-sys-net')?.textContent || '')), 'going offline is said plainly')
    const pill = await p.evaluate(() => { const r = document.querySelector('.lc-sys-net__pill').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth })
    check(pill, 'the offline notice fits on a phone')
    await p.setOfflineMode(false)
    await wait(400)
    check(await p.evaluate(() => /Back online/.test(document.querySelector('.lc-sys-net')?.textContent || '')), 'coming back is said too')
    await wait(3300)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-net__pill')), 'and then it goes away')
    await p.close()

    // Admin: app errors
    p = await open('/admin-errors', 1272, 900)
    check(await p.evaluate(() => /2 distinct, 16 in all/.test(document.querySelector('.section-head')?.textContent || '')), 'admins see how many errors and how often')
    await p.evaluate(() => document.querySelector('.data-table__row--clickable').click())
    await wait(300)
    check(await p.evaluate(() => /at Agenda/.test(document.querySelector('.cell-stack')?.textContent || '')), 'an error opens to its stack')
    await p.evaluate(() => document.querySelector('.data-table button[aria-label^="Clear"]').click())
    await wait(400)
    check((await p.evaluate(() => window.__calls.filter((c) => c[0] === 'delete' && c[1] === 'client_errors').length)) === 1 && (await p.evaluate(() => document.querySelectorAll('.data-table__row--clickable').length)) === 1, 'an error can be cleared')
    check(p.errors.length === 0, `no page errors on admin errors: ${p.errors.join(' | ')}`)
    await p.close()

    // The demo business is labelled where clients find it and on its page
    p = await open('/client/search', 390, 844, '&demo=1')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cl-result')].some((r) => /Femtos/.test(r.textContent) && r.querySelector('.lc-cl-result__demo'))), 'the demo business is labelled in search')
    await p.close()
    p = await open('/femtos-barbearia', 390, 844, '&demo=1&guest=1&nobiz=1')
    check(await p.evaluate(() => /demo business/.test(document.querySelector('.lc-pub__demo')?.textContent || '')), 'the demo page says it is a demo')
    await p.close()
    p = await open('/femtos-barbearia', 390, 844, '&guest=1&nobiz=1')
    check(await p.evaluate(() => !document.querySelector('.lc-pub__demo')), 'a real business has no demo note')
    await p.close()

    // QR codes carry ?src=qr so scans show as QR in Insights
    p = await open('/portal/channels', 1272, 900)
    await p.evaluate(() => [...document.querySelectorAll('.lc-channel__action .ui-btn')].find((b) => /QR poster/.test(b.textContent))?.click())
    await wait(600)
    const qr = await p.evaluate(() => {
        const draw = (value) => {
            const { modules } = window.__QRCode.create(value, { errorCorrectionLevel: 'M' })
            let out = ''
            for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) out += `M${x + 2} ${y + 2}h1v1h-1z`
            return out
        }
        const svg = document.querySelector('.lc-poster-sheet .lc-poster__qr svg')
        const page = svg.getAttribute('aria-label').replace('QR code for ', '')
        const d = svg.querySelector('path').getAttribute('d')
        return { tagged: d === draw(`${page}?src=qr`), plain: d === draw(page), link: document.querySelector('.lc-poster-sheet .lc-poster__link').textContent }
    })
    check(qr.tagged && !qr.plain, `the poster code opens the page tagged as a QR scan: ${JSON.stringify(qr)}`)
    check(!/src=qr/.test(qr.link || ''), 'while the printed link stays clean')
    await p.close()

    for (const w of [320, 390]) {
        p = await open('/portal/crash', w, 700)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `the crash screen fits at ${w}px`)
        await p.close()
    }
}

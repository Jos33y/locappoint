// The gold Verified badge: the owner's three steps, the video upload, the admin decision, and the
// badge where clients see it.

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
    const calls = (p, kind, name) => p.evaluate((k, n) => window.__calls.filter((c) => c[0] === k && (!n || c[1] === n)), kind, name)
    const click = (p, sel, label) => p.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); el?.click(); return Boolean(el) }, sel, label)

    // A new owner: three steps, the ID check opens Stripe
    let p = await open('/portal/verified', '', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-ver-step'), { timeout: 5000 }).catch(() => {})
    check((await p.evaluate(() => document.querySelectorAll('.lc-ver-step').length)) === 3, 'three steps: ID, the place, our look')
    check(/Stripe keeps the photos/.test(await text(p, '.lc-ver-steps')) && /delete it once we decide/.test(await text(p, '.lc-ver-steps')), 'it says who keeps the ID and that the video goes')
    await click(p, '.lc-ver-step .ui-btn', 'Check my ID'); await wait(500)
    check((await calls(p, 'fn', 'verify')).some((c) => c[2]?.action === 'start'), 'the ID check starts on Stripe')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page fits a phone')
    check(p.errors.length === 0, `verified errors ${p.errors}`)
    await p.close()

    // Back from Stripe: it asks how it went
    p = await open('/portal/verified', '&identity=return')
    check((await calls(p, 'fn', 'verify')).some((c) => c[2]?.action === 'check'), 'coming back from Stripe asks for the result')
    await p.close()

    // Uploading a video: to the business folder, then handed in
    p = await open('/portal/verified', '&ver=sent')
    check(/With us now/.test(await text(p, '.lc-ver-hero')), 'sent: it is with us, and says how long')
    check(/Video sent/.test(await text(p, '.lc-ver-steps')), 'the video shows as sent and can be replaced')
    const input = await p.$('.lc-ver input[type=file]')
    if (input) {
        await input.evaluate((el) => {
            const dt = new DataTransfer()
            dt.items.add(new File([new Uint8Array(2048)], 'walk.mp4', { type: 'video/mp4' }))
            el.files = dt.files
            el.dispatchEvent(new Event('change', { bubbles: true }))
        })
        await wait(600)
    }
    check((await calls(p, 'upload')).some((c) => /^b1\/\d+\.mp4$/.test(c[1])), 'the video goes to the business folder')
    check((await calls(p, 'rpc', 'submit_verification_place')).some((c) => c[2].p_kind === 'video' && /^b1\//.test(c[2].p_path)), 'and is handed in')
    await p.close()

    // No shop: a call
    p = await open('/portal/verified', '&ver=nobiz')
    check(/Meet us on a call/.test(await text(p, '.lc-ver-steps')), 'no address: a call instead of a video')
    await click(p, '.lc-ver-step .ui-btn', 'Ask for a call'); await wait(400)
    check((await calls(p, 'rpc', 'submit_verification_place')).some((c) => c[2].p_kind === 'call'), 'the call is asked for')
    await p.close()

    p = await open('/portal/verified', '&ver=gold')
    check(/Verified/.test(await text(p, '.lc-ver-hero .lc-trust-badge')) && /until/.test(await text(p, '.lc-ver-hero')), 'verified: the gold badge and until when')
    await p.close()

    // Clients see gold next to blue
    p = await open('/femtos-barbearia', '&guest=1&nobiz=1', 390, 844)
    await p.waitForFunction(() => document.querySelector('.lc-pub .lc-trust'), { timeout: 5000 }).catch(() => {})
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-pub .lc-trust-badge.is-gold')) && /Verified/.test(document.querySelector('.lc-pub .lc-trust')?.textContent || '')), 'the page shows the gold Verified badge')
    await p.close()

    // Admin: the video, then a decision; the video is deleted
    p = await open('/admin-view/verification', '&guest=1')
    check(/Femtos Barbearia/.test(await text(p, '.adm-ver')) && Boolean(await p.$('.adm-ver-video')), 'staff see the application and the video')
    await click(p, '.adm-ver .btn', 'Not yet'); await wait(400)
    check((await calls(p, 'rpc', 'admin_review_verification')).some((c) => c[2].p_decision === 'reject'), 'not yet goes to the server, which asks for the note')
    await click(p, '.adm-ver .btn', 'Approve'); await wait(500)
    check((await calls(p, 'rpc', 'admin_review_verification')).some((c) => c[2].p_decision === 'approve' && c[2].p_business === 'b1'), 'staff approve')
    check((await calls(p, 'remove')).some((c) => JSON.stringify(c[1]).includes('b1/1.mp4')), 'and the video is deleted')
    check(p.errors.length === 0, `admin errors ${p.errors}`)
    await p.close()
}

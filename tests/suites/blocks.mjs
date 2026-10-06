// Blocks with reasons: the owner blocks from a booking, sees the list in Clients, Locappoint reviews
// in admin, a blocked client sees a neutral line with a way to tell us, and the written policies.

export default async ({ browser, url, check }) => {
    const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, extra = '', vw = 1272, vh = 900) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(700)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel)
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const click = (p, sel, label) => p.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); el?.click(); return Boolean(el) }, sel, label)

    // The owner blocks from a booking, with a reason
    let p = await open('/portal?booking=p1', '&phoned=1')
    await p.waitForFunction(() => document.querySelector('.ui-sheet'), { timeout: 5000 }).catch(() => {})
    check(await click(p, '.ui-sheet .biz-report', 'Block this client'), 'the booking sheet offers to block the client')
    await wait()
    check(/Block Jameson\?/.test(await text(p, '.ui-sheet')) && /Locappoint reviews every block/.test(await text(p, '.ui-sheet')), 'the block sheet says what happens and that we review it')
    await click(p, '.ui-sheet .ui-btn', 'Block from booking online'); await wait()
    check(/Pick the reason/.test(await text(p, '.ui-sheet')) && (await rpcs(p, 'block_client')).length === 0, 'no block without a reason')
    await click(p, '.ui-sheet .ui-chip', 'Repeated no-shows')
    await click(p, '.ui-sheet .ui-btn', 'Block from booking online'); await wait(500)
    check((await rpcs(p, 'block_client')).some((a) => a.p_appointment === 'p1' && a.p_reason === 'no_shows'), 'the block is sent with the booking and the reason')
    check(/Client blocked/.test(await text(p, '.ui-sheet')), 'the sheet confirms it')
    check(p.errors.length === 0, `block errors ${p.errors}`)
    await p.close()

    // Clients: blocked clients in one place, with the review state, and unblock
    p = await open('/portal/clients')
    check(/1 client blocked from booking online/.test(await text(p, '.lc-cbk-line')), 'Clients says how many are blocked')
    await click(p, '.lc-cbk-line', '1 client'); await wait()
    check(/Rui Costa/.test(await text(p, '.ui-sheet')) && /Locappoint is reviewing/.test(await text(p, '.ui-sheet')), 'the list shows who, why and the review')
    await click(p, '.ui-sheet .ui-btn', 'Unblock'); await wait(500)
    check((await rpcs(p, 'unblock_client')).some((a) => a.p_block === 'bk1'), 'the owner can unblock')
    await p.close()

    // Admin: review with the client's record and the over-blocking flag
    p = await open('/admin-view/blocks', '&guest=1')
    check(/Femtos Barbearia blocked Rui Costa/.test(await text(p, '.adm-blk')) && /Repeated no-shows/.test(await text(p, '.adm-blk')), 'admin sees the block and its reason')
    check(/blocks a lot/.test(await text(p, '.adm-blk__flag')), 'a business that blocks a lot is flagged')
    await click(p, '.adm-blk .btn', 'Lift the block'); await wait(400)
    check((await rpcs(p, 'admin_review_block')).length === 1, 'lifting is sent to the server, which asks for the note')
    await click(p, '.adm-blk .btn', 'Keep it'); await wait(400)
    check((await rpcs(p, 'admin_review_block')).some((a) => a.p_decision === 'kept' && a.p_block === 'bk1'), 'staff keep a block')
    check(p.errors.length === 0, `admin blocks errors ${p.errors}`)
    await p.close()

    // A blocked guest: a neutral line, never "blocked", and a way to tell us
    const day = (() => { const d = new Date(Date.now() + 86400000); return d.getUTCDay() === 0 ? new Date(Date.now() + 2 * 86400000) : d })()
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(day)
    p = await open(`/femtos-barbearia?book=s1.${key}.1000`, '&guest=1&nobiz=1&blockedme=1', 390, 844)
    await p.waitForFunction(() => /Check and confirm/.test(document.body.textContent), { timeout: 8000 }).catch(() => {})
    const inputs = await p.$$('.lc-bk-details input')
    if (inputs[0]) await inputs[0].type('Rui Costa')
    const email = await p.$('.lc-bk-details input[type=email]')
    if (email) await email.type('rui@x.pt')
    const phone = await p.$('.lc-bk-details input[type=tel]')
    if (phone) await phone.type('912000111')
    await wait(300)
    await click(p, '.ui-btn', 'Confirm booking'); await wait(900)
    const notice = await text(p, '.lc-bk-notice')
    check(/not taking online bookings from you/.test(notice) && !/blocked/i.test(notice), `the client sees a neutral line: ${notice}`)
    check(await p.evaluate(() => Boolean([...document.querySelectorAll('.lc-bk-notice a')].find((a) => /Tell Locappoint/.test(a.textContent) && a.href.startsWith('mailto:hello@locappoint.com')))), 'a guest can tell us by email')
    await p.close()

    // The written policies
    p = await open('/legal/policies', '&guest=1')
    const body = await p.evaluate(() => document.body.textContent)
    check(/24 hours before/.test(body) && /half of the price/.test(body) && /48 hours after the visit/.test(body) && /way the money came/.test(body) && /reviews every block/.test(body), 'the policies say the rules in plain words')
    check(/Blocks/.test(body) && /Reviews/.test(body) && /Refunds/.test(body), 'every topic has its section')
    check(p.errors.length === 0, `policies errors ${p.errors}`)
    await p.close()
}

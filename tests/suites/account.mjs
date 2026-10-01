// Account: delete from inside the app and the website, the public deletion page, and the Android update notice.

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
    const openDelete = async (p) => {
        await p.evaluate(() => [...document.querySelectorAll('.biz-st .ui-btn')].find((b) => /Delete account/.test(b.textContent))?.click())
        await wait(700)
    }
    const sheetText = (p) => p.evaluate(() => document.querySelector('.ui-sheet')?.textContent || '')
    const deleteBtn = (p) => p.evaluate(() => {
        const b = [...document.querySelectorAll('.ui-sheet .ui-btn')].find((x) => /Delete for good/.test(x.textContent))
        return b ? { disabled: b.disabled } : null
    })

    // Owner with nothing coming up
    let p = await open('/portal/settings', 390, 844)
    check(!(await p.evaluate(() => /Ask us to close it/.test(document.body.textContent))), 'deleting no longer means emailing us')
    await openDelete(p)
    const owner = await sheetText(p)
    check(/Delete your account\?/.test(owner) && /Femtos Barbearia: its page, services, hours, past bookings and reviews are deleted with it/.test(owner), 'the owner sees that the business goes with the account')
    check((await deleteBtn(p))?.disabled === true, 'nothing can be deleted until DELETE is typed')
    await p.evaluate(() => {
        const el = document.querySelector('.ui-sheet input')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'delete')
        el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await wait(200)
    check((await deleteBtn(p))?.disabled === false, 'typing it, in any case, unlocks the button')
    await p.evaluate(() => [...document.querySelectorAll('.ui-sheet .ui-btn')].find((x) => /Delete for good/.test(x.textContent)).click())
    await wait(1200)
    check(await p.evaluate(() => /legal\/delete-account\?done=1/.test(location.href)), 'after deleting, the person lands on the confirmation page')
    await p.close()

    // Owner with clients still coming
    p = await open('/portal/settings', 390, 844, '&deleteblock=1')
    await openDelete(p)
    const blocked = await sheetText(p)
    check(/Femtos Barbearia still has 3 upcoming bookings\. Cancel or move them first/.test(blocked), 'an owner with clients coming is told to deal with them first')
    check((await deleteBtn(p)) === null && /Open the calendar/.test(blocked), 'and gets the calendar, not a delete button')
    await p.close()

    // Client
    p = await open('/client/profile', 390, 844, '&nobiz=1')
    await openDelete(p)
    const client = await sheetText(p)
    check(/Your booking coming up stays booked/.test(client), `a client is told their upcoming booking stays: ${client.slice(0, 160)}`)
    check(!/its page, services/.test(client), 'and is not told about a business they do not have')
    check(p.errors.length === 0, `no page errors on profile: ${p.errors.join(' | ')}`)
    await p.close()

    // Public page Google Play asks for
    p = await open('/legal/delete-account', 390, 844, '&guest=1&nobiz=1')
    check(await p.evaluate(() => /Delete your account/.test(document.querySelector('h1')?.textContent || '') && /Settings, then Your account, then Delete account/.test(document.body.textContent) && /mailto:hello@locappoint\.com/.test(document.body.innerHTML)), 'the public page explains how, in the app and by email')
    await p.close()
    p = await open('/legal/delete-account?done=1', 390, 844, '&guest=1&nobiz=1')
    check(await p.evaluate(() => /Your account is deleted/.test(document.querySelector('h1')?.textContent || '')), 'and confirms when it is done')
    await p.close()

    // Android update notice
    p = await open('/portal', 390, 844, '&native=android&release=1&installed=1.0.2')
    await wait(500)
    check(await p.evaluate(() => /Version 1\.0\.7 of Locappoint is ready/.test(document.querySelector('.lc-sys-update')?.textContent || '')), 'an older Android app is told a new version is ready')
    await p.evaluate(() => document.querySelector('.lc-sys-update__x').click())
    await wait(200)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-update')), 'and can put it off')
    await p.close()
    p = await open('/portal', 390, 844, '&native=android&release=1&installed=1.0.7')
    await wait(500)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-update')), 'an up-to-date app says nothing')
    await p.close()
    p = await open('/portal', 390, 844, '&release=1&installed=1.0.2')
    await wait(500)
    check(await p.evaluate(() => !document.querySelector('.lc-sys-update')), 'the website never shows it')
    await p.close()

    for (const w of [320, 390]) {
        p = await open('/portal/settings', w, 700)
        await openDelete(p)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `the delete sheet fits at ${w}px`)
        await p.close()
    }
}

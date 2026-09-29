// Clients: due back first, the list with visit strips and reliability, the client sheet with notes, and palette search.

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

    let p = await open('/portal/clients')
    check(await p.evaluate(() => !document.querySelector('.biz-soon') || ![...document.querySelectorAll('a[href$="/portal/clients"] .biz-soon')].length), 'Clients no longer says Soon')
    const due = await p.evaluate(() => [...document.querySelectorAll('.lc-cli-due__item strong')].map((e) => e.textContent))
    check(due.length === 1 && due[0] === 'Ana Silva', `due back shows the regular past her gap: ${JSON.stringify(due)}`)
    check(await p.evaluate(() => /wa\.me\/351912345678\?text=Hi%20Ana/.test(document.querySelector('.lc-cli-due__acts a')?.href || '')), 'Message opens WhatsApp with a ready line')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-row').length === 4), 'all four clients listed')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-row')[0].querySelectorAll('.lc-cli-strip__dot').length === 6), 'visit strip draws one dot per outcome')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-row')[2].querySelectorAll('.lc-cli-strip__dot.is-no_show').length === 2), 'no-shows are marked in the strip')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-row')[2].querySelector('.lc-cli-rel')?.classList.contains('is-low')), 'low reliability is flagged')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-row')[3].querySelector('.lc-cli-rel')?.textContent === 'New'), 'first-timers read New, not 0%')

    await p.type('.lc-cli-search input', '93300')
    await wait(200)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cli-row strong')].map((e) => e.textContent.trim()).join() === 'Rui Costa'), 'search finds by phone digits')
    await p.evaluate(() => { const i = document.querySelector('.lc-cli-search input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })) })
    await wait(200)
    await p.evaluate(() => [...document.querySelectorAll('.ui-seg button, [role="radio"]')].find((b) => /^Missed/.test(b.textContent.trim()))?.click())
    await wait(200)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cli-row strong')].map((e) => e.textContent.trim()).join() === 'Ana Silva,Joao Pereira'), 'Missed shows only clients who missed a visit')
    await p.evaluate(() => [...document.querySelectorAll('.ui-seg button, [role="radio"]')].find((b) => /^All/.test(b.textContent.trim()))?.click())
    await wait(200)

    await p.evaluate(() => document.querySelectorAll('.lc-cli-row')[0].click())
    await wait(800)
    check(await p.evaluate(() => /Likes a skin fade/.test(document.querySelector('.lc-cli-note textarea')?.value || '')), 'the sheet shows the private note')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cli-hist__row').length === 3), 'the sheet lists the history')
    check(await p.evaluate(() => /Service removed/.test(document.querySelector('.lc-cli-hist')?.textContent || '')), 'a removed service still reads sensibly')
    await p.evaluate(() => { const t = document.querySelector('.lc-cli-note textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Prefers mornings.'); t.dispatchEvent(new Event('input', { bubbles: true })) })
    await wait(200)
    await p.evaluate(() => [...document.querySelectorAll('.lc-cli-note .ui-btn')].find((b) => /Save note/.test(b.textContent))?.click())
    await wait(500)
    check(await p.evaluate(() => /Saved/.test(document.querySelector('.lc-cli-note__state')?.textContent || '')), 'saving the note confirms')
    await p.evaluate(() => [...document.querySelectorAll('.lc-cli-sheet .ui-btn')].find((b) => /^Book Ana/.test(b.textContent.trim()))?.click())
    await wait(800)
    const form = await p.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value))
    check(form.includes('Ana Silva') && form.includes('+351 912 345 678'), `Book fills the client in: ${JSON.stringify(form.filter(Boolean))}`)
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/clients', 390, 844, '&noclients=1')
    check(await p.evaluate(() => /No clients yet/.test(document.querySelector('.lc-cli-empty')?.textContent || '')), 'empty state explains where clients come from')
    await p.close()

    p = await open('/portal', 1272, 900)
    await p.keyboard.down('Control')
    await p.keyboard.press('k')
    await p.keyboard.up('Control')
    await wait(600)
    await p.keyboard.type('joao')
    await wait(300)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-cmd__item')].some((i) => /Joao Pereira/.test(i.textContent))), 'the palette finds clients by name')
    await p.keyboard.press('Enter')
    await wait(1200)
    check(await p.evaluate(() => /Joao Pereira/.test(document.querySelector('.ui-sheet, [role="dialog"]')?.textContent || '')), 'and opens their sheet')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        p = await open('/portal/clients', w, h)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `clients fits at ${w}px`)
        const small = await p.evaluate(() => [...document.querySelectorAll('.lc-cli .ui-btn, .lc-cli-row, .lc-cli-due__who')].filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.className))
        check(small.length === 0, `tap targets hold at ${w}px: ${small.join(', ')}`)
        await p.close()
    }
}

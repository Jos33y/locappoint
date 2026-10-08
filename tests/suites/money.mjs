// Money: Insights say what no-shows cost and what reminders saved, figures count up, Book again keeps last time's extras, and the QR poster prints.

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
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel)
    const card = (p) => p.evaluate(() => [...document.querySelectorAll('.lc-ins-card')].find((c) => /What reminders did/.test(c.textContent))?.textContent || '')

    // Insights in money
    let p = await open('/portal/insights', 1272, 900)
    await wait(1200)
    check(/No-shows cost you €18 this week\./.test(await text(p, '.lc-ins__say')), `the week is said in money: ${await text(p, '.lc-ins__say')}`)
    check(await p.evaluate(() => document.querySelector('.lc-ins__say').classList.contains('is-bad')), 'money lost reads as a loss')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-ins-tile.is-bad')].some((t) => /Lost to no-shows/.test(t.textContent) && /€18/.test(t.textContent))), 'the no-show tile is in money and marked')
    const rem = await card(p)
    check(/Reminders went to 24 clients this week/.test(rem) && /Came22/.test(rem) && /No-shows1/.test(rem) && /€410/.test(rem), `reminders card has the counts: ${rem}`)
    check(/About €36 saved\./.test(rem), 'money saved by reminders is shown')
    check((await p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'reminder_effect').map((c) => c[2]))).some((a) => a.p_business_id === 'b1' && a.p_days === 7), 'reminder figures follow the business and period')
    check(p.errors.length === 0, `no page errors on Insights: ${p.errors.join(' | ')}`)
    await p.close()

    // Figures count up, then settle on the exact amount
    p = await browser.newPage()
    await p.setViewport({ width: 1272, height: 900 })
    await p.goto(`${url}/?path=${encodeURIComponent('/portal/insights')}`, { waitUntil: 'domcontentloaded' })
    const seen = []
    for (let i = 0; i < 40; i += 1) {
        const v = await p.evaluate(() => document.querySelector('.lc-ins-hero__value')?.textContent || '')
        if (v) seen.push(v)
        await wait(40)
    }
    await wait(1500)
    const final = await p.evaluate(() => document.querySelector('.lc-ins-hero__value')?.textContent || '')
    check(new Set(seen).size > 2 && /^€[\d,]+$/.test(final), `the headline counts up: ${[...new Set(seen)].slice(0, 5).join(', ')} to ${final}`)
    await p.close()

    p = await open('/portal/insights', 390, 844, '&fewreminders=1')
    await wait(1200)
    check(/at least ten reminded visits/.test(await card(p)) && !/saved\./.test(await card(p)), 'too few visits: no estimate, and it says why')
    await p.close()

    p = await open('/portal/insights', 390, 844, '&noreminders=1')
    await wait(1200)
    check(/day before and two hours before/.test(await card(p)), 'before the first reminder, the card explains what will show')
    await p.close()

    p = await open('/portal/insights', 390, 844, '&noinsights=1')
    await wait(1200)
    check(!(await p.evaluate(() => document.querySelector('.lc-ins__say'))), 'a new business gets no money sentence')
    await p.close()

    // Book again keeps last time's extras
    p = await open('/client', 390, 844, '&extras=1')
    await p.evaluate(() => [...document.querySelectorAll('.lc-again .ui-btn, .lc-again .btn')].find((b) => /Book again/.test(b.textContent))?.click())
    await wait(1400)
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-bk-extras .ui-chip.is-selected')].some((c) => /\+ Beard trim/.test(c.textContent))), 'Book again ticks the extra from last time')
    check(await p.evaluate(() => /Haircut \+ Beard trim/.test(document.querySelector('.lc-bk-again')?.closest('.ui-sheet')?.textContent || document.body.textContent)), 'and books the whole thing')
    const slotCalls = await p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'get_available_slots').map((c) => c[2]))
    check(slotCalls.some((a) => Array.isArray(a.p_addon_ids) && a.p_addon_ids.includes('s2')), 'free times fit the extra')
    check(p.errors.length === 0, `no page errors on Book again: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client', 390, 844)
    await p.evaluate(() => [...document.querySelectorAll('.lc-again .ui-btn, .lc-again .btn')].find((b) => /Book again/.test(b.textContent))?.click())
    await wait(1200)
    check(await p.evaluate(() => !document.querySelector('.lc-bk-extras .ui-chip.is-selected')), 'no extras last time, none ticked')
    await p.close()

    // QR poster
    p = await open('/portal/channels', 1272, 900)
    await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1 } })
    check(!(await p.evaluate(() => document.querySelector('.lc-poster-print'))), 'no print copy until the poster is opened')
    await p.evaluate(() => [...document.querySelectorAll('.lc-channel__action .ui-btn')].find((b) => /QR poster/.test(b.textContent))?.click())
    await wait(600)
    check(await p.evaluate(() => /Marque a sua próxima visita/.test(document.querySelector('.lc-poster-sheet .lc-poster')?.textContent || '')), 'a Portuguese business gets a Portuguese poster')
    check(await p.evaluate(() => /Femtos Barbearia/.test(document.querySelector('.lc-poster-sheet .lc-poster').textContent) && /locappoint\.com\/femtos-barbearia|femtos-barbearia/.test(document.querySelector('.lc-poster__link').textContent)), 'the poster has the name and the link')
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-poster-sheet .lc-poster__qr svg path')?.getAttribute('d'))), 'the poster has the code')
    await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-seg button, .lc-poster-sheet [role="radio"]')].find((b) => /English/.test(b.textContent))?.click())
    await wait(300)
    check(await p.evaluate(() => /Book your next visit/.test(document.querySelector('.lc-poster-sheet .lc-poster').textContent) && /Book your next visit/.test(document.querySelector('.lc-poster-print .lc-poster').textContent)), 'switching to English changes the preview and the print')
    const ratio = await p.evaluate(() => { const r = document.querySelector('.lc-poster-sheet .lc-poster').getBoundingClientRect(); return r.height / r.width })
    check(Math.abs(ratio - 297 / 210) < 0.02, `the preview is A4 shaped: ${ratio.toFixed(3)}`)
    const qrShare = await p.evaluate(() => document.querySelector('.lc-poster-sheet .lc-poster__qr').getBoundingClientRect().width / document.querySelector('.lc-poster-sheet .lc-poster').getBoundingClientRect().width)
    check(qrShare > 0.45, `the code is big enough to scan across a counter: ${qrShare.toFixed(2)}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-btn')].find((b) => /^Print/.test(b.textContent.trim()))?.click())
    check((await p.evaluate(() => window.__printed)) === 1, 'Print opens the print dialog')

    // Download poster saves the whole poster as an A4 image, not just the code
    await p.evaluate(() => {
        window.__saved = []
        HTMLAnchorElement.prototype.click = function () { window.__saved.push({ name: this.download, href: this.href }) }
    })
    await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-btn')].find((b) => /Download poster/.test(b.textContent))?.click())
    // Drawing the poster can take a few seconds on a busy machine: wait for the file, not a fixed time.
    await p.waitForFunction(() => window.__saved.some((s) => /qr-poster\.png$/.test(s.name)), { timeout: 15000 }).catch(() => {})
    const png = await p.evaluate(async () => {
        const saved = window.__saved.find((s) => /qr-poster\.png$/.test(s.name))
        if (!saved) return null
        const img = new Image()
        await new Promise((r) => { img.onload = r; img.src = saved.href })
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dark = (x, y) => ctx.getImageData(x, y, 1, 1).data.slice(0, 3).reduce((a, b) => a + b, 0) < 200
        // Rows with ink: brand, headline, name, code, words, footer, spread down the page.
        const inked = []
        for (let y = 0; y < img.height; y += 8) {
            const row = ctx.getImageData(0, y, img.width, 1).data
            let n = 0
            for (let i = 0; i < row.length; i += 4) if (row[i] + row[i + 1] + row[i + 2] < 600) n += 1
            if (n > 0) inked.push(y)
        }
        return { name: saved.name, w: img.width, h: img.height, corner: dark(4, 4), first: inked[0], last: inked[inked.length - 1] }
    })
    check(png && png.name === 'femtos-barbearia-qr-poster.png', `the poster downloads as a named image: ${png?.name}`)
    check(png && png.w === 1240 && png.h === 1754, `the image is A4 shaped: ${png?.w}x${png?.h}`)
    check(png && !png.corner && png.first < 150 && png.last > 1550, `the image is the whole poster, top to bottom: ${JSON.stringify(png)}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-btn')].find((b) => /Just the QR code/.test(b.textContent))?.click())
    await wait(400)
    check(await p.evaluate(() => window.__saved.some((s) => s.name === 'femtos-barbearia-booking-qr.png')), 'the code alone can still be saved')

    await p.emulateMediaType('print')
    await wait(200)
    const printed = await p.evaluate(() => ({
        app: getComputedStyle(document.getElementById('root')).display,
        sheet: getComputedStyle(document.querySelector('.ui-sheet')).display,
        poster: getComputedStyle(document.querySelector('.lc-poster-print')).display,
        width: document.querySelector('.lc-poster-print .lc-poster').getBoundingClientRect().width,
    }))
    check(printed.app === 'none' && printed.sheet === 'none' && printed.poster === 'block', `only the poster prints: ${JSON.stringify(printed)}`)
    check(Math.abs(printed.width - 793.7) < 3, `the printed poster is A4 wide: ${printed.width}`)
    const fit = await p.evaluate(() => ({ page: document.documentElement.scrollHeight, room: document.querySelector('.lc-poster-print .lc-poster').getBoundingClientRect().bottom - document.querySelector('.lc-poster-print .lc-poster__by').getBoundingClientRect().bottom }))
    check(fit.page <= 1123 && fit.room > 20, `the poster prints whole on one A4 page: ${JSON.stringify(fit)}`)
    await p.emulateMediaType('screen')
    await p.evaluate(() => document.querySelector('.ui-sheet .ui-iconbtn[aria-label="Close"]').click())
    await wait(500)
    check(!(await p.evaluate(() => document.querySelector('.lc-poster-print'))), 'closing the poster removes the print copy')
    check(p.errors.length === 0, `no page errors on Channels: ${p.errors.join(' | ')}`)
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768]]) {
        p = await open('/portal/channels', w, h)
        await p.evaluate(() => [...document.querySelectorAll('.lc-channel__action .ui-btn')].find((b) => /QR poster/.test(b.textContent))?.click())
        await wait(600)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.ui-sheet__panel').scrollWidth <= document.querySelector('.ui-sheet__panel').clientWidth), `the poster sheet fits at ${w}px`)
        check(await p.evaluate(() => [...document.querySelectorAll('.lc-poster-sheet .ui-btn svg')].every((i) => i.getBoundingClientRect().width >= 16)), `poster buttons keep their icons at ${w}px`)
        await p.close()
        p = await open('/portal/insights', w, h)
        await wait(1200)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `insights fit at ${w}px`)
        await p.close()
    }
}

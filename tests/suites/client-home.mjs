// Client Home as an overview: next booking, what waits on the client, book again, and places for someone new.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(800)
        return page
    }

    let p = await open('/client')
    const todo = await p.evaluate(() => [...document.querySelectorAll('.lc-cl-todo__item strong')].map((e) => e.textContent))
    check(todo.some((t) => /How was Haircut\?/.test(t)), `visits to rate wait on the client: ${JSON.stringify(todo)}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-cl-todo .ui-btn')].find((b) => b.textContent.trim() === 'Rate')?.click())
    await wait(500)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-starpick'))), 'Rate opens the review right there')
    check(p.errors.length === 0, `no page errors on Home: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client', 390, 844, '&nobookings=1')
    check(await p.evaluate(() => document.querySelectorAll('.lc-cl-popular .lc-cl-result').length > 0), 'someone new sees places worth booking')
    check(await p.evaluate(() => !document.querySelector('.lc-cl-todo')), 'and nothing waiting on them')
    await p.close()

    for (const [w, h] of [[320, 640], [1272, 588]]) {
        p = await open('/client', w, h)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `client home fits at ${w}px`)
        await p.close()
    }
}

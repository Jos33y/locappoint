// Engine v1: "What do you need?" asks what, where, when and how many, shows up to three people free
// for different reasons, and one tap opens that business's booking sheet at that time.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (route, extra = '', vw = 390, vh = 844) => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(route)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(900)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.trim() || '', sel)
    const calls = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)

    // A client with no business of their own: an owner's own page opens in owner mode, never the client sheet.
    let p = await open('/client', '&nobiz=1')
    check(/What do you need/.test(await text(p, '.lc-eng')), 'the client home asks what you need')
    const chips = await p.evaluate(() => [...document.querySelectorAll('.lc-eng .ui-chip')].map((c) => c.textContent.trim()))
    check(chips.includes('Barbershop') && chips.includes('Nails'), `popular categories in the city are offered: ${JSON.stringify(chips)}`)
    await p.type('.lc-eng__what input', 'haircut')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    const sent = (await calls(p, 'engine_match')).pop() || {}
    check(sent.p_query === 'haircut' && sent.p_market === 'porto' && sent.p_people === 1 && sent.p_dates === null, `the request goes to the engine, for the soonest free times by default: ${JSON.stringify(sent)}`)
    const opts = await p.evaluate(() => [...document.querySelectorAll('.lc-eng__opt')].map((o) => ({ tag: o.querySelector('.lc-eng__tag')?.textContent, why: o.querySelector('.lc-eng__why')?.textContent || '', book: o.querySelector('.ui-btn')?.textContent.trim() })))
    check(opts.length === 3 && opts[0].tag === 'Best match' && opts[1].tag === 'Earliest' && opts[2].tag === 'Closest', `three options, three reasons: ${JSON.stringify(opts.map((o) => o.tag))}`)
    check(/70% of clients book again/.test(opts[0].why) && /1\.2 km away/.test(opts[2].why) && /4\.8 from 12 reviews/.test(opts[2].why), `each says why: ${JSON.stringify(opts.map((o) => o.why))}`)
    check(opts[0].book === 'Book 10:00', `one tap books the time: ${opts[0].book}`)
    await wait(300)
    const noted = (await calls(p, 'search_note')).pop() || {}
    check(noted.p_channel === 'web' && noted.p_query === 'haircut' && noted.p_market === 'porto' && noted.p_options === 3 && noted.p_matched === 3 && noted.p_offered === 3 && noted.p_people === 1, `every search is kept for Demand, with what we found: ${JSON.stringify(noted)}`)
    check(!/You are in/.test(await text(p, '.lc-eng')), 'no country line when the country is unknown')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.evaluate(() => document.querySelector('.lc-eng__opt .ui-btn')?.click())
    // The business page loads on demand; on a slow machine that takes a few seconds.
    await p.waitForFunction(() => /Check and confirm/.test(document.body.textContent) && document.querySelector('.lc-bk-ticket'), { timeout: 8000 }).catch(() => {})
    check(await p.evaluate(() => window.__path) === '/femtos-barbearia', 'the business page opens')
    check(/Check and confirm/.test(await p.evaluate(() => document.body.textContent)) && /10:00/.test(await text(p, '.lc-bk-ticket')), 'with the booking sheet at that time, ready to confirm')
    await p.close()

    // Nobody at the time asked: the nearest time instead.
    p = await open('/client')
    await p.type('.lc-eng__what input', 'haircut')
    await p.evaluate(() => {
        const pick = [...document.querySelectorAll('.lc-eng__row button')][2]
        pick?.click()
    })
    await wait(300)
    await p.evaluate(() => [...document.querySelectorAll('[role=option]')].find((o) => o.textContent.includes('Around 21:00'))?.click())
    await wait(300)
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    check(/Nobody is free then, around 21:00/.test(await text(p, '.lc-eng__out')) && /Book 18:30/.test(await text(p, '.lc-eng__out')), `nobody at 21:00, the nearest time instead: ${await text(p, '.lc-eng__out')}`)
    await p.close()

    // Plans ahead: a day in the words becomes When; any day of the next two weeks can be picked.
    p = await open('/client')
    const whens = await p.evaluate(async () => {
        const pick = [...document.querySelectorAll('.lc-eng__row button')][1]
        pick?.click()
        await new Promise((r) => setTimeout(r, 300))
        const list = [...document.querySelectorAll('[role=option]')].map((o) => o.textContent.trim())
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        return list
    })
    check(whens[0] === 'Soonest' && whens.includes('This weekend') && whens.includes('Next week') && whens.some((w) => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d+ /.test(w)) && whens.length === 18, `When reaches two weeks ahead: ${JSON.stringify(whens)}`)
    await p.close()
    p = await open('/client')
    await p.type('.lc-eng__what input', 'haircut tuesday')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    let ask = (await calls(p, 'engine_match')).pop() || {}
    const tue = ask.p_dates?.[0]
    check(ask.p_dates?.length === 1 && new Date(`${tue}T12:00:00Z`).getUTCDay() === 2 && tue >= new Date().toISOString().slice(0, 10), `"haircut tuesday" searches the coming Tuesday: ${JSON.stringify(ask.p_dates)}`)
    await p.$eval('.lc-eng__what input', (el) => el.select())
    await p.type('.lc-eng__what input', 'nails next week')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    ask = (await calls(p, 'engine_match')).pop() || {}
    check(ask.p_dates?.length === 7 && new Date(`${ask.p_dates[0]}T12:00:00Z`).getUTCDay() === 1, `"next week" searches Monday to Sunday: ${JSON.stringify(ask.p_dates)}`)
    await p.$eval('.lc-eng__what input', (el) => el.select())
    await p.type('.lc-eng__what input', 'haircut next week friday')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    ask = (await calls(p, 'engine_match')).pop() || {}
    const fri = ask.p_dates?.[0]
    const gap = (Date.parse(`${fri}T12:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`)) / 86400000
    check(ask.p_dates?.length === 1 && new Date(`${fri}T12:00:00Z`).getUTCDay() === 5 && gap >= 5 && gap <= 12, `"next week friday" is that Friday, not the whole week: ${JSON.stringify(ask.p_dates)}`)
    await p.$eval('.lc-eng__what input', (el) => el.select())
    await p.type('.lc-eng__what input', 'closed today')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    check(/Nobody is free today\. Next free:/.test(await text(p, '.lc-eng__out')) && /Book 09:00/.test(await text(p, '.lc-eng__out')) && !/offers that yet/.test(await text(p, '.lc-eng__out')), `closed today: never "nobody offers", the next free time instead: ${await text(p, '.lc-eng__out')}`)
    await p.$eval('.lc-eng__what input', (el) => el.select())
    await p.type('.lc-eng__what input', 'booked out')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    check(/fully booked for the next 3 weeks/.test(await text(p, '.lc-eng__out')) && /Want to know when a time opens up/.test(await text(p, '.lc-eng__out')), 'booked out for 3 weeks: said plainly, and they can ask to be told')
    check(((await calls(p, 'search_note')).pop() || {}).p_offered === 2, 'the search log keeps how many offer it')
    await p.close()

    // One business: no "Best match"; the area, how long, the date, its other times and its other services.
    p = await open('/client')
    await p.type('.lc-eng__what input', 'kids')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    const one = await p.evaluate(() => {
        const o = document.querySelector('.lc-eng__opt')
        return { tag: !!o?.querySelector('.lc-eng__tag'), text: o?.textContent || '', times: [...(o?.querySelectorAll('.lc-eng__times .ui-btn') || [])].map((b) => b.textContent.trim()), also: [...(o?.querySelectorAll('.lc-eng__also .ui-btn') || [])].map((b) => b.textContent.trim()) }
    })
    check(!one.tag && /Bonfim/.test(one.text) && /Haircut, 45 min/.test(one.text) && /(Today|Tomorrow), \w{3} \d+ \w{3} at 10:00/.test(one.text), `one business: no Best match, its area, how long and the date: ${one.text}`)
    check(JSON.stringify(one.times) === '["10:30","11:00","15:00","More times"]' && one.also.length === 1 && /^Kids cut \(under 12\), €12, 09:45$/.test(one.also[0]), `its other times and other services: ${JSON.stringify(one)}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-eng__times .ui-btn')].find((b) => b.textContent.trim() === '11:00')?.click())
    await wait(600)
    check(/book=s1\.\d{4}-\d{2}-\d{2}\.1100/.test(await p.evaluate(() => window.__search || '')), `another time books that time: ${await p.evaluate(() => window.__search)}`)
    await p.close()
    p = await open('/client')
    await p.type('.lc-eng__what input', 'kids')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    await p.evaluate(() => document.querySelector('.lc-eng__also .ui-btn')?.click())
    await wait(600)
    check(/book=s9\.\d{4}-\d{2}-\d{2}\.0945/.test(await p.evaluate(() => window.__search || '')), `another service books that service: ${await p.evaluate(() => window.__search)}`)
    await p.close()

    // Nothing that fits: says so and offers every place.
    p = await open('/client')
    await p.type('.lc-eng__what input', 'nothing like this')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    check(/Nobody in Porto offers that yet/.test(await text(p, '.lc-eng__out')) && /Browse every place/.test(await text(p, '.lc-eng__out')), 'nothing fits: it says so and offers every place')
    check(/Want to know when someone near you offers it/.test(await text(p, '.lc-eng__out')) && await p.$('.lc-eng__out .lc-wish'), 'nothing fits: they can ask to be told')
    await p.$eval('.lc-wish input', (el) => el.select())
    await p.type('.lc-wish input', 'ana@x.pt')
    await p.evaluate(() => document.querySelector('.lc-wish').requestSubmit())
    await wait(500)
    const wish = (await calls(p, 'search_wish_add')).pop() || {}
    check(wish.p_query === 'nothing like this' && wish.p_market === 'porto' && wish.p_email === 'ana@x.pt' && wish.p_phone === null, `Tell me when keeps the search and the email: ${JSON.stringify(wish)}`)
    check(/We will tell you when someone near you offers it/.test(await text(p, '.lc-eng__out')), 'and says it is done')
    const missNote = (await calls(p, 'search_note')).pop() || {}
    check(missNote.p_query === 'nothing like this' && missNote.p_options === 0 && missNote.p_later === 0, 'a search that found nothing is kept too')
    await p.close()

    // Someone in Kenya: told where Locappoint works, and can ask for Kenya.
    p = await browser.newPage()
    p.errors = []
    p.on('pageerror', (e) => p.errors.push(e.message))
    await p.setRequestInterception(true)
    p.on('request', (r) => (new URL(r.url()).pathname === '/geo'
        ? r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ country: 'KE' }) })
        : r.continue()))
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await p.goto(`${url}/?path=${encodeURIComponent('/client')}`, { waitUntil: 'networkidle0' })
    await wait(900)
    check(/You are in Kenya\. Locappoint books businesses in Nigeria and Portugal/.test(await text(p, '.lc-eng__abroad')), `a visitor from Kenya is told where Locappoint works: ${await text(p, '.lc-eng__abroad')}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-eng__abroad .ui-btn')].find((b) => /Want Locappoint in Kenya/.test(b.textContent))?.click())
    await wait(300)
    await p.$eval('.lc-eng__abroad .lc-wish input', (el) => el.select())
    await p.type('.lc-eng__abroad .lc-wish input', '+254 712 345 678')
    await p.evaluate(() => document.querySelector('.lc-eng__abroad .lc-wish').requestSubmit())
    await wait(500)
    const ke = (await calls(p, 'search_wish_add')).pop() || {}
    check(ke.p_target_country === 'KE' && ke.p_origin_country === 'KE' && ke.p_phone === '+254 712 345 678' && ke.p_email === null, `asking for Kenya keeps the country and the number: ${JSON.stringify(ke)}`)
    check(/We will tell you when Locappoint opens in Kenya/.test(await text(p, '.lc-eng__abroad')), 'and says it is done')
    await p.type('.lc-eng__what input', 'haircut')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(800)
    check(((await calls(p, 'search_note')).pop() || {}).p_origin_country === 'KE', 'their searches carry their country')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth) && p.errors.length === 0, `fits a phone, no page errors: ${p.errors.join(' | ')}`)
    await p.close()

}

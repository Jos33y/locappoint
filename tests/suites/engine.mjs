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

    // Search that understands (doc 36): day, time, people and where read from the words, shown as chips,
    // each removable; a day from the words resets when the words change; a hand pick stays.
    p = await open('/client')
    const ask2 = async (words) => {
        await p.$eval('.lc-eng__what input', (el) => el.select())
        await p.type('.lc-eng__what input', words)
        await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
        await wait(700)
        return (await calls(p, 'engine_match')).pop() || {}
    }
    const chipsNow = () => p.evaluate(() => [...document.querySelectorAll('.lc-eng__read')].map((c) => c.textContent.trim()))
    let a2 = await ask2('kids cut friday after 5')
    check(a2.p_query === 'kids cut' && a2.p_window === '17:00-23:59' && a2.p_dates?.length === 1 && new Date(`${a2.p_dates[0]}T12:00:00Z`).getUTCDay() === 5, `"kids cut friday after 5": what, day and time apart: ${JSON.stringify([a2.p_query, a2.p_window, a2.p_dates])}`)
    let read = await chipsNow()
    check(read.length === 2 && read.includes('After 17:00') && read.some((c) => /Fri/.test(c)), `what was understood shows as chips: ${JSON.stringify(read)}`)
    await p.evaluate(() => [...document.querySelectorAll('.lc-eng__read')].find((c) => /After/.test(c.textContent))?.click())
    await wait(700)
    a2 = (await calls(p, 'engine_match')).pop() || {}
    check(a2.p_window === 'any' && a2.p_dates?.length === 1 && await p.$eval('.lc-eng__what input', (el) => el.value) === 'kids cut friday', `removing a chip takes its words out and searches again: ${await p.$eval('.lc-eng__what input', (el) => el.value)}`)
    a2 = await ask2('haircut')
    check(a2.p_dates === null && a2.p_window === 'any' && (await chipsNow()).length === 0, `a day from the words does not stick to the next search: ${JSON.stringify(a2.p_dates)}`)
    a2 = await ask2('braids for 3 people at 3pm')
    check(a2.p_people === 3 && a2.p_at === '15:00' && a2.p_query === 'braids', `people and time from the words: ${JSON.stringify([a2.p_people, a2.p_at, a2.p_query])}`)
    a2 = await ask2('braids')
    check(a2.p_people === 1 && a2.p_at === null, 'and they reset when the words change')
    await p.close()
    p = await open('/client')
    await p.evaluate(async () => {
        const pick = [...document.querySelectorAll('.lc-eng__row button')][1]
        pick?.click()
        await new Promise((r) => setTimeout(r, 300))
        ;[...document.querySelectorAll('[role=option]')].find((o) => o.textContent.trim() === 'Next week')?.click()
    })
    await wait(300)
    await p.type('.lc-eng__what input', 'haircut')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(700)
    check(((await calls(p, 'engine_match')).pop() || {}).p_dates?.length === 7, 'a day picked by hand stays')
    await p.$eval('.lc-eng__what input', (el) => el.select())
    await p.type('.lc-eng__what input', 'haircut home service')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(500)
    check(/Tell us where you are/.test(await text(p, '.lc-eng__out')) && (await chipsNow()).includes('At your place'), 'home service from the words asks where they are')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    // The AI step (R1b): a long sentence goes to the AI first; a short clear one never does; a short one
    // the engine cannot place goes after; an AI reading can be removed; with the AI off, rules alone.
    const fnCalls = (pg, name) => pg.evaluate((n) => window.__calls.filter((c) => c[0] === 'fn' && c[1] === n).map((c) => c[2]), name)
    p = await open('/client')
    const ask3 = async (words) => {
        await p.$eval('.lc-eng__what input', (el) => el.select())
        await p.type('.lc-eng__what input', words)
        await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
        await wait(900)
    }
    await ask3('haircut')
    check((await fnCalls(p, 'understand')).length === 0, 'a short clear search never asks the AI')
    await ask3('something for my son tomorrow after football please')
    let ai = await fnCalls(p, 'understand')
    let sent3 = (await calls(p, 'engine_match')).pop() || {}
    check(ai.length === 1 && ai[0].market === 'porto' && sent3.p_query === 'kids' && sent3.p_window === '13:00-23:59' && sent3.p_dates?.length === 1, `a long sentence: the AI reads it, the rules keep their own day: ${JSON.stringify([ai.length, sent3.p_query, sent3.p_window, sent3.p_dates])}`)
    const aiChips = await p.evaluate(() => ({ label: document.querySelector('.lc-eng__understood .lc-eng__label')?.textContent, ai: [...document.querySelectorAll('.lc-eng__read.is-ai')].map((c) => c.textContent.trim()), all: [...document.querySelectorAll('.lc-eng__read')].map((c) => c.textContent.trim()) }))
    check(aiChips.label === 'Understood with AI' && aiChips.ai.includes('kids') && aiChips.ai.includes('After 13:00') && aiChips.all.includes('Tomorrow'), `what the AI read is marked as such: ${JSON.stringify(aiChips)}`)
    const before3 = (await fnCalls(p, 'understand')).length
    await p.evaluate(() => [...document.querySelectorAll('.lc-eng__read.is-ai')].find((c) => /After/.test(c.textContent))?.click())
    await wait(800)
    sent3 = (await calls(p, 'engine_match')).pop() || {}
    check((await fnCalls(p, 'understand')).length === before3 && sent3.p_window === 'any', `removing an AI reading searches again on the rules, without the AI: ${JSON.stringify(sent3.p_window)}`)
    await ask3('nothing zzz')
    const engineRuns = (await calls(p, 'engine_match')).length
    check((await fnCalls(p, 'understand')).length === before3 + 1 && /offers that yet/.test(await text(p, '.lc-eng__out')), 'a short search nobody offers asks the AI once after, and says so when it cannot help')
    check(p.errors.length === 0 && engineRuns > 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()
    p = await open('/client', '&ai=off')
    await p.type('.lc-eng__what input', 'something for my son tomorrow after football please')
    await p.evaluate(() => document.querySelector('.lc-eng__form').requestSubmit())
    await wait(900)
    check(((await calls(p, 'engine_match')).pop() || {}).p_dates?.length === 1 && !(await p.$('.lc-eng__read.is-ai')), 'with the AI off or over its cap, the rules still search')
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

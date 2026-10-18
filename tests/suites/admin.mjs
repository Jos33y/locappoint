// Admin: overview of the platform, businesses, bookings and people. Looking only, nothing changes.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (section, vw = 1272, vh = 900, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh, isMobile: vw < 1024, hasTouch: vw < 1024 })
        await page.goto(`${url}/?path=${encodeURIComponent(`/admin-view/${section}`)}&guest=1${extra}`, { waitUntil: 'networkidle0' })
        await wait(700)
        return page
    }
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel)
    const rpcs = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

    // Overview
    let p = await open('overview')
    const cards = await p.evaluate(() => [...document.querySelectorAll('.stat-card')].map((c) => c.textContent))
    check(cards.some((c) => /Live businesses\s*1/.test(c) && /1 setting up/.test(c)), `live and setting-up businesses are counted: ${cards[0]}`)
    check(cards.some((c) => /Bookings today\s*4/.test(c)) && cards.some((c) => /App users, 30 days\s*6/.test(c) && /4 phones with notifications on/.test(c)), 'bookings today and app users show')
    const attention = await text(p, '.adm-attention')
    check(/2 bookings waiting/.test(attention) && /1 message failed/.test(attention) && /2 app errors this week, 16 times/.test(attention), `what needs a look is listed first: ${attention}`)
    check(/€540/.test(await text(p, '.adm-facts')) && /₦135,000/.test(await text(p, '.adm-facts')), 'booked value shows in euros and naira separately')
    check(/Android 1\.0\.7/.test(await p.evaluate(() => document.body.textContent)) && /Booking page or app/.test(await p.evaluate(() => document.body.textContent)), 'app versions and booking sources are named plainly')
    await p.evaluate(() => [...document.querySelectorAll('.adm-attention .adm-link')].find((b) => b.closest('li').textContent.includes('waiting')).click())
    await wait(700)
    check((await text(p, '#__admin')) === 'bookings' && /Bookings/.test(await text(p, '.section-head__title')), 'Open goes straight to the list')
    check(p.errors.length === 0, `no page errors on the overview: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('overview', 1272, 900, '&adminempty=1')
    check(!(await p.evaluate(() => document.querySelector('.adm-attention'))) && /Nobody has signed in on the app yet/.test(await p.evaluate(() => document.body.textContent)), 'a new platform shows calm empty states, no alarms')
    await p.close()

    // Businesses
    p = await open('businesses')
    let rows = await p.evaluate(() => [...document.querySelectorAll('.adm-table tbody tr')].map((r) => r.textContent))
    check(rows.length === 3 && rows.some((r) => /Nove Nails/.test(r) && /Setting up/.test(r) && /2\/4/.test(r)), 'each business shows its stage and how ready its page is')
    await p.evaluate(() => [...document.querySelectorAll('.adm-chip')].find((b) => /Setting up/.test(b.textContent)).click())
    await wait(200)
    rows = await p.evaluate(() => [...document.querySelectorAll('.adm-table tbody tr')].map((r) => r.textContent))
    check(rows.length === 1 && /Nove Nails/.test(rows[0]), 'filtering to setting up leaves those only')
    await p.evaluate(() => document.querySelector('.adm-table tbody tr').click())
    await wait(200)
    check(/Still missing\s*Logo, Description/.test(await text(p, '.adm-detail')) && await p.evaluate(() => document.querySelector('.adm-detail a')?.getAttribute('href') === '/nove-nails'), 'opening a business says what its page still needs, with a link to it')
    await p.evaluate(() => [...document.querySelectorAll('.adm-chip')].find((b) => /^All/.test(b.textContent)).click())
    await p.type('.adm-search input', 'lagos')
    await wait(200)
    rows = await p.evaluate(() => [...document.querySelectorAll('.adm-table tbody tr')].map((r) => r.textContent))
    check(rows.length === 1 && /Lekki Cuts/.test(rows[0]), 'search finds by city')
    await p.close()

    // Bookings
    p = await open('bookings')
    check(/63 bookings/.test(await text(p, '.section-head__meta')) && (await p.evaluate(() => document.querySelectorAll('.adm-table tbody tr').length)) === 50, 'bookings come 50 a page with the full count')
    check(/Page 1 of 2/.test(await text(p, '.adm-pager')), 'and pages through the rest')
    await p.evaluate(() => [...document.querySelectorAll('.adm-pager button')].find((b) => /Older/.test(b.textContent)).click())
    await wait(500)
    check((await rpcs(p, 'admin_bookings')).some((a) => a.p_offset === 50), 'Older asks the server for the next 50')
    await p.evaluate(() => [...document.querySelectorAll('.adm-chip')].find((b) => /No-show/.test(b.textContent)).click())
    await wait(500)
    check((await rpcs(p, 'admin_bookings')).some((a) => a.p_status === 'no_show' && a.p_offset === 0), 'a status filter starts again from the first page')
    await p.type('.adm-search input', 'ana@')
    await wait(800)
    check((await rpcs(p, 'admin_bookings')).some((a) => a.p_search === 'ana@'), 'search is done on the server, after typing stops')
    await p.close()

    // People
    p = await open('people')
    rows = await p.evaluate(() => [...document.querySelectorAll('.adm-table tbody tr')].map((r) => r.textContent))
    check(rows.some((r) => /Miles Farra \(admin\)/.test(r) && /Email, Google/.test(r) && /Android 1\.0\.7/.test(r) && /notifications on/.test(r)), 'people show how they sign in and which app version they run')
    check(rows.some((r) => /Ana Ferreira/.test(r) && /Website only/.test(r) && /3 bookings/.test(r)), 'clients on the website say so')
    await p.evaluate(() => [...document.querySelectorAll('.adm-chip')].find((b) => /Owners/.test(b.textContent)).click())
    await wait(500)
    check((await rpcs(p, 'admin_people')).some((a) => a.p_type === 'business'), 'owners filter asks for owners')
    check(!(await p.evaluate(() => document.querySelector('.adm-table button, .adm-table input'))), 'nothing on the lists can change data')
    await p.close()

    for (const s of ['overview', 'businesses', 'bookings', 'people']) {
        p = await open(s, 390, 844)
        check(await fits(p), `${s} fits a phone, tables scroll on their own`)
        check(p.errors.length === 0, `no page errors on ${s} at 390: ${p.errors.join(' | ')}`)
        await p.close()
    }

    // Demand (doc 35): where people search from, where they want it, what found nothing, who asked to be told.
    p = await open('demand')
    const dem = await p.evaluate(() => document.querySelector('.adm-demand')?.textContent || '')
    const dcards = await p.evaluate(() => [...document.querySelectorAll('.adm-demand .stat-card')].map((c) => c.textContent))
    check(dcards.some((c) => /Searches\s*42/.test(c) && /From 3 countries\. Website 30, WhatsApp 12/.test(c)) && dcards.some((c) => /Found something to book\s*71%/.test(c)) && dcards.some((c) => /Nobody there\s*7/.test(c) && /17% of searches/.test(c)) && dcards.some((c) => /Asked to be told\s*2/.test(c) && /Waiting on 2 places/.test(c)), `the four numbers: ${JSON.stringify(dcards)}`)
    const placeRows = await p.evaluate(() => [...document.querySelectorAll('.adm-dem-places .adm-dem-row:not(.is-head)')].map((r) => ({ text: r.textContent, tile: r.querySelector('.lc-pattern')?.getAttribute('class') || '' })))
    check(placeRows.length === 3 && /Ibadan, Lagos/.test(placeRows[0].text) && /lash tech/.test(placeRows[0].text) && placeRows[0].tile.includes('lc-pattern--adire') && placeRows[1].tile.includes('lc-pattern--minho') && placeRows[2].tile.includes('lc-pattern--uli'), `places to sign up from, each in its world: ${JSON.stringify(placeRows)}`)
    await p.evaluate(() => document.querySelector('.adm-dem-places .adm-dem-row:not(.is-head)').click())
    await wait(500)
    const detail = await p.evaluate(() => ({ words: [...document.querySelectorAll('.adm-dem-word')].map((w) => w.textContent), text: document.querySelector('.adm-dem-detail')?.textContent || '', find: document.querySelector('.adm-dem-detail a')?.getAttribute('href') || '' }))
    check(detail.words.join('|') === 'lash tech3|lashes bodija1' && /Copy the waiting list \(1\)/.test(detail.text) && /Most searched on Saturdays/.test(detail.text), `a place opened: the words and the waiting list: ${detail.text}`)
    check(/google\.com\/maps\/search\/lash%20tech%20Ibadan/.test(detail.find), `and a search for businesses there: ${detail.find}`)
    const place = (await rpcs(p, 'admin_demand_place')).pop() || {}
    check(place.p_market === 'lagos' && place.p_zone === 'Ibadan' && place.p_days === 30, `asked for that place: ${JSON.stringify(place)}`)
    check(/Booked out for 3 weeks3/.test(dem) && /Free, but not when asked2/.test(dem) && /haircut, Lagos3/.test(dem) && /braids, Lagos2/.test(dem), `no time that fit, split in two: ${dem.slice(0, 600)}`)
    check(/Kenya/.test(dem) && /mostly Lagos/.test(dem) && /mostly Lisbon/.test(dem), 'countries we are not in, and where they searched')
    check(/\+254712345678/.test(dem) && /ana@x\.pt/.test(dem) && /Locappoint in their country/.test(dem), 'the Tell me when contacts are listed')
    const before = (await rpcs(p, 'admin_demand')).length
    await p.evaluate(() => [...document.querySelectorAll('.adm-demand__periods .btn')].find((b) => b.textContent === '7 days')?.click())
    await wait(500)
    const asked = await rpcs(p, 'admin_demand')
    check(asked.length === before + 1 && asked.pop().p_days === 7, 'the period can be changed')
    check(p.errors.length === 0, `no page errors on Demand: ${p.errors.join(' | ')}`)
    await p.close()
    p = await open('demand', 390, 844)
    check(await fits(p), 'Demand fits a phone')
    await p.close()
}

// Travel time between visits: Lagos areas grouped into regions with minutes between them, slower at
// rush hour. Free times carry where the booking happens; the client is told before confirming when
// the travel to their area no longer fits the time; Services asks where visits start from.

import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, root }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
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
    const click = (p, sel, label) => p.evaluate((s, l) => [...document.querySelectorAll(s)].find((b) => b.textContent.trim().includes(l))?.click(), sel, label)

    // Every Lagos area belongs to a region.
    const sql = read('supabase/migrations/travel.sql')
    const listed = (file) => {
        const body = read(file)
        const block = body.slice(body.indexOf("SELECT 'lagos'"), body.indexOf('ON CONFLICT', body.indexOf("SELECT 'lagos'")))
        return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((n) => n !== 'lagos')
    }
    const areas = [...listed('supabase/migrations/engine-foundation.sql'), ...listed('supabase/migrations/cities.sql')]
    const missing = areas.filter((a) => !sql.includes(`('${a}', '`))
    check(areas.length === 73 && missing.length === 0, `all 73 Lagos areas have a region (${areas.length}; missing: ${missing.join(', ')})`)
    check((sql.match(/\('lagos', '[a-z_]+', '[^']+', \d+\)/g) || []).length === 13, 'Lagos has 13 regions')
    check(/\('lagos', '06:30', '10:00', 1\.5, true\)/.test(sql) && /\('lagos', '16:00', '20:00', 1\.5, true\)/.test(sql), 'weekday rush hours are 1.5 times slower')
    check(/WHEN biz\.travels THEN public\.travel_minutes/.test(sql) && /appointment_date BETWEEN p_date - 1 AND p_date \+ 1/.test(sql), 'free times keep the travel gap, only where the city has regions')
    check(/v_people, v_mode, v_zone\) s/.test(sql) && /p_mode, p_zone\) sl/.test(sql), 'booking and What do you need? check travel for the way and area asked')
    check(/p_mode: mode/.test(read('src/services/booking.js')) && /p_zone: zone/.test(read('src/services/booking.js')), 'the booking sheet asks free times for its way and area')

    // The client picks a time, then a visit at their place in an area the travel does not fit.
    let p = await open('/femtos-barbearia', '&guest=1&nobiz=1&home=1&travel=1')
    await click(p, '.lc-pub__svc', 'Haircut')
    await wait(900)
    await p.evaluate(() => document.querySelector('.lc-bk-slot')?.click())
    await click(p, '.ui-btn, .btn', 'Continue')
    await wait(700)
    await click(p, '.lc-fmt-pick .ui-seg__btn', 'At your place')
    await wait(500)
    check(await p.evaluate(() => window.__calls.some((c) => c[0] === 'rpc' && c[1] === 'get_available_slots' && c[2].p_mode === 'at_client')), 'picking a visit at their place asks free times again, for a visit')
    await p.evaluate(() => document.querySelector('.lc-fmt-visit .ui-picker-trigger')?.click())
    await wait(400)
    await click(p, '[role="option"]', 'Matosinhos')
    await wait(900)
    check(await p.evaluate(() => window.__calls.some((c) => c[0] === 'rpc' && c[1] === 'get_available_slots' && c[2].p_zone === 'Matosinhos')), 'and again once the area is known')
    const clash = await text(p, '.lc-bk-notice')
    check(/With the travel to Matosinhos, \d{2}:\d{2} no longer works for Femtos Barbearia\./.test(clash) && /Pick another time/.test(clash), `the client is told before confirming: ${clash}`)
    const before = await p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'book_appointment').length)
    await click(p, '.ui-btn', 'Confirm booking')
    await wait(400)
    check(await p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'book_appointment').length === n, before), 'and nothing is booked at that time')
    await click(p, '.lc-bk-notice .lc-bk-link', 'Pick another time')
    await wait(500)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-slot'))), 'Pick another time goes back to the times')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    // Services: where visits start from, only in a city with regions.
    p = await open('/portal/services', '&home=1')
    check(!(await p.evaluate(() => /You start from/.test(document.body.textContent))), 'a city without regions is not asked where visits start')
    await p.close()
    p = await open('/portal/services', '&home=1&travel=1')
    check(await p.evaluate(() => /You start from/.test(document.body.textContent)), 'a city with regions asks where visits start from')
    await p.evaluate(() => document.querySelector('.biz-sh__start .ui-picker-trigger')?.click())
    await wait(400)
    await click(p, '[role="option"]', 'Maia')
    await wait(600)
    check(await p.evaluate(() => window.__calls.some((c) => c[0] === 'update' && c[1] === 'businesses' && c[2].base_zone === 'Maia')), 'the start area is saved')
    check(/Maia/.test(await text(p, '.biz-sh__start .ui-picker-trigger')), 'and shown')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()
}

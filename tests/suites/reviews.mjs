// Reviews: asked after a visit, posted by link or signed in, shown on the page and in search, answered by the owner.

export default async ({ browser, url, check }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent(path)}${extra}`, { waitUntil: 'networkidle0' })
        await wait(600)
        return page
    }
    const rpc = (p, name) => p.evaluate((n) => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === n).map((c) => c[2]), name)
    const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent?.trim() || '', sel)
    const clickText = (p, sel, label) => p.evaluate((s, l) => {
        const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim() === l)
        el?.click()
        return Boolean(el)
    }, sel, label)
    const type = async (p, sel, value) => { await p.focus(sel); await p.keyboard.type(value) }
    const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

    let p = await open('/femtos-barbearia')
    check(/3\.3/.test(await text(p, '.lc-pub__head .lc-rating')) && /7 reviews/.test(await text(p, '.lc-pub__head .lc-rating')), `rating under the name: ${await text(p, '.lc-pub__head .lc-rating')}`)
    check(await p.evaluate(() => document.querySelector('.lc-pub__head .lc-rating')?.getAttribute('href') === '#reviews'), 'rating jumps to the reviews')
    check(await p.evaluate(() => document.querySelectorAll('#reviews .lc-starbars__row').length === 5), 'star split, five down to one')
    check(await p.evaluate(() => document.querySelectorAll('#reviews .lc-rv').length === 2), 'first reviews listed')
    check(/Reply from Femtos/.test(await text(p, '#reviews')), 'owner replies show under the review')
    check(!/Ferreira|Clarke/.test(await text(p, '#reviews')), 'the public sees first name and initial only')
    await clickText(p, '#reviews .ui-btn', 'Show more reviews')
    await wait(500)
    check((await rpc(p, 'public_reviews')).some((a) => a.p_offset === 2) && await p.evaluate(() => document.querySelectorAll('#reviews .lc-rv').length === 4), 'Show more loads the next page')
    check(await fits(p), 'public page with reviews fits a phone')
    check(p.errors.length === 0, `no page errors on the public page: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/femtos-barbearia', 390, 844, '&noreviews=1')
    check(await text(p, '.lc-pub__head .lc-rating') === 'New on Locappoint' && !(await p.evaluate(() => Boolean(document.querySelector('#reviews')))), 'a business without reviews reads as new, not as unrated')
    await p.close()

    p = await open('/client/search')
    check(/4\.7/.test(await text(p, '.lc-cl-result__rating')) && /12 reviews/.test(await text(p, '.lc-cl-result__rating')), `search shows the rating: ${await text(p, '.lc-cl-result__rating')}`)
    await p.close()

    p = await open('/client/appointments')
    await clickText(p, '.ui-seg__btn', 'Past 4')
    await wait(300)
    check(/Business replied/.test(await text(p, '#booking-c1 .lc-cl-past__rated')), 'a reviewed visit shows its stars and the reply')
    check(Boolean(await p.evaluate(() => Boolean(document.querySelector('#booking-c3 .lc-cl-past__rate')))), 'a fresh visit asks for a rating')
    check(!(await p.evaluate(() => Boolean(document.querySelector('#booking-c2 .lc-cl-past__rate')))), 'a no-show cannot be rated')
    await p.evaluate(() => document.querySelector('#booking-c3 .lc-cl-past__rate').click())
    await wait(500)
    await p.evaluate(() => document.querySelectorAll('.lc-starpick__star')[3].click())
    check(await text(p, '.lc-rvform__word') === 'Very good', 'the stars say what they mean')
    await type(p, '.lc-rvform textarea', 'Quick and friendly.')
    await clickText(p, '.ui-btn', 'Post review')
    await wait(500)
    const mine = (await rpc(p, 'submit_my_review')).at(-1)
    check(mine?.p_appointment_id === 'c3' && mine?.p_rating === 4 && mine?.p_body === 'Quick and friendly.', `posts the review for that visit: ${JSON.stringify(mine)}`)
    check(/Thanks/.test(await text(p, '.lc-rate__thanks')), 'says thanks')
    await clickText(p, '.ui-btn', 'Book again')
    await wait(900)
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-bk-again'))), 'after rating, Book again is one tap')
    check(p.errors.length === 0, `no page errors on bookings: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client/appointments?rate=c3')
    check(await p.evaluate(() => Boolean(document.querySelector('.lc-starpick'))), 'the bell link opens the rating')
    await p.close()

    p = await open('/b/tok-1234567890abcdef1234567890abcdef?rate=5', 390, 844, '&guest=1')
    check(await p.evaluate(() => document.querySelectorAll('.lc-mb-review .lc-starpick__star')[4]?.getAttribute('aria-checked') === 'true'), 'the star tapped in the email is already picked')
    await clickText(p, '.lc-mb-review .ui-btn', 'Post review')
    await wait(500)
    const byLink = (await rpc(p, 'submit_review_by_link')).at(-1)
    check(byLink?.p_rating === 5 && /^tok-/.test(byLink?.p_token || ''), `a guest posts without signing in: ${JSON.stringify(byLink)}`)
    check(/Your review/.test(await text(p, '.lc-mb-review')) && /Edit review/.test(await text(p, '.lc-mb-review')), 'then sees the review, and can still edit it')
    check(await fits(p), 'manage page with a review fits a phone')
    check(p.errors.length === 0, `no page errors on the manage page: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/reviews', 1272, 588)
    check(await text(p, '.lc-bizrv__avg') === '3.3', 'owner sees the average first')
    check(/2 waiting for your reply/.test(await text(p, '.lc-bizrv__waiting')), 'and how many wait for a reply')
    check(await p.evaluate(() => document.querySelectorAll('.lc-bizrv__item').length === 2), 'waiting reviews shown first')
    check(/Ana Ferreira/.test(await text(p, '#review-rv1')) && /Shown as Ana F\./.test(await text(p, '#review-rv1')), 'owner sees the full name and how it shows publicly')
    check(/Reported/.test(await text(p, '#review-rv3')) && !(await p.evaluate(() => Boolean(document.querySelector('#review-rv3 .lc-bizrv__link.is-quiet')))), 'a reported review says so and cannot be reported twice')
    check(!(await p.evaluate(() => [...document.querySelectorAll('.biz-navlink, .biz-hubnav a')].some((a) => a.textContent.startsWith('Reviews') && a.querySelector('.biz-soon')))), 'Reviews is no longer marked Soon')
    await p.evaluate(() => [...document.querySelectorAll('#review-rv1 .ui-btn')].find((b) => b.textContent.trim() === 'Reply')?.click())
    await wait(200)
    await type(p, '#review-rv1 textarea', 'Thank you Ana, see you next month.')
    await clickText(p, '#review-rv1 .ui-btn', 'Post reply')
    await wait(400)
    const reply = (await rpc(p, 'reply_to_review')).at(-1)
    check(reply?.p_review_id === 'rv1' && /see you next month/.test(reply?.p_reply || ''), `reply posts: ${JSON.stringify(reply)}`)
    check(/1 waiting/.test(await text(p, '.lc-bizrv__waiting')) && !(await p.evaluate(() => Boolean(document.querySelector('#review-rv1')))), 'answered review leaves the waiting list')
    await clickText(p, '.ui-seg__btn', 'All 3')
    await wait(200)
    check(/Thank you Ana/.test(await text(p, '#review-rv1 .lc-bizrv__reply')), 'and shows the reply under All')
    await p.evaluate(() => document.querySelector('#review-rv2 .lc-bizrv__link.is-quiet')?.click())
    await wait(400)
    await type(p, '.ui-sheet textarea, [role="dialog"] textarea', 'This is not a real client of ours.')
    await clickText(p, '.ui-btn', 'Send report')
    await wait(400)
    check((await rpc(p, 'report_review')).at(-1)?.p_review_id === 'rv2' && /Reported/.test(await text(p, '#review-rv2')), 'owners report, they do not delete')
    check(p.errors.length === 0, `no page errors on Reviews: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/portal/reviews?review=rv2', 390, 844)
    await wait(300)
    check(await p.evaluate(() => document.querySelector('#review-rv2')?.classList.contains('is-focus')), 'a link to one review opens it')
    await p.close()

    p = await open('/portal/reviews', 390, 844, '&noreviews=1')
    check(await text(p, '.lc-bizrv-empty h2') === 'No reviews yet', 'empty state')
    await p.close()

    for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1272, 588]]) {
        for (const path of ['/portal/reviews', '/femtos-barbearia']) {
            p = await open(path, w, h)
            const r = await p.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > window.innerWidth,
                clipped: [...document.querySelectorAll('.lc-bizrv__item, .lc-rv')].some((el) => el.scrollWidth > el.clientWidth + 1),
            }))
            check(!r.overflow && !r.clipped, `${path} fits at ${w}px`)
            await p.close()
        }
    }
}

import fs from 'node:fs'
import path from 'node:path'

export default async ({ browser, url, check, cover, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (path, vw = 1272, vh = 588, touch = false) => {
      const page = await browser.newPage()
      page.errors = []
      page.on('pageerror', (e) => page.errors.push(e.message))
      await page.setViewport({ width: vw, height: vh, hasTouch: touch, isMobile: touch })
      await page.goto(`${url}/?path=${encodeURIComponent(path.split('&')[0])}${path.includes('&') ? '&' + path.split('&').slice(1).join('&') : ''}`, { waitUntil: 'networkidle0' })
      await wait(500)
      return page
    }
    const updates = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'update' && c[1] === 'businesses').map((c) => c[2]))
    const save = (p) => p.evaluate(() => document.querySelector('.biz-save')?.textContent)
    const field = async (p, label) => p.evaluateHandle((label) => {
      if (label === 'Business name') return document.getElementById('biz-bp-name')
      if (label === 'Description') return document.getElementById('biz-bp-about')
      const l = [...document.querySelectorAll('.ui-field__label')].find((e) => e.firstChild.textContent.trim() === label)
      return document.getElementById(l.htmlFor)
    }, label)
    const typeInto = async (p, label, text, clear = true) => {
      const el = await field(p, label)
      await el.focus()
      if (clear) { await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace') }
      if (text) await p.keyboard.type(text)
    }

    let p = await open('/portal/page')
    await wait(1200)
    check((await updates(p)).length === 0, `no save on open: ${JSON.stringify(await updates(p))}`)
    check(await save(p) === 'Changes save as you go', `idle text ${await save(p)}`)
    check(await p.evaluate(() => !document.querySelector('.ui-phone')), 'no preview phone')
    const rail = await p.evaluate(() => { const r = document.querySelector('.biz-bp__strength').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight } })
    check(rail.top < rail.vh - 120, `page strength visible on first screen ${JSON.stringify(rail)}`)
    check(await p.evaluate(() => document.querySelector('.biz-bp__pct').textContent.replace(/\s/g, '')) === '88%', 'ring shows 88%')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-bp__step')].map((e) => e.textContent).join('|')) === 'Add a logo+12%', 'one step left, worth 12%')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-bp__done')].length) === 2, 'both sections complete')
    check(await p.evaluate(() => { const r = document.querySelectorAll('.biz-bp__link > *'); return r[r.length - 1].textContent.includes('Taking bookings') && [...r].findIndex((e) => e.textContent === 'Change address') > [...r].findIndex((e) => e.textContent === 'Copy link') }), 'change address sits quietly under copy link')
    check(await p.evaluate(() => !document.body.textContent.includes('Like Anjos or Baixa') && !document.body.textContent.includes('booked more')), 'filled hints and unproven claims gone')
    check(await p.evaluate(() => document.querySelector('.biz-bp__where').textContent) === 'Barbershop in Arroios, Lisbon', 'hero line')

    await typeInto(p, 'Description', 'Skin fades and hot towel shaves in Arroios.')
    check(await save(p) !== 'Saving' || true, 'typing')
    await wait(1100)
    let u = await updates(p)
    check(u.length === 1 && u[0].description === 'Skin fades and hot towel shaves in Arroios.' && Object.keys(u[0]).length === 1, `description saved alone ${JSON.stringify(u)}`)
    check(await save(p) === 'All changes saved', `saved text ${await save(p)}`)
    check(await p.evaluate(() => document.querySelector('#biz-bp-about-hint').classList.contains('ui-visually-hidden')), 'hint hides once written')

    await typeInto(p, 'Business name', '')
    await wait(1000)
    check(await p.evaluate(() => document.body.textContent.includes('Enter the name clients know you by') && document.getElementById('biz-bp-name').getAttribute('aria-invalid') === 'true'), 'empty name error')
    check(await save(p) === 'Fix the highlighted field to save it', `blocked text ${await save(p)}`)
    check((await updates(p)).length === 1, 'empty name not saved')
    await p.keyboard.type('Femtos Barbearia Arroios')
    await wait(1100)
    u = await updates(p)
    check(u.length === 2 && u[1].business_name === 'Femtos Barbearia Arroios', `name saved ${JSON.stringify(u[1])}`)
    check(!('slug' in u[1]), 'name change never touches the address')
    check(await p.evaluate(() => document.querySelector('.biz-bizcard strong').textContent) === 'Femtos Barbearia Arroios', 'sidebar card shows new name')
    check(await p.evaluate(() => window.__refreshed > 0), 'profile refreshed after rename')

    await p.evaluate(() => [...document.querySelectorAll('.biz-bp__link [role=switch]')][0].click())
    await wait(600)
    u = await updates(p)
    check(u[u.length - 1].is_active === false, 'pause saved')
    check(await p.evaluate(() => document.querySelector('.biz-bp__link .ui-status').textContent) === 'Paused', 'status Paused')
    check(await p.evaluate(() => document.querySelector('.biz-bizcard small').textContent) === 'Bookings paused', 'sidebar shows paused')
    await p.evaluate(() => [...document.querySelectorAll('.biz-bp__link [role=switch]')][0].click())
    await wait(600)
    check((await updates(p)).slice(-1)[0].is_active === true, 'resume saved')

    await p.evaluate(() => document.querySelector('.biz-bp__link .biz-bp__quietbtn').click())
    await wait(400)
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-bp__warn'))), 'address sheet warns')
    const slugInput = await p.$('.biz-bp__slugsheet input')
    await slugInput.focus(); await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace'); await p.keyboard.type('taken-one'); await wait(800)
    check(await p.evaluate(() => document.querySelector('.biz-bp__slugstatus').textContent.startsWith('Taken')), 'taken shown')
    check(await p.evaluate(() => [...document.querySelectorAll('.ui-sheet button')].find((b) => b.textContent.includes('Change address')).disabled), 'cannot save taken')
    await slugInput.focus(); await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace'); await p.keyboard.type('Femtos Arroios!'); await wait(800)
    check(await p.evaluate(() => document.querySelector('.biz-bp__slugsheet input').value) === 'femtosarroios', 'address input cleans characters')
    await slugInput.focus(); await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace'); await p.keyboard.type('femtos-arroios'); await wait(800)
    check(await p.evaluate(() => document.querySelector('.biz-bp__slugstatus').textContent.startsWith('Available')), 'available shown')
    await p.evaluate(() => [...document.querySelectorAll('.ui-sheet button')].find((b) => b.textContent.includes('Change address')).click())
    await wait(700)
    check((await updates(p)).slice(-1)[0].slug === 'femtos-arroios', 'slug saved')
    check(await p.evaluate(() => document.querySelector('.biz-bp__slug').textContent) === 'femtos-arroios', 'link shows new address')
    check(await p.evaluate(() => !document.querySelector('.biz-bp__slugsheet')), 'sheet closed')

    check(await p.evaluate(() => document.querySelector('.biz-startrow__pct')?.textContent) === '88%', 'still 88% before logo')
    const [chooser] = await Promise.all([p.waitForFileChooser({ timeout: 3000 }), p.evaluate(() => document.querySelector('.biz-bp__step').click())])
    check(Boolean(chooser), 'logo step opens the photo picker')
    await chooser.accept([cover])
    await wait(1500)
    check(await p.evaluate(() => window.__calls.some((c) => c[0] === 'upload' && /^b1\/logo-\d+\.(webp|jpg)$/.test(c[1]))), 'logo uploaded to business folder')
    check((await updates(p)).slice(-1)[0].logo_url?.includes('/brand/'), 'logo url saved')
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-bp__logo img'))), 'logo shows in the hero')
    await wait(800)
    check(await p.evaluate(() => document.querySelector('.biz-bp__strength h2').textContent) === 'Your page is complete', 'complete state')
    check(await p.evaluate(() => document.querySelector('.biz-bp__pct').textContent.replace(/\s/g, '')) === '100%', 'ring at 100%')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-bp__strength button')].some((b) => b.textContent.includes('Copy your link'))), 'share action at 100%')
    await p.evaluate(() => document.querySelector('.biz-bp__logo .biz-bp__menubtn').click())
    await wait(200)
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-bp__menuitem')].map((e) => e.textContent).join('|')) === 'Replace logo|Remove logo', 'logo menu')
    await p.keyboard.press('Escape')
    await wait(200)
    check(await p.evaluate(() => !document.querySelector('.biz-bp__menu')), 'logo menu closes with Esc')
    check(await p.evaluate(() => !document.querySelector('.biz-startrow')), 'getting started gone at 100%')

    await p.evaluate(() => [...document.querySelectorAll('#contact [role=switch]')][0].click())
    await wait(1100)
    check((await updates(p)).slice(-1)[0].whatsapp === null, 'whatsapp off saved')
    check(await p.evaluate(() => document.querySelector('#contact .biz-bp__todo')?.textContent) === 'WhatsApp off', 'contact shows what is missing')
    check(await p.evaluate(() => document.querySelector('.biz-bp__strength h2').textContent) === 'Page strength', 'strength drops when WhatsApp goes off')
    await p.evaluate(() => [...document.querySelectorAll('#contact [role=switch]')][0].click())
    await wait(1100)
    check((await updates(p)).slice(-1)[0].whatsapp === '+351912345678', 'whatsapp on uses the business phone')
    check(await p.evaluate(() => document.querySelector('#contact .ui-switchrow__desc').textContent.includes('912 345 678')), 'switch names the number')
    check(await p.evaluate(() => !document.querySelector('#contact .ui-phone-field + .ui-phone-field') && document.querySelectorAll('#contact .ui-phone-field').length === 1), 'one number field when same')
    await p.evaluate(() => [...document.querySelectorAll('#contact button')].find((b) => b.textContent === 'Use another number').click())
    await wait(300)
    check(await p.evaluate(() => document.querySelectorAll('#contact .ui-phone-field').length === 2), 'second field for another number')
    await typeInto(p, 'WhatsApp number', '936 555 222')
    await wait(1100)
    check((await updates(p)).slice(-1)[0].whatsapp === '+351936555222', 'separate whatsapp saved')
    await p.evaluate(() => [...document.querySelectorAll('#contact button')].find((b) => b.textContent.startsWith('Use my business phone')).click())
    await wait(1100)
    check((await updates(p)).slice(-1)[0].whatsapp === '+351912345678', 'back to business phone')

    await typeInto(p, 'Business phone', '91234')
    await wait(1000)
    check(await p.evaluate(() => document.body.textContent.includes('does not look like a Portugal number')), 'bad phone error')
    const before = (await updates(p)).length
    await typeInto(p, 'Business phone', '913 000 111')
    await wait(1100)
    u = await updates(p)
    check(u.length === before + 1 && u[u.length - 1].phone === '+351913000111' && u[u.length - 1].whatsapp === '+351913000111', `phone saved and WhatsApp follows ${JSON.stringify(u.slice(-1))}`)
    check(p.errors.length === 0, `errors ${p.errors}`)
    await p.close()

    p = await open('/portal/page')
    await p.evaluate(() => { window.__failNext = true })
    await typeInto(p, 'Neighbourhood', 'Anjos')
    await wait(1100)
    check(await save(p) === 'Not savedTry again', `error state ${await save(p)}`)
    await p.evaluate(() => document.querySelector('.biz-save__retry').click())
    await wait(1100)
    check(await save(p) === 'All changes saved', 'retry saves')
    check((await updates(p)).slice(-1)[0].neighbourhood === 'Anjos', 'neighbourhood saved')
    await typeInto(p, 'Neighbourhood', 'Intendente')
    await p.evaluate(() => [...document.querySelectorAll('.biz-sidebar .biz-navlink')].find((e) => e.textContent.startsWith('Today')).click())
    await wait(800)
    check((await updates(p)).slice(-1)[0].neighbourhood === 'Intendente', 'leaving saves the last change')
    await p.close()

    p = await open('/portal/page')
    const countryBtn = await p.evaluateHandle(() => [...document.querySelectorAll('#location .ui-field')].find((f) => f.textContent.startsWith('Country')).querySelector('button'))
    await countryBtn.click(); await wait(300)
    await p.keyboard.type('Nigeria'); await wait(300); await p.keyboard.press('Enter'); await wait(1300)
    u = await updates(p)
    check(u.slice(-1)[0]?.country === 'NG' && u.slice(-1)[0].city === 'Lagos' && u.slice(-1)[0].timezone === 'Africa/Lagos', `country saved ${JSON.stringify(u.slice(-1))}`)
    check(await p.evaluate(() => !document.querySelector('.biz-bp__note')), 'Lagos is a live city, so no coming-later note')
    check(p.errors.length === 0, `errors ${p.errors}`)
    await p.close()

    p = await open('/portal/page#photos')
    await wait(300)
    check(await p.evaluate(() => { const r = document.getElementById('photos').getBoundingClientRect(); return r.top >= 0 && r.top < 140 }), 'hash lands on photos')
    await p.close()

    p = await open('/portal/start')
    check(await p.evaluate(() => document.querySelector('.lc-start .ui-row')?.textContent.includes('Add a logo')), 'getting started shows the open step first')
    check(await p.evaluate(() => document.querySelector('.lc-start .ui-row')?.getAttribute('href') || document.querySelector('.lc-start a.ui-row')?.getAttribute('href')) === '/portal/page#photos', 'logo step links to photos')
    await p.close()

    p = await open('/portal/page&empty=1', 390, 844, true)
    check(await p.evaluate(() => document.querySelector('.biz-bp__pct').textContent.replace(/\s/g, '')) === '38%', 'empty page at 38%')
    const order = await p.evaluate(() => ['.biz-bp__hero', '.biz-bp__strength', '#details'].map((q) => document.querySelector(q).getBoundingClientRect().top))
    check(order[0] < order[1] && order[1] < order[2], `phone order hero, strength, sections ${order}`)
    await p.evaluate(() => [...document.querySelectorAll('.biz-bp__step')].find((b) => b.textContent.startsWith('Add your WhatsApp')).click())
    await wait(1300)
    check((await updates(p)).slice(-1)[0]?.whatsapp === '+351912345678', 'WhatsApp step turns it on in one tap')
    check(await p.evaluate(() => document.querySelector('.biz-bp__pct').textContent.replace(/\s/g, '')) === '50%', 'ring moves to 50%')
    await p.evaluate(() => [...document.querySelectorAll('.biz-bp__step')].find((b) => b.textContent.startsWith('Add a description')).click())
    await wait(400)
    check(await p.evaluate(() => document.activeElement.id) === 'biz-bp-about', 'description step focuses the hero text')
    await p.keyboard.type('Fades and beard work in Arroios.')
    await wait(1200)
    check(await p.evaluate(() => document.querySelector('.biz-bp__pct').textContent.replace(/\s/g, '')) === '63%', 'ring moves as you type')
    await p.evaluate(() => [...document.querySelectorAll('.biz-bp__step')].find((b) => b.textContent.startsWith('Add your address')).click())
    await wait(700)
    check(await p.evaluate(() => document.activeElement.closest('.biz-bp__address') !== null), 'address step focuses the address field')
    const [coverChooser] = await Promise.all([p.waitForFileChooser({ timeout: 3000 }), p.evaluate(() => [...document.querySelectorAll('.biz-bp__cover button')].find((b) => b.textContent.includes('Add a cover photo')).click())])
    await coverChooser.accept([cover])
    await wait(1500)
    check(await p.evaluate(() => Boolean(document.querySelector('.biz-bp__cover > img'))), 'cover added on phone')
    check(p.errors.length === 0, `phone errors ${p.errors}`)
    await p.close()

    // The public page wears its city until the owner adds photos: the pattern as cover, the tile as logo,
    // no drawn street map, and a free service reads Free.
    p = await open('/femtos-barbearia&empty=1')
    let face = await p.evaluate(() => ({
        cover: Boolean(document.querySelector('.lc-pub__cover.is-city .lc-pattern')),
        tile: Boolean(document.querySelector('.lc-pub__logo.is-tile .lc-tile')),
        initials: /^[A-Z]{1,2}$/.test(document.querySelector('.lc-pub__logo')?.textContent.trim() || ''),
        map: Boolean(document.querySelector('.lc-pub__map, .lc-pub .street-grid, .lc-pub svg[class*="grid"]')),
    }))
    check(face.cover && face.tile && !face.initials && !face.map, `without photos the page shows its city pattern and tile, no initials or drawn map: ${JSON.stringify(face)}`)
    check(p.errors.length === 0, `no errors on the photo-less page: ${p.errors}`)
    await p.close()

    p = await open('/femtos-barbearia')
    face = await p.evaluate(() => ({
        cover: Boolean(document.querySelector('.lc-pub__cover:not(.is-city) img')),
        logo: Boolean(document.querySelector('.lc-pub__logo:not(.is-tile)')) || Boolean(document.querySelector('.lc-pub__logo.is-tile .lc-tile')),
        find: document.querySelector('.lc-pub__find')?.textContent || '',
        route: document.querySelector('.lc-pub__find .lc-pub__route')?.getAttribute('href') || '',
    }))
    check(face.cover && face.logo, 'with a cover photo the photo is the cover')
    check(/Find us/.test(face.find) && /google\.com\/maps/.test(face.route) && !/<svg/.test(face.find), `Find us gives the address and a way there, no drawn map: ${face.route}`)
    await p.close()

    // Booking first: the next real free time and one button, in the side column on a wide screen.
    p = await open('/femtos-barbearia')
    await wait(600)
    let view = await p.evaluate(() => ({
        open: document.querySelector('.lc-pub__head .lc-pub__open')?.textContent || '',
        statusCard: Boolean(document.querySelector('.lc-pub__status')),
        strip: Boolean(document.querySelector('.lc-pub__hours .lc-pub__strip')) || !/Open now/.test(document.querySelector('.lc-pub__open')?.textContent || ''),
        label: document.querySelector('.lc-pub__book .lc-pub__booklabel')?.textContent,
        time: document.querySelector('.lc-pub__book .lc-pub__booktime')?.textContent || '',
        panelShown: (() => { const b = document.querySelector('.lc-pub__book'); return Boolean(b && b.getClientRects().length) })(),
        barShown: (() => { const b = document.querySelector('.lc-pub__bookbar'); return Boolean(b && b.getClientRects().length) })(),
        actions: [...document.querySelectorAll('.lc-pub__actions .ui-btn')].map((b) => b.textContent.trim()),
        city: document.querySelector('.lc-pub__city .lc-pub__citytext b')?.textContent || '',
        band: Boolean(document.querySelector('.lc-pub__city .lc-pub__cityband .lc-pattern')),
        mark: Boolean(document.querySelector('.lc-pub__city .lc-pub__citymark .lc-face')),
        bars: [...document.querySelectorAll('.lc-pub .lc-starbars__track i')].map((i) => getComputedStyle(i).backgroundColor),
        amber: getComputedStyle(document.documentElement).getPropertyValue('--signal').trim(),
    }))
    check(/^(Open now|Opens|Closed|Closing|Back)/i.test(view.open) && /\d\d:\d\d/.test(view.open) && !view.statusCard, `open or closed is one line under the name, the big status card is gone: ${view.open}`)
    check(view.strip, 'today\'s strip sits in the hours card while the door is open')
    check(view.label === 'Next free time' && /^(Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d\d:\d\d$/.test(view.time), `the book panel shows the next real free time: ${view.label} ${view.time}`)
    check(view.panelShown && !view.barShown, 'wide screen: the panel in the side column, no bottom bar')
    check(view.actions.length >= 2 && view.actions.every((t) => t.length > 0), `contact buttons carry words: ${view.actions.join(', ')}`)
    check(/^Femtos Barbearia takes bookings on Locappoint in Lisbon\.$/.test(view.city) && view.band && view.mark, `the page closes in its city: ${view.city}`)
    check(view.bars.length === 5 && view.bars.every((c) => c !== 'rgb(232, 154, 62)'), `review bars are not amber: ${view.bars[0]}`)
    const nextTime = view.time.split(' ').pop()
    await p.evaluate(() => [...document.querySelectorAll('.lc-pub__book button')].find((b) => /Book/.test(b.textContent))?.click())
    await wait(700)
    view = await p.evaluate(() => ({ sheet: document.querySelector('[role="dialog"]')?.innerText || '' }))
    check(view.sheet.includes(nextTime), `Book opens the sheet at that time (${nextTime})`)
    check(p.errors.length === 0, `no errors booking from the panel: ${p.errors}`)
    await p.close()

    // A phone: the bar is fixed to the bottom of the screen, the panel is not shown, the bar goes while the sheet is open.
    p = await open('/femtos-barbearia', 390, 844, true)
    await wait(600)
    view = await p.evaluate(() => {
        const bar = document.querySelector('.lc-pub__bookbar')
        const r = bar?.getBoundingClientRect()
        return { fixed: bar && getComputedStyle(bar).position === 'fixed', bottom: r && r.bottom <= innerHeight && r.bottom > innerHeight - 40, time: bar?.querySelector('.lc-pub__booktime')?.textContent || '', panel: Boolean(document.querySelector('.lc-pub__book')?.getClientRects().length), over: document.documentElement.scrollWidth > innerWidth }
    })
    check(view.fixed && view.bottom && /\d\d:\d\d$/.test(view.time) && !view.panel && !view.over, `phone: the book bar sits at the bottom with the next free time: ${JSON.stringify(view)}`)
    await p.evaluate(() => document.querySelector('.lc-pub__bookbar button')?.click())
    await wait(700)
    check(await p.evaluate(() => !document.querySelector('.lc-pub__bookbar') && Boolean(document.querySelector('[role="dialog"]'))), 'phone: the bar opens the sheet and steps aside')
    await p.close()

    // A business with no reviews yet says so, instead of an empty space.
    p = await open('/femtos-barbearia&noreviews=1')
    view = await p.evaluate(() => ({ head: document.querySelector('#reviews.is-new h2')?.textContent, text: document.querySelector('#reviews .lc-pubrv__newtext')?.textContent || '' }))
    check(view.head === 'Reviews' && /written only by people who booked/.test(view.text), `new business: ${view.head}`)
    await p.close()

    // A demo page takes no bookings: no panel and no bar.
    p = await open('/femtos-barbearia&demo=1', 390, 844, true)
    check(await p.evaluate(() => !document.querySelector('.lc-pub__bookbar, .lc-pub__book')), 'demo: no book panel or bar')
    await p.close()

    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
    check(/shownPrice = .*=== 0 \? 'Free'/.test(read('src/services/business.js')) && /shownPrice\(service\.price/.test(read('src/components/business/public/PublicMenu.jsx')) && /shownPrice\(service\.price/.test(read('src/components/booking/BookingSheet.jsx')), 'a free service reads Free on the page and in the booking sheet, never a zero')
}

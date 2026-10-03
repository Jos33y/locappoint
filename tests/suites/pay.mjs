// Pay at booking: the sheet shows the price, the service fee and the cancellation rule, holds the
// time and opens the payment page; the client comes back to a page that asks the database, not the
// redirect. Plus the server rules for signatures and the checkout page.

import path from 'node:path'
import crypto from 'node:crypto'

export default async ({ browser, url, check, server, root }) => {
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
    const toReview = async (p) => {
        await click(p, '.lc-pub__svc', 'Haircut')
        await wait(900)
        await p.evaluate(() => document.querySelector('.lc-bk-slot')?.click())
        await click(p, '.ui-btn, .btn', 'Continue')
        await wait(700)
    }
    const fill = async (p) => {
        const inputs = await p.$$('.lc-bk-details input')
        const name = inputs[0]
        const email = await p.$('.lc-bk-details input[type=email]')
        const phone = await p.$('.lc-bk-details input[type=tel]')
        if (name) await name.type('Ana Guest')
        if (email) await email.type('ana@guest.pt')
        if (phone) await phone.type('912345678')
        await wait(300)
    }
    const fns = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'fn').map((c) => [c[1], c[2]]))

    // Portugal, payouts on: a receipt, the rule, and one button that says the amount.
    let p = await open('/femtos-barbearia', '&guest=1&nobiz=1&payquote=online')
    await toReview(p)
    const ticket = await text(p, '.lc-bk-ticket')
    check(/Service fee/.test(ticket) && /0[.,]50/.test(ticket), `the ticket shows the service fee: ${ticket}`)
    check(/Pay now by card/.test(ticket) && /25[.,]50/.test(await text(p, '.lc-bk-ticket__price')), `the total is what the client pays: ${await text(p, '.lc-bk-ticket__price')}`)
    const rule = await text(p, '.lc-bk-policy')
    check(/Free cancellation until|starts within/.test(rule) && /half the price is kept/.test(rule), `the cancellation rule is said with its time: ${rule}`)
    check(!/Nothing is charged online/.test(await p.evaluate(() => document.body.textContent)), 'no "nothing is charged" line when it is paid online')
    const payButton = await p.evaluate(() => [...document.querySelectorAll('.ui-btn')].map((b) => b.textContent.trim()).find((t) => /^Pay /.test(t)) || '')
    check(/^Pay .*25[.,]50/.test(payButton), `the button says the amount: ${payButton}`)
    await fill(p)
    await click(p, '.ui-btn', 'Pay ')
    await wait(1600)
    const calls = await fns(p).catch(() => [])
    const landed = await p.evaluate(() => window.location.search)
    check(landed.includes('pay%2Freturn') || landed.includes('/pay/return') || calls.some(([n]) => n === 'checkout'), `paying opens the payment page: ${landed}`)
    await wait(1200)
    check(/You are booked/.test(await text(p, '.lc-paid__title')) && /25[.,]50/.test(await text(p, '.lc-paid__text')), `back from paying, the page confirms it and what was paid: ${await text(p, '.lc-paid__title')}`)
    check(Boolean(await p.$('.lc-paid__hero')) && Boolean(await p.$('.lc-cal')), 'one centred column, with add to calendar')
    check(/Paid online/.test(await text(p, '.lc-bk-ticket')) && /Paid/.test(await text(p, '.lc-bk-ticket__stamp')), 'the ticket comes back stamped Paid')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-paid__actions a, .lc-paid__actions .ui-btn')].some((a) => /Manage booking/.test(a.textContent))), 'with the manage link')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    // Payouts off: today's flow, unchanged.
    p = await open('/femtos-barbearia', '&guest=1&nobiz=1')
    await toReview(p)
    check(/Nothing is charged online/.test(await p.evaluate(() => document.body.textContent)), 'without payouts, booking stays free and paid at the visit')
    check(await p.evaluate(() => [...document.querySelectorAll('.ui-btn')].some((b) => b.textContent.trim() === 'Confirm booking' && !b.disabled)), 'and the button is Confirm booking')
    await p.close()

    // The quote could not load: never guess, never book blind.
    p = await open('/femtos-barbearia', '&guest=1&nobiz=1&payquote=error')
    await toReview(p)
    check(/could not check how this booking is paid/.test(await p.evaluate(() => document.body.textContent)), 'a failed quote says so')
    check(await p.evaluate(() => [...document.querySelectorAll('.ui-btn')].some((b) => b.textContent.trim() === 'Confirm booking' && b.disabled)), 'and nothing can be booked until it loads')
    await p.close()

    // Lagos: transfer or card, in naira.
    p = await open('/femtos-barbearia', '&guest=1&nobiz=1&payquote=lagos')
    await toReview(p)
    check(/Pay now by bank transfer or card/.test(await text(p, '.lc-bk-ticket')) && /15,300/.test(await text(p, '.lc-bk-ticket__price')), `Lagos pays by transfer or card, in naira: ${await text(p, '.lc-bk-ticket__price')}`)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the paid review fits a phone')
    await p.close()

    // The return page asks the database.
    const ref = `cs_test_${'a'.repeat(24)}`
    const back = async (state, extra = '') => open('/pay/return', `&ref=${ref}&paystate=${state}${extra}`)
    p = await back('pending')
    check(/Request sent/.test(await text(p, '.lc-paid__title')) && /get it all back/.test(await text(p, '.lc-paid__text')), 'a paid request says it is refunded in full if declined')
    await p.close()
    p = await back('released')
    check(/Payment not completed/.test(await text(p, '.lc-paid__title')) && /Nothing was charged/.test(await text(p, '.lc-paid__text')), 'an unfinished payment says nothing was charged')
    check(await p.evaluate(() => [...document.querySelectorAll('.lc-paid__actions a')].some((a) => a.getAttribute('href') === '/femtos-barbearia')), 'and leads back to the business')
    await p.close()
    p = await back('waiting', '&cancelled=1')
    check(/Payment cancelled/.test(await text(p, '.lc-paid__title')), 'turning back from the payment page says so')
    check((await p.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc' && c[1] === 'payment_abandon').length)) === 1, 'and lets the held time go at once')
    await p.close()
    p = await back('refunding')
    check(/Refund on its way/.test(await text(p, '.lc-paid__title')), 'a payment after the hold ran out is refunded, and the page says so')
    await p.close()
    p = await back('paid', '&app=1')
    check(/Close this window/.test(await p.evaluate(() => document.body.textContent)) && !(await p.$('.lc-paid__actions')), 'in the app, the page sends the client back to the app')
    await p.close()
    p = await open('/pay/return', '&paystate=paid', 320, 640)
    check(/could not find this payment/.test(await text(p, '.lc-paid__title')), 'no reference, no guessing')
    await p.close()
    p = await open('/pay/return', `&ref=${ref}&paystate=paid`, 320, 640)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the return page fits a small phone')
    await p.close()

    // After paying: every place the client sees the booking says it is paid, and what a cancel gives back.
    p = await open('/client', '&paidbooking=1')
    const next = await text(p, '.lc-cl-home__next .lc-bk-ticket')
    check(/Paid online/.test(next) && /12[.,]49/.test(next) && !/Pay at your visit/.test(next), `Home shows the next booking as paid: ${next}`)
    check(/Service fee/.test(next) && /0[.,]49/.test(next), 'with the receipt lines')
    check(/Free cancellation until/.test(await text(p, '.lc-cl-home__next .lc-bk-policy')), `and the free cancellation cutoff: ${await text(p, '.lc-cl-home__next .lc-bk-policy')}`)
    await click(p, '.lc-cl-home__next .ui-btn', 'Cancel booking')
    await wait(500)
    const back = await text(p, '.lc-refund .is-back dd')
    check(/12[.,]49/.test(back), `cancelling before the cutoff gives all of it back: ${back}`)
    check(/all of it comes back/.test(await text(p, '.lc-refund__lead')), 'and says so before the button')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('/client', '&paidbooking=soon')
    await click(p, '.lc-cl-home__next .ui-btn', 'Cancel booking')
    await wait(500)
    const late = await p.evaluate(() => [...document.querySelectorAll('.lc-refund__rows > div')].map((d) => d.textContent.trim()))
    check(late.some((r) => /back to you/.test(r) && /6[.,]00/.test(r)) && late.some((r) => /Kept by Femtos/.test(r) && /6[.,]00/.test(r)) && late.some((r) => /Service fee/.test(r) && /0[.,]49/.test(r)), `inside 24 hours: half the price back, half kept, the fee kept: ${JSON.stringify(late)}`)
    check(/within 24 hours/.test(await text(p, '.lc-refund__lead')), 'and it says why')
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the cancel sheet fits a phone')
    await p.close()

    p = await open('/client/appointments?booking=pd2', '&paidbooking=1')
    const line = await text(p, '#booking-pd2 .lc-paidline')
    check(/6[.,]00 refunded/.test(line) && /6[.,]49 kept/.test(line), `a cancelled paid booking says what came back: ${line}`)
    await p.close()

    p = await open('/client/notifications', '&paidbooking=1')
    const bell = await p.evaluate(() => document.body.textContent)
    check(/Paid €12[.,]49/.test(bell), 'the notification says what was paid, not the price')
    await p.close()
    p = await open('/portal/notifications', '&paidbooking=1')
    check(/€6[.,]00 refunded to the client/.test(await p.evaluate(() => document.body.textContent)), 'the business sees what went back to the client')
    await p.close()

    p = await open('/b/tok-1234567890abcdef1234567890abcdef', '&guestpaid=1')
    check(/Paid online/.test(await text(p, '.lc-bk-ticket')) && /18[.,]49/.test(await text(p, '.lc-bk-ticket__price')), `the manage page shows it paid: ${await text(p, '.lc-bk-ticket__price')}`)
    await p.close()
    p = await open('/b/tok-1234567890abcdef1234567890abcdef', '&guestpaid=refunded')
    check(/Refunded/.test(await text(p, '.lc-refund-card__head')) && /18[.,]49/.test(await text(p, '.lc-refund .is-back dd')), `a booking the business cancelled shows the full refund: ${await text(p, '.lc-refund-card__head')}`)
    check(!(await p.$('.lc-refund .is-kept')), 'with nothing kept')
    await p.close()

    // Server rules
    const pay = await server.ssrLoadModule(path.join(root, 'supabase', 'functions', '_shared', 'pay.ts'))
    const raw = '{"type":"checkout.session.completed"}'
    const t = Math.floor(Date.now() / 1000)
    const sig = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${raw}`).digest('hex')
    check(await pay.stripeSigned(raw, `t=${t},v1=${sig}`, 'whsec_test'), 'a Stripe event with a good signature is accepted')
    check(!(await pay.stripeSigned(`${raw} `, `t=${t},v1=${sig}`, 'whsec_test')), 'a changed Stripe event is refused')
    check(!(await pay.stripeSigned(raw, `t=${t - 900},v1=${crypto.createHmac('sha256', 'whsec_test').update(`${t - 900}.${raw}`).digest('hex')}`, 'whsec_test')), 'an old Stripe event is refused')
    const psig = crypto.createHmac('sha512', 'sk_test_x').update(raw).digest('hex')
    check(await pay.paystackSigned(raw, psig, 'sk_test_x') && !(await pay.paystackSigned(raw, psig, 'sk_test_y')), 'Paystack events are checked against the secret key')
    const b = { id: 'a1', name: 'Haircut at Femtos', when: 'Fri 9 Oct at 10:00', price: 25, clientFee: 0.5, businessFee: 0.93, total: 25.5, currency: 'EUR', email: 'ana@guest.pt' }
    const s = pay.stripeSession(b, 'https://locappoint.com', false)
    check(s['payment_intent_data[application_fee_amount]'] === 143 && s['line_items[0][price_data][unit_amount]'] === 2500 && s['line_items[1][price_data][unit_amount]'] === 50, 'Stripe: price and service fee as lines, Locappoint fee as the application fee')
    check(s['payment_method_types[0]'] === 'card' && s.success_url.includes('{CHECKOUT_SESSION_ID}'), 'card only, and the return carries the checkout reference')
    const saved = pay.stripeSession(b, 'https://locappoint.com', false, { customer: 'cus_123' })
    check(saved.customer === 'cus_123' && !('customer_email' in saved) && saved['saved_payment_method_options[payment_method_save]'] === 'enabled' && saved['saved_payment_method_options[payment_method_remove]'] === 'enabled', 'a signed-in client pays as a customer of the business, and Stripe offers to remember the card, and to forget it')
    check(s.customer === undefined && s.customer_email === 'ana@guest.pt' && !Object.keys(s).some((k) => k.startsWith('saved_payment_method_options')), 'a guest never gets a saved card: anyone can type an email')
    check(pay.stripeSession(b, 'https://locappoint.com', false, { link: true })['payment_method_types[1]'] === 'link' && s['payment_method_types[1]'] === undefined, 'Link only when it is switched on')
    const ref2 = pay.paystackReference()
    const init = pay.paystackInit({ ...b, currency: 'NGN', price: 15000, clientFee: 300, businessFee: 535, total: 15300 }, 'ACCT_x', ref2, 'https://locappoint.com', false)
    check(init.amount === 1530000 && init.transaction_charge === 83500 && init.subaccount === 'ACCT_x' && init.channels.includes('bank_transfer'), 'Paystack: split to the business, transfer and card, amounts in kobo')
}

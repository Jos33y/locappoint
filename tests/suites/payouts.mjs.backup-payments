// Payouts: where a business owner's money goes. Stripe in Portugal through its own page, Paystack in
// Nigeria on our screen with the account name confirmed by the bank first. Plus the server rules.

import path from 'node:path'

export default async ({ browser, url, check, server, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (state, vw = 390, vh = 844, extra = '') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent('/portal/settings')}&payoutstate=${state}${extra}`, { waitUntil: 'networkidle0' })
        await wait(500)
        return page
    }
    const section = (p) => p.evaluate(() => {
        const s = document.querySelector('#payouts-title')?.closest('section')
        return s ? { text: s.textContent, buttons: [...s.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean) } : null
    })
    const fn = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'fn').map((c) => c[2].action))

    let p = await open('not_started')
    let s = await section(p)
    check(s && /Getting paid/.test(s.text) && s.buttons.includes('Set up payouts'), 'a Portuguese owner is asked to set up payouts')
    check(/never sees your ID/.test(s.text) && /Test mode/.test(s.text), 'it says what Locappoint keeps, and that this is test mode')
    const order = await p.evaluate(() => [...document.querySelectorAll('.biz-st__column > section h2, .biz-st__column > section .biz-st__h2')].map((h) => h.textContent))
    check(order.indexOf('Getting paid') === 0 || order.indexOf('Getting paid') === 1, `payouts sit near the top of Settings: ${order.join(', ')}`)
    await p.evaluate(() => [...document.querySelectorAll('#payouts-title ~ * button, section button')].find((b) => b.textContent.trim() === 'Set up payouts').click())
    await wait(1200)
    check((await p.evaluate(() => window.location.search)).includes('payouts=return'), 'setting up opens Stripe and comes back to Settings')
    s = await section(p)
    check(/Account ending 6789/.test(s?.text || '') && /Ready/.test(s.text) && s.buttons.includes('Open Stripe'), `back from Stripe, the bank shows as ready: ${s?.text}`)
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('pending')
    s = await section(p)
    check(/Almost there/.test(s.text) && s.buttons.includes('Continue'), 'an unfinished setup offers Continue')
    await p.close()

    p = await open('waiting')
    s = await section(p)
    check(/checking your details/.test(s.text) && s.buttons.includes('Check again'), 'a setup under review says so and can check again')
    await p.close()

    p = await open('restricted')
    s = await section(p)
    check(/needs a few more details/.test(s.text) && /paused/.test(s.text), 'a paused account says payouts are paused')
    await p.close()

    p = await open('not_started', 390, 844, '&payouts=expired')
    s = await section(p)
    check(/link had expired/.test(s.text), 'an expired Stripe link is explained, not silent')
    await p.close()

    p = await open('error')
    s = await section(p)
    check(/not switched on yet/.test(s.text) && s.buttons.includes('Try again'), 'a server problem shows its reason and a retry')
    await p.close()

    // Nigeria
    p = await open('paystack')
    s = await section(p)
    check(/Bank/.test(s.text) && /Account number/.test(s.text) && /last four digits/.test(s.text), 'a Lagos owner gets bank and account number on our screen')
    check(await p.evaluate(() => [...document.querySelectorAll('section button')].find((b) => /Pay me here/.test(b.textContent))?.disabled), 'nothing can be saved before the bank confirms the name')
    await p.evaluate(() => document.querySelector('#payouts-title').closest('section').querySelector('.ui-picker__trigger, button[aria-haspopup]')?.click())
    await wait(300)
    await p.evaluate(() => [...document.querySelectorAll('[role=option]')].find((o) => o.textContent.includes('Access Bank'))?.click())
    await wait(200)
    await p.type('.biz-pay__nuban', '01234-56789')
    await wait(900)
    check(await p.evaluate(() => document.querySelector('.biz-pay__nuban').value) === '0123456789', 'only digits go in, ten at most')
    check(/ADEBAYO OLUWASEUN/.test((await section(p)).text), 'the bank confirms the account name before saving')
    await p.evaluate(() => [...document.querySelectorAll('section button')].find((b) => b.textContent.trim() === 'Yes, pay me here').click())
    await wait(600)
    s = await section(p)
    check(/Access Bank/.test(s.text) && /Account ending 6789/.test(s.text) && s.buttons.includes('Change bank'), 'saved: the bank and last four digits show as ready')
    check(JSON.stringify(await fn(p)) === JSON.stringify(['status', 'banks', 'resolve', 'connect']), `calls in order: ${(await fn(p)).join(', ')}`)
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('not_started', 1272, 588)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'fits the 13-inch laptop')
    await p.close()
    p = await open('paystack', 320, 640)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the bank form fits a small phone')
    await p.close()

    // Server rules
    const prov = await server.ssrLoadModule(path.join(root, 'supabase', 'functions', 'payouts', 'providers.ts'))
    const base = { requirements: { currently_due: [], past_due: [] }, external_accounts: { data: [{ object: 'bank_account', bank_name: 'MILLENNIUM BCP', last4: '4321' }] } }
    check(prov.stripeState({ ...base, charges_enabled: true, payouts_enabled: true }).status === 'active', 'charges and payouts on means ready')
    check(prov.stripeState({ ...base, details_submitted: false, requirements: { currently_due: ['individual.dob.day'] } }).status === 'pending', 'unfinished onboarding is pending')
    check(prov.stripeState({ ...base, details_submitted: true, requirements: { disabled_reason: 'requirements.past_due', past_due: ['external_account'] } }).status === 'restricted', 'Stripe asking again after submission is restricted')
    const st = prov.stripeState({ ...base, charges_enabled: true, payouts_enabled: true })
    check(st.bank_name === 'MILLENNIUM BCP' && st.account_last4 === '4321', 'only the bank name and last four digits are kept')
    check(prov.nigerianAccount('012 345 6789') === '0123456789' && prov.nigerianAccount('12345') === null, 'Nigerian account numbers are ten digits')
    check(prov.bankCode('044') === '044' && prov.bankCode('044; drop') === null, 'bank codes are checked before use')
    const acct = prov.newStripeAccount({ country: 'PT', email: 'a@b.pt', name: 'Femtos', url: 'https://locappoint.com/femtos', businessId: 'b1' })
    check(acct['controller[requirement_collection]'] === 'stripe' && acct['controller[stripe_dashboard][type]'] === 'express' && acct['capabilities[transfers][requested]'] === true, 'Stripe keeps the identity checks; the account can be paid out')
}

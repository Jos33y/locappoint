// Payments: where a business owner's money goes, on its own page under Your business. Stripe in
// Portugal through its own page (Accounts v2), Paystack in Nigeria on our screen with the account
// name confirmed by the bank first. Plus the server rules.

import path from 'node:path'

export default async ({ browser, url, check, server, root }) => {
    const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
    const open = async (state, vw = 390, vh = 844, extra = '', at = '/portal/payments') => {
        const page = await browser.newPage()
        page.errors = []
        page.on('pageerror', (e) => page.errors.push(e.message))
        await page.setViewport({ width: vw, height: vh })
        await page.goto(`${url}/?path=${encodeURIComponent(at)}&payoutstate=${state}${extra}`, { waitUntil: 'networkidle0' })
        await wait(500)
        return page
    }
    const view = (p) => p.evaluate(() => {
        const card = document.querySelector('.biz-pay__card')
        const route = document.querySelector('.biz-pay__route')
        return {
            text: document.querySelector('.biz-pay')?.textContent || '',
            title: document.querySelector('.biz-pay__title')?.textContent || '',
            badge: card?.querySelector('.ui-status')?.textContent || '',
            route: route ? route.className : '',
            bank: document.querySelector('.biz-pay__stop--bank')?.textContent || '',
            buttons: [...document.querySelectorAll('.biz-pay button')].map((b) => b.textContent.trim()).filter(Boolean),
        }
    })
    const click = (p, label) => p.evaluate((l) => [...document.querySelectorAll('.biz-pay button')].find((b) => b.textContent.trim() === l)?.click(), label)
    const fn = (p) => p.evaluate(() => window.__calls.filter((c) => c[0] === 'fn').map((c) => c[2].action))

    // Where it lives
    let p = await open('not_started')
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.biz-hubnav__tab')].map((t) => t.textContent.trim()))
    check(tabs.join(',') === 'Page,Services,Hours,Team,Payments', `Payments is a tab under Your business: ${tabs.join(', ')}`)
    check(await p.evaluate(() => document.querySelector('.biz-hubnav__tab.active')?.textContent.trim() === 'Payments'), 'the Payments tab is the open one')
    await p.close()
    p = await open('not_started', 390, 844, '', '/portal/settings')
    check(!(await p.evaluate(() => document.body.textContent)).includes('Getting paid') && !(await p.evaluate(() => !!document.querySelector('.biz-pay__route'))), 'Settings is back to the owner as a person: no payouts there')
    check(/Your account, sign-in and security/.test(await p.evaluate(() => document.body.textContent)), 'Settings subtitle no longer mentions payouts')
    await p.close()

    // Portugal, not set up
    p = await open('not_started')
    let v = await view(p)
    check(v.title === 'Get paid for bookings online' && v.badge === 'Not set up', `the page says what this is for: ${v.title} / ${v.badge}`)
    check(/is-missing/.test(v.route) && /Not set yet/.test(v.bank), 'the route shows the bank as the missing stop')
    check(/Client pays/.test(v.text) && /Stripe/.test(v.text) && /Keeps it safe/.test(v.text), 'the route reads client, Stripe, your bank')
    check(/Have these ready/.test(v.text) && /ID card or passport/.test(v.text) && /IBAN/.test(v.text) && /3 minutes/.test(v.text), 'it says what to have at hand before leaving for Stripe')
    check(v.buttons.filter((b) => b === 'Continue to Stripe').length === 1 && !v.buttons.includes('Set up payouts'), 'one action, said once')
    check(/Every day, automatically/.test(v.text) && /3 working days/.test(v.text), 'it says when the money arrives')
    check(/Locappoint only sees your bank name and the last four digits/.test(v.text), 'it says what Locappoint keeps')
    check(await p.evaluate(() => document.querySelector('.biz-pay__head .ui-status')?.textContent === 'Test mode'), 'test mode is marked by the title, not inside a sentence')
    await click(p, 'Continue to Stripe')
    await wait(1400)
    v = await view(p)
    check(!(await p.evaluate(() => window.location.search)).includes('payouts='), 'the return flag is cleared from the address')
    check(v.title === 'Payouts are on' && v.badge === 'Ready' && /is-ready/.test(v.route), `back from Stripe, payouts show as on: ${v.title}`)
    check(/Millennium BCP/.test(v.bank) && /Account ending 6789/.test(v.bank), 'the bank stop shows the bank name and last four digits')
    check(v.buttons.includes('Manage on Stripe'), 'a ready account can be managed on Stripe')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    p = await open('pending')
    v = await view(p)
    check(v.title === 'Finish setting up with Stripe' && v.badge === 'Unfinished' && v.buttons.includes('Continue to Stripe') && /is-unfinished/.test(v.route), 'an unfinished setup says so and continues')
    await p.close()

    p = await open('waiting')
    v = await view(p)
    check(/checking your details/.test(v.title) && v.badge === 'Being checked' && v.buttons.includes('Check again'), 'a setup under review says so and can check again')
    const before = (await fn(p)).length
    await wait(6600)
    check((await fn(p)).length > before, 'under review, the page looks again by itself')
    await p.close()

    p = await open('restricted')
    v = await view(p)
    check(v.title === 'Payouts are paused' && v.badge === 'Paused' && v.buttons.includes('Fix it on Stripe') && /is-paused/.test(v.route), 'a paused account says payouts are paused and how to fix it')
    await p.close()

    p = await open('not_started', 390, 844, '&payouts=expired')
    await wait(1400)
    v = await view(p)
    check(v.title === 'Payouts are on' && (await p.evaluate(() => window.location.search)).includes('payoutstate=active'), 'an expired Stripe link is replaced with a fresh one, no dead end')
    await p.close()

    p = await open('error')
    v = await view(p)
    check(/not switched on yet/.test(v.text) && v.buttons.includes('Try again'), 'a server problem shows its reason and a retry')
    await p.close()

    // Nigeria
    p = await open('paystack')
    v = await view(p)
    check(v.title === 'Where should we pay you?' && /Paystack/.test(v.text) && /By transfer or card/.test(v.text), 'a Lagos owner sees the Paystack route')
    check(/Bank/.test(v.text) && /Account number/.test(v.text) && /next working day/.test(v.text), 'bank and account number on our screen, and when money arrives')
    check(await p.evaluate(() => [...document.querySelectorAll('.biz-pay button')].find((b) => /Pay me here/.test(b.textContent))?.disabled), 'nothing can be saved before the bank confirms the name')
    await p.evaluate(() => document.querySelector('.biz-pay__form button[aria-haspopup]')?.click())
    await wait(300)
    await p.evaluate(() => [...document.querySelectorAll('[role=option]')].find((o) => o.textContent.includes('Access Bank'))?.click())
    await wait(200)
    await p.type('.biz-pay__nuban', '01234-56789')
    await wait(900)
    check(await p.evaluate(() => document.querySelector('.biz-pay__nuban').value) === '0123456789', 'only digits go in, ten at most')
    check(/ADEBAYO OLUWASEUN/.test((await view(p)).text), 'the bank confirms the account name before saving')
    await click(p, 'Yes, pay me here')
    await wait(600)
    v = await view(p)
    check(v.title === 'Payouts are on' && /Access Bank/.test(v.bank) && /Account ending 6789/.test(v.bank) && v.buttons.includes('Change bank'), 'saved: the bank and last four digits show on the route')
    check(JSON.stringify(await fn(p)) === JSON.stringify(['status', 'banks', 'resolve', 'connect']), `calls in order: ${(await fn(p)).join(', ')}`)
    await click(p, 'Change bank')
    await wait(300)
    v = await view(p)
    check(v.title === 'Change where we pay you' && v.buttons.includes('Cancel'), 'changing the bank reopens the form with a way back')
    check(p.errors.length === 0, `no page errors: ${p.errors.join(' | ')}`)
    await p.close()

    // Fit
    for (const [state, w, h] of [['not_started', 1272, 588], ['not_started', 320, 640], ['active', 320, 640], ['paystack', 320, 640]]) {
        p = await open(state, w, h)
        check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${state} fits ${w}px`)
        await p.close()
    }
    p = await open('not_started', 320, 640)
    check(await p.evaluate(() => {
        const box = document.querySelector('.biz-hubnav__track')
        const tab = box.querySelector('.active').getBoundingClientRect()
        const b = box.getBoundingClientRect()
        return tab.left >= b.left - 1 && tab.right <= b.right + 1
    }), 'on a small phone the hub tabs scroll and the open tab is in view')
    await p.close()

    // Server rules
    const prov = await server.ssrLoadModule(path.join(root, 'supabase', 'functions', 'payouts', 'providers.ts'))
    const caps = (card, transfers, payouts = 'active') => ({
        configuration: {
            merchant: { capabilities: { card_payments: { status: card } } },
            recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: transfers }, payouts: { status: payouts } } } },
        },
    })
    const due = (status, from = 'user') => ({ requirements: { entries: [{ description: 'representative.dob', awaiting_action_from: from, minimum_deadline: { status } }] } })
    check(prov.stripeState({ ...caps('active', 'active') }).status === 'active', 'cards, transfers and payouts on means ready')
    check(prov.stripeState({ ...caps('restricted', 'restricted'), ...due('past_due') }).status === 'pending', 'a new account still waiting for the owner is unfinished, not paused')
    check(prov.stripeState({ ...caps('restricted', 'restricted'), ...due('past_due') }, true).status === 'restricted', 'a ready account that now needs details is paused')
    const review = prov.stripeState({ ...caps('pending', 'pending'), ...due('currently_due', 'stripe') })
    check(review.status === 'pending' && review.details_due.length === 0, 'waiting on Stripe alone is a review, nothing for the owner to do')
    check(prov.stripeState({ ...caps('rejected', 'active') }).status === 'restricted', 'a rejected capability is paused')
    const bank = prov.bankSummary({ data: [{ object: 'bank_account', bank_name: 'MILLENNIUM BCP', last4: '4321', iban: 'PT50...' }] })
    check(bank.bank_name === 'MILLENNIUM BCP' && bank.account_last4 === '4321' && Object.keys(bank).length === 2, 'only the bank name and last four digits are kept')
    check(prov.nigerianAccount('012 345 6789') === '0123456789' && prov.nigerianAccount('12345') === null, 'Nigerian account numbers are ten digits')
    check(prov.bankCode('044') === '044' && prov.bankCode('044; drop') === null, 'bank codes are checked before use')
    const acct = prov.newStripeAccount({ country: 'PT', currency: 'EUR', email: 'a@b.pt', name: 'Femtos', url: 'https://locappoint.com/femtos', businessId: 'b1' })
    check(acct.dashboard === 'express' && acct.identity.country === 'pt' && acct.defaults.currency === 'eur', 'a v2 account: Express dashboard, Portugal, euros')
    check(acct.defaults.responsibilities.fees_collector === 'application' && acct.defaults.responsibilities.losses_collector === 'application', 'Express needs Locappoint to collect fees and carry losses')
    check(acct.configuration.merchant.capabilities.card_payments.requested === true && acct.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested === true, 'the account can take cards in its name and receive transfers')
    const link = prov.onboardingLink('acct_1', { return_url: 'https://x/r', refresh_url: 'https://x/e' })
    check(link.use_case.type === 'account_onboarding' && link.use_case.account_onboarding.configurations.join() === 'merchant,recipient' && link.use_case.account_onboarding.collection_options.fields === 'eventually_due', 'onboarding asks for everything once, for both configurations')
    check(prov.includeQuery(['a', 'b.c']) === 'include[0]=a&include[1]=b.c', 'v2 include fields are encoded as Stripe expects')
}

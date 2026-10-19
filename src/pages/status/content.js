export const UPDATED = { iso: '2026-10-19T20:00:00Z', label: '19 October 2026' }

export const NEXT_FIX = 'Left: the test data clean-up, on launch day'

export const NEXT_SWITCH = 'Next: one live refund'

export const WAVES = [
    { key: 'w1', name: 'Wave 1', title: 'The launch product', sub: 'Payments, visits at home and online, the booking engine, WhatsApp, trust and policies.', state: 'done', tag: 'Done' },
    { key: 'fixes', name: 'Now', title: 'Launch fixes and switch-ons', sub: 'WhatsApp and Paystack are live. Left: one live refund, the test data cleared, a clean-up pass on every screen, the English copy, then Portuguese for Portugal.', state: 'now', tag: 'Building' },
    { key: 'system', name: 'Built', title: 'Countries, and our own look', sub: 'Join and book anywhere in Nigeria and Portugal, search from where you are, travel priced by road, eight country worlds, Today in daylight.', state: 'done', tag: 'Done' },
    { key: 'w2', name: 'Wave 2', title: 'Why owners stay', sub: 'Fill the gap, Momentum and owner launch videos, Quote first.', state: 'planned', tag: 'After launch' },
    { key: 'scale', name: 'At 100 to 200 businesses', title: 'Found everywhere', sub: 'Book on Google, and booking from AI assistants.', state: 'planned', tag: 'Later' },
    { key: 'w3', name: 'Wave 3', title: 'Deeper', sub: 'Loca AI for owners, packages and classes, MB Way.', state: 'planned', tag: 'Later' },
]

export const BUILT = [
    {
        label: 'For clients',
        items: [
            'Book end to end, with emails and calendar invites',
            'Move or cancel from the email, no account needed',
            '"What do you need?": three free times, each for a reason',
            'Anywhere in Nigeria and Portugal: near me, a state, a town',
            'Book, move and cancel on WhatsApp, Support from the chat',
            'Visits at your place, online sessions, group bookings',
            'Reminders the day before and two hours before',
            'Reviews from real visits, one-tap rebooking',
            'On my way: minutes, never a position',
        ],
    },
    {
        label: 'For owners',
        items: [
            'Today with the Day Ring, Calendar with week rings',
            'Clients with reliability and due back',
            'Team with their own hours and logins',
            'Services with extras, hours with breaks and closed days',
            'Insights in money and the Monday statement',
            'Bookings list with download, QR poster, referrals',
            'Join anywhere: state or district, town, a pin where you stand',
            'Android app with push, from locappoint.com/app',
            'WhatsApp for owners: accept, decline, on my way',
        ],
    },
    {
        label: 'Money',
        items: [
            'Nigeria: pay ahead by transfer or card through Paystack, live',
            'Portugal: pay at the visit',
            'Payouts to the business, account name checked',
            'Support check for a different registered name',
            'Receipts for paid and completed visits',
            'Refunds and no-shows by written policy',
            'Travel by road from the shop\'s pin: time held, fee by distance',
        ],
    },
    {
        label: 'Trust and platform',
        items: [
            'Blue Reliable and gold Verified badges',
            'Report a problem, Support desk and admin queue',
            'Blocks need a reason, and we review every one',
            'Booking policies in plain words',
            'Business pages found on Google, with link previews',
            'Crash reports, spam limits, data kept only as promised',
            'WhatsApp live: Meta verification, all templates approved, app published',
        ],
    },
]

export const SLIP = [
    {
        key: 'code',
        title: 'Code fixes',
        lines: [
            { n: '1.1', text: 'Support check for payout accounts', state: 'done' },
            { n: '1.9', text: 'WhatsApp bookings counted everywhere', state: 'done' },
            { n: '1.10', text: 'Old purple out of the public pages', state: 'done' },
            { n: '1.11', text: 'Waitlist retired; its address goes to the beta sign-up', state: 'done' },
            { n: '1.2', text: 'Area picker for owners', state: 'done' },
            { n: '1.3', text: 'WhatsApp agent polish', state: 'done' },
            { n: '1.4', text: 'Naira sign', state: 'done' },
            { n: '1.6', text: 'Small polish owners see daily', state: 'done' },
            { n: '1.8', text: 'Meta pages: WhatsApp line on data deletion', state: 'done' },
            { n: '1.5', text: 'Verified for Lagos: NIN, licence and passport all pass', state: 'done' },
            { n: '1.7', text: 'Test data clean-up script', state: 'open' },
        ],
    },
    {
        key: 'switch',
        title: 'Switch on, in order',
        lines: [
            { n: '1', text: 'WhatsApp templates approved: 10 of 10', state: 'done' },
            { n: '2', text: 'Meta app published', state: 'done' },
            { n: '3', text: 'WhatsApp live for everyone', state: 'done' },
            { n: '4', text: 'Paystack live, with the first real Lagos business', state: 'done' },
            { n: '5', text: 'One real Lagos booking: paid, refund to check', state: 'open' },
        ],
    },
    {
        key: 'wait',
        title: 'Outside our hands',
        lines: [
            { n: 'D&B', text: 'D-U-N-S number, requested 7 October', state: 'wait' },
            { n: 'Vincent', text: 'Portuguese company, Stripe live, fees locked', state: 'wait' },
            { n: 'Vincent', text: 'Owners in Portugal signed', state: 'wait' },
            { n: 'Joseey', text: 'Owners in Nigeria onboarded', state: 'wait' },
            { n: 'Both', text: 'Naira business fee and VAT agreed', state: 'wait' },
        ],
    },
]

// Two countries (geo1 to geo5, 18 and 19 October): businesses join anywhere in each, and each has
// four worlds from four regions. style picks the card colours checked for contrast.
export const COUNTRIES = [
    {
        key: 'ng',
        style: 'lagos',
        name: 'Nigeria',
        world: 'adire',
        kind: 'Four worlds: south-west, south-east, north, south-south',
        greeting: 'Good morning, Nigeria.',
        lang: 'en',
        facts: [
            ['Status', 'Live, every state and the FCT'],
            ['Clients pay', 'Ahead, by transfer or card through Paystack. Live since 17 October'],
            ['On the ground', 'Joseey, in Lagos'],
        ],
        patterns: [['adire', 'Adire'], ['uli', 'Uli'], ['arewa', 'Arewa knot'], ['benin', 'Benin guilloche']],
    },
    {
        key: 'pt',
        style: 'porto',
        name: 'Portugal',
        world: 'azulejo',
        kind: 'Four worlds: Porto, Lisbon, the Minho, the Alentejo',
        greeting: 'Bom dia, Portugal.',
        lang: 'pt',
        facts: [
            ['Status', 'Live, every district, the Azores and Madeira'],
            ['Clients pay', 'At the visit. Online once the Portuguese company has Stripe'],
            ['On the ground', 'Vincent, in Porto'],
        ],
        patterns: [['azulejo', 'Azulejo'], ['calcada', 'Calçada'], ['minho', 'Minho filigree'], ['arraiolos', 'Arraiolos']],
    },
]

export const TILE_SAMPLES = [
    { name: 'A braider in Enugu', city: 'uli' },
    { name: 'A barber in Kano', city: 'arewa' },
    { name: 'A nail studio in Benin City', city: 'benin' },
    { name: 'A tutor in Braga', city: 'minho' },
    { name: 'A physio in Évora', city: 'arraiolos' },
    { name: 'A cleaner in Lisbon', city: 'calcada' },
]

export const NEXT_PIECES = [
    ['The ticket you keep', 'Porcelain paper, the business tile on the stub, an amber stamp on confirmation.'],
    ['Membership you can see', 'Founding businesses keep their number for good: "No. 007 in Portugal".'],
    ['Today has daylight', 'Built: the owner\'s Today screen takes the light of the hour where the business is.'],
]

export const AFTER = [
    {
        label: 'Wave 2, right after launch',
        items: [
            'Fill the gap: a freed slot goes first to clients who wanted earlier',
            'Momentum and the Monday recap, ready for WhatsApp Status',
            'Owner launch videos made from each business page',
            'Quote first, for home services',
            'iPhone after the D-U-N-S number; USSD in Nigeria when owners ask',
        ],
    },
    {
        label: 'At 100 to 200 businesses',
        items: [
            'Book on Google: the Book button on Maps and Search',
            'Booking from AI assistants such as Claude, ChatGPT and Gemini',
        ],
    },
    {
        label: 'Wave 3',
        items: [
            'Loca AI for owners: "what is my day", "block 2 to 4"',
            'Pickup and return; packages, repeats and classes',
            'Split the bill in groups',
            'MB Way when Portugal pays online',
        ],
    },
]

export const LINKS = [
    { url: 'https://locappoint.com', label: 'locappoint.com', desc: 'The booking platform. Live across Nigeria and Portugal.', state: 'live', tag: 'Live' },
    { url: 'https://locappoint.com/app', label: 'locappoint.com/app', desc: 'Android, live here now. Google Play and iPhone wait on the D-U-N-S number.', state: 'part', tag: 'Android live' },
    { url: 'https://status.locappoint.com', label: 'status.locappoint.com', desc: 'This page.', state: 'live', tag: 'Live' },
]

export const NEEDS = [
    { who: 'Vincent', title: 'Owners in Portugal', when: 'Before launch', text: 'Barbers, salons, clinics and home services ready to go live, with Porto in person first. The goal is 20 or more businesses taking real bookings every week.' },
    { who: 'Vincent', title: 'Portuguese company', when: 'Before paying online in Portugal', text: 'A Lda run by Vincent, for Stripe, euro invoices and EU data rules. Nigeria stays with Locappoint Technologies Ltd and Paystack. Needs a certified accountant from day one.' },
    { who: 'Vincent', title: 'Lock the fees', when: 'Before fees are charged', text: 'Lagos client fee decided on 17 October: NGN 100 under NGN 5,000, NGN 200 up to NGN 15,000, then 1.5% capped at NGN 2,000. Still to agree: the business fee and VAT in naira, and the Portugal fees (proposed: client fee 2%, EUR 0.49 to 4.90, business fee 1.5%). Decided: the first 100 businesses across both countries get their first month of fees free, with no rate lock.' },
    { who: 'Vincent', title: 'Stripe tax reporting', when: 'With the Lda', text: 'Request access to Stripe\'s tax reporting preview. Stripe collects each business\'s tax number and prepares the yearly EU report (DAC7); the accountant files it by 31 January.' },
    { who: 'D&B', title: 'App store accounts', when: 'Waiting', text: 'The D-U-N-S number for Locappoint Technologies Ltd, requested through Apple on 7 October. It opens Google Play, Apple and Aptoide.' },
    { who: 'Joseey', title: 'Google Maps billing', when: 'Before launch', text: 'A one-time prepayment turns on address search, places named in a search, and travel by road for home visits. Without it, the phone pin, near me and the area lists still work.' },
]

export const COSTS = {
    rows: [
        ['D-U-N-S number', 'Once', '0'],
        ['Apple Developer Program', 'Every year', '100'],
        ['Google Play Console', 'Once', '26'],
        ['Android developer verification', 'Once', '26'],
        ['Google Maps billing', 'Once, prepaid', '101'],
    ],
    total: '253',
    yearly: '100',
}

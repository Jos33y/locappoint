export const UPDATED = { iso: '2026-10-14T18:30:00Z', label: '14 October 2026' }

export const META_LEFT = 2

export const NEXT_FIX = 'Next: the area picker for owners'

export const WAVES = [
    { key: 'w1', name: 'Wave 1', title: 'The launch product', sub: 'Payments, three cities, visits at home and online, the booking engine, WhatsApp, trust and policies.', state: 'done', tag: 'Done' },
    { key: 'fixes', name: 'Now', title: 'Launch fixes and switch-ons', sub: 'Eleven small fixes, then WhatsApp live, Paystack live and the test data cleared.', state: 'now', tag: 'Building' },
    { key: 'system', name: 'Next', title: 'One system, our own look', sub: 'Every page on one design system, then city worlds, business tiles and the ticket you keep. This page is the first piece.', state: 'started', tag: 'Started' },
    { key: 'w2', name: 'Wave 2', title: 'Why owners stay', sub: 'Fill the gap, Momentum and owner launch videos, Quote first, Pins.', state: 'planned', tag: 'After launch' },
    { key: 'scale', name: 'At 100 to 200 businesses', title: 'Found everywhere', sub: 'Book on Google, and booking from AI assistants.', state: 'planned', tag: 'Later' },
    { key: 'w3', name: 'Wave 3', title: 'Deeper', sub: 'Loca AI for owners, packages and classes, Portuguese screens, MB Way.', state: 'planned', tag: 'Later' },
]

export const BUILT = [
    {
        label: 'For clients',
        items: [
            'Book end to end, with emails and calendar invites',
            'Move or cancel from the email, no account needed',
            '"What do you need?": three free times, each for a reason',
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
            'Android app with push, from locappoint.com/app',
            'WhatsApp for owners: accept, decline, on my way',
        ],
    },
    {
        label: 'Money',
        items: [
            'Lagos: pay ahead by transfer or card, through Paystack',
            'Porto and Lisbon: pay at the visit',
            'Payouts to the business, account name checked',
            'Support check for a different registered name',
            'Receipts for paid and completed visits',
            'Refunds and no-shows by written policy',
            'Travel fee, and travel time between Lagos visits',
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
            'Meta business verification approved, Meta app published',
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
            { n: '1.2', text: 'Area picker for owners', state: 'open' },
            { n: '1.3', text: 'WhatsApp agent polish', state: 'open' },
            { n: '1.4', text: 'Naira sign', state: 'open' },
            { n: '1.6', text: 'Small polish owners see daily', state: 'open' },
            { n: '1.7', text: 'Test data clean-up script', state: 'open' },
            { n: '1.8', text: 'Meta pages: WhatsApp line on data deletion', state: 'open' },
            { n: '1.5', text: 'Verified for Lagos, after the ID test', state: 'open' },
        ],
    },
    {
        key: 'switch',
        title: 'Switch on, in order',
        lines: [
            { n: '1', text: 'WhatsApp templates approved: 9 of 10', state: 'open' },
            { n: '2', text: 'Display name "Locappoint" approved', state: 'open' },
            { n: '3', text: 'Meta app published', state: 'done' },
            { n: '4', text: 'WhatsApp live for everyone', state: 'open' },
            { n: '5', text: 'Paystack live key, with the first real Lagos business', state: 'open' },
            { n: '6', text: 'One real Lagos booking, paid and refunded', state: 'open' },
            { n: '7', text: 'Test data cleared, site deployed', state: 'open' },
            { n: '8', text: 'This page at launch state', state: 'open' },
            { n: '9', text: 'Android app rebuilt with everything since', state: 'open' },
        ],
    },
    {
        key: 'wait',
        title: 'Outside our hands',
        lines: [
            { n: 'Meta', text: 'Last template and the display name', state: 'wait' },
            { n: 'D&B', text: 'D-U-N-S number, requested 7 October', state: 'wait' },
            { n: 'Vincent', text: 'Portuguese company, Stripe live, fees locked', state: 'wait' },
            { n: 'Vincent', text: 'Stripe Identity on in the live dashboard', state: 'wait' },
            { n: 'Vincent', text: 'Porto and Lisbon owners signed', state: 'wait' },
            { n: 'Joseey', text: 'Lagos owners onboarded', state: 'wait' },
            { n: 'Joseey', text: 'Stripe Identity test with a Nigerian ID', state: 'wait' },
            { n: 'Joseey', text: 'Google Maps prepayment', state: 'wait' },
        ],
    },
]

export const CITIES = [
    {
        key: 'porto',
        name: 'Porto',
        world: 'Azulejo cobalt, porcelain, port wine, granite',
        greeting: 'Bom dia, Porto.',
        facts: [
            ['Status', 'Live'],
            ['Clients pay', 'At the visit. Online once the Portuguese company has Stripe'],
            ['On the ground', 'Vincent'],
        ],
        swatches: [['cobalt', 'porto-cobalt'], ['porcelain', 'porto-porcelain'], ['vinho', 'porto-vinho'], ['granito', 'porto-granito']],
    },
    {
        key: 'lagos',
        name: 'Lagos',
        world: 'Adire indigo, lagoon light, ember, sand',
        greeting: 'Good morning, Lagos.',
        facts: [
            ['Status', 'Live'],
            ['Clients pay', 'Ahead, by transfer or card through Paystack. The live key goes in with the first real business'],
            ['On the ground', 'Joseey and the Lagos side'],
        ],
        swatches: [['indigo', 'lagos-indigo'], ['lagoon', 'lagos-lagoon'], ['ember', 'lagos-ember'], ['sand', 'lagos-sand']],
    },
    {
        key: 'lisbon',
        name: 'Lisbon',
        world: 'Tram yellow, terracotta, pastel fronts, the Tejo',
        greeting: 'Bom dia, Lisboa.',
        facts: [
            ['Status', 'Live, the same as Porto'],
            ['Clients pay', 'At the visit'],
            ['On the ground', 'Vincent'],
        ],
        swatches: [['elétrico', 'lisbon-eletrico'], ['telha', 'lisbon-telha'], ['fachada', 'lisbon-fachada'], ['Tejo', 'lisbon-tejo']],
    },
]

export const TILE_SAMPLES = [
    { name: 'A barber in Ribeira', city: 'porto' },
    { name: 'A braider in Yaba', city: 'lagos' },
    { name: 'A physio in Alfama', city: 'lisbon' },
    { name: 'A nail studio in Lekki', city: 'lagos' },
    { name: 'A tutor in Bonfim', city: 'porto' },
    { name: 'A cleaner in Benfica', city: 'lisbon' },
]

export const NEXT_PIECES = [
    ['The ticket you keep', 'Porcelain paper, the business tile on the stub, an amber stamp on confirmation.'],
    ['Membership you can see', 'Founding businesses keep their number for good: "No. 007 in Porto".'],
    ['Today has daylight', 'The owner\'s Today screen takes the light of the hour in their own city.'],
]

export const AFTER = [
    {
        label: 'Wave 2, right after launch',
        items: [
            'Fill the gap: a freed slot goes first to clients who wanted earlier',
            'Momentum and the Monday recap, ready for WhatsApp Status',
            'Owner launch videos made from each business page',
            'Quote first, for Lagos home services',
            'Pins; iPhone after the D-U-N-S number; USSD in Nigeria when Lagos asks',
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
            'Portuguese screens, sooner if Insights shows English losing clients',
            'MB Way when Porto and Lisbon pay online',
        ],
    },
]

export const LINKS = [
    { url: 'https://locappoint.com', label: 'locappoint.com', desc: 'The booking platform. Live in Porto, Lagos and Lisbon.', state: 'live', tag: 'Live' },
    { url: 'https://locappoint.com/app', label: 'locappoint.com/app', desc: 'Android, live here now. Google Play and iPhone wait on the D-U-N-S number.', state: 'part', tag: 'Android live' },
    { url: 'https://status.locappoint.com', label: 'status.locappoint.com', desc: 'This page.', state: 'live', tag: 'Live' },
]

export const NEEDS = [
    { who: 'Vincent', title: 'Porto and Lisbon owners', when: 'Before launch', text: 'Barbers, salons, clinics and home services ready to go live. The goal is 20 or more businesses taking real bookings every week across the three cities.' },
    { who: 'Vincent', title: 'Portuguese company', when: 'Before paying online in Portugal', text: 'A Lda run by Vincent, for Stripe, euro invoices and EU data rules. Nigeria stays with Locappoint Technologies Ltd and Paystack. Needs a certified accountant from day one.' },
    { who: 'Vincent', title: 'Lock the fees', when: 'Before payments go live', text: 'Proposed: client fee 2% (EUR 0.49 to 4.90), business fee 1.5%, first month free, and founding terms for the first 20 businesses. Built and waiting for Vincent\'s yes.' },
    { who: 'Vincent', title: 'Stripe Identity live', when: 'Before launch', text: 'One switch in the live Stripe dashboard, so the gold Verified badge works for real.' },
    { who: 'Vincent', title: 'Stripe tax reporting', when: 'With the Lda', text: 'Request access to Stripe\'s tax reporting preview. Stripe collects each business\'s tax number and prepares the yearly EU report (DAC7); the accountant files it by 31 January.' },
    { who: 'Meta', title: 'Two approvals', when: 'Any day', text: 'The last WhatsApp template and the display name. Then one switch turns WhatsApp on for every business and client.' },
    { who: 'D&B', title: 'App store accounts', when: 'Waiting', text: 'The D-U-N-S number for Locappoint Technologies Ltd, requested through Apple on 7 October. It opens Google Play, Apple and Aptoide.' },
    { who: 'Joseey', title: 'Google Maps billing', when: 'Before launch', text: 'A one-time prepayment turns on address search and live minutes for home visits. Areas already work without it.' },
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

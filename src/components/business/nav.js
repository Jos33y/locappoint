import { Bell, Bot, CalendarDays, ChartColumn, Clock, Gift, Inbox, LifeBuoy, ListChecks, Radio, Rocket, Scissors, Settings, Sprout, Star, Store, Sun, Users, UsersRound, Wallet } from 'lucide-react'

export const NAV_GROUPS = [
    {
        label: 'Run the day',
        items: [
            { to: '/portal', label: 'Today', icon: Sun, end: true, tab: true, tour: 'today' },
            { to: '/portal/calendar', label: 'Calendar', icon: CalendarDays, tab: true, tour: 'calendar' },
            { to: '/portal/bookings', label: 'Bookings', icon: ListChecks, keywords: ['appointments', 'list', 'all bookings', 'history', 'upcoming', 'export'] },
            { to: '/portal/clients', label: 'Clients', icon: Users, tab: true, keywords: ['customers', 'regulars', 'notes', 'due back'] },
        ],
    },
]

export const HUBS = [
    {
        id: 'business',
        label: 'Your business',
        icon: Store,
        tour: 'business',
        pages: [
            { to: '/portal/page', label: 'Page', name: 'Business page', icon: Store, keywords: ['profile', 'photos', 'logo', 'cover', 'address', 'description'] },
            { to: '/portal/services', label: 'Services', name: 'Services', icon: Scissors, keywords: ['prices', 'menu', 'duration'] },
            { to: '/portal/hours', label: 'Hours', name: 'Opening hours', icon: Clock, keywords: ['schedule', 'open', 'closed', 'lunch'] },
            { to: '/portal/team', label: 'Team', name: 'Team', icon: UsersRound, keywords: ['staff', 'barbers', 'people', 'login'] },
            { to: '/portal/payments', label: 'Payments', name: 'Payments', icon: Wallet, keywords: ['payouts', 'getting paid', 'bank', 'iban', 'stripe', 'paystack', 'money'] },
        ],
    },
    {
        id: 'grow',
        label: 'Grow',
        icon: Sprout,
        tour: 'grow',
        pages: [
            { to: '/portal/channels', label: 'Channels', name: 'Channels', icon: Radio, keywords: ['link', 'whatsapp', 'google', 'qr'] },
            { to: '/portal/insights', label: 'Insights', name: 'Insights', icon: ChartColumn, keywords: ['money', 'stats', 'reports', 'visits', 'busiest'] },
            { to: '/portal/reviews', label: 'Reviews', name: 'Reviews', icon: Star, keywords: ['ratings', 'stars', 'reply'] },
            { to: '/portal/invite', label: 'Invite', name: 'Invite a business', icon: Gift, keywords: ['referral', 'points', 'invite'] },
        ],
    },
]

export const NAV_FOOT = [
    { to: '/portal/start', label: 'Getting started', icon: Rocket, tour: 'start' },
    { to: '/portal/help', label: 'Help', icon: LifeBuoy, tour: 'help', keywords: ['faq', 'questions', 'how do i'] },
    { to: '/portal/support', label: 'Support', icon: Inbox, keywords: ['ticket', 'report', 'problem', 'contact', 'refund'] },
]

// Support sits in the sidebar on its own, always in view: in this business people need to reach us fast.
export const SUPPORT_NAV = { to: '/portal/support', label: 'Support', icon: LifeBuoy, tour: 'support' }

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

const matches = (item, pathname) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`))

export const hubFor = (pathname) => HUBS.find((hub) => hub.pages.some((page) => matches(page, pathname))) || null

export const HUB_PAGES = HUBS.flatMap((hub) => hub.pages.map((page) => ({ ...page, label: page.name, hub: hub.label })))

export const PALETTE_PAGES = [...NAV_ITEMS, ...HUB_PAGES, ...NAV_FOOT, { to: '/portal/settings', label: 'Settings', icon: Settings }]

// Staff run their own day: bookings, clients and their account. The business itself is the owner's.
const STAFF_PATHS = ['/portal', '/portal/calendar', '/portal/bookings', '/portal/clients', '/portal/notifications', '/portal/help', '/portal/support', '/portal/settings']
export const staffCanSee = (pathname) => STAFF_PATHS.some((p) => pathname === p || (p !== '/portal' && pathname.startsWith(`${p}/`)))
export const STAFF_PALETTE_PAGES = PALETTE_PAGES.filter((page) => staffCanSee(page.to))

export const PLANNED = {
    assistant: {
        title: 'Loca AI',
        icon: Bot,
        promise: 'Run your day in a sentence. Ask what is next, book a caller, block an hour, and it is done.',
        points: [
            'Ask "What is my day?" or "Who is next?" and get the answer in a line',
            'Book, confirm, move and cancel by chat, always with a confirm step first',
            'See every conversation Loca AI has with your clients on WhatsApp',
            'Decide what it may answer, and when it hands the chat over to you',
        ],
        preview: 'chat',
    },
    insights: {
        title: 'Insights',
        icon: ChartColumn,
        promise: 'See what your time is worth, week by week.',
        points: [
            'Money this week against last, earned and still to come',
            'Lost to no-shows, and saved by reminders',
            'Your busiest days and hours, and your most booked services',
            'A weekly recap, ready to share on WhatsApp or Instagram',
        ],
        preview: 'chart',
    },
    notifications: {
        title: 'Notifications',
        icon: Bell,
        promise: 'Everything that changed, the moment it changes.',
        points: [
            'New bookings, cancellations and moves, as they happen',
            'An unread count on the bell, so nothing slips',
            'Email and WhatsApp alerts with your reminders',
        ],
        preview: 'list',
    },
}

const EXTRA_TITLES = [
    ['/portal/notifications', 'Notifications'],
    ['/portal/ui', 'Primitives'],
]

export const titleFor = (pathname) => {
    const match = PALETTE_PAGES.find((item) => matches(item, pathname))
    if (match) return match.label
    const extra = EXTRA_TITLES.find(([path]) => pathname.startsWith(path))
    return extra ? extra[1] : 'Today'
}

export const TOUR_STEPS = [
    { target: 'today', title: 'Today is your home', body: 'How full today is, what you earned and what is still to come, your week, and what needs you.' },
    { target: 'new', title: 'Add a booking in seconds', body: 'Phone call or walk-in? Tap here, pick a time, type a name. That is it.' },
    { target: 'calendar', title: 'Plan ahead', body: 'See any day or the whole week. Tap a booking to confirm, move or cancel it.' },
    { target: 'more', title: 'Everything else lives here', body: 'Your page, services, hours, channels, help and settings. Your setup progress is at the top.' },
    { target: 'business', title: 'Your business', body: 'Your page, services, hours, team and payments, in one place. Clients book from what you set here.' },
    { target: 'grow', title: 'Get booked in more places', body: 'Your link today; WhatsApp, Google Maps and AI assistants as they come online. Reviews and insights land here too.' },
    { target: 'account', title: 'Help is under your name', body: 'Help, settings and switching to Booking live here. You can replay this tour from here any time.' },
]

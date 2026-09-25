import { Bell, Bot, CalendarDays, ChartColumn, Clock, Gift, LifeBuoy, Radio, Rocket, Scissors, Star, Store, Sun, Users, UsersRound } from 'lucide-react'

export const NAV_GROUPS = [
    {
        label: 'Run the day',
        items: [
            { to: '/portal', label: 'Today', icon: Sun, end: true, tab: true, tour: 'today' },
            { to: '/portal/calendar', label: 'Calendar', icon: CalendarDays, tab: true, tour: 'calendar' },
            { to: '/portal/assistant', label: 'Loca AI', icon: Bot, tab: true, planned: 'assistant', tour: 'ai' },
            { to: '/portal/clients', label: 'Clients', icon: Users, tab: true, planned: 'clients' },
        ],
    },
    {
        label: 'Set up',
        items: [
            { to: '/portal/services', label: 'Services', icon: Scissors, tour: 'services' },
            { to: '/portal/team', label: 'Team', icon: UsersRound, planned: 'team' },
            { to: '/portal/hours', label: 'Hours', icon: Clock },
            { to: '/portal/page', label: 'Business page', icon: Store, tour: 'page' },
        ],
    },
    {
        label: 'Grow',
        items: [
            { to: '/portal/channels', label: 'Channels', icon: Radio, tour: 'channels' },
            { to: '/portal/insights', label: 'Insights', icon: ChartColumn, planned: 'insights' },
            { to: '/portal/reviews', label: 'Reviews', icon: Star, planned: 'reviews' },
            { to: '/portal/invite', label: 'Invite a business', icon: Gift, planned: 'invite' },
        ],
    },
]

export const NAV_FOOT = [
    { to: '/portal/start', label: 'Getting started', icon: Rocket, tour: 'start' },
    { to: '/portal/help', label: 'Help and support', icon: LifeBuoy, tour: 'help' },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

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
    clients: {
        title: 'Clients',
        icon: Users,
        promise: 'Everyone who books you, in one place, with the history that matters.',
        points: [
            'Everyone who booked online, by phone or walked in, searchable',
            'Visits, last visit and total spent on every client',
            'Reliability at a glance: kept, cancelled and no-show counts',
            'Private notes, and book again in one tap',
        ],
        preview: 'list',
    },
    team: {
        title: 'Team',
        icon: UsersRound,
        promise: 'Add the people who take bookings, each with their own calendar.',
        points: [
            'Invite by email or phone; they join with their own account',
            'Owner and staff roles: staff see their own day, you see everyone',
            'Each person has their own hours and the services they do',
            'Clients pick a person, or anyone who is free',
        ],
        preview: 'list',
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
    reviews: {
        title: 'Reviews',
        icon: Star,
        promise: 'Let happy clients say so, where new clients will read it.',
        points: [
            'Clients rate their visit after it is marked completed',
            'Reviews show on your business page and in Browse',
            'Reply publicly, or privately when something went wrong',
            'Only clients who really visited can leave a review',
        ],
        preview: 'list',
    },
    invite: {
        title: 'Invite a business',
        icon: Gift,
        promise: 'Know a business that should be on Locappoint? Invite them. When they start, you both get a month free.',
        points: [
            'Your own invite link to send on WhatsApp or by email',
            'One free month for you and one for them when they take their first booking',
            'See who you invited and which months you have earned',
            'No limit on how many businesses you invite',
        ],
        preview: 'list',
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
    ['/portal/settings', 'Settings'],
    ['/portal/notifications', 'Notifications'],
    ['/portal/ui', 'Primitives'],
]

export const titleFor = (pathname) => {
    const match = [...NAV_ITEMS, ...NAV_FOOT]
        .sort((a, b) => b.to.length - a.to.length)
        .find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
    if (match) return match.label
    const extra = EXTRA_TITLES.find(([path]) => pathname.startsWith(path))
    return extra ? extra[1] : 'Today'
}

export const TOUR_STEPS = [
    { target: 'today', title: 'Today is your home', body: 'Your day at a glance: who is next, what needs confirming, and the free time you can still fill.' },
    { target: 'new', title: 'Add a booking in seconds', body: 'Phone call or walk-in? Tap here, pick a time, type a name. That is it.' },
    { target: 'calendar', title: 'Plan ahead', body: 'See any day or the whole week. Tap a booking to confirm, move or cancel it.' },
    { target: 'more', title: 'Everything else lives here', body: 'Services, hours, your page, channels and help. Your setup progress is at the top.' },
    { target: 'services', title: 'What you offer', body: 'Your services, prices and how long each one takes. Clients book from this list.' },
    { target: 'page', title: 'Your page', body: 'What clients see at your link. A description, photos and your address make it book more.' },
    { target: 'channels', title: 'Everywhere you can be booked', body: 'Your link today; WhatsApp, Google Maps and AI assistants as they come online.' },
    { target: 'help', title: 'We are here', body: 'Guides, WhatsApp support and tickets. You can replay this tour from Getting started any time.' },
]

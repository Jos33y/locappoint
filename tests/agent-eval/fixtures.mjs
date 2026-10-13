// A frozen, in-memory copy of what the WhatsApp agent can see: five businesses (The Brick Dev as it is
// live, four made-up ones with the shapes our real businesses have, one in Lagos) and a demo page. Every wa_* function
// the agent calls is answered here with the same fields the database returns, so a conversation can book,
// move and cancel without touching Supabase. One fresh copy per conversation.

import crypto from 'node:crypto'

export const TZ = 'Europe/Lisbon'
const DAY = 86_400_000

export const lisbonNow = () => {
    const now = new Date()
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    return { date, time }
}
export const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10)
export const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay()
export const dayName = (date, lang = 'en') => new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { timeZone: 'UTC', weekday: 'long' }).format(new Date(`${date}T12:00:00Z`))
// The next date on that weekday, after today (0 Sunday ... 6 Saturday).
export const nextDow = (dow, from = lisbonNow().date) => {
    for (let i = 1; i <= 7; i++) if (weekday(addDays(from, i)) === dow) return addDays(from, i)
    return null
}
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// hours: weekday number to [open, close]; busy: times nobody can book on any open day.
const BUSINESSES = [
    {
        id: id(101), slug: 'thebrickdev', name: 'The Brick Dev', city: 'Porto', market: 'porto', category: 'Web and software studio',
        address: 'Online', area: null, phone: '+351 912 000 101', whatsapp: null, auto: false, cutoff: 1440, currency: 'EUR', demo: false, payOnline: false, staff: 'John Stewart',
        description: 'Websites, web apps and reviews for small businesses.',
        hours: { 1: ['09:00', '17:00'], 2: ['09:00', '17:00'], 3: ['09:00', '17:00'], 4: ['09:00', '17:00'], 5: ['09:00', '17:00'] }, busy: [['12:00', '13:00']],
        services: [
            { id: id(201), name: 'Discovery call', minutes: 30, price: 0, per: 'booking', max: 1, ways: ['online'], about: 'A first call about your project.' },
            { id: id(202), name: 'Website review', minutes: 60, price: 50, per: 'booking', max: 1, ways: ['online'], about: 'A review of your website with a written list of fixes.' },
            { id: id(203), name: 'Build session', minutes: 150, price: 120, per: 'booking', max: 1, ways: ['online'], about: 'Hands-on work on your site.' },
        ],
    },
    {
        id: id(102), slug: 'barbearia-rio', name: 'Barbearia Rio', city: 'Lisbon', market: 'lisbon', category: 'Barber',
        address: 'Rua da Rosa 12', area: 'Bairro Alto', phone: '+351 912 000 102', whatsapp: null, auto: true, cutoff: 120, currency: 'EUR', demo: false, payOnline: false, staff: 'Rui',
        description: 'Classic cuts and beards in Bairro Alto.',
        hours: { 2: ['10:00', '19:00'], 3: ['10:00', '19:00'], 4: ['10:00', '19:00'], 5: ['10:00', '19:00'], 6: ['10:00', '19:00'] }, busy: [['13:00', '14:00']],
        services: [
            { id: id(211), name: 'Corte de cabelo', minutes: 30, price: 15, per: 'person', max: 4, ways: ['at_business'], about: 'Haircut.' },
            { id: id(212), name: 'Barba', minutes: 20, price: 10, per: 'booking', max: 1, ways: ['at_business'], about: 'Beard trim.' },
            { id: id(213), name: 'Corte e barba', minutes: 45, price: 22, per: 'booking', max: 1, ways: ['at_business'], about: 'Haircut and beard trim.' },
        ],
    },
    {
        id: id(103), slug: 'unhas-lab', name: 'Unhas Lab', city: 'Porto', market: 'porto', category: 'Nails',
        address: 'Rua de Cedofeita 210', area: 'Cedofeita', phone: '+351 912 000 103', whatsapp: null, auto: true, cutoff: 1440, currency: 'EUR', demo: false, payOnline: true, staff: 'Carla',
        description: 'Gel, manicure and pedicure.',
        hours: { 1: ['09:30', '18:30'], 2: ['09:30', '18:30'], 3: ['09:30', '18:30'], 4: ['09:30', '18:30'], 5: ['09:30', '18:30'], 6: ['09:30', '18:30'] }, busy: [['13:00', '14:00']],
        services: [
            { id: id(221), name: 'Manicure gel', minutes: 60, price: 25, per: 'booking', max: 1, ways: ['at_business'], about: 'Gel nails, lasts three weeks.' },
            { id: id(222), name: 'Pedicure', minutes: 60, price: 30, per: 'booking', max: 1, ways: ['at_business'], about: '' },
            { id: id(223), name: 'Verniz simples', minutes: 30, price: 12, per: 'booking', max: 1, ways: ['at_business'], about: 'Plain polish.' },
        ],
    },
    {
        id: id(104), slug: 'bem-estar', name: 'Bem Estar Massagens', city: 'Lisbon', market: 'lisbon', category: 'Massage and wellness',
        address: 'Avenida da Liberdade 100', area: 'Avenida', phone: '+351 912 000 104', whatsapp: null, auto: false, cutoff: 1440, currency: 'EUR', demo: false, payOnline: false, staff: 'Sofia',
        description: 'Relaxing and sports massage, also at home.', areas: ['Lisboa', 'Oeiras', 'Amadora'],
        hours: { 1: ['10:00', '20:00'], 2: ['10:00', '20:00'], 3: ['10:00', '20:00'], 4: ['10:00', '20:00'], 5: ['10:00', '20:00'], 6: ['10:00', '14:00'] }, busy: [['14:00', '15:00']],
        services: [
            { id: id(231), name: 'Massagem relaxante', minutes: 60, price: 45, per: 'booking', max: 1, ways: ['at_business'], about: 'Relaxing massage.' },
            { id: id(232), name: 'Massagem desportiva', minutes: 60, price: 50, per: 'booking', max: 1, ways: ['at_business'], about: 'Sports massage.' },
            { id: id(233), name: 'Massagem ao domicílio', minutes: 60, price: 60, per: 'booking', max: 1, ways: ['at_client'], travel: 10, about: 'Massage at your home in Lisbon.' },
        ],
    },
    {
        id: id(106), slug: 'fade-lab', name: 'Fade Lab', city: 'Lagos', market: 'lagos', category: 'Barber',
        address: '5 Admiralty Way', area: 'Lekki Phase 1', phone: '+234 801 000 1060', whatsapp: null, auto: true, cutoff: 120, currency: 'NGN', demo: false, payOnline: false, staff: 'Tunde',
        description: 'Fades, cuts and beards in Lekki. Home service too.', areas: ['Lekki', 'Lekki Phase 1', 'Ajah', 'VGC', 'Ikoyi', 'Victoria Island'],
        hours: { 1: ['09:00', '20:00'], 2: ['09:00', '20:00'], 3: ['09:00', '20:00'], 4: ['09:00', '20:00'], 5: ['09:00', '20:00'], 6: ['09:00', '20:00'] }, busy: [['14:00', '15:00']],
        services: [
            { id: id(251), name: 'Haircut', minutes: 45, price: 8000, per: 'person', max: 3, ways: ['at_business', 'at_client'], travel: 5000, about: 'Any cut, fade included.' },
            { id: id(252), name: 'Haircut and beard', minutes: 60, price: 12000, per: 'booking', max: 1, ways: ['at_business', 'at_client'], travel: 5000, about: '' },
        ],
    },
    {
        id: id(105), slug: 'femtos-barbearia', name: 'Femtos Barbearia', city: 'Lisbon', market: 'lisbon', category: 'Barber',
        address: 'Rua Exemplo 1', area: null, phone: null, whatsapp: null, auto: true, cutoff: 0, currency: 'EUR', demo: true, payOnline: false, staff: null,
        description: 'Example page.', hours: {}, busy: [],
        services: [{ id: id(241), name: 'Corte', minutes: 30, price: 18, per: 'person', max: 1, ways: ['at_business'], about: '' }],
    },
]

const WORDS = [
    ['corte', 'cabelo', 'haircut', 'hair', 'cut', 'barber', 'barbeiro', 'barbearia', 'fade', 'barb'],
    ['barba', 'beard', 'shave'],
    ['unhas', 'nails', 'nail', 'manicure', 'gel', 'verniz', 'pedicure', 'polish'],
    ['massagem', 'massage', 'spa', 'relax', 'back', 'domicilio'],
    ['website', 'site', 'web', 'developer', 'review', 'app', 'discovery'],
]

export const makeFixtures = ({ phone }) => {
    const bookings = []
    const tickets = []
    const now = () => lisbonNow()
    const biz = (bid) => BUSINESSES.find((b) => b.id === bid) || null
    const svc = (b, sid) => b?.services.find((s) => s.id === sid) || null

    const view = (a) => {
        const b = biz(a.business_id), s = svc(b, a.service_id)
        return {
            id: a.id, status: a.status, payment_status: a.payment_status, hold_until: a.hold_until,
            price: a.price, total: a.total, client_fee: 0, currency: b.currency,
            business_id: b.id, business_name: b.name, slug: b.slug,
            address: a.mode === 'at_client' ? a.address : b.address, city: a.mode === 'at_client' ? a.zone : b.city, landmark: a.mode === 'at_client' ? a.landmark : null, travel_fee: a.travel || 0,
            service_id: s.id, service_name: s.name, date: a.date, time: a.time, minutes: a.minutes,
            staff_name: b.staff, mode: a.mode, people: a.people, timezone: b.market === 'lagos' ? 'Africa/Lagos' : TZ, cancel_cutoff_minutes: b.cutoff,
            meeting_url: a.mode === 'online' && a.status === 'confirmed' ? 'https://meet.example.com/eval' : null,
            manage_token: a.token,
        }
    }

    const slots = (b, s, date, ignore = null, people = 1) => {
        if (!b || !s || b.demo) return []
        const open = b.hours[weekday(date)]
        if (!open) return []
        const n = now()
        if (date < n.date) return []
        // One person serves the group, one after another: each extra person adds the service's length.
        const length = s.minutes * Math.max(1, people)
        if (people > (s.max || 1)) return []
        const taken = [
            ...b.busy.map(([f, t]) => [toMin(f), toMin(t)]),
            ...bookings.filter((a) => a.business_id === b.id && a.date === date && a.id !== ignore && a.status !== 'cancelled' && a.payment_status !== 'failed')
                .map((a) => [toMin(a.time), toMin(a.time) + a.minutes]),
        ]
        const out = []
        for (let m = toMin(open[0]); m + length <= toMin(open[1]); m += 15) {
            if (date === n.date && m <= toMin(n.time) + 30) continue
            if (taken.some(([f, t]) => m < t && m + length > f)) continue
            out.push(toTime(m))
        }
        return out
    }

    const mine = (bid) => {
        const a = bookings.find((x) => x.id === bid)
        if (!a) throw Object.assign(new Error('That booking was not made from this WhatsApp'), { code: '42501' })
        return a
    }
    const upcoming = (a) => `${a.date}T${a.time}` > `${now().date}T${now().time}`
    const minutesUntil = (a) => (Date.parse(`${a.date}T${a.time}:00Z`) - Date.parse(`${now().date}T${now().time}:00Z`)) / 60_000

    const book = ({ business, service, date, time, name, email, mode, people = 1, status, address = null, landmark = null, zone = null }) => {
        const b = biz(business), s = svc(b, service)
        if (!b || !s) throw Object.assign(new Error('This service is not available'), { code: 'P0002' })
        const m = mode || (s.ways.includes('at_business') ? 'at_business' : s.ways.includes('online') ? 'online' : s.ways[0])
        let area = null
        if (m === 'at_client') {
            area = (b.areas || []).find((z) => z.toLowerCase() === String(zone || '').trim().toLowerCase()) || null
            if (!area) throw Object.assign(new Error('This business does not go to that area. Pick one of the areas it lists.'), { code: '22023' })
            if (String(address || '').trim().length < 5) throw Object.assign(new Error('Enter the address where the visit happens'), { code: '22023' })
        }
        if (bookings.filter((a) => upcoming(a) && a.status !== 'cancelled').length >= 3) throw Object.assign(new Error('You already have three upcoming bookings from WhatsApp. Change or cancel one first.'), { code: 'P0001' })
        if (!slots(b, s, date, null, people).includes(time)) throw Object.assign(new Error('That time is no longer free. Pick another.'), { code: 'P0001' })
        const travel = m === 'at_client' ? s.travel || 0 : 0
        const price = (s.per === 'person' ? s.price * people : s.price) + travel
        const a = {
            id: crypto.randomUUID(), business_id: b.id, service_id: s.id, date, time, minutes: s.minutes * people,
            people, mode: m, name, email: email ? String(email).trim().toLowerCase() : null, price, total: price,
            address: m === 'at_client' ? String(address).trim() : null, landmark: m === 'at_client' ? landmark || null : null, zone: area, travel,
            status: status || (b.auto ? 'confirmed' : 'pending'),
            payment_status: b.payOnline && price > 0 ? 'awaiting' : 'at_visit',
            hold_until: b.payOnline && price > 0 ? new Date(Date.now() + 35 * 60_000).toISOString() : null,
            token: crypto.randomBytes(24).toString('hex'),
        }
        bookings.push(a)
        return view(a)
    }

    const fns = {
        wa_directory: () => BUSINESSES.filter((b) => !b.demo).map((b) => ({ name: b.name, slug: b.slug, city: b.city, category: b.category, services: b.services.map((s) => s.name).join(', ') })),
        wa_find: ({ p_query }) => {
            const raw = String(p_query || '').trim().toLowerCase()
            const clean = raw.replace(/[\\%_]/g, '')
            if (clean.length < 2) return []
            return BUSINESSES.filter((b) => b.slug === raw || (!b.demo && (b.name.toLowerCase().includes(clean) || b.slug.includes(clean.replace(/ /g, '-')))))
                .slice(0, 5).map((b) => ({ business_id: b.id, name: b.name, slug: b.slug, city: b.city, area: b.area, category: b.category }))
        },
        wa_business: ({ p_business }) => {
            const b = biz(p_business)
            if (!b) return null
            const n = now()
            return {
                business_id: b.id, name: b.name, slug: b.slug, category: b.category, address: b.address, area: b.area, city: b.city, market: b.market,
                timezone: b.market === 'lagos' ? 'Africa/Lagos' : TZ, phone: b.phone, whatsapp: b.whatsapp, description: b.description, confirms_automatically: b.auto,
                cancel_cutoff_minutes: b.cutoff, currency: b.currency, today: n.date, now: n.time, visit_areas: b.areas || null,
                hours: Object.entries(b.hours).map(([d, [f, t]]) => ({ day: WEEKDAYS[Number(d)], open: `${f}-${t}` })),
                services: b.services.map((s) => ({ service_id: s.id, name: s.name, minutes: s.minutes, price: s.price, price_per: s.per, max_people: s.max, extra_person_minutes: s.max > 1 ? s.minutes : null, ways: s.ways, travel_fee: s.ways.includes('at_client') ? s.travel || 0 : null, about: s.about })),
            }
        },
        wa_times: ({ p_business, p_service, p_date, p_ignore, p_people }) => { const b = biz(p_business); return slots(b, svc(b, p_service), p_date, p_ignore, Number(p_people) || 1) },
        wa_free_days: ({ p_business, p_service, p_from, p_people }) => {
            const b = biz(p_business), s = svc(b, p_service)
            const out = []
            const today = now().date
            const start = p_from && p_from > today ? p_from : today
            for (let d = start; d <= addDays(today, 20) && out.length < 5; d = addDays(d, 1)) {
                const t = slots(b, s, d, null, Number(p_people) || 1)
                if (!t.length) continue
                const step = Math.ceil(t.length / 8)
                out.push({ date: d, first: t[0], last: t[t.length - 1], count: t.length, examples: t.filter((_, i) => i % step === 0) })
            }
            return out
        },
        wa_quote: ({ p_business, p_service, p_people }) => {
            const b = biz(p_business), s = svc(b, p_service)
            if (!b || !s) return null
            const people = Number(p_people) || 1
            const total = s.per === 'person' ? s.price * people : s.price
            return { travel_fee: s.travel || 0, online: b.payOnline && total > 0, total, currency: b.currency, price_per: s.per, service_price: s.price, currency_hint: b.currency, cancel_cutoff_minutes: b.cutoff, confirms_automatically: b.auto }
        },
        wa_search: ({ p_market, p_query, p_dates, p_window, p_at, p_people, p_zone }) => {
            const zone = String(p_zone || '').trim().toLowerCase()
            const q = String(p_query || '').toLowerCase()
            const groups = WORDS.filter((g) => g.some((w) => q.includes(w)))
            const today = now().date
            const dates = Array.isArray(p_dates) && p_dates.length ? p_dates : [today, addDays(today, 1), addDays(today, 2)]
            const people = Number(p_people) || 1
            const fits = (t) => {
                const m = toMin(t)
                if (p_at) return Math.abs(m - toMin(p_at)) <= 90
                if (p_window === 'morning') return m < 720
                if (p_window === 'afternoon') return m >= 720 && m < 1020
                if (p_window === 'evening') return m >= 1020
                return true
            }
            const found = []
            for (const b of BUSINESSES.filter((x) => !x.demo && x.market === String(p_market || '').toLowerCase() && (!zone || (x.areas || []).some((z) => z.toLowerCase() === zone)))) {
                for (const s of b.services.filter((x) => (zone ? x.ways.includes('at_client') : !x.ways.every((w) => w === 'at_client')))) {
                    const text = `${s.name} ${b.category}`.toLowerCase()
                    if (!groups.some((g) => g.some((w) => text.includes(w)))) continue
                    for (const d of dates) {
                        const all = slots(b, s, d, null, people)
                        const inside = all.filter(fits)
                        if (all.length) found.push({ b, s, d, inside, all })
                    }
                }
            }
            const option = (x, t, label) => ({
                km: null, city: x.b.city, date: x.d, mode: zone ? 'at_client' : x.s.ways.includes('at_business') ? 'at_business' : 'online', slug: x.b.slug, time: t, label,
                price: x.s.per === 'person' ? x.s.price * people : x.s.price, score: 0.7, people, rating: null, starts: `${x.d}T${t}:00`, minutes: x.s.minutes,
                regular: false, reviews: 0, currency: x.b.currency, kept_pct: null, logo_url: null, reliable: false, verified: false, price_per: x.s.per,
                rebook_pct: null, service_id: x.s.id, business_id: x.b.id, service_name: x.s.name, business_name: x.b.name,
            })
            const options = found.filter((x) => x.inside.length).slice(0, 3).map((x, i) => option(x, x.inside[0], ['best', 'earliest', 'top'][i]))
            const later = options.length ? [] : found.slice(0, 2).map((x) => option(x, x.all[0], 'later'))
            return { dates, later, words: q.split(/\s+/).filter(Boolean), matched: new Set(found.map((x) => x.b.id)).size, options, timezone: TZ }
        },
        wa_my: () => bookings.filter((a) => upcoming(a) && ['pending', 'confirmed'].includes(a.status) && a.payment_status !== 'failed').map(view),
        wa_book: ({ p_business, p_service, p_date, p_time, p_name, p_email, p_mode, p_people, p_address, p_landmark, p_zone }) =>
            book({ business: p_business, service: p_service, date: p_date, time: p_time, name: p_name, email: p_email, mode: p_mode, people: Number(p_people) || 1, address: p_address, landmark: p_landmark, zone: p_zone }),
        wa_recent: () => bookings.filter((a) => !upcoming(a) && a.status !== 'cancelled').map(view),
        wa_tickets: () => tickets.filter((t) => t.status !== 'resolved').map((t) => ({ ticket_id: t.id, number: t.number, subject: t.subject, status: t.status, last_reply: t.replies.at(-1) || null })),
        wa_report: ({ p_category, p_message, p_appointment, p_name, p_email }) => {
            const msg = String(p_message || '').trim()
            if (!['payment', 'safety', 'no_show', 'service', 'bookings', 'account', 'other'].includes(p_category)) throw Object.assign(new Error('Pick what it is about'), { code: '22023' })
            if (msg.length < 10) throw Object.assign(new Error('Tell us a little more, so we can help first time.'), { code: '22023' })
            if (p_appointment) mine(p_appointment)
            const open = p_appointment && tickets.find((t) => t.appointment === p_appointment && t.status !== 'resolved')
            if (open) { open.messages.push(msg); return { ticket_id: open.id, number: open.number, added: true } }
            const t = { id: crypto.randomUUID(), number: 1040 + tickets.length + 1, appointment: p_appointment || null, category: p_category, subject: msg.slice(0, 60), status: 'open', messages: [msg], replies: [], name: p_name, email: p_email }
            tickets.push(t)
            return { ticket_id: t.id, number: t.number, added: false }
        },
        wa_support_reply: ({ p_ticket, p_message }) => {
            const t = tickets.find((x) => x.id === p_ticket)
            if (!t) throw Object.assign(new Error('That ticket is not one of theirs'), { code: '42501' })
            t.messages.push(String(p_message || ''))
            t.status = 'open'
            return { ticket_id: t.id, number: t.number }
        },
        wa_move: ({ p_appointment, p_date, p_time }) => {
            const a = mine(p_appointment), b = biz(a.business_id)
            if (minutesUntil(a) < b.cutoff) throw Object.assign(new Error('It is too late to change this booking online. Contact the business.'), { code: 'P0001' })
            if (!slots(b, svc(b, a.service_id), p_date, a.id, a.people).includes(p_time)) throw Object.assign(new Error('That time is no longer free. Pick another.'), { code: 'P0001' })
            a.date = p_date
            a.time = p_time
            return view(a)
        },
        wa_cancel: ({ p_appointment }) => {
            const a = mine(p_appointment)
            if (a.status === 'cancelled') throw Object.assign(new Error('That booking is already cancelled'), { code: 'P0001' })
            a.status = 'cancelled'
            return view(a)
        },
        wa_set_email: ({ p_appointment, p_email }) => {
            const a = mine(p_appointment)
            const email = String(p_email || '').trim().toLowerCase()
            if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('That email does not look right. Could you type it again?'), { code: '22023' })
            if (!['pending', 'confirmed'].includes(a.status) || !upcoming(a)) throw Object.assign(new Error('That booking is over or cancelled'), { code: 'P0002' })
            a.email = email
            a.emailed = (a.emailed || 0) + 1
            return { ...view(a), email }
        },
    }

    return {
        phone,
        bookings,
        tickets,
        view,
        businesses: BUSINESSES,
        bySlug: (slug) => BUSINESSES.find((b) => b.slug === slug),
        slots: (slug, serviceName, date, people = 1) => { const b = BUSINESSES.find((x) => x.slug === slug); return slots(b, b?.services.find((s) => s.name === serviceName), date, null, people) },
        // A booking made before the conversation, as if from an earlier chat.
        seed: ({ slug, service, date, time, name = 'Client' }) => {
            const b = BUSINESSES.find((x) => x.slug === slug), s = b.services.find((x) => x.name === service)
            const v = book({ business: b.id, service: s.id, date, time, name, status: 'confirmed' })
            bookings.find((a) => a.id === v.id).seeded = true
            return v
        },
        // What the agent may call, by the same names and arguments as the real database functions.
        call: async (fn, args) => {
            if (!fns[fn]) throw Object.assign(new Error(`function ${fn} does not exist`), { code: '42883' })
            return structuredClone(fns[fn](args || {}))
        },
        // What the judge is told the agent could know.
        facts: () => BUSINESSES.filter((b) => !b.demo).map((b) => ({
            name: b.name, slug: b.slug, city: b.city, address: b.address, area: b.area, phone: b.phone, category: b.category, description: b.description,
            confirms_automatically: b.auto, cancel_cutoff_minutes: b.cutoff, staff: b.staff,
            hours: `${Object.entries(b.hours).map(([d, [f, t]]) => `${WEEKDAYS[Number(d)]} ${f}-${t}`).join(', ')}; days not listed are closed`, no_bookings_between: b.busy.map(([f, t]) => `${f}-${t}`).join(', '),
            visit_areas: b.areas || null,
            services: b.services.map((s) => `${s.name}: ${s.minutes} min, ${s.price === 0 ? 'free' : `${b.currency} ${s.price}${s.per === 'person' ? ' per person' : ''}`}, ${s.ways.join('/')}${s.ways.includes('at_client') ? `, travel fee ${b.currency} ${s.travel || 0} for visits at the client's place (areas: ${(b.areas || []).join(', ') || 'none, booked on the business page'})` : ''}, ${b.payOnline && s.price > 0 ? 'paid online when booking' : 'paid at the visit'}${s.max > 1 ? `, up to ${s.max} people served one after another, each adds ${s.minutes} min` : ''}${s.about ? `. ${s.about}` : ''}`),
        })),
    }
}

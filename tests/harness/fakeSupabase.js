import cover from '../fixtures/cover.jpg'

const today = new Date()
const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(today)
const dk = (n) => { const [y, m, d] = key.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` }

export const DATA = {
  businesses: [{ id: 'b1', user_id: 'u1', business_name: 'Femtos Barbearia', slug: 'femtos-barbearia', timezone: 'Europe/Lisbon', is_active: true, launched_at: '2026-09-25T10:00:00Z', city: 'Lisbon', country: 'PT', neighbourhood: 'Arroios', category: 'barbershop', category_detail: null, phone: '+351912345678', whatsapp: '+351912345678', description: 'Classic cuts and hot towel shaves in Arroios.', address: 'Rua Morais Soares 12', logo_url: null, banner_url: cover }],
  business_members: [{ id: 'm1', user_id: 'u1', business_id: 'b1', role: new URLSearchParams(window.location.search).get('staff') === '1' ? 'staff' : 'owner', display_name: 'Miles Farra', status: 'active', is_bookable: true, sort_order: 0 }],
  services: [
    { id: 's1', business_id: 'b1', service_name: 'Haircut', duration_minutes: 30, price: 18, is_active: true, sort_order: 0 },
    { id: 's2', business_id: 'b1', service_name: 'Beard trim', duration_minutes: 20, price: 12, is_active: true, sort_order: 1 },
  ],
  availability: [1, 2, 3, 4, 5, 6].map((d) => ({ id: `a${d}`, business_id: 'b1', staff_id: null, day_of_week: d, start_time: '09:00:00', end_time: '19:00:00' })),
  appointments: [
    { id: 'p1', business_id: 'b1', staff_id: 'm1', service_id: 's1', appointment_date: key, appointment_time: '10:00:00', duration_minutes: 30, status: 'confirmed', source: 'online', client_name: 'Jameson', client_phone: '', client_email: '', notes: '', services: { service_name: 'Haircut', price: 18 } },
    { id: 'p2', business_id: 'b1', staff_id: 'm1', service_id: 's2', appointment_date: key, appointment_time: '15:00:00', duration_minutes: 20, status: 'pending', source: 'online', client_name: 'Rui', client_phone: '', client_email: '', notes: '', services: { service_name: 'Beard trim', price: 12 } },
  ],
  time_blocks: [],
  my_appointments: [],
  profiles: [{ id: 'u1', full_name: 'Miles Farra', email: 'milesfarra@gmail.com' }],
  users: [{ id: 'u1', full_name: 'Miles Farra', email: 'milesfarra@gmail.com' }],
  support_tickets: [],
  inbox: [
    { id: 'i1', user_id: 'u1', audience: 'business', kind: 'booking_new', appointment_id: 'p1', business_id: 'b1', read_at: null, created_at: new Date(Date.now() - 5 * 60000).toISOString(), payload: { client_name: 'Jameson', service_name: 'Haircut', duration_minutes: 30, price: 18, country: 'PT', date: key, time: '10:00' } },
    { id: 'i2', user_id: 'u1', audience: 'business', kind: 'booking_request', appointment_id: 'p2', business_id: 'b1', read_at: null, created_at: new Date(Date.now() - 50 * 60000).toISOString(), payload: { client_name: 'Rui', service_name: 'Beard trim', duration_minutes: 20, price: 12, country: 'PT', date: key, time: '15:00', moved_from: `${key}T11:30` } },
    { id: 'i4', user_id: 'u1', audience: 'client', kind: 'visit_followup', appointment_id: 'c3', business_id: 'b1', read_at: null, created_at: new Date(Date.now() - 20 * 60000).toISOString(), payload: { business_name: 'Femtos Barbearia', service_name: 'Haircut', staff_name: 'Miles Farra', price: 18, country: 'PT', date: dk(-1), time: '10:00', suggested_date: dk(2), gap_days: 28 } },
    { id: 'i3', user_id: 'u1', audience: 'business', kind: 'booking_cancelled', appointment_id: null, business_id: 'b1', read_at: '2026-09-01T10:00:00Z', created_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12).toISOString(), payload: { client_name: 'Ana Maria dos Santos Ferreira', service_name: 'Haircut and beard trim with hot towel', duration_minutes: 75, price: 30, country: 'PT', date: key, time: '17:45', moved_from: `${key}T09:00` } },
  ],
}

// Account deletion: an owner, an owner with clients still to come (?deleteblock=1), or a client (?nobiz=1).
const deletionCheck = () => ({
  businesses: quiet('nobiz') ? [] : [{ id: 'b1', name: 'Femtos Barbearia', upcoming: quiet('deleteblock') ? 3 : 0 }],
  client_upcoming: quiet('nobiz') ? 1 : 0,
  staff_of: [],
})

// What reminders did: ?noreminders=1 for a business before its first reminded visit, ?fewreminders=1 for too few to compare.
const reminderEffect = () => {
  if (quiet('noreminders')) return { reminded: 0, reminded_came: 0, reminded_no_show: 0, reminded_value: 0, other: 0, other_no_show: 0, saved_estimate: null }
  if (quiet('fewreminders')) return { reminded: 4, reminded_came: 4, reminded_no_show: 0, reminded_value: 72, other: 2, other_no_show: 1, saved_estimate: null }
  return { reminded: 24, reminded_came: 22, reminded_no_show: 1, reminded_value: 410, other: 12, other_no_show: 3, saved_estimate: 36 }
}

// Last week's statement, or ?nostatement=1 for a week with no visits.
const weekStatement = (back) => {
  const empty = quiet('nostatement')
  const monday = new Date(today); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7 * (back || 1))
  const key = (d) => new Intl.DateTimeFormat('en-CA').format(d)
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  return { from: key(monday), to: key(sunday), country: 'PT', online: { count: empty ? 0 : 12, value: empty ? 0 : 286.5 }, added: { count: empty ? 0 : 4, value: empty ? 0 : 72 }, fee: empty ? 0 : 10.71, due: 0, beta: true, weeks_back: back || 1, older: (back || 1) < 3 }
}

// A believable Insights answer for any period, or a brand-new business with ?noinsights=1.
const insights = (days) => {
  const quiet = new URLSearchParams(window.location.search).get('noinsights') === '1'
  const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return new Intl.DateTimeFormat('en-CA').format(d) }
  const daily = Array.from({ length: days }, (_, i) => {
    const n = days - 1 - i
    const bookings = quiet ? 0 : [3, 5, 0, 4, 6, 8, 2][n % 7]
    return { day: `${back(n)}T00:00:00`, bookings, earned: bookings * 16 }
  })
  const sum = (k) => daily.reduce((s, d) => s + d[k], 0)
  const period = (scale) => quiet
    ? { earned: 0, earned_count: 0, bookings: 0, no_shows: 0, no_show_value: 0, cancelled_by_client: 0, cancelled_by_business: 0, clients: 0, new_clients: 0, views: 0, starts: 0, times: 0, booked_online: 0, booked_counted: 0 }
    : { earned: Math.round(sum('earned') * scale), earned_count: Math.round(sum('bookings') * scale), bookings: Math.round(sum('bookings') * scale), no_shows: 1, no_show_value: 18, cancelled_by_client: 2, cancelled_by_business: 1, clients: Math.round(sum('bookings') * 0.7), new_clients: Math.round(sum('bookings') * 0.3), views: 60 * days, starts: 14 * days, times: 9 * days, booked_online: 4 * days, booked_counted: 4 * days }
  return {
    days, from: back(days - 1), today: key, country: 'PT', counting_since: quiet ? null : back(days - 1),
    current: period(1), previous: period(0.8),
    ahead: quiet ? { count: 0, value: 0 } : { count: 11, value: 196 },
    daily,
    sources: quiet ? [] : [['instagram', 34], ['whatsapp', 12], ['direct', 8], ['google', 4], ['locappoint', 2]].map(([source, v]) => ({ source, views: v * days })),
    mobile_views: quiet ? 0 : 48 * days,
    hours: { open: 9, close: 19 },
    busiest: quiet ? [] : [[1, 10, 2], [2, 11, 3], [3, 17, 4], [4, 18, 6], [5, 17, 8], [5, 18, 9], [6, 10, 12], [6, 11, 10], [6, 12, 7], [2, 15, 1]].map(([dow, hour, bookings]) => ({ dow, hour, bookings })),
    services: quiet ? [] : [{ name: 'Haircut', bookings: 21, value: 378 }, { name: 'Beard trim', bookings: 9, value: 108 }, { name: 'Haircut and beard trim with hot towel finish', bookings: 4, value: 120 }],
    lead_hours: quiet ? null : 41,
  }
}

// The client side: a regular at Femtos who comes every four weeks, and one place whose service is gone.
const femtos = () => ({ ...DATA.businesses[0], auto_confirm: true, cancel_cutoff_minutes: 0 })
const haircut = { id: 's1', service_name: 'Haircut', duration_minutes: 30, price: 18 }
const trim = { id: 's2', service_name: 'Beard trim', duration_minutes: 20, price: 12 }
const rhythm = () => ({
  visits: 3, last_date: dk(-1), recent: [dk(-57), dk(-29), dk(-1)], gap_days: 28, due_date: dk(10), suggested_date: dk(10), today: key, upcoming: null,
  last: { appointment_id: 'c3', date: dk(-1), service: { ...haircut, active: true }, staff_id: 'm2', staff_name: 'Rita', staff_count: 2, addon_ids: new URLSearchParams(window.location.search).get('extras') === '1' ? ['s2'] : null },
})
const nove = { id: 'b2', business_name: 'Studio Nove', slug: 'studio-nove', timezone: 'Europe/Lisbon', city: 'Porto', country: 'PT', category: 'nails', category_detail: null, logo_url: null, banner_url: null, auto_confirm: false, cancel_cutoff_minutes: 0 }
const past = (id, n, service, status = 'completed', extra = {}) => ({
  id, service_id: service?.id || null, appointment_date: dk(n), appointment_time: '10:00:00', duration_minutes: service?.duration_minutes || 30, status,
  notes: '', price: service?.price ?? 20, cancelled_by: null, rescheduled_from: null, businesses: femtos(), services: service, ...extra,
})
DATA.my_appointments = [
  past('c1', -57, haircut, 'completed', { reviews: [{ id: 'r1', rating: 5, body: 'Best fade I have had in Lisbon.', reply: 'Thank you, see you soon.', replied_at: `${dk(-50)}T10:00:00Z`, created_at: `${dk(-56)}T10:00:00Z`, status: 'published' }] }),
  past('c2', -29, trim, 'no_show'), past('c3', -1, haircut, 'confirmed'),
  past('c5', -40, null, 'completed', { businesses: nove }),
]
// Paid online (?paidbooking=1): one ahead, paid in full; one cancelled late, half the price back.
// ?paidbooking=soon puts the paid one three hours from now, inside the free cancellation window.
const lisbonNow = (() => { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number); return h * 60 + m })()
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`
const PAID_MONEY = { payment_status: 'paid', price: 12, client_fee: 0.49, total: 12.49, currency: 'EUR' }
const paidWhen = () => {
  if (new URLSearchParams(window.location.search).get('paidbooking') !== 'soon') return { appointment_date: dk(3), appointment_time: '11:00:00' }
  const at = Math.min(lisbonNow + 180, 1440 + 600)
  return { appointment_date: at >= 1440 ? dk(1) : key, appointment_time: hhmm(at % 1440) }
}
const PAID_ROWS = () => [
  past('pd1', 3, trim, 'confirmed', { ...PAID_MONEY, ...paidWhen(), receipts: [{ kind: 'payment', number: 'FEM-00012', token: 'r'.repeat(32) }] }),
  past('pd2', -3, trim, 'cancelled', { ...PAID_MONEY, payment_status: 'partly_refunded', cancelled_by: 'client', receipts: [{ kind: 'payment', number: 'FEM-00010', token: 'p'.repeat(32) }, { kind: 'refund', number: 'FEM-00011', token: 'q'.repeat(32) }] }),
]
if (new URLSearchParams(window.location.search).get('paidbooking')) {
  DATA.my_appointments = [...DATA.my_appointments, ...PAID_ROWS()]
  DATA.inbox = [
    { id: 'i6', user_id: 'u1', audience: 'client', kind: 'booking_confirmed', appointment_id: 'pd1', business_id: 'b1', read_at: null, created_at: new Date(Date.now() - 2 * 60000).toISOString(), payload: { business_name: 'Femtos Barbearia', service_name: 'Beard trim', price: 12, country: 'PT', date: dk(3), time: '11:00', payment_status: 'paid', total: 12.49, client_fee: 0.49, currency: 'EUR' } },
    { id: 'i7', user_id: 'u1', audience: 'business', kind: 'booking_cancelled', appointment_id: 'pd2', business_id: 'b1', read_at: null, created_at: new Date(Date.now() - 3 * 60000).toISOString(), payload: { client_name: 'Ana', service_name: 'Beard trim', duration_minutes: 20, price: 12, country: 'PT', date: dk(-3), time: '10:00', payment_status: 'paid', total: 12.49, client_fee: 0.49, currency: 'EUR', refund: 6 } },
    ...DATA.inbox,
  ]
}
const PAID_REFUNDS = { pd2: 6 }

const rebookPlaces = () => (new URLSearchParams(window.location.search).get('noplaces') === '1' ? [] : [
  { business: femtos(), rhythm: rhythm() },
  { business: nove, rhythm: { visits: 1, last_date: dk(-40), recent: [dk(-40)], gap_days: null, due_date: null, suggested_date: null, today: key, upcoming: null, last: { appointment_id: 'c5', date: dk(-40), service: { id: 's9', service_name: 'Gel nails', duration_minutes: 60, price: 30, active: false }, staff_id: null, staff_name: 'Joana', staff_count: 1 } } },
])
// ?guestpaid=1: the manage page of a booking paid online and still ahead; ?guestpaid=refunded: cancelled by the business, all of it back.
const guestPaid = () => {
  const mode = new URLSearchParams(window.location.search).get('guestpaid')
  if (!mode) return {}
  const money = { payment_status: 'paid', price: 18, client_fee: 0.49, total: 18.49, currency: 'EUR', policy: { free_hours: 24, keep_pct: 50 } }
  if (mode === 'refunded') return { ...money, appointment_date: dk(2), status: 'cancelled', cancelled_by: 'business', payment_status: 'refunded', refund: 18.49 }
  return { ...money, appointment_date: dk(3), refund: null }
}
const guestBooking0 = () => ({
  id: 'g1', status: 'confirmed', appointment_date: dk(-1), appointment_time: '10:00:00', duration_minutes: 30, price: 18, notes: '', client_name: 'Ana Guest', client_email: 'ana@guest.pt',
  cancelled_by: null, rescheduled_from: null, service_id: 's1', has_account: false, services: haircut, businesses: femtos(),
})
const guestBooking = () => ({ ...guestBooking0(), ...guestPaid() })
const slots = (staff) => {
  const from = staff === 'm2' ? 14 * 60 : 9 * 60
  const out = []
  for (let m = from; m <= 18 * 60 + 30; m += 15) out.push({ slot_time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`, staff_id: staff || 'm1', staff_name: staff === 'm2' ? 'Rita' : 'Miles Farra' })
  return out
}
const quiet = (flag) => new URLSearchParams(window.location.search).get(flag) === '1'
// Online sessions: ?online=1 offers Haircut in person or online; ?online=only offers it online only.
// ?onlinebooking=1 adds a confirmed online booking with its meeting link to the client's bookings.
{
  const online = new URLSearchParams(window.location.search).get('online')
  if (online) {
    DATA.services[0].modes = online === 'only' ? ['online'] : ['at_business', 'online']
    DATA.businesses[0].meeting_url = 'https://meet.example.com/femtos'
  }
  // ?home=1 offers Haircut at the shop or at the client's place, with a EUR 5 travel fee, in Porto and Matosinhos.
  if (quiet('home')) {
    DATA.services[0].modes = ['at_business', 'at_client']
    DATA.services[0].travel_fee = 5
    DATA.businesses[0].service_zones = ['Porto', 'Matosinhos']
    DATA.businesses[0].market = 'porto'
    DATA.market_zones = ['Porto', 'Vila Nova de Gaia', 'Matosinhos', 'Maia'].map((name, i) => ({ market: 'porto', name, sort_order: i }))
  }
  // ?radius=1: the shop is placed in Porto and the business travels up to 10 km as well as to its areas.
  if (quiet('radius')) Object.assign(DATA.businesses[0], { lat: 41.1496, lng: -8.6109, service_radius_km: 10, place_id: 'ChIJshop00000001' })
  // ?trip=1: a visit at the client's place today in 20 minutes. The client's copy (hm2) has the
  // business on the way, about 12 min; the business's copy (tr1) has not left yet.
  if (quiet('trip')) {
    const soon = hhmm(Math.min(lisbonNow + 20, 1439))
    DATA.my_appointments = [...DATA.my_appointments, past('hm2', 0, haircut, 'confirmed', { mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12', travel_fee: 5, appointment_time: soon })]
    DATA.appointments = [...DATA.appointments, { id: 'tr1', business_id: 'b1', staff_id: 'm1', service_id: 's1', appointment_date: key, appointment_time: soon, duration_minutes: 30, status: 'confirmed', source: 'online', client_name: 'Ana', client_phone: '', client_email: '', notes: '', mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12', travel_fee: 5, services: { service_name: 'Haircut', price: 18 } }]
  }
  if (quiet('homebooking')) DATA.my_appointments = [...DATA.my_appointments, past('hm1', 2, haircut, 'confirmed', { mode: 'at_client', client_zone: 'Matosinhos', client_address: 'Rua das Flores 12', client_landmark: 'Blue door', travel_fee: 5, appointment_time: '18:00:00' })]
  if (quiet('onlinebooking')) DATA.my_appointments = [...DATA.my_appointments, past('on1', 2, haircut, 'confirmed', { mode: 'online', meeting_url: 'https://meet.example.com/femtos', appointment_time: '18:00:00' })]
}
// ?group=1: Haircut takes groups of up to 4, priced per person, each person the full 30 minutes.
if (quiet('group')) Object.assign(DATA.services[0], { max_people: 4, price_per: 'person', extra_person_minutes: null })
if (quiet('demo')) DATA.businesses[0].is_demo = true
// ?opentoday=1: open today as well (the test business is closed on Sundays).
if (quiet('opentoday')) {
  const dow = new Date(`${key}T12:00:00Z`).getUTCDay()
  if (!DATA.availability.some((a) => a.day_of_week === dow)) DATA.availability.push({ id: `a${dow}`, business_id: 'b1', staff_id: null, day_of_week: dow, start_time: '09:00:00', end_time: '19:00:00' })
}
DATA.client_errors = [
  { id: 'e1', message: "TypeError: Cannot read properties of undefined (reading 'map')", stack: "TypeError: Cannot read properties of undefined (reading 'map')\n    at Agenda (Agenda.jsx:40:12)", app: 'app', path: '/portal/calendar', release: 'index-B7x', user_agent: 'Mozilla/5.0 (iPhone)', user_id: 'u1', count: 14, first_seen_at: '2026-09-28T10:00:00Z', last_seen_at: new Date().toISOString() },
  { id: 'e2', message: 'ReferenceError: slot is not defined', stack: 'ReferenceError: slot is not defined\n    at TimeGrid (TimeGrid.jsx:9:3)', app: 'app', path: '/femtos-barbearia', release: 'index-B7x', user_agent: 'Mozilla/5.0 (Android)', user_id: null, count: 2, first_seen_at: '2026-09-29T10:00:00Z', last_seen_at: '2026-09-29T11:00:00Z' },
]
if (quiet('extras')) { DATA.services[0].is_addon = false; DATA.services[1].is_addon = true; DATA.appointments[0].addons = [{ id: 's2', name: 'Beard trim', minutes: 20, price: 12 }] }
if (quiet('blocks')) DATA.time_blocks.push({ id: 'tb1', business_id: 'b1', staff_id: null, starts_at: `${key}T17:00:00`, ends_at: `${key}T18:00:00`, reason: 'Doctor' }, { id: 'tb2', business_id: 'b1', staff_id: null, starts_at: `${dk(9)}T00:00:00`, ends_at: `${dk(11)}T00:00:00`, reason: 'Holiday' })
const REVIEWS = [
  { id: 'rv1', appointment_id: 'p9', rating: 5, body: 'Best fade I have had in Lisbon. On time, and Miles remembered how I like it.', client_name: 'Ana Ferreira', author: 'Ana F.', service: 'Haircut', staff_name: 'Miles Farra', date: dk(-2), time: '10:00', created_at: `${dk(-1)}T09:00:00Z`, reply: null, replied_at: null, hidden: false, reported: false, visit_month: 'September 2026' },
  { id: 'rv2', appointment_id: 'p8', rating: 4, body: null, client_name: 'Jameson Clarke', author: 'Jameson C.', service: 'Beard trim', staff_name: null, date: dk(-9), time: '15:00', created_at: `${dk(-8)}T09:00:00Z`, reply: 'Thanks Jameson, see you next time.', replied_at: `${dk(-7)}T09:00:00Z`, hidden: false, reported: false, visit_month: 'September 2026' },
  { id: 'rv3', appointment_id: 'p7', rating: 1, body: 'Never went there but it looks bad.', client_name: 'Rui Costa', author: 'Rui C.', service: 'Haircut', staff_name: null, date: dk(-12), time: '12:00', created_at: `${dk(-11)}T09:00:00Z`, reply: null, replied_at: null, hidden: false, reported: true, visit_month: 'September 2026' },
]
const summary = (items) => ({ count: items.length, average: items.length ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10 : null, stars: [5, 4, 3, 2, 1].map((n) => items.filter((r) => r.rating === n).length) })
const LADDER = [['joined', 0, 10, 'Joins Locappoint'], ['bookings_1', 1, 20, 'First booking'], ['bookings_10', 10, 30, '10 bookings'], ['bookings_25', 25, 50, '25 bookings'], ['bookings_50', 50, 75, '50 bookings'], ['bookings_100', 100, 100, '100 bookings']].map(([milestone, bookings, points, label]) => ({ milestone, bookings, points, label }))
const INVITED = [
  { business_name: 'Corte Fino', city: 'Lisbon', joined_at: `${dk(-40)}T10:00:00Z`, live: true, bookings: 12, points: 60, reached: ['joined', 'bookings_1', 'bookings_10'] },
  { business_name: 'Studio Unhas Porto', city: 'Porto', joined_at: `${dk(-3)}T10:00:00Z`, live: false, bookings: 0, points: 10, reached: ['joined'] },
]
const CLIENTS = [
  { key: 'p:912345678', name: 'Ana Silva', phone: '+351 912 345 678', email: 'ana@example.pt', visits: 5, no_shows: 1, late_cancels: 0, reliability: 83, spent: 90, first_visit: dk(-150), last_visit: dk(-32), next_at: null, gap_days: 29, due_on: dk(-3), recent: ['came', 'came', 'no_show', 'came', 'came', 'came'], service_id: 's1', staff_id: 'm1', has_note: true },
  { key: 'p:933000111', name: 'Rui Costa', phone: '933000111', email: null, visits: 8, no_shows: 0, late_cancels: 0, reliability: 100, spent: 144, first_visit: dk(-120), last_visit: dk(-10), next_at: `${dk(4)}T11:00:00`, gap_days: 16, due_on: null, recent: Array(8).fill('came'), service_id: 's1', staff_id: 'm1', has_note: false },
  { key: 'e:joao@example.pt', name: 'Joao Pereira', phone: null, email: 'joao@example.pt', visits: 1, no_shows: 2, late_cancels: 1, reliability: 25, spent: 12, first_visit: dk(-60), last_visit: dk(-60), next_at: null, gap_days: null, due_on: null, recent: ['late_cancel', 'no_show', 'no_show', 'came'], service_id: 's2', staff_id: 'm1', has_note: false },
  { key: 'p:966555444', name: 'Marta Nunes', phone: '966555444', email: null, visits: 0, no_shows: 0, late_cancels: 0, reliability: null, spent: 0, first_visit: null, last_visit: null, next_at: `${dk(1)}T09:30:00`, gap_days: null, due_on: null, recent: [], service_id: 's2', staff_id: 'm1', has_note: false },
]
const NOTES = { 'p:912345678': 'Likes a skin fade, number 2 on top.' }
const clientRpc2 = {
  business_clients: () => (quiet('noclients') ? [] : CLIENTS.map((c) => ({ ...c, has_note: Boolean(NOTES[c.key]) }))),
  client_history: (args) => ({
    note: NOTES[args.p_key] ? { body: NOTES[args.p_key], updated_at: `${dk(-5)}T10:00:00Z` } : null,
    visits: [
      { id: 'h1', date: dk(-32), time: '10:00', service: 'Haircut', staff: 'Miles Farra', price: 18, status: 'confirmed', outcome: 'came', source: 'web' },
      { id: 'h2', date: dk(-61), time: '10:30', service: 'Haircut', staff: 'Miles Farra', price: 18, status: 'no_show', outcome: 'no_show', source: 'web' },
      { id: 'h3', date: dk(-90), time: '11:00', service: null, staff: null, price: 18, status: 'completed', outcome: 'came', source: 'manual' },
    ],
  }),
  save_client_note: (args) => { if (args.p_body.trim()) NOTES[args.p_key] = args.p_body.trim(); else delete NOTES[args.p_key]; return null },
}
const TEAM = [
  { id: 'm1', display_name: 'Miles Farra', role: 'owner', is_bookable: true, sort_order: 0, login_email: 'milesfarra@gmail.com', invite_token: null, services: [], upcoming: 4, served_30: 31 },
  { id: 'm2', display_name: 'Ana Costa', role: 'staff', is_bookable: true, sort_order: 1, login_email: null, invite_token: null, services: ['s1'], upcoming: 2, served_30: 12 },
  { id: 'm3', display_name: 'Rui Lopes', role: 'staff', is_bookable: false, sort_order: 2, login_email: 'rui@example.pt', invite_token: null, services: [], upcoming: 0, served_30: 0 },
]
const TOKEN = 'a'.repeat(40)
const teamRpc = {
  team_members: () => (quiet('solo') ? TEAM.slice(0, 1) : TEAM),
  add_team_member: (args) => { const id = `m${TEAM.length + 1}`; TEAM.push({ id, display_name: args.p_name.trim(), role: 'staff', is_bookable: true, sort_order: TEAM.length, login_email: null, invite_token: null, services: [], upcoming: 0, served_30: 0 }); return id },
  update_team_member: (args) => { Object.assign(TEAM.find((m) => m.id === args.p_member_id), { display_name: args.p_name.trim(), is_bookable: args.p_bookable }); return null },
  set_member_services: (args) => { TEAM.find((m) => m.id === args.p_member_id).services = args.p_service_ids; return null },
  member_invite_link: (args) => { TEAM.find((m) => m.id === args.p_member_id).invite_token = TOKEN; return TOKEN },
  remove_team_member: (args) => {
    const m = TEAM.find((x) => x.id === args.p_member_id)
    if (m.upcoming) throw new Error(`${m.display_name} has ${m.upcoming} bookings ahead. Move them to someone else first.`)
    TEAM.splice(TEAM.indexOf(m), 1)
    return null
  },
  team_invite_info: (args) => (args.p_token === TOKEN ? { display_name: 'Ana Costa', business_name: 'Femtos Barbearia', city: 'Lisbon', logo_url: null, owner_name: 'Miles Farra' } : null),
  accept_team_invite: () => 'b1',
}
const referralRpc = {
  my_referrals: () => ({ code: 'ab12cd34', points: quiet('noinvites') ? 0 : 70, ladder: LADDER, invited: quiet('noinvites') ? [] : INVITED }),
  claim_referral: () => false,
}
const reviewRpc = {
  owner_reviews: () => (quiet('noreviews') ? { ...summary([]), waiting: 0, items: [] } : { ...summary(REVIEWS), waiting: REVIEWS.filter((r) => !r.reply).length, items: REVIEWS }),
  public_reviews: (args) => (quiet('noreviews') ? { ...summary([]), items: [] } : { ...summary(REVIEWS), count: 7, items: REVIEWS.slice(0, 2).map(({ client_name, ...r }) => ({ ...r, id: `${r.id}-${args.p_offset || 0}` })) }),
  business_ratings: () => (quiet('noreviews') ? [] : [{ business_id: 'b1', average: 4.7, count: 12 }]),
  review_by_link: () => (quiet('reviewed') ? { can_review: false, can_edit: true, review: { id: 'x', rating: 4, body: 'Good.', reply: null, created_at: new Date().toISOString() } } : { can_review: true, can_edit: false, review: null }),
  submit_review_by_link: (args) => ({ can_review: false, can_edit: true, review: { id: 'new', rating: args.p_rating, body: args.p_body, reply: null, created_at: new Date().toISOString() } }),
  submit_my_review: (args) => ({ can_review: false, can_edit: true, review: { id: 'new', rating: args.p_rating, body: args.p_body, reply: null, created_at: new Date().toISOString() } }),
  reply_to_review: () => null,
  report_review: () => null,
}

const clientRpc = {
  my_rebook: () => rebookPlaces(),
  get_available_slots: (args) => slots(args.p_staff_id),
  booking_by_link: () => guestBooking(),
  rebook_by_link: () => ({ business: femtos(), booking: { service: { ...haircut, active: true }, staff_id: 'm2', staff_name: 'Rita', staff_count: 2, addon_ids: new URLSearchParams(window.location.search).get('extras') === '1' ? ['s2'] : null }, rhythm: rhythm(), client: { name: 'Ana Guest', email: 'ana@guest.pt', phone: '+351911111111' }, emails_stopped: false }),
  stop_emails_by_link: () => true,
  book_appointment: () => 'new-booking',
}

// Admin views (admin.sql). ?adminempty=1 shows a brand-new platform.
const adminEmpty = () => new URLSearchParams(window.location.search).get('adminempty') === '1'
const adminDays = () => Array.from({ length: 30 }, (_, i) => ({ day: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10), bookings: i % 5, signups: i % 3 }))
const ADMIN_BIZ = [
  { id: 'b1', name: 'Femtos Barbearia', slug: 'femtos-barbearia', category: 'barbershop', category_detail: null, city: 'Lisbon', country: 'PT', is_active: true, is_demo: true, created_at: '2026-08-01T10:00:00Z', launched_at: '2026-08-02T10:00:00Z', owner_name: 'Miles Farra', owner_email: 'milesfarra@gmail.com', owner_phone: '+351 912 345 678', has_logo: true, has_description: true, services: 6, has_hours: true, team: 2, bookings: 40, bookings_30d: 12, upcoming: 3, last_booking_at: '2026-09-30T10:00:00Z', rating: 4.8, reviews: 12, owner_last_seen: '2026-09-30T10:00:00Z' },
  { id: 'b2', name: 'Nove Nails', slug: 'nove-nails', category: 'nails', category_detail: null, city: 'Porto', country: 'PT', is_active: true, is_demo: false, created_at: '2026-09-28T10:00:00Z', launched_at: null, owner_name: 'Ines Costa', owner_email: 'ines@nove.pt', owner_phone: null, has_logo: false, has_description: false, services: 2, has_hours: true, team: 1, bookings: 0, bookings_30d: 0, upcoming: 0, last_booking_at: null, rating: null, reviews: 0, owner_last_seen: null },
  { id: 'b3', name: 'Lekki Cuts', slug: 'lekki-cuts', category: 'barbershop', category_detail: null, city: 'Lagos', country: 'NG', is_active: true, is_demo: false, created_at: '2026-09-10T10:00:00Z', launched_at: '2026-09-12T10:00:00Z', owner_name: 'Tunde Bello', owner_email: 'tunde@lekki.ng', owner_phone: '+234 800 000 0000', has_logo: true, has_description: true, services: 4, has_hours: true, team: 3, bookings: 9, bookings_30d: 9, upcoming: 2, last_booking_at: '2026-09-29T10:00:00Z', rating: null, reviews: 0, owner_last_seen: '2026-09-29T10:00:00Z' },
]
const ADMIN_BOOKINGS = Array.from({ length: 63 }, (_, i) => ({
  id: `ab${i}`, business: i % 2 ? 'Lekki Cuts' : 'Femtos Barbearia', slug: 'x', is_demo: i % 2 === 0, service: 'Haircut',
  client_name: i === 0 ? 'Ana Ferreira' : `Client ${i}`, client_email: i === 0 ? 'ana@mail.pt' : `c${i}@mail.com`, has_account: i % 3 === 0,
  date: '2026-10-02', time: '10:30', status: ['confirmed', 'pending', 'completed', 'no_show', 'cancelled'][i % 5], source: i % 4 ? 'web' : 'manual',
  price: i % 2 ? 15000 : 18, currency: i % 2 ? 'NGN' : 'EUR', cancelled_by: i % 5 === 4 ? 'client' : null, created_at: '2026-09-30T10:00:00Z',
}))
const ADMIN_PEOPLE = [
  { id: 'u1', name: 'Miles Farra', email: 'milesfarra@gmail.com', type: 'business', is_admin: true, joined_at: '2026-03-14T10:00:00Z', last_sign_in_at: '2026-09-30T10:00:00Z', providers: ['email', 'google'], business: 'Femtos Barbearia', bookings: 0, app: { platform: 'android', version: '1.0.7', seen_at: '2026-09-30T10:00:00Z' }, push_phones: 1 },
  { id: 'u2', name: 'Ana Ferreira', email: 'ana@mail.pt', type: 'client', is_admin: false, joined_at: '2026-09-20T10:00:00Z', last_sign_in_at: null, providers: ['email'], business: null, bookings: 3, app: null, push_phones: 0 },
]
const page = (rows, a) => {
  const q = (a.p_search || '').toLowerCase()
  const hit = rows.filter((r) => (!q || JSON.stringify(r).toLowerCase().includes(q)) && (!a.p_status || r.status === a.p_status) && (!a.p_type || r.type === a.p_type))
  return { total: hit.length, rows: hit.slice(a.p_offset || 0, (a.p_offset || 0) + (a.p_limit || 50)) }
}
export const adminRpc = {
  admin_overview: () => (adminEmpty() ? {
    businesses: { live: 0, setup: 0, paused: 0, new_7d: 0, by_city: [] },
    bookings: { today: 0, next_7d: 0, waiting: 0, made_7d: 0, made_30d: 0, completed_30d: 0, no_show_30d: 0, cancelled_30d: 0, value_30d: {}, by_source_30d: [] },
    people: { owners: 0, clients: 0, new_7d: 0, new_30d: 0, deleted_30d: 0 },
    apps: { people_30d: [], phones_with_push: {} }, messages_7d: {}, errors_7d: { distinct: 0, times: 0 }, waitlist: 0, daily: adminDays().map((d) => ({ ...d, bookings: 0, signups: 0 })),
  } : {
    businesses: { live: 1, setup: 1, paused: 0, new_7d: 1, by_city: [{ city: 'Lisbon', count: 1 }, { city: 'Porto', count: 1 }, { city: 'Lagos', count: 1 }] },
    bookings: { today: 4, next_7d: 11, waiting: 2, made_7d: 9, made_30d: 31, completed_30d: 18, no_show_30d: 2, cancelled_30d: 3, value_30d: { EUR: 540, NGN: 135000 }, by_source_30d: [{ source: 'web', count: 26 }, { source: 'manual', count: 5 }] },
    people: { owners: 3, clients: 21, new_7d: 4, new_30d: 12, deleted_30d: 1 },
    apps: { people_30d: [{ platform: 'android', version: '1.0.7', people: 5 }, { platform: 'android', version: '1.0.2', people: 1 }], phones_with_push: { android: 4 } },
    messages_7d: { email: { sent: 40, failed: 1 }, push: { sent: 12, skipped: 3 } },
    errors_7d: { distinct: 2, times: 16 }, waitlist: 214, daily: adminDays(),
  }),
  admin_businesses: () => (adminEmpty() ? [] : ADMIN_BIZ),
  admin_bookings: (a) => page(adminEmpty() ? [] : ADMIN_BOOKINGS, a),
  admin_people: (a) => page(adminEmpty() ? [] : ADMIN_PEOPLE, a),
}

export const calls = []
window.__calls = calls

let seq = 0

const builder = (table) => {
  let rows = [...(DATA[table] || [])]
  let mode = 'many'
  let op = 'select'
  let change = null
  let inserted = null
  const api = {
    select(cols) { if (table === 'appointments' && /cancel_cutoff_minutes/.test(cols || '')) rows = new URLSearchParams(window.location.search).get('nobookings') === '1' ? [] : [...DATA.my_appointments]; return api },
    eq(k, v) { rows = rows.filter((r) => !(k in r) || r[k] === v); return api },
    in(k, vals) { rows = rows.filter((r) => vals.includes(r[k])); return api },
    neq() { return api }, gte() { return api }, lte() { return api }, lt() { return api }, gt() { return api },
    is() { return api }, not() { return api }, or() { return api }, order() { return api }, limit() { return api }, range() { return api },
    ilike() { return api }, contains() { return api }, filter() { return api }, match() { return api },
    insert(v) { op = 'insert'; inserted = (Array.isArray(v) ? v : [v]).map((r) => ({ id: `${table}-${++seq}`, ...r })); calls.push(['insert', table, v]); return api },
    update(v) { op = 'update'; calls.push(['update', table, v]); change = v; return api },
    upsert(v) { calls.push(['upsert', table, v]); return api },
    delete() { op = 'delete'; calls.push(['delete', table]); return api },
    single() { mode = 'single'; return api }, maybeSingle() { mode = 'maybe'; return api },
    then(resolve, reject) {
      calls.push(['from', table])
      if (window.__failNext && op !== 'select') { window.__failNext = false; return Promise.resolve({ data: null, error: { code: window.__failCode || '500', message: window.__failMessage || 'fail' } }).then(resolve, reject) }
      if (op === 'insert') {
        DATA[table] = [...(DATA[table] || []), ...inserted]
        rows = inserted
      }
      if (op === 'update') rows.forEach((r) => Object.assign(r, change))
      if (op === 'delete') {
        const gone = new Set(rows.map((r) => r.id))
        calls.push(['deleted', table, [...gone]])
        DATA[table] = DATA[table].filter((r) => !gone.has(r.id))
      }
      const out = rows.map((r) => ({ ...r }))
      const data = mode === 'many' ? out : out[0] || null
      return Promise.resolve({ data, error: null, count: out.length }).then(resolve, reject)
    },
  }
  return api
}

// Payouts server function: ?payoutstate=not_started|pending|waiting|restricted|active|error|paystack|paystack-active
const PAYOUT_ROWS = {
  not_started: { provider: 'stripe', status: 'not_started', details_due: [] },
  pending: { provider: 'stripe', status: 'pending', details_due: ['identity.individual.date_of_birth.day', 'identity.individual.date_of_birth.month', 'identity.individual.address.city', 'identity.individual.phone'] },
  waiting: { provider: 'stripe', status: 'pending', details_due: [] },
  restricted: { provider: 'stripe', status: 'restricted', details_due: ['external_account'] },
  active: { provider: 'stripe', status: 'active', bank_name: 'Millennium BCP', account_last4: '6789', details_due: [] },
  'active-nobank': { provider: 'stripe', status: 'active', details_due: [] },
  paystack: { provider: 'paystack', status: 'not_started', details_due: [] },
  'paystack-active': { provider: 'paystack', status: 'active', bank_name: 'Access Bank', account_last4: '6789', details_due: [] },
}
// Money on the Payments page: ?money=full (Stripe, paid bookings and payouts), ?money=error; empty by default.
const MONEY_EMPTY = { provider: 'stripe', currency: 'EUR', net_exact: true, on_way: { total: 0, days: [] }, month: { paid_out: 0, earned: 0, bookings: 0, refunded: 0 }, payouts: [], payments: [] }
const money = () => {
  const mode = new URLSearchParams(window.location.search).get('money')
  if (mode === 'error') return failed('Stripe test mode: the balance could not load')
  if (mode !== 'full') return { data: MONEY_EMPTY, error: null }
  return { data: {
    ...MONEY_EMPTY,
    on_way: { total: 34.62, days: [{ date: dk(1), amount: 11.38, exact: true }, { date: dk(3), amount: 23.24, exact: false }] },
    month: { paid_out: 46.1, earned: 80.48, bookings: 7, refunded: 6 },
    payouts: [{ id: 'po_2', amount: 11.38, date: dk(1), status: 'on_way' }, { id: 'po_1', amount: 46.1, date: dk(-2), status: 'paid' }],
    payments: [
      { id: 'pay_2', appointment_id: 'p1', paid_at: new Date().toISOString(), client: 'Joseey John', service: 'Barba com toalha quente', date: dk(3), time: '11:00', paid: 12.49, net: 11.38, refunded: 0 },
      { id: 'pay_1', appointment_id: 'p2', paid_at: new Date().toISOString(), client: 'Ana Guest', service: 'Haircut', date: dk(-3), time: '10:00', paid: 18.49, net: null, refunded: 18.49 },
    ],
  }, error: null }
}
const failed = (message) => ({ data: null, error: { context: { json: async () => ({ error: message }) } } })
const payouts = (body) => {
  const state = new URLSearchParams(window.location.search).get('payoutstate') || 'not_started'
  if (state === 'error') return failed('Payouts are not switched on yet')
  const row = { test: true, ...(PAYOUT_ROWS[state] || PAYOUT_ROWS.not_started) }
  if (body.action === 'status') return { data: row, error: null }
  if (body.action === 'start' || body.action === 'manage') return { data: { url: `/?path=${encodeURIComponent('/portal/payments')}&payouts=return&payoutstate=active` }, error: null }
  if (body.action === 'money') return money()
  if (body.action === 'banks') return { data: { banks: [{ code: '044', name: 'Access Bank' }, { code: '058', name: 'GTBank' }] }, error: null }
  if (body.action === 'resolve') return body.account_number === '0123456789' ? { data: { account_name: 'ADEBAYO OLUWASEUN' }, error: null } : failed('We could not find that account. Check the number and the bank.')
  if (body.action === 'connect') return { data: { ...PAYOUT_ROWS['paystack-active'], test: true, account_name: 'ADEBAYO OLUWASEUN' }, error: null }
  return failed('Unknown action')
}

// Pay at booking: ?payquote=online|lagos|error turns online payment on; ?paystate=paid|pending|waiting|released|refunding.
const payParam = (k) => new URLSearchParams(window.location.search).get(k)
const PAY_POLICY = { free_hours: 24, keep_pct: 50, no_show_keep_pct: 50 }
const PAY_REF = `cs_test_${'a'.repeat(24)}`
// Receipts: /r/<token> with ?receipt=refund|missing; payment by default.
const RECEIPT = {
  kind: 'payment', number: 'FEM-00012', client_name: 'Joseey John',
  business: { name: 'Femtos Barbearia', address: 'Rua de Cedofeita 120', city: 'Porto', country: 'PT' },
  booking: { service: 'Barba com toalha quente', staff: 'Miles Farra', date: '2026-10-06', time: '11:00' },
  lines: [{ label: 'Barba com toalha quente', amount: 12 }, { label: 'Locappoint service fee', amount: 0.49 }],
  total: 12.49, currency: 'EUR', method: 'card', refund_of: null, issued_at: '2026-10-03T10:00:00Z', manage_token: 'tok-1234567890abcdef1234567890abcdef',
}
const receiptRpc = (name) => {
  const mode = payParam('receipt')
  if (name === 'receipt_by_token') {
    if (mode === 'missing') return { data: null, error: null }
    if (mode === 'refund') return { data: { ...RECEIPT, kind: 'refund', number: 'FEM-00013', refund_of: 'FEM-00012', lines: [{ label: 'Cancelled after free cancellation closed', amount: 6 }], total: 6 }, error: null }
    return { data: RECEIPT, error: null }
  }
  if (name === 'receipts_by_link') return { data: payParam('guestpaid') ? [{ kind: 'payment', number: 'FEM-00020', token: 's'.repeat(32), total: 18.49, currency: 'EUR' }] : [], error: null }
  return null
}

const payRpc = (name, args) => {
  const receipt = receiptRpc(name)
  if (receipt) return receipt
  if (name === 'booking_money') {
    const policy = { ...PAY_POLICY }
    return { data: (args?.p_ids || []).map((id) => ({ id, refund: PAID_REFUNDS[id] ?? null, policy })), error: null }
  }
  const mode = payParam('payquote')
  if (name === 'payment_quote') {
    if (mode === 'error') return { data: null, error: { message: 'down' } }
    if (mode === 'lagos') return { data: { online: true, provider: 'paystack', currency: 'NGN', price: 15000, client_fee: 300, total: 15300, methods: ['transfer', 'card'], hold_minutes: 35, policy: PAY_POLICY }, error: null }
    if (mode === 'online') return { data: { online: true, provider: 'stripe', currency: 'EUR', price: 25, client_fee: 0.5, total: 25.5, methods: ['card'], hold_minutes: 35, policy: PAY_POLICY }, error: null }
    return { data: { online: false }, error: null }
  }
  if (name === 'book_appointment' && mode && mode !== 'error') return { data: '00000000-0000-4000-8000-0000000000aa', error: null }
  if (name === 'payment_state') {
    const s = payParam('paystate') || 'paid'
    const paid = s === 'paid' || s === 'pending'
    return { data: { state: paid ? 'paid' : s, status: s === 'pending' ? 'pending' : 'confirmed', business_name: 'Femtos Barbearia', slug: 'femtos-barbearia', address: 'Rua de Cedofeita 120', city: 'Porto', auto_confirm: s !== 'pending', service_name: 'Haircut', date: '2026-10-09', time: '10:00', duration_minutes: 30, price: 25, client_fee: 0.5, amount: 25.5, currency: 'EUR', provider: 'stripe', email: paid ? 'ana@guest.pt' : null, manage_token: paid ? 'tok-1234567890abcdef1234567890abcdef' : null }, error: null }
  }
  if (name === 'payment_abandon') return { data: 'released', error: null }
  return null
}
// Address search (?places=1 switches it on): two suggestions, one in Matosinhos (an area, 7.5 km),
// one in Santo Tirso (24 km, not an area).
const PLACES = {
  'ChIJnear00000001': { id: 'ChIJnear00000001', address: 'Rua Brito Capelo 200, 4450-073 Matosinhos', lat: 41.1821, lng: -8.6891, zone: 'Matosinhos', km: 7.5 },
  'ChIJfar000000001': { id: 'ChIJfar000000001', address: 'Rua de Camilo 10, 4780-373 Santo Tirso', lat: 41.3431, lng: -8.4775, zone: null, km: 24.2 },
}
const placesFn = (body) => {
  if (!quiet('places')) return { data: { on: false }, error: null }
  if (body.action === 'ping') return { data: { on: true }, error: null }
  if (body.action === 'suggest') return { data: { on: true, items: [{ id: 'ChIJnear00000001', main: 'Rua Brito Capelo 200', rest: '4450-073 Matosinhos' }, { id: 'ChIJfar000000001', main: 'Rua de Camilo 10', rest: '4780-373 Santo Tirso' }] }, error: null }
  const b = DATA.businesses[0]
  const p = PLACES[body.place_id]
  if (body.action === 'place' && p) {
    const radius = b.lat != null ? Number(b.service_radius_km) || null : null
    return { data: { on: true, place: { ...p, km: radius ? p.km : null, in_zone: Boolean(p.zone && (b.service_zones || []).includes(p.zone)), in_reach: Boolean(radius && p.km <= radius) } }, error: null }
  }
  if (body.action === 'shop' && p) return { data: { on: true, shop: { address: p.address, lat: p.lat, lng: p.lng } }, error: null }
  return { data: { error: 'Unknown action' }, error: null }
}
// "What do you need?": three options for any words, a later time when asked for 21:00, nothing for "nothing".
const openDay = () => { const d = new Date(`${dk(1)}T12:00:00Z`).getUTCDay(); return d === 0 ? dk(2) : dk(1) }
const engineOption = (label, i, extra = {}) => ({ business_id: `b${i}`, business_name: ['Femtos Barbearia', 'Nove Unhas', 'Barba Rija'][i - 1], slug: 'femtos-barbearia', city: 'Porto', service_id: 's1', service_name: 'Haircut', people: 1, price: 18, price_per: 'booking', currency: 'EUR', mode: 'at_business', date: openDay(), time: ['10:00', '09:30', '11:00'][i - 1], km: i === 3 ? 1.2 : null, rating: i === 3 ? 4.8 : null, reviews: i === 3 ? 12 : 0, rebook_pct: i === 1 ? 70 : null, regular: false, label, ...extra })
const engineRpc = (name, args) => {
  if (name === 'engine_popular') return { data: [{ category: 'barbershop', businesses: 2 }, { category: 'nails', businesses: 1 }], error: null }
  if (name !== 'engine_match') return null
  if (/nothing/.test(args.p_query || '')) return { data: { options: [], later: [], matched: 0, words: ['nothing'] }, error: null }
  if (args.p_at === '21:00') return { data: { options: [], later: [engineOption('later', 1, { time: '18:30' })], matched: 1 }, error: null }
  return { data: { options: [engineOption('best', 1, { people: args.p_people, service_name: 'Haircut', reliable: true, kept_pct: 98 }), engineOption('earliest', 2), engineOption('closest', 3)], later: [], matched: 3 }, error: null }
}

// Live trips: minutes only, kept per booking for the page's lifetime.
const clockIn = (min) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(Date.now() + min * 60000))
const onWay = (minutes, guess = false) => ({ status: 'on_way', started_at: new Date(Date.now() - 3 * 60000).toISOString(), eta_at: new Date(Date.now() + minutes * 60000).toISOString(), eta_time: clockIn(minutes), minutes, late_minutes: 0, guess, by: 'Miles Farra', steps: { on_way: new Date(Date.now() - 3 * 60000).toISOString() } })
const TRIPS = quiet('trip') ? { hm2: onWay(12) } : {}
// Support: two tickets for whoever asks, and the admin queue with one ticket open in full.
const sAgo = (mins) => new Date(Date.now() - mins * 60000).toISOString()
const SUPPORT_ROWS = () => [
  { id: 'st1', number: 1042, subject: 'Haircut at Femtos Barbearia, 4 Oct', category: 'payment', status: 'waiting', side: 'client', created_at: sAgo(300), last_message_at: sAgo(120), unread: true, from_us: false, booking: { id: 'a1', business_name: 'Femtos Barbearia', service_name: 'Haircut', date: '2026-10-04', time: '15:00', status: 'completed' } },
  { id: 'st2', number: 1031, subject: 'Clients cannot see Saturday', category: 'bookings', status: 'resolved', side: 'business', created_at: sAgo(5000), last_message_at: sAgo(4000), unread: false, from_us: false, booking: null },
]
const SUPPORT_THREAD = [
  { id: 'sm1', from: 'you', mine: true, body: 'I was charged twice for this visit.', at: sAgo(300) },
  { id: 'sm2', from: 'support', mine: false, body: 'We checked: one charge and one hold that drops in 3 days.', at: sAgo(120) },
]
const ADMIN_TICKET = {
  ticket: { id: 'st1', number: 1042, subject: 'Haircut at Femtos Barbearia, 4 Oct', category: 'payment', priority: 1, status: 'open', side: 'client', outcome: null, created_at: sAgo(300), parent_id: null, children: [] },
  reporter: { name: 'Ana Silva', email: 'ana@x.pt', has_account: true, tickets: 1, upheld: 0, not_upheld: 0 },
  messages: [{ id: 'sm1', role: 'user', body: 'I was charged twice for this visit.', at: sAgo(300), author: 'Ana Silva' }, { id: 'sm3', role: 'note', body: 'Stripe shows one capture.', at: sAgo(200), author: 'Miles Farra' }],
  booking: { id: 'a1', date: '2026-10-04', time: '15:00', status: 'completed', service: 'Haircut', staff: 'Rui', mode: 'at_business', people: 1, client_name: 'Ana Silva', client_email: 'ana@x.pt', has_account: true, price: 18, currency: 'EUR', payment_status: 'paid', created_at: sAgo(5000), started: true, report_open: true },
  payment: { provider: 'stripe', method: 'card', amount: 18.49, currency: 'EUR', refunded: 0, pending_refunds: 0, refunds: [] },
  business: { id: 'b1', name: 'Femtos Barbearia', slug: 'femtos', is_active: true, suspended_at: null, owner_email: 'rui@femtos.pt', bookings_90d: 212, cancelled_by_business_90d: 3, no_shows_marked_90d: 5, reports_against: 1, upheld_against: 0, warnings: 0 },
  client: { has_account: true, bookings: 7, no_shows: 0, late_cancels: 1, warnings: 0 },
  actions: [],
}
const supportRpc = (name, args) => {
  const sp = new URLSearchParams(location.search)
  if (name === 'my_tickets') return { data: sp.has('notickets') ? { rows: [], unread: 0 } : { rows: SUPPORT_ROWS().filter((r) => r.side === args.p_side), unread: args.p_side === 'client' ? 1 : 0 }, error: null }
  if (['my_ticket', 'reply_ticket', 'close_ticket'].includes(name)) return { data: { ...SUPPORT_ROWS().find((r) => r.id === args.p_id), unread: false, can_reply: true, status: name === 'close_ticket' ? 'resolved' : 'waiting', messages: SUPPORT_THREAD }, error: null }
  if (name === 'open_ticket' || name === 'report_by_link') return { data: { id: 'st9', number: 1050, added: false }, error: null }
  if (name === 'tickets_by_link') return { data: { can_report: true, rows: [] }, error: null }
  if (name === 'my_business_suspension') return { data: sp.has('paused') ? { since: sAgo(60), reason: 'Two reports of charging outside Locappoint this week.' } : null, error: null }
  if (name === 'admin_tickets') return { data: { total: 2, counts: { open: 2, urgent: 1, waiting: 0, resolved: 4 }, rows: [
    { id: 'st1', number: 1042, subject: 'Haircut at Femtos Barbearia, 4 Oct', category: 'payment', priority: 1, status: 'open', side: 'client', who: 'Ana Silva', email: 'ana@x.pt', guest: false, business_name: 'Femtos Barbearia', has_booking: true, last_from: 'user', last_message_at: sAgo(40), created_at: sAgo(300) },
    { id: 'st3', number: 1040, subject: 'Clients cannot see Saturday', category: 'bookings', priority: 3, status: 'open', side: 'business', who: 'Rui Costa', email: 'rui@femtos.pt', guest: false, business_name: 'Femtos Barbearia', has_booking: false, last_from: 'user', last_message_at: sAgo(900), created_at: sAgo(1000) },
  ] }, error: null }
  if (/^admin_(ticket|reply|update_ticket|refund|set_visit|warn|suspend|unsuspend|ask_other)$/.test(name)) return { data: ADMIN_TICKET, error: null }
  return null
}

// Blocks: one client blocked by Femtos, one block waiting for review in admin. ?blockedme=1 makes a
// client's booking fail the way a blocked client's does; ?phoned=1 gives Jameson a phone to block by.
if (new URLSearchParams(window.location.search).get('phoned') === '1') DATA.appointments[0].client_phone = '+351 912 000 222'
const BLOCKS = () => [{ id: 'bk1', name: 'Rui Costa', email: 'rui@x.pt', phone: '912000111', has_account: true, reason: 'no_shows', note: 'Three no-shows since August', status: 'active', review: 'pending', review_note: null, lifted_by: null, created_at: new Date(Date.now() - 86400000).toISOString() }]
const ADMIN_BLOCKS = () => ({ total: 1, counts: { pending: 1, kept: 2, lifted: 1 }, rows: [{ id: 'bk1', business_id: 'b1', business_name: 'Femtos Barbearia', slug: 'femtos-barbearia', name: 'Rui Costa', email: 'rui@x.pt', phone: '912000111', has_account: true, reason: 'no_shows', note: 'Three no-shows since August', status: 'active', review: 'pending', review_note: null, created_at: new Date(Date.now() - 86400000).toISOString(), ticket_id: null, flag: { recent: 4, active: 4, clients: 40, share: 10, flagged: true }, client: { bookings: 5, no_shows: 3, late_cancels: 0, cancelled: 1, blocked_elsewhere: 0 } }] })
const blockRpc = (name, args) => {
  if (name === 'book_appointment' && new URLSearchParams(window.location.search).get('blockedme') === '1') return { data: null, error: { code: 'P0001', hint: 'not_taking_you', message: 'This business is not taking online bookings from you. Contact them directly.' } }
  if (name === 'my_blocks' || name === 'unblock_client') return { data: name === 'unblock_client' ? BLOCKS().map((b) => ({ ...b, status: 'lifted', lifted_by: 'business' })) : BLOCKS(), error: null }
  if (name === 'block_client') return { data: BLOCKS(), error: null }
  if (name === 'booking_block') return { data: null, error: null }
  if (name === 'admin_blocks' || name === 'admin_review_block') return { data: ADMIN_BLOCKS(), error: null }
  if (name === 'admin_business_blocks') return { data: { recent: 4, active: 4, clients: 40, share: 10, flagged: true }, error: null }
  return null
}

// Reliability: Femtos holds the badge at 96. ?rel=new is a business under 10 bookings, ?rel=risk one under 85.
const relMode = () => new URLSearchParams(window.location.search).get('rel') || ''
const REL_CHECKS = { score: true, completed: true, email: true, phone: true, safety: true, active: true }
const MY_REL = () => {
  if (relMode() === 'new') return { score: 100, shown: false, bookings: 6, completed: 4, kept_pct: 100, parts: { kept: 40, showed: 25, answers: 20, clean: 15 }, counts: { cancels: 0, late_cancels: 0, excused: 0, no_shows: 0, requests: 0, late_requests: 0, reports: 0, safety: 0 }, checks: { ...REL_CHECKS, score: false, completed: false }, items: [], badge: false, weeks: [], removed: false }
  const risk = relMode() === 'risk'
  return {
    score: risk ? 82 : 96, shown: true, bookings: 48, completed: 41, kept_pct: risk ? 92 : 98,
    parts: { kept: risk ? 26.7 : 36.7, showed: 25, answers: risk ? 15.3 : 19.3, clean: 15 },
    counts: { cancels: risk ? 3 : 1, late_cancels: risk ? 1 : 0, excused: 1, no_shows: 0, requests: 14, late_requests: risk ? 2 : 1, reports: 0, safety: 0 },
    checks: risk ? { ...REL_CHECKS, score: false } : REL_CHECKS,
    items: [
      { kind: 'cancel', appointment_id: 'p1', date: dk(-10), time: '15:00', client_name: 'Jameson Clarke', at: new Date(Date.now() - 12 * 86400000).toISOString(), points: 3.3 },
      { kind: 'late_request', appointment_id: 'p2', date: dk(-4), time: '11:00', client_name: 'Ana Silva', at: new Date(Date.now() - 5 * 86400000).toISOString(), waited_hours: 19, points: 2.9 },
    ],
    badge: true, badge_since: '2026-08-20T03:33:00Z', below_since: risk ? new Date(Date.now() - 2 * 86400000).toISOString() : null, removed: false, removed_note: null,
    weeks: [88, 90, 93, 95, 94, 96, 97, risk ? 82 : 96].map((score, i) => ({ week: dk(-7 * (8 - i)), score, badge: score >= 90 })),
  }
}
const ADMIN_REL = () => ({ total: 2, counts: { all: 2, badge: 1, warned: 0, removed: 0, new: 1 }, rows: [
  { business_id: 'b1', business_name: 'Femtos Barbearia', slug: 'femtos-barbearia', city: 'Lisbon', score: 96, shown: true, bookings: 48, completed: 41, kept_pct: 98, parts: { kept: 36.7, showed: 25, answers: 19.3, clean: 15 }, counts: MY_REL().counts, badge: true, badge_since: '2026-08-20T03:33:00Z', below_since: null, warned_at: null, removed_at: null, removed_note: null, computed_at: new Date(Date.now() - 3600000).toISOString() },
  { business_id: 'b2', business_name: 'Nove Unhas', slug: 'nove-unhas', city: 'Porto', score: 100, shown: false, bookings: 4, completed: 3, kept_pct: null, parts: { kept: 40, showed: 25, answers: 20, clean: 15 }, counts: {}, badge: false, badge_since: null, below_since: null, warned_at: null, removed_at: null, removed_note: null, computed_at: new Date(Date.now() - 3600000).toISOString() },
] })
// Verified: ?ver=sent has the ID done and the video in, ?ver=gold is verified, ?ver=nobiz has no address.
const verMode = () => new URLSearchParams(window.location.search).get('ver') || ''
const MY_VER = () => {
  const m = verMode()
  const idDone = m === 'sent' || m === 'gold'
  return {
    status: m === 'gold' ? 'approved' : m === 'sent' ? 'submitted' : 'none', gold: m === 'gold',
    identity: { status: idDone ? 'verified' : 'none', attempts: idDone ? 1 : 0, left: idDone ? 2 : 3, error: null, at: idDone ? '2026-10-06T10:00:00Z' : null },
    place: { kind: m === 'sent' ? 'video' : null, video: m === 'sent', video_at: m === 'sent' ? '2026-10-06T10:05:00Z' : null, call_at: null, has_address: m !== 'nobiz', address: m === 'nobiz' ? null : 'Rua Morais Soares 12' },
    verified_until: m === 'gold' ? '2027-10-06T10:00:00Z' : null, removed: false, paused: false,
  }
}
const ADMIN_VER = () => ({ total: 1, counts: { submitted: 1, approved: 0, rejected: 0, expired: 0, started: 2, all: 3 }, rows: [{ ...MY_VER(), status: 'submitted', identity: { status: 'verified', attempts: 1, left: 2 }, place: { kind: 'video', video: true, address: 'Rua Morais Soares 12' }, business_id: 'b1', business_name: 'Femtos Barbearia', city: 'Lisbon', phone: '+351912345678', owner_email: 'milesfarra@gmail.com', video_path: 'b1/1.mp4', reliable: true, score: 96, submitted_at: new Date(Date.now() - 7200000).toISOString() }] })
const verRpc = (name) => {
  if (name === 'my_verification') return { data: MY_VER(), error: null }
  if (name === 'submit_verification_place') return { data: { ...MY_VER(), place: { ...MY_VER().place, kind: 'video', video: true, video_at: new Date().toISOString() } }, error: null }
  if (name === 'admin_verifications') return { data: ADMIN_VER(), error: null }
  if (name === 'admin_review_verification' || name === 'admin_gold') return { data: { ...MY_VER(), delete_path: 'b1/1.mp4' }, error: null }
  return null
}

const relRpc = (name) => {
  if (name === 'my_reliability') return { data: MY_REL(), error: null }
  if (name === 'business_trust') return { data: relMode() === 'none' ? [] : [{ business_id: 'b1', reliable: true, kept_pct: 98, verified: true }], error: null }
  if (name === 'admin_reliability') return { data: ADMIN_REL(), error: null }
  if (['admin_reliability_business', 'admin_badge', 'admin_excuse_cancellation'].includes(name)) return { data: { ...MY_REL(), removed_at: null, excused: [] }, error: null }
  return null
}

const tripRpc = (name, args) => {
  if (name === 'my_trips') return { data: (args?.p_ids || []).filter((id) => TRIPS[id]).map((id) => ({ appointment_id: id, trip: TRIPS[id] })), error: null }
  if (name === 'trip_by_link') return { data: null, error: null }
  return null
}
const tripFn = (body) => {
  const id = body.appointment_id
  if (body.action === 'start') {
    if (body.lat === undefined && !body.minutes) return { data: { need_minutes: true }, error: null }
    TRIPS[id] = onWay(body.minutes || 14, Boolean(body.minutes))
    return { data: { trip: TRIPS[id] }, error: null }
  }
  if (body.action === 'arrive' && TRIPS[id]) {
    TRIPS[id] = { ...TRIPS[id], status: 'arrived', ended_at: new Date().toISOString(), minutes: null, steps: { ...TRIPS[id].steps, arrived: new Date().toISOString() } }
    return { data: { trip: TRIPS[id] }, error: null }
  }
  if (body.action === 'stop') { delete TRIPS[id]; return { data: { trip: null }, error: null } }
  return { data: { trip: TRIPS[id] || null }, error: null }
}
const checkoutFn = (body) => (body.action === 'start' && body.appointment_id
  ? { data: { url: `/?path=${encodeURIComponent('/pay/return')}&ref=${PAY_REF}&paystate=paid`, ref: PAY_REF, test: true }, error: null }
  : failed('Unknown action'))

export const supabase = {
  functions: { invoke: async (name, { body } = {}) => { calls.push(['fn', name, body]); if (name === 'checkout') return checkoutFn(body || {}); if (name === 'places') return placesFn(body || {}); if (name === 'trip') return tripFn(body || {}); if (name === 'verify') return { data: body?.action === 'start' ? { url: '#stripe-identity' } : MY_VER(), error: null }; return name === 'payouts' ? payouts(body || {}) : { data: null, error: null } } },
  from: builder,
  rpc: async (name, args) => { calls.push(['rpc', name, args]); const tripping = tripRpc(name, args); if (tripping) return tripping; const relying = relRpc(name); if (relying) return relying; const verifying = verRpc(name); if (verifying) return verifying; const supporting = supportRpc(name, args); if (supporting) return supporting; const blocking = blockRpc(name, args); if (blocking) return blocking; const matching = engineRpc(name, args); if (matching) return matching; const paying = payRpc(name, args); if (paying) return paying; if (name === 'slug_status') return { data: args.p_slug === 'taken-one' ? 'taken' : 'available', error: null }; if (name === 'business_insights') return { data: insights(args.p_days), error: null }; if (name === 'reminder_effect') return { data: reminderEffect(), error: null }; if (name === 'week_statement') return { data: weekStatement(args.p_weeks_back), error: null }; if (name === 'account_deletion_check') return { data: deletionCheck(), error: null }; if (name === 'delete_my_account') return { data: null, error: null }; if (adminRpc[name]) return { data: adminRpc[name](args || {}), error: null }; if (clientRpc[name]) return { data: clientRpc[name](args), error: null }; if (reviewRpc[name]) return { data: reviewRpc[name](args), error: null }; if (referralRpc[name]) return { data: referralRpc[name](args), error: null }; if (clientRpc2[name]) return { data: clientRpc2[name](args), error: null }; if (teamRpc[name]) { try { return { data: teamRpc[name](args), error: null } } catch (e) { return { data: null, error: { code: 'P0001', message: e.message } } } } return { data: null, error: null } },
  storage: { from: () => ({ getPublicUrl: (path) => ({ data: { publicUrl: `/brand/loca-app-icon.svg?${path}` } }), upload: async (path) => { calls.push(['upload', path]); return { data: {}, error: null } }, remove: async (paths) => { calls.push(['remove', paths]); return { error: null } }, createSignedUrl: async (path) => ({ data: { signedUrl: `/brand/loca-app-icon.svg?${path}` }, error: null }) }) },
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: { id: 'u1', email: 'milesfarra@gmail.com' } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async (opts) => { calls.push(['signOut', opts]); return { error: null } },
    signInWithPassword: async ({ password }) => { calls.push(['signIn']); return password === 'right-password' ? { data: {}, error: null } : { data: null, error: { message: 'Invalid login credentials' } } },
    updateUser: async (v) => { calls.push(['updateUser', v]); return { data: {}, error: null } },
  },
  channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c },
  removeChannel() {},
}
export default supabase

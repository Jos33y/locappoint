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

// What reminders did: ?noreminders=1 for a business before its first reminded visit, ?fewreminders=1 for too few to compare.
const reminderEffect = () => {
  if (quiet('noreminders')) return { reminded: 0, reminded_came: 0, reminded_no_show: 0, reminded_value: 0, other: 0, other_no_show: 0, saved_estimate: null }
  if (quiet('fewreminders')) return { reminded: 4, reminded_came: 4, reminded_no_show: 0, reminded_value: 72, other: 2, other_no_show: 1, saved_estimate: null }
  return { reminded: 24, reminded_came: 22, reminded_no_show: 1, reminded_value: 410, other: 12, other_no_show: 3, saved_estimate: 36 }
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
const rebookPlaces = () => (new URLSearchParams(window.location.search).get('noplaces') === '1' ? [] : [
  { business: femtos(), rhythm: rhythm() },
  { business: nove, rhythm: { visits: 1, last_date: dk(-40), recent: [dk(-40)], gap_days: null, due_date: null, suggested_date: null, today: key, upcoming: null, last: { appointment_id: 'c5', date: dk(-40), service: { id: 's9', service_name: 'Gel nails', duration_minutes: 60, price: 30, active: false }, staff_id: null, staff_name: 'Joana', staff_count: 1 } } },
])
const guestBooking = () => ({
  id: 'g1', status: 'confirmed', appointment_date: dk(-1), appointment_time: '10:00:00', duration_minutes: 30, price: 18, notes: '', client_name: 'Ana Guest', client_email: 'ana@guest.pt',
  cancelled_by: null, rescheduled_from: null, service_id: 's1', has_account: false, services: haircut, businesses: femtos(),
})
const slots = (staff) => {
  const from = staff === 'm2' ? 14 * 60 : 9 * 60
  const out = []
  for (let m = from; m <= 18 * 60 + 30; m += 15) out.push({ slot_time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`, staff_id: staff || 'm1', staff_name: staff === 'm2' ? 'Rita' : 'Miles Farra' })
  return out
}
const quiet = (flag) => new URLSearchParams(window.location.search).get(flag) === '1'
if (quiet('demo')) DATA.businesses[0].is_demo = true
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

export const supabase = {
  from: builder,
  rpc: async (name, args) => { calls.push(['rpc', name, args]); if (name === 'slug_status') return { data: args.p_slug === 'taken-one' ? 'taken' : 'available', error: null }; if (name === 'business_insights') return { data: insights(args.p_days), error: null }; if (name === 'reminder_effect') return { data: reminderEffect(), error: null }; if (clientRpc[name]) return { data: clientRpc[name](args), error: null }; if (reviewRpc[name]) return { data: reviewRpc[name](args), error: null }; if (referralRpc[name]) return { data: referralRpc[name](args), error: null }; if (clientRpc2[name]) return { data: clientRpc2[name](args), error: null }; if (teamRpc[name]) { try { return { data: teamRpc[name](args), error: null } } catch (e) { return { data: null, error: { code: 'P0001', message: e.message } } } } return { data: null, error: null } },
  storage: { from: () => ({ getPublicUrl: (path) => ({ data: { publicUrl: `/brand/loca-app-icon.svg?${path}` } }), upload: async (path) => { calls.push(['upload', path]); return { data: {}, error: null } }, remove: async () => ({ error: null }) }) },
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

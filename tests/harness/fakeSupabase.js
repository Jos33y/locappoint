import cover from '../fixtures/cover.jpg'

const today = new Date()
const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(today)
const dk = (n) => { const [y, m, d] = key.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` }

export const DATA = {
  businesses: [{ id: 'b1', user_id: 'u1', business_name: 'Femtos Barbearia', slug: 'femtos-barbearia', timezone: 'Europe/Lisbon', is_active: true, launched_at: '2026-09-25T10:00:00Z', city: 'Lisbon', country: 'PT', neighbourhood: 'Arroios', category: 'barbershop', category_detail: null, phone: '+351912345678', whatsapp: '+351912345678', description: 'Classic cuts and hot towel shaves in Arroios.', address: 'Rua Morais Soares 12', logo_url: null, banner_url: cover }],
  business_members: [{ id: 'm1', user_id: 'u1', business_id: 'b1', role: 'owner', display_name: 'Miles Farra', status: 'active', is_bookable: true, sort_order: 0 }],
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
  last: { appointment_id: 'c3', date: dk(-1), service: { ...haircut, active: true }, staff_id: 'm2', staff_name: 'Rita', staff_count: 2 },
})
const nove = { id: 'b2', business_name: 'Studio Nove', slug: 'studio-nove', timezone: 'Europe/Lisbon', city: 'Porto', country: 'PT', category: 'nails', category_detail: null, logo_url: null, banner_url: null, auto_confirm: false, cancel_cutoff_minutes: 0 }
const past = (id, n, service, status = 'completed', extra = {}) => ({
  id, service_id: service?.id || null, appointment_date: dk(n), appointment_time: '10:00:00', duration_minutes: service?.duration_minutes || 30, status,
  notes: '', price: service?.price ?? 20, cancelled_by: null, rescheduled_from: null, businesses: femtos(), services: service, ...extra,
})
DATA.my_appointments = [
  past('c1', -57, haircut), past('c2', -29, trim, 'no_show'), past('c3', -1, haircut, 'confirmed'),
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
const clientRpc = {
  my_rebook: () => rebookPlaces(),
  get_available_slots: (args) => slots(args.p_staff_id),
  booking_by_link: () => guestBooking(),
  rebook_by_link: () => ({ business: femtos(), booking: { service: { ...haircut, active: true }, staff_id: 'm2', staff_name: 'Rita', staff_count: 2 }, rhythm: rhythm(), client: { name: 'Ana Guest', email: 'ana@guest.pt', phone: '+351911111111' }, emails_stopped: false }),
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
    select(cols) { if (table === 'appointments' && /cancel_cutoff_minutes/.test(cols || '')) rows = [...DATA.my_appointments]; return api },
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
  rpc: async (name, args) => { calls.push(['rpc', name, args]); if (name === 'slug_status') return { data: args.p_slug === 'taken-one' ? 'taken' : 'available', error: null }; if (name === 'business_insights') return { data: insights(args.p_days), error: null }; if (clientRpc[name]) return { data: clientRpc[name](args), error: null }; return { data: null, error: null } },
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

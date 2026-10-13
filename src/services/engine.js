import { supabase } from '../config/supabase'
import { zonedNow } from './business'
import { parseDateKey, toDateKey } from './dates'
import { CATEGORIES } from '../constants/categories'
import { keptLine } from './reliability'

// "What do you need?": one request, matched in the database (engine_match) against every live
// business in the city. The same function serves the site, the app and, later, WhatsApp.

// Porto and Lagos are live; Lisbon is open to sign-ups.
export const MARKETS = [
    { code: 'porto', name: 'Porto', country: 'Portugal', timeZone: 'Europe/Lisbon', currency: 'EUR', live: true, street: 'Rua de Santa Catarina 120' },
    { code: 'lagos', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos', currency: 'NGN', live: true, street: '12 Admiralty Way, Lekki' },
    { code: 'lisbon', name: 'Lisbon', country: 'Portugal', timeZone: 'Europe/Lisbon', currency: 'EUR', live: false, street: 'Rua Augusta 100' },
]

// The city a visitor sees: the one they picked, remembered on this device, or on a first visit the
// one their phone's clock is set to (Lagos for Africa/Lagos, otherwise Porto). Every screen that
// shows places follows it, and changing it anywhere changes it everywhere.
const CITY = 'lc.city'
const CITY_EVENT = 'lc:city'
const known = (code) => MARKETS.some((m) => m.code === code)
export const defaultCity = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Africa/Lagos' ? 'lagos' : 'porto'
    } catch {
        return 'porto'
    }
}
export const savedCity = () => {
    try {
        const code = localStorage.getItem(CITY)
        return known(code) ? code : defaultCity()
    } catch {
        return defaultCity()
    }
}
export const saveCity = (code) => {
    if (!known(code)) return
    try { localStorage.setItem(CITY, code) } catch { /* private mode: asked again next time */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CITY_EVENT, { detail: code }))
}
// Calls back when the city changes in this tab or another one.
export const onCityChange = (callback) => {
    if (typeof window === 'undefined') return () => {}
    const here = (e) => callback(e.detail)
    const elsewhere = (e) => { if (e.key === CITY) callback(savedCity()) }
    window.addEventListener(CITY_EVENT, here)
    window.addEventListener('storage', elsewhere)
    return () => {
        window.removeEventListener(CITY_EVENT, here)
        window.removeEventListener('storage', elsewhere)
    }
}

export const marketOf = (code) => MARKETS.find((m) => m.code === code) || MARKETS[0]

const addDays = (key, n) => {
    const d = parseDateKey(key)
    d.setDate(d.getDate() + n)
    return toDateKey(d)
}

// The days asked for, in the city's own calendar.
export const daysFor = (when, timeZone) => {
    const today = zonedNow(timeZone).dateKey
    if (when === 'tomorrow') return [addDays(today, 1)]
    if (when === 'soon') return [today, addDays(today, 1), addDays(today, 2)]
    return [today]
}

export const WHEN = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'soon', label: 'Next 3 days' },
]

// Any time, a part of the day, or around an hour ("at:15").
export const TIMES = [
    { value: 'any', label: 'Any time' },
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' },
    ...Array.from({ length: 14 }, (_, i) => i + 8).map((h) => ({ value: `at:${h}`, label: `Around ${String(h).padStart(2, '0')}:00` })),
]

export const WHERE = [
    { value: '', label: 'Anywhere' },
    { value: 'at_business', label: 'At their place' },
    { value: 'at_client', label: 'At my place' },
    { value: 'online', label: 'Online' },
]

export const findMatches = async ({ market, text, mode = '', when = 'today', time = 'any', people = 1, place = null, zone = '' }) => {
    const m = marketOf(market)
    const at = time.startsWith('at:') ? `${String(time.slice(3)).padStart(2, '0')}:00` : null
    const { data, error } = await supabase.rpc('engine_match', {
        p_market: m.code,
        p_query: text,
        p_mode: mode || null,
        p_dates: daysFor(when, m.timeZone),
        p_window: at ? 'any' : time,
        p_at: at,
        p_people: people,
        p_lat: place?.lat ?? null,
        p_lng: place?.lng ?? null,
        p_zone: place?.zone || zone || null,
    })
    if (error) throw error
    return data
}

// The chips under the box: the categories with the most live businesses in the city.
export const loadPopular = async (market) => {
    const { data, error } = await supabase.rpc('engine_popular', { p_market: market })
    if (error) throw error
    return (data || [])
        .map((row) => CATEGORIES.find((c) => c.value === row.category))
        .filter(Boolean)
        .map((c) => ({ value: c.value, label: c.label, words: c.services?.[0]?.[0] || c.label }))
}

export const LABELS = {
    regular: 'You have been before',
    best: 'Best match',
    earliest: 'Earliest',
    closest: 'Closest',
    top_rated: 'Top rated',
    another: 'Also free',
    later: 'Later',
}

export const dayWord = (dateKey, timeZone) => {
    const today = zonedNow(timeZone).dateKey
    if (dateKey === today) return 'Today'
    if (dateKey === addDays(today, 1)) return 'Tomorrow'
    return parseDateKey(dateKey).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Why this option: "2 km · 4.9 from 12 reviews · 70% book again".
export const reasons = (o) => [
    o.km !== null && o.km !== undefined ? `${Number(o.km).toLocaleString('en-GB', { maximumFractionDigits: 1 })} km away` : '',
    o.rating && Number(o.reviews) >= 5 ? `${Number(o.rating).toFixed(1)} from ${o.reviews} reviews` : '',
    o.rebook_pct ? `${o.rebook_pct}% of clients book again` : '',
    o.kept_pct !== null && o.kept_pct !== undefined ? keptLine(o.kept_pct) : '',
].filter(Boolean)

// One tap: the business page opens the booking sheet at that time, format and group size.
export const bookingLink = (o) => {
    const hhmm = String(o.time).replace(':', '')
    const extra = new URLSearchParams()
    if (o.mode) extra.set('mode', o.mode)
    if (Number(o.people) > 1) extra.set('people', String(o.people))
    const tail = extra.toString()
    return `/${o.slug}?book=${encodeURIComponent(`${o.service_id}.${o.date}.${hhmm}`)}${tail ? `&${tail}` : ''}`
}

// The address picked in the box, carried into the booking sheet so the client does not type it twice.
const PLACE = 'lc.engine.place'
export const keepEnginePlace = (place) => {
    try {
        if (place) sessionStorage.setItem(PLACE, JSON.stringify({ ...place, at: Date.now() }))
        else sessionStorage.removeItem(PLACE)
    } catch { /* storage blocked: the sheet asks again */ }
}
export const enginePlace = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(PLACE) || 'null')
        if (!saved || Date.now() - saved.at > 30 * 60000) return null
        return saved
    } catch {
        return null
    }
}

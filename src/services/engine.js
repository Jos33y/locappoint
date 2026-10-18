import { supabase } from '../config/supabase'
import { zonedNow } from './business'
import { parseDateKey, toDateKey } from './dates'
import { CATEGORIES } from '../constants/categories'
import { keptLine } from './reliability'

// "What do you need?": one request, matched in the database (engine_match) against every live
// business in the city. The same function serves the site, the app and, later, WhatsApp.

// Porto, Lagos and Lisbon are live.
export const MARKETS = [
    { code: 'porto', name: 'Porto', country: 'Portugal', timeZone: 'Europe/Lisbon', currency: 'EUR', live: true, street: 'Rua de Santa Catarina 120' },
    { code: 'lagos', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos', currency: 'NGN', live: true, street: '12 Admiralty Way, Lekki' },
    { code: 'lisbon', name: 'Lisbon', country: 'Portugal', timeZone: 'Europe/Lisbon', currency: 'EUR', live: true, street: 'Rua Augusta 100' },
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

// The days asked for, in the city's own calendar. Soonest sends none: the engine looks day by day
// from today, up to 3 weeks, and never stops at a closed day.
export const daysFor = (when, timeZone) => {
    const today = zonedNow(timeZone).dateKey
    const dow = parseDateKey(today).getDay()
    if (when === 'today') return [today]
    if (when === 'tomorrow') return [addDays(today, 1)]
    if (when === 'soon') return [today, addDays(today, 1), addDays(today, 2)]
    // Said on a Sunday, "this weekend" is mostly the next one: today and next Saturday and Sunday.
    if (when === 'weekend') return dow === 0 ? [today, addDays(today, 6), addDays(today, 7)] : dow === 6 ? [today, addDays(today, 1)] : [addDays(today, 6 - dow), addDays(today, 7 - dow)]
    if (when === 'nextweek') {
        const monday = addDays(today, ((8 - dow) % 7) || 7)
        return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    }
    if (String(when).startsWith('d:')) return [String(when).slice(2)]
    return null
}

export const WHEN = [
    { value: 'soonest', label: 'Soonest' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'weekend', label: 'This weekend' },
    { value: 'nextweek', label: 'Next week' },
]

// Every choice for "When": the five above, then each of the next two weeks' days by name.
export const whenOptions = (timeZone) => {
    const today = zonedNow(timeZone).dateKey
    return [...WHEN, ...Array.from({ length: 13 }, (_, i) => {
        const key = addDays(today, i + 2)
        return { value: `d:${key}`, label: parseDateKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) }
    })]
}

// "When" in words, for the line under the results: "today", "on Tuesday 20 Oct", "next week".
export const whenWords = (when, timeZone) => {
    if (when === 'soonest') return 'soon'
    if (when === 'weekend') return 'this weekend'
    if (when === 'nextweek') return 'next week'
    if (String(when).startsWith('d:')) return `on ${parseDateKey(String(when).slice(2)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`
    return (whenOptions(timeZone).find((w) => w.value === when)?.label || 'then').toLowerCase()
}

// A day in what they typed ("haircut Tuesday", "unhas sabado", "nails next week"), in English or
// Portuguese, becomes "When". The words stay in the search: the engine knows they are days.
const DAY_NAMES = [
    ['sunday', 'domingo'], ['monday', 'segunda'], ['tuesday', 'terca'], ['wednesday', 'quarta'],
    ['thursday', 'quinta'], ['friday', 'sexta'], ['saturday', 'sabado'],
]
const fold = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const readWhen = (text, timeZone) => {
    const t = ` ${fold(text).replace(/[^a-z0-9]+/g, ' ')} `
    const today = zonedNow(timeZone).dateKey
    const dow = parseDateKey(today).getDay()
    const nextWeek = / (next week|proxima semana|semana que vem) /.test(t)
    const hit = DAY_NAMES.findIndex((names) => names.some((n) => t.includes(` ${n} `)))
    // A weekday wins over the week around it: "next week Friday" is that Friday, not the whole week.
    if (hit >= 0) {
        const ahead = nextWeek
            ? (((8 - dow) % 7) || 7) + ((hit + 6) % 7)
            : (hit - dow + 7) % 7
        return ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : `d:${addDays(today, ahead)}`
    }
    if (nextWeek) return 'nextweek'
    if (/ (weekend|fim de semana) /.test(t)) return 'weekend'
    if (/ (today|tonight|hoje) /.test(t)) return 'today'
    if (/ (tomorrow|amanha) /.test(t)) return 'tomorrow'
    return null
}

// What a time choice says: "After 17:00", "Around 15:30", "11:30 to 14:00", "Morning".
export const timeLabel = (value) => {
    const v = String(value || 'any')
    if (v.startsWith('r:')) {
        const [from, to] = v.slice(2).split('-')
        if (to === '23:59') return `After ${from}`
        if (from === '00:00') return `Before ${String(Number(to.slice(0, 2)) + 1).padStart(2, '0')}:00`
        return `${from} to ${to}`
    }
    if (v.startsWith('at:')) return `Around ${v.slice(3).includes(':') ? v.slice(3) : `${v.slice(3).padStart(2, '0')}:00`}`
    return TIMES.find((t) => t.value === v)?.label || 'Any time'
}

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

export const findMatches = async ({ market, text, mode = '', when = 'soonest', time = 'any', people = 1, place = null, zone = '', maxPrice = null, order = '' }) => {
    const m = marketOf(market)
    // "at:15" or "at:15:30" around an hour; "r:17:00-23:59" a range read from the words ("after 5").
    const at = time.startsWith('at:') ? (time.slice(3).includes(':') ? time.slice(3) : `${String(time.slice(3)).padStart(2, '0')}:00`) : null
    const range = time.startsWith('r:') ? time.slice(2) : null
    const { data, error } = await supabase.rpc('engine_match', {
        p_market: m.code,
        p_query: text,
        p_mode: mode || null,
        p_dates: daysFor(when, m.timeZone),
        p_window: at ? 'any' : range || time,
        p_at: at,
        p_people: people,
        p_lat: place?.lat ?? null,
        p_lng: place?.lng ?? null,
        p_zone: place?.zone || zone || null,
        // Only sent when asked, so a search without them stays the same call as before.
        ...(maxPrice ? { p_max_price: maxPrice } : {}),
        ...(order ? { p_order: order } : {}),
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
    cheapest: 'Cheapest',
    later: 'Later',
}

// "Tomorrow, Mon 19 Oct" or "Fri 23 Oct": the date is always there, so a week ahead never reads as tomorrow.
export const dayLabel = (dateKey, timeZone) => {
    const today = zonedNow(timeZone).dateKey
    const d = parseDateKey(dateKey)
    const date = `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`
    if (dateKey === today) return `Today, ${date}`
    if (dateKey === addDays(today, 1)) return `Tomorrow, ${date}`
    return date
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

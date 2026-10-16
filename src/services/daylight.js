import { getTimes } from 'suncalc'
import { worldOf } from '../components/brand/world'

// The middle of each city we serve, for a business that has not placed its shop on the map.
const CENTRES = { porto: [41.1579, -8.6291], lisbon: [38.7223, -9.1393], lagos: [6.5244, 3.3792] }

const NAMES = { porto: 'Porto', lisbon: 'Lisbon', lagos: 'Lagos' }

// Where the sun is read: the shop's own pin, or the middle of its city. The name is the place it was read for.
export const placeOf = (business = {}) => {
    const lat = Number(business.lat)
    const lng = Number(business.lng)
    if (business.lat != null && business.lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        return { at: [lat, lng], name: String(business.city || '').trim() || null }
    }
    const world = worldOf(business)
    return { at: CENTRES[world], name: NAMES[world] }
}

const clock = (date, timeZone) => (date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
    : null)

const hourIn = (date, timeZone) => Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(date))

const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime())

// The light outside the shop right now, from the real sun where the business is:
// night, dawn (first light until the morning golden hour ends), day, golden (the hour before sunset),
// dusk (sunset until it is properly dark). The greeting follows the shop's clock, not the sun.
export const daylightOf = (business = {}, at = new Date()) => {
    const timeZone = business.timezone || 'Europe/Lisbon'
    const place = placeOf(business)
    const [lat, lng] = place.at
    const t = getTimes(at, lat, lng)
    const now = at.getTime()
    const hour = hourIn(at, timeZone)
    let light
    if ([t.dawn, t.goldenHourEnd, t.goldenHour, t.sunset, t.nauticalDusk].every(valid)) {
        if (now < t.dawn.getTime()) light = 'night'
        else if (now < t.goldenHourEnd.getTime()) light = 'dawn'
        else if (now < t.goldenHour.getTime()) light = 'day'
        else if (now < t.sunset.getTime()) light = 'golden'
        else if (now < t.nauticalDusk.getTime()) light = 'dusk'
        else light = 'night'
    } else {
        light = hour < 6 || hour >= 21 ? 'night' : hour < 9 ? 'dawn' : hour < 17 ? 'day' : hour < 19 ? 'golden' : 'dusk'
    }
    const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'
    return { light, greeting, place: place.name, sunrise: clock(t.sunrise, timeZone), sunset: clock(t.sunset, timeZone) }
}

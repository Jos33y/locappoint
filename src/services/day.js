import { addDays, bookingStart, startOfWeek, windowsFor } from './business'
import { parseDateKey, toDateKey } from './dates'

const LIVE = ['pending', 'confirmed', 'completed']

const priceOf = (b) => Number(b.price ?? b.services?.price ?? 0) || 0

// Open minutes for a day: each bookable person's own hours, or the business hours when they have none.
export const capacityFor = (hours, members, dateKey) => {
    const dow = parseDateKey(dateKey).getDay()
    const people = members.length ? members : [null]
    return people.reduce((sum, m) => sum + windowsFor(hours, m?.id, dow).reduce((s, [a, b]) => s + (b - a), 0), 0)
}

// Fill, earned, still to come and lost for one day. Earned uses the Insights rule: completed, or confirmed and ended.
export const dayFigures = ({ bookings, hours, members, dateKey, now }) => {
    const capacity = capacityFor(hours, members, dateKey)
    const day = bookings.filter((b) => b.appointment_date === dateKey)
    const booked = day.filter((b) => LIVE.includes(b.status)).reduce((s, b) => s + (Number(b.duration_minutes) || 0), 0)
    const ended = (b) => dateKey < now.dateKey || (dateKey === now.dateKey && bookingStart(b) + (Number(b.duration_minutes) || 0) <= now.minutes)
    let earned = 0
    let toCome = 0
    let lost = 0
    for (const b of day) {
        if (b.status === 'completed' || (b.status === 'confirmed' && ended(b))) earned += priceOf(b)
        else if (b.status === 'confirmed' || b.status === 'pending') toCome += priceOf(b)
        else if (b.status === 'no_show') lost += priceOf(b)
    }
    return {
        capacity,
        booked,
        fill: capacity ? Math.min(1, booked / capacity) : 0,
        earned,
        toCome,
        lost,
        count: day.filter((b) => LIVE.includes(b.status)).length,
        pending: day.filter((b) => b.status === 'pending'),
    }
}

// A month as whole weeks, Monday to Sunday, so the grid never starts mid-week.
export const monthRange = (anchor) => {
    const d = parseDateKey(anchor)
    const first = toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
    const last = toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return [startOfWeek(first), addDays(startOfWeek(last), 6)]
}

export const shiftMonth = (anchor, dir) => {
    const d = parseDateKey(anchor)
    return toDateKey(new Date(d.getFullYear(), d.getMonth() + dir, 1))
}

export const weekKeys = (dateKey) => {
    const monday = startOfWeek(dateKey)
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// This week so far against the same days last week, so a Tuesday is never compared with a whole week.
export const weekFigures = ({ bookings, hours, members, now, anchor }) => {
    const keys = weekKeys(anchor || now.dateKey)
    const days = keys.map((dateKey) => ({ dateKey, ...dayFigures({ bookings, hours, members, dateKey, now }) }))
    const sofar = keys.filter((k) => k <= now.dateKey)
    const lastKeys = sofar.map((k) => addDays(k, -7))
    const before = lastKeys.reduce((s, k) => s + dayFigures({ bookings, hours, members, dateKey: k, now }).earned, 0)
    const earned = days.filter((d) => d.dateKey <= now.dateKey).reduce((s, d) => s + d.earned, 0)
    const ahead = days.reduce((s, d) => s + d.toCome, 0)
    const lost = days.reduce((s, d) => s + d.lost, 0)
    const capacity = days.reduce((s, d) => s + d.capacity, 0)
    const booked = days.reduce((s, d) => s + d.booked, 0)
    return { keys, days, earned, before, ahead, lost, fill: capacity ? Math.min(1, booked / capacity) : 0, from: addDays(keys[0], -7), to: keys[6] }
}

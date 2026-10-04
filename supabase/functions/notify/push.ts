// What each push says. Short enough for a lock screen: who or what, then when.
// No Deno APIs here, so tests can run it under Node.

import { oneLine, relativeDay } from './format.ts'
import type { Row } from './types.ts'

export type Push = { title: string; body: string; link: string }

const facts = (row: Row) => {
    const p = row.payload as Record<string, unknown>
    const date = String(p.date || '').slice(0, 10)
    const time = String(p.time || '').slice(0, 5)
    const tz = String(p.timezone || 'Europe/Lisbon')
    const rel = date ? relativeDay(date, tz) : ''
    const at = time ? `at ${time}` : ''
    // "tomorrow at 10:30" or "Friday 3 October at 10:30"; whenOn keeps the "on" for mid-sentence use.
    const when = [rel.replace(/^on /, ''), at].filter(Boolean).join(' ')
    const whenOn = [rel, at].filter(Boolean).join(' ')
    const forBusiness = p.audience === 'business'
    const link = row.appointment_id
        ? forBusiness ? `/portal/calendar?booking=${row.appointment_id}` : `/client/appointments?booking=${row.appointment_id}`
        : forBusiness ? '/portal/notifications' : '/client'
    return {
        p,
        when,
        whenOn,
        link,
        biz: oneLine(p.business_name) || 'The business',
        client: oneLine(p.client_name) || 'A client',
        service: oneLine(p.service_name) || 'Booking',
        place: [oneLine(p.address), oneLine(p.city)].filter(Boolean).join(', '),
    }
}

// Minutes until a trip arrives, at least one.
const minutesOf = (f: ReturnType<typeof facts>) => Math.max(1, Math.round(Number(f.p.minutes) || 0))

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text)

const BUSINESS: Record<string, (f: ReturnType<typeof facts>) => [string, string]> = {
    booking_new: (f) => ['New booking', `${f.client} booked ${f.service}, ${f.when}.`],
    booking_request: (f) => [f.p.moved_from ? 'Moved, needs your OK' : 'New request', `${f.client} asked for ${f.service}, ${f.when}. Tap to confirm.`],
    booking_cancelled: (f) => ['Booking cancelled', `${f.client} cancelled ${f.service}, ${f.when}. The time is free again.`],
    booking_moved: (f) => ['Booking moved', `${f.client} moved ${f.service} to ${f.when}.`],
}

const CLIENT: Record<string, (f: ReturnType<typeof facts>) => [string, string]> = {
    booking_confirmed: (f) => ['You are booked', `${f.service} at ${f.biz}, ${f.when}.`],
    booking_declined: (f) => ['Request not accepted', `${f.biz} cannot do ${f.service} ${f.whenOn}. Pick another time.`],
    booking_cancelled: (f) => ['Booking cancelled', `${f.biz} cancelled ${f.service} ${f.whenOn}.`],
    booking_moved: (f) => ['New time', `${f.biz} moved ${f.service} to ${f.when}.`],
    booking_reminder: (f) => [cap(f.when || 'Coming up'), [`${f.service} at ${f.biz}.`, f.place].filter(Boolean).join(' ')],
}

// Live trips to the client's place, queued straight from the trip (live-trips.sql), not from the bell.
const TRIP: Record<string, (f: ReturnType<typeof facts>) => [string, string]> = {
    trip_on_way: (f) => ['On the way', `${oneLine(f.p.by) ? `${oneLine(f.p.by)} from ` : ''}${f.biz} is on the way, about ${minutesOf(f)} min.`],
    trip_close: (f) => [minutesOf(f) <= 3 ? 'Almost there' : `About ${minutesOf(f)} min away`, `${f.biz} is about ${minutesOf(f)} min away.`],
    trip_arrived: (f) => ['Arrived', `${f.biz} is at your place.`],
}

export const renderPush = (row: Row): Push | null => {
    const table = (row.payload as Record<string, unknown>)?.audience === 'business' ? BUSINESS : { ...CLIENT, ...TRIP }
    const make = table[row.kind]
    if (!make) return null
    const f = facts(row)
    const [title, body] = make(f)
    return { title: clip(title, 60), body: clip(body.replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/ \./g, '.'), 180), link: f.link }
}

export const PUSH_KINDS = { business: Object.keys(BUSINESS), client: Object.keys(CLIENT) }
export const TRIP_KINDS = Object.keys(TRIP)

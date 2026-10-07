// What Locappoint says on WhatsApp to owners and staff. Shared by notify (booking news) and the
// whatsapp function (replies). No Deno APIs, so tests can run it under Node.
//
// Reply ids, kept short because they travel inside buttons:
//   day                today's list        acc:<id> / dec:<id>  accept or decline a request
//   way:<id>           pick the minutes    min:<id>:<n>         on my way, n minutes
//   arr:<id>           arrived

import { oneLine, relativeDay } from '../notify/format.ts'
import { buttons, choices, template, text, type Outgoing } from './wa.ts'

export type View = {
    id: string
    status: string
    date: string
    time: string
    minutes?: number
    client_name?: string
    service_name?: string
    mode?: string
    zone?: string
    people?: number
    staff_name?: string
    business_name?: string
    timezone?: string
    trip?: string | null
    moved_from?: unknown
}

export const LANG = 'en'

const ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ACT = new RegExp(`^(acc|dec|way|arr):(${ID})$`, 'i')
const MIN = new RegExp(`^min:(${ID}):(\\d{1,3})$`, 'i')

// A tapped button, read back. Anything else is null.
export const readReply = (reply: string): { verb: 'day' | 'acc' | 'dec' | 'way' | 'arr' | 'min'; id?: string; minutes?: number } | null => {
    if (reply === 'day') return { verb: 'day' }
    const min = reply.match(MIN)
    if (min) return { verb: 'min', id: min[1].toLowerCase(), minutes: Number(min[2]) }
    const act = reply.match(ACT)
    return act ? { verb: act[1].toLowerCase() as 'acc', id: act[2].toLowerCase() } : null
}
export const MINUTES = [10, 15, 20, 30, 45]

// The templates Meta must approve, in the order of their values. Category: Utility.
export const TEMPLATES = {
    lc_booking_request: {
        body: 'New request for {{1}}: {{2}} asked for {{3}}, {{4}}. Tap Accept or Decline, or open Locappoint to answer.',
        buttons: ['Accept', 'Decline'],
        sample: ['Barbearia Rio', 'Ana Silva', 'Haircut', 'tomorrow at 10:30'],
    },
    lc_booking_new: {
        body: 'New booking for {{1}}: {{2}} booked {{3}}, {{4}}. Tap Today to see your whole day.',
        buttons: ['Today'],
        sample: ['Barbearia Rio', 'Ana Silva', 'Haircut', 'tomorrow at 10:30'],
    },
    lc_booking_cancelled: {
        body: 'Booking cancelled for {{1}}: {{2}} cancelled {{3}}, {{4}}. The time is free again in your calendar.',
        buttons: ['Today'],
        sample: ['Barbearia Rio', 'Ana Silva', 'Haircut', 'tomorrow at 10:30'],
    },
    lc_booking_moved: {
        body: 'Booking moved for {{1}}: {{2}} moved {{3}} to {{4}}. Your calendar already shows the new time.',
        buttons: ['Today'],
        sample: ['Barbearia Rio', 'Ana Silva', 'Haircut', 'Friday 10 October at 11:00'],
    },
} as const

const client = (v: View) => oneLine(v.client_name) || 'A client'
const service = (v: View) => oneLine(v.service_name) || 'a booking'
const biz = (v: View) => oneLine(v.business_name) || 'your business'
const hhmm = (v: View) => String(v.time || '').slice(0, 5)

// "today at 10:30", "tomorrow at 10:30", "on Friday 10 October at 11:00"
export const when = (v: View) => {
    const day = v.date ? relativeDay(String(v.date).slice(0, 10), v.timezone || 'Europe/Lisbon') : ''
    return [day, hhmm(v) ? `at ${hhmm(v)}` : ''].filter(Boolean).join(' ')
}
const whenBare = (v: View) => when(v).replace(/^on /, '')

const where = (v: View) => (v.mode === 'at_client' ? `at their place${v.zone ? ` in ${oneLine(v.zone)}` : ''}` : v.mode === 'online' ? 'online' : '')

// One booking on one line: "10:30 *Ana Silva*, Haircut, 30 min, with Rita, at their place in Bonfim"
export const line = (v: View, withStaff = true) => [
    `${hhmm(v)} *${client(v)}*`,
    oneLine(v.service_name) || 'Booking',
    v.minutes ? `${v.minutes} min` : '',
    Number(v.people) > 1 ? `${v.people} people` : '',
    withStaff && v.staff_name ? `with ${oneLine(v.staff_name)}` : '',
    where(v),
    v.status === 'pending' ? 'needs your OK' : v.status === 'completed' ? 'done' : '',
    v.trip === 'on_way' ? 'on the way' : v.trip === 'arrived' ? 'arrived' : '',
].filter(Boolean).join(', ')

const EVENT: Record<string, keyof typeof TEMPLATES> = {
    booking_request: 'lc_booking_request',
    booking_new: 'lc_booking_new',
    booking_cancelled: 'lc_booking_cancelled',
    booking_moved: 'lc_booking_moved',
}

// Booking news. Inside the 24 hour window a free message with buttons; outside it, the template.
export const news = (event: string, v: View, inWindow: boolean): Outgoing | null => {
    const name = EVENT[event]
    if (!name) return null
    if (!inWindow) {
        const values = [biz(v), client(v), service(v), whenBare(v)]
        const replies = event === 'booking_request' ? [`acc:${v.id}`, `dec:${v.id}`] : ['day']
        const shown = TEMPLATES[name].body.replace(/\{\{(\d)\}\}/g, (_, i) => values[Number(i) - 1])
        return template(name, LANG, values, replies, shown)
    }
    const at = `${biz(v)}: `
    if (event === 'booking_request') {
        const head = v.moved_from ? 'Moved, needs your OK' : 'New request'
        return buttons(`*${head}*\n${at}${client(v)} asked for ${service(v)}, ${whenBare(v)}.${v.mode === 'at_client' ? `\nVisit ${where(v)}.` : ''}`,
            [{ id: `acc:${v.id}`, title: 'Accept' }, { id: `dec:${v.id}`, title: 'Decline' }])
    }
    if (event === 'booking_new') return buttons(`*New booking*\n${at}${client(v)} booked ${service(v)}, ${whenBare(v)}.`, [{ id: 'day', title: 'Today' }])
    if (event === 'booking_moved') return buttons(`*Booking moved*\n${at}${client(v)} moved ${service(v)} to ${whenBare(v)}.`, [{ id: 'day', title: 'Today' }])
    return text(`*Booking cancelled*\n${at}${client(v)} cancelled ${service(v)}, ${whenBare(v)}. The time is free again.`)
}

// "today": the list, then a message with buttons for each request still waiting and each home visit.
export const today = (list: View[], dayName: string): Outgoing[] => {
    if (!list.length) return [buttons(`*${dayName}*\nNothing booked today.`, [{ id: 'day', title: 'Check again' }])]
    const names = [...new Set(list.map((v) => biz(v)))]
    const parts: string[] = [`*${dayName}*, ${list.length} ${list.length === 1 ? 'booking' : 'bookings'}`]
    for (const n of names) {
        if (names.length > 1) parts.push('', `_${n}_`)
        for (const v of list.filter((x) => biz(x) === n)) parts.push(line(v))
    }
    const out: Outgoing[] = [text(parts.join('\n'))]
    const asks = list.filter((v) => v.status === 'pending').slice(0, 3)
    for (const v of asks) out.push(buttons(`Waiting for your OK:\n${line(v)}`, [{ id: `acc:${v.id}`, title: 'Accept' }, { id: `dec:${v.id}`, title: 'Decline' }]))
    const visits = list.filter((v) => v.mode === 'at_client' && v.status === 'confirmed' && v.trip !== 'arrived' && v.trip !== 'stopped')
    for (const v of visits.slice(0, Math.max(0, 4 - asks.length))) {
        out.push(v.trip === 'on_way'
            ? buttons(`On the way to ${client(v)}, ${hhmm(v)}.`, [{ id: `arr:${v.id}`, title: 'Arrived' }])
            : buttons(`Visit at ${hhmm(v)}: ${client(v)}, ${where(v)}.`, [{ id: `way:${v.id}`, title: 'On my way' }]))
    }
    return out
}

// Only the id here: the booking is shown once wa_trip has checked it is theirs.
export const pickMinutes = (id: string) =>
    choices('How long until you get there? The client is told now and again when you are close.', 'Minutes', MINUTES.map((m) => ({ id: `min:${id}:${m}`, title: `About ${m} min` })))

export const answered = (v: View & { already?: boolean }, answer: 'confirm' | 'decline') => {
    if (v.already) return text(v.status === 'confirmed' ? `Already confirmed: ${line(v, false)}.` : v.status === 'cancelled' ? `This booking was already cancelled: ${client(v)}, ${whenBare(v)}.` : `Already answered: ${line(v, false)}.`)
    return answer === 'confirm'
        ? buttons(`Confirmed. ${client(v)} is told.\n${oneLine(v.service_name) || 'Booking'}, ${whenBare(v)}.`, [{ id: 'day', title: 'Today' }])
        : text(`Declined. ${client(v)} is told and can pick another time.`)
}

export const onWay = (v: View, minutes: number) =>
    buttons(`On the way, about ${minutes} min. ${client(v)} is told, and again when you are close.`, [{ id: `arr:${v.id}`, title: 'Arrived' }])

export const arrived = (v: View) => text(`Arrived. ${client(v)} is told. Have a good visit.`)

export const HELP = (name: string) => buttons(
    `Hi${name ? ` ${name}` : ''}. Here you get new bookings and requests as they come in.\n\nTap Today, or write *today*, to see your day. Accept or Decline requests from the message. For a visit at the client's place, tap On my way.\n\nWrite *STOP* to turn WhatsApp off.`,
    [{ id: 'day', title: 'Today' }],
)

export const LINKED = (name: string, count: number) => buttons(
    `Linked${name ? `, ${name}` : ''}. This WhatsApp is now yours on Locappoint.\n\n${count ? 'To get bookings here, switch on WhatsApp for each business in Locappoint, Settings, Notifications.' : 'Bookings can come here once you are on a business team.'}`,
    [{ id: 'day', title: 'Today' }],
)

export const BAD_CODE = text('That code is not right or has run out. Get a new one in Locappoint, Settings, Notifications, and send it within 30 minutes.')
export const STOPPED = text('WhatsApp is off for this number. Nothing more will come here. Write START to turn it back on.')
export const STARTED = buttons('WhatsApp is back on for this number.', [{ id: 'day', title: 'Today' }])
export const UNKNOWN = text('Booking by WhatsApp is coming soon. For now, book on locappoint.com.\n\nRun a business on Locappoint? Link this number in Settings, Notifications.')
export const NOT_YOURS = text('That booking is not yours to change. Ask the owner, or open it in Locappoint.')
export const GONE = text('That booking is no longer there.')
export const TRY_AGAIN = text('That did not work. Try again in a minute, or open Locappoint.')

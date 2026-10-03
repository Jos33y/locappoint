// Calendar entries for a booking: an .ics invite (Apple, Outlook, Gmail) and a Google Calendar link.
// Booking times are local to the business, so they are turned into UTC with the business's time zone.

const pad = (n: number) => String(n).padStart(2, '0')

// The UTC moment of a wall-clock time in a time zone.
export const zonedToUtc = (date: string, time: string, tz: string) => {
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    const guess = Date.UTC(y, m - 1, d, hh, mm)
    const parts = (at: number) => {
        const out: Record<string, number> = {}
        for (const p of new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(at))) {
            if (p.type !== 'literal') out[p.type] = Number(p.value)
        }
        return Date.UTC(out.year, out.month - 1, out.day, out.hour, out.minute)
    }
    const offset = parts(guess) - guess
    const first = guess - offset
    const correction = parts(first) - first - offset
    return new Date(first - correction)
}

const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines over 75 octets are folded, as the format requires.
const fold = (line: string) => {
    const out: string[] = []
    let rest = line
    while (new TextEncoder().encode(rest).length > 73) {
        let cut = 73
        while (new TextEncoder().encode(rest.slice(0, cut)).length > 73) cut -= 1
        out.push(rest.slice(0, cut))
        rest = ` ${rest.slice(cut)}`
    }
    out.push(rest)
    return out.join('\r\n')
}

export type CalendarEvent = {
    uid: string
    sequence: number
    title: string
    start: Date
    minutes: number
    location: string
    details: string
    url: string
}

export const icsFile = (e: CalendarEvent) => {
    const end = new Date(e.start.getTime() + e.minutes * 60_000)
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//LocAppoint//Bookings//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${e.uid}`,
        `SEQUENCE:${e.sequence}`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(e.start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${escapeIcs(e.title)}`,
        e.location ? `LOCATION:${escapeIcs(e.location)}` : '',
        `DESCRIPTION:${escapeIcs(e.details)}`,
        `URL:${e.url}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean).map(fold).join('\r\n') + '\r\n'
}

export const googleLink = (e: CalendarEvent) => {
    const end = new Date(e.start.getTime() + e.minutes * 60_000)
    const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${stamp(e.start)}/${stamp(end)}`, details: e.details, location: e.location })
    return `https://calendar.google.com/calendar/render?${q.toString()}`
}

export const base64 = (text: string) => {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

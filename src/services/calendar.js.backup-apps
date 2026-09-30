// Add a booking to a calendar: a Google Calendar link and an .ics file for Apple, Outlook and others.
// Booking times are the business's local time, so they are placed in its time zone first.

const pad = (n) => String(n).padStart(2, '0')

export const zonedToUtc = (dateKey, minutes, timeZone) => {
    const [y, m, d] = dateKey.split('-').map(Number)
    const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60)
    const wall = (at) => {
        const out = {}
        for (const p of new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(at))) {
            if (p.type !== 'literal') out[p.type] = Number(p.value)
        }
        return Date.UTC(out.year, out.month - 1, out.day, out.hour, out.minute)
    }
    const offset = wall(guess) - guess
    const first = guess - offset
    return new Date(first - (wall(first) - first - offset))
}

const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const escapeIcs = (value) => String(value).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// { id, title, dateKey, minutes, duration, timeZone, location, details, url }
export const calendarEvent = (e) => {
    const start = zonedToUtc(e.dateKey, e.minutes, e.timeZone || 'Europe/Lisbon')
    return { ...e, start, end: new Date(start.getTime() + (e.duration || 30) * 60000) }
}

export const googleCalendarUrl = (e) => {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${stamp(e.start)}/${stamp(e.end)}`, details: e.details || '', location: e.location || '' })
    return `https://calendar.google.com/calendar/render?${q.toString()}`
}

export const icsText = (e) => [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LocAppoint//Bookings//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id || stamp(e.start)}@locappoint.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    e.location ? `LOCATION:${escapeIcs(e.location)}` : '',
    e.details ? `DESCRIPTION:${escapeIcs(e.details)}` : '',
    e.url ? `URL:${e.url}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
].filter(Boolean).join('\r\n') + '\r\n'

export const downloadIcs = (e) => {
    const url = URL.createObjectURL(new Blob([icsText(e)], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'booking.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

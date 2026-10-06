// Where a booking happens: at the business, at the client's place, or online.

export const MODES = ['at_business', 'at_client', 'online']

export const isHomeVisit = (booking) => booking?.mode === 'at_client'

// Where a home visit happens, for the people allowed to see it: the area always, the address with it
// when known (the client always; the business once it has confirmed).
export const visitPlace = (booking) => [booking?.client_address, booking?.client_zone].filter((x) => String(x || '').trim()).join(', ')

export const serviceModes = (service) => {
    const modes = (service?.modes || []).filter((m) => MODES.includes(m))
    return modes.length ? modes : ['at_business']
}

export const isOnlineBooking = (booking) => booking?.mode === 'online'

// The booking's meeting link once confirmed: its own, or the business's room.
export const joinLink = (booking) => {
    if (!isOnlineBooking(booking) || booking.status !== 'confirmed') return null
    const url = booking.meeting_url || booking.businesses?.meeting_url || ''
    return /^https:\/\/\S+$/.test(url) ? url : null
}

const clientZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null
    } catch {
        return null
    }
}

// Minutes to add to UTC to get the wall time in a zone, at a given instant.
const offsetAt = (timeZone, instant) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            .formatToParts(new Date(instant))
            .map((p) => [p.type, p.value]),
    )
    const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    return Math.round((wall - instant) / 60000)
}

// An online session at the business's local time, as the client's own clock shows it. Null when
// the two clocks agree, or the client's zone is unknown.
export const yourTime = ({ dateKey, minutes, timeZone }, zone = clientZone()) => {
    if (!zone || !timeZone || !dateKey || minutes === null || minutes === undefined) return null
    const [y, m, d] = String(dateKey).slice(0, 10).split('-').map(Number)
    const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60)
    const instant = guess - offsetAt(timeZone, guess) * 60000
    if (offsetAt(zone, instant) === offsetAt(timeZone, instant)) return null
    const fmt = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, ...opts }).format(new Date(instant))
    const time = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const sameDay = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }) === new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant))
    return sameDay ? `${time} your time` : `${time} your time, ${fmt({ weekday: 'short', day: 'numeric', month: 'short' })}`
}

// Groups: one booking for several people, one staff member, one after another. Each extra person
// takes the time set for them, or the service's own time when none is set.
export const groupMax = (service) => Math.max(1, Math.min(50, Number(service?.max_people) || 1))

const eachExtra = (service) => {
    const set = service?.extra_person_minutes
    return set === null || set === undefined || set === '' ? Number(service?.duration_minutes) || 0 : Number(set) || 0
}

export const groupMinutes = (service, people = 1) => (Number(service?.duration_minutes) || 0) + (Math.max(1, people) - 1) * eachExtra(service)

export const groupPrice = (service, people = 1) => {
    const price = Number(String(service?.price ?? '').replace(',', '.'))
    if (!Number.isFinite(price)) return service?.price
    return service?.price_per === 'person' ? price * Math.max(1, people) : price
}

export const withPeople = (name, people) => (Number(people) > 1 ? `${name} for ${people} people` : name)

// "Up to 4 people, priced per person" on the menu.
export const groupTag = (service) => {
    const max = groupMax(service)
    if (max < 2) return ''
    return `Up to ${max} people, ${service.price_per === 'person' ? 'priced per person' : 'one price for the group'}`
}

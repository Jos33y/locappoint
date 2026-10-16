import { useEffect, useRef, useState } from 'react'
import { loadSlots } from '../../../services/booking'
import { zonedNow } from '../../../services/business'
import { parseDateKey, toDateKey } from '../../../services/dates'
import { WEEK, clock } from '../../../services/hours'

// The page's promise in one line: the next real free time for the first service on the menu,
// asked from the same free-times call the booking sheet uses. At most two lookups: today, then the
// next open day. Nothing shows while it loads or if it fails; the page never waits for it.

const LOOKUPS = 2
const AHEAD = 14

const firstBookable = (services) => services.find((s) => !s.is_addon && s.is_active !== false && Number(s.duration_minutes) > 0)

const dayLabel = (offset, date) => {
    if (offset === 0) return 'Today'
    if (offset === 1) return 'Tomorrow'
    return WEEK.find((d) => d.dow === date.getDay()).long
}

export const useNextFree = ({ business, services, week, skip = false }) => {
    const [next, setNext] = useState(null)
    const service = firstBookable(services || [])
    const serviceId = service?.id
    const serviceRef = useRef(service)
    serviceRef.current = service
    const businessId = business?.id
    const timeZone = business?.timezone || 'Europe/Lisbon'

    useEffect(() => {
        setNext(null)
        if (skip || !businessId || !serviceId || !week?.some((day) => day.length > 0)) return undefined
        let cancelled = false
        const find = async () => {
            const { dateKey, minutes } = zonedNow(timeZone)
            const today = parseDateKey(dateKey)
            let asked = 0
            for (let offset = 0; offset < AHEAD && asked < LOOKUPS; offset += 1) {
                const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
                const open = week[date.getDay()]
                if (!open?.length) continue
                if (offset === 0 && open[open.length - 1].end <= minutes) continue
                asked += 1
                const key = toDateKey(date)
                const free = await loadSlots({ businessId, serviceId, dateKey: key })
                const first = free.find((m) => offset > 0 || m > minutes)
                if (first != null) {
                    if (!cancelled) setNext({ service: serviceRef.current, dateKey: key, minutes: first, day: dayLabel(offset, date), time: clock(first), label: `${dayLabel(offset, date)} ${clock(first)}` })
                    return
                }
            }
        }
        find().catch((err) => console.error('Next free time failed:', err))
        return () => { cancelled = true }
    }, [businessId, serviceId, timeZone, week, skip])

    return next
}

import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { clockOf, loadTrip, minutesLeft, pastEta, tripWindow } from '../../../services/trips'
import { toMinutes } from '../../../services/dates'
import '../../../styles/client/trip.css'

// On the day of a visit at the client's place: once the business taps On my way, the minutes until
// they arrive and each step on the way. Never where they are. Asks again every 30 seconds while they
// are on the way, every minute before they leave, and stops once they arrive.
const STEPS = [
    { key: 'on_way', label: 'On the way' },
    { key: '10', label: 'About 10 min away' },
    { key: '3', label: 'Almost there' },
    { key: 'arrived', label: 'Arrived' },
]

export const LiveTrip = ({ booking, token = null, business }) => {
    const timeZone = business?.timezone || 'Europe/Lisbon'
    const due = tripWindow({ dateKey: booking.appointment_date, minutes: toMinutes(booking.appointment_time), timeZone })
    const [trip, setTrip] = useState(null)
    const [, setTick] = useState(0)

    const live = trip?.status === 'on_way'
    const ended = trip?.status === 'arrived'
    useEffect(() => {
        if (!due || ended) return undefined
        let cancelled = false
        const ask = () => loadTrip({ token, appointmentId: booking.id })
            .then((t) => { if (!cancelled) setTrip(t) })
            .catch((err) => console.error('Trip failed:', err))
        ask()
        const timer = setInterval(ask, live ? 30000 : 60000)
        return () => { cancelled = true; clearInterval(timer) }
    }, [due, ended, live, token, booking.id])

    useEffect(() => {
        if (!live) return undefined
        const timer = setInterval(() => setTick((n) => n + 1), 15000)
        return () => clearInterval(timer)
    }, [live])

    if (!due || !trip || !['on_way', 'arrived'].includes(trip.status)) return null

    const who = trip.by || business?.business_name || 'They'
    const steps = trip.steps || {}
    const now = Date.now()
    const minutes = minutesLeft(trip, now)
    const late = Number(trip.late_minutes) || 0
    const reached = (key) => Boolean(steps[key])

    return (
        <section className={`lc-trip${ended ? ' is-done' : ''}`} aria-live="polite" aria-labelledby={`trip-${booking.id}`}>
            <p id={`trip-${booking.id}`} className="lc-trip__who">
                {ended ? <CircleCheck size={16} aria-hidden="true" /> : <span className="lc-trip__dot" aria-hidden="true" />}
                {ended ? `${who} has arrived` : `${who} is on the way`}
            </p>
            {live && (
                <>
                    <p className="lc-trip__min">{pastEta(trip, now) ? 'Any minute now' : <>About <b>{minutes} min</b></>}</p>
                    <p className="lc-trip__eta">
                        Arriving around {trip.eta_time || clockOf(trip.eta_at, timeZone)}
                        {trip.guess ? ', their own estimate' : ''}
                        {late >= 3 ? `. Running about ${late} min late.` : '.'}
                    </p>
                </>
            )}
            <ol className="lc-trip__steps">
                {STEPS.map((s) => (
                    <li key={s.key} className={reached(s.key) ? 'is-reached' : ''}>
                        <span className="lc-trip__mark" aria-hidden="true" />
                        <span className="lc-trip__label">{s.label}</span>
                        {reached(s.key) && <span className="lc-trip__time">{clockOf(steps[s.key], timeZone)}</span>}
                    </li>
                ))}
            </ol>
            {live && <p className="lc-trip__note">Only the minutes are shared, never where they are.</p>}
        </section>
    )
}

import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Navigation, TriangleAlert } from 'lucide-react'
import { Button, Chip, ChipGroup } from '../ui'
import { toMinutes } from '../../services/dates'
import { arriveTrip, clockOf, currentSpot, loadTrip, minutesLeft, startTrip, stopTrip, tripWindow, updateTrip, watchSpot } from '../../services/trips'
import '../../styles/business/trip.css'

const GUESSES = [10, 15, 20, 30, 45]
const EVERY = 120000

// On my way, for a visit at the client's place, on its day. The phone's spot goes to the trip
// function, which turns it into minutes for the client and keeps nothing else. Sharing starts on
// this tap and ends on Arrived or Stop. While this is open, the minutes follow the road.
export const TripControl = ({ booking, timeZone }) => {
    const due = booking.status === 'confirmed' && tripWindow({ dateKey: booking.appointment_date, minutes: toMinutes(booking.appointment_time), timeZone })
    const [trip, setTrip] = useState(null)
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState('')
    const [ask, setAsk] = useState(false)
    const [near, setNear] = useState(false)
    const [error, setError] = useState('')
    const [, setTick] = useState(0)
    const sent = useRef(0)

    useEffect(() => {
        if (!due) return undefined
        let cancelled = false
        loadTrip({ appointmentId: booking.id })
            .then((t) => { if (!cancelled) { setTrip(t); setLoaded(true) } })
            .catch((err) => { console.error('Trip failed:', err); if (!cancelled) setLoaded(true) })
        return () => { cancelled = true }
    }, [due, booking.id])

    const live = trip?.status === 'on_way'

    // While on the way and this is open: a new estimate every two minutes as the phone moves.
    useEffect(() => {
        if (!live) return undefined
        sent.current = Date.now()
        const stop = watchSpot((spot) => {
            if (Date.now() - sent.current < EVERY) return
            sent.current = Date.now()
            updateTrip({ appointmentId: booking.id, spot })
                .then((res) => { if (res.trip) setTrip(res.trip); setNear(Boolean(res.near)) })
                .catch((err) => console.error('Trip update failed:', err))
        })
        const tick = setInterval(() => setTick((n) => n + 1), 15000)
        return () => { stop(); clearInterval(tick) }
    }, [live, booking.id])

    if (!due || !loaded) return null

    const run = async (kind, work) => {
        setBusy(kind)
        setError('')
        try {
            await work()
        } catch (err) {
            setError(err.message || 'That did not work. Try again.')
        } finally {
            setBusy('')
        }
    }

    const leave = () => run('start', async () => {
        const spot = await currentSpot()
        const res = await startTrip({ appointmentId: booking.id, spot })
        if (res.need_minutes) { setAsk(true); return }
        setTrip(res.trip)
    })
    const guess = (minutes) => run('start', async () => {
        const res = await startTrip({ appointmentId: booking.id, minutes })
        setAsk(false)
        setTrip(res.trip)
    })
    const arrive = () => run('arrive', async () => setTrip((await arriveTrip(booking.id)).trip))
    const stop = () => run('stop', async () => { await stopTrip(booking.id); setTrip(null); setNear(false) })

    if (trip?.status === 'arrived') {
        return (
            <p className="biz-trip__done">
                <CircleCheck size={15} aria-hidden="true" />
                Arrived at {clockOf(trip.ended_at || trip.steps?.arrived, timeZone)}. The client was told.
            </p>
        )
    }

    if (live) {
        const late = Number(trip.late_minutes) || 0
        return (
            <div className="biz-trip">
                <p className="biz-trip__now">The client sees <b>about {minutesLeft(trip)} min</b>, arriving around {trip.eta_time}.</p>
                {late >= 3 && <p className="biz-trip__late"><TriangleAlert size={14} aria-hidden="true" />About {late} min late. The client sees this too.</p>}
                <p className="biz-trip__hint">{near ? 'You are close. Tap Arrived at the door.' : 'Keep this open on the way and the minutes follow the road. Only minutes are shared.'}</p>
                <div className="biz-trip__actions">
                    <Button size="sm" icon={CircleCheck} loading={busy === 'arrive'} onClick={arrive}>Arrived</Button>
                    <Button size="sm" variant="quiet" loading={busy === 'stop'} onClick={stop}>Stop sharing</Button>
                </div>
                {error && <p className="biz-trip__error" role="alert">{error}</p>}
            </div>
        )
    }

    return (
        <div className="biz-trip">
            {ask ? (
                <>
                    <p className="biz-trip__now">Location is off, so pick how long until you are there.</p>
                    <ChipGroup label="Minutes until you arrive">
                        {GUESSES.map((m) => <Chip key={m} onClick={() => guess(m)}>{`${m} min`}</Chip>)}
                    </ChipGroup>
                    <Button size="sm" variant="quiet" onClick={() => setAsk(false)}>Cancel</Button>
                </>
            ) : (
                <>
                    <Button size="sm" variant="secondary" icon={Navigation} loading={busy === 'start'} onClick={leave}>On my way</Button>
                    <p className="biz-trip__hint">The client sees the minutes until you arrive, never where you are. Sharing stops when you tap Arrived.</p>
                </>
            )}
            {error && <p className="biz-trip__error" role="alert">{error}</p>}
        </div>
    )
}

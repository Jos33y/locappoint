import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import Agenda from '../../components/business/Agenda'
import ShareLink from '../../components/business/ShareLink'
import StaffFilter from '../../components/business/StaffFilter'
import {
    formatMoney,
    friendlyError,
    loadBlocks,
    loadBookings,
    minutesToLabel,
    setBookingStatus,
    windowsFor,
    zonedNow,
} from '../../services/business'
import { parseDateKey } from '../../services/dates'
import '../../styles/business/day.css'

const Today = () => {
    const { business, bookableMembers, activeServices, hours, me, isOwner, bookingsVersion, refreshBookings, openNewBooking, openBooking, notify } = useWorkspace()
    const [now, setNow] = useState(() => zonedNow(business.timezone))
    const [staffFilter, setStaffFilter] = useState(isOwner ? 'all' : me?.id)
    const [bookings, setBookings] = useState([])
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const timer = setInterval(() => setNow(zonedNow(business.timezone)), 60000)
        return () => clearInterval(timer)
    }, [business.timezone])

    useEffect(() => {
        let cancelled = false
        Promise.all([loadBookings(business.id, now.dateKey, now.dateKey), loadBlocks(business.id, now.dateKey, now.dateKey)])
            .then(([rows, blockRows]) => {
                if (cancelled) return
                setBookings(rows)
                setBlocks(blockRows)
                setError('')
            })
            .catch(() => { if (!cancelled) setError('Could not load today. Check your connection and reload.') })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [business.id, now.dateKey, bookingsVersion])

    const staff = staffFilter === 'all' ? null : bookableMembers.find((m) => m.id === staffFilter) || null
    const visible = useMemo(
        () => (staff ? bookings.filter((b) => b.staff_id === staff.id) : bookings),
        [bookings, staff]
    )

    const counted = visible.filter((b) => b.status !== 'cancelled')
    const expected = counted
        .filter((b) => b.status !== 'no_show')
        .reduce((sum, b) => sum + Number(b.services?.price || 0), 0)
    const pending = visible.filter((b) => b.status === 'pending')

    const hasService = activeServices.length > 0
    const hasHours = hours.some((h) => !h.staff_id)
    const setupDone = hasService && hasHours && business.is_active

    const todayWindows = windowsFor(hours, staff?.id, parseDateKey(now.dateKey).getDay())
    const closedNow = todayWindows.length === 0 || now.minutes >= todayWindows[todayWindows.length - 1][1]
    const opensAt = todayWindows.length ? minutesToLabel(todayWindows[0][0]) : null

    const date = parseDateKey(now.dateKey)
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

    const confirm = async (booking) => {
        try {
            await setBookingStatus(booking.id, 'confirmed')
            refreshBookings()
            notify(`${booking.client_name} confirmed`)
        } catch (err) {
            notify(friendlyError(err))
        }
    }

    const book = (minutes, staffId) => openNewBooking({ staffId, date: now.dateKey, time: minutesToLabel(minutes) })

    return (
        <div className="biz-page biz-today">
            <header className="biz-dayhead">
                <h1 className="biz-dayhead__date">
                    <span className="biz-dayhead__weekday">{weekday}</span>
                    {dayMonth}
                </h1>
                <dl className="biz-stats">
                    <div>
                        <dt>Bookings</dt>
                        <dd className="biz-num">{counted.length}</dd>
                    </div>
                    <div>
                        <dt>Expected</dt>
                        <dd className="biz-num">{formatMoney(expected)}</dd>
                    </div>
                    <div className={pending.length ? 'is-warn' : ''}>
                        <dt>To confirm</dt>
                        <dd className="biz-num">{pending.length}</dd>
                    </div>
                </dl>
            </header>

            {!setupDone && (
                <section className="biz-setup" aria-labelledby="setup-title">
                    <h2 id="setup-title" className="biz-subhead">Finish setting up to take bookings</h2>
                    <ol className="biz-setup__list">
                        <li className="is-done"><Check size={16} aria-hidden="true" /> Business page created</li>
                        <li className={hasService ? 'is-done' : ''}>
                            {hasService ? <Check size={16} aria-hidden="true" /> : <span className="biz-setup__dot" />}
                            {hasService ? 'Services added' : <Link to="/portal/services">Add your first service</Link>}
                        </li>
                        <li className={hasHours ? 'is-done' : ''}>
                            {hasHours ? <Check size={16} aria-hidden="true" /> : <span className="biz-setup__dot" />}
                            {hasHours ? 'Opening hours set' : <Link to="/portal/hours">Set your opening hours</Link>}
                        </li>
                        {!business.is_active && (
                            <li>
                                <span className="biz-setup__dot" />
                                <Link to="/portal/page">Bookings are paused. Turn them back on</Link>
                            </li>
                        )}
                    </ol>
                </section>
            )}

            <div className="biz-today__grid">
                <section className="biz-today__main" aria-label="Today's schedule">
                    <StaffFilter members={isOwner ? bookableMembers : []} value={staffFilter} onChange={setStaffFilter} />
                    {error && <p className="biz-error" role="alert">{error}</p>}
                    {loading ? (
                        <div className="biz-agenda-skel" aria-hidden="true">
                            {[0, 1, 2].map((i) => <span key={i} className="lc-skel" style={{ height: 76 }} />)}
                        </div>
                    ) : (
                        <>
                            {counted.length === 0 && closedNow && (
                                <div className="biz-closed">
                                    <strong>{todayWindows.length === 0 ? 'Closed today' : 'Closed for the day'}</strong>
                                    <span>No bookings today. Share your link so tomorrow fills up.</span>
                                </div>
                            )}
                            {counted.length === 0 && !closedNow && (
                                <p className="biz-empty">
                                    Nothing booked yet{opensAt && now.minutes < todayWindows[0][0] ? `. You open at ${opensAt}` : ''}. Your free time is below, ready to book.
                                </p>
                            )}
                            <Agenda
                                dateKey={now.dateKey}
                                bookings={visible}
                                blocks={blocks}
                                hours={hours}
                                staff={staff}
                                members={bookableMembers}
                                nowMinutes={now.minutes}
                                onBook={book}
                                onOpen={openBooking}
                                onConfirm={confirm}
                            />
                        </>
                    )}
                </section>

                <aside className="biz-today__side">
                    {pending.length > 0 && (
                        <section className="biz-panel" aria-labelledby="pending-title">
                            <h2 id="pending-title" className="biz-subhead">Waiting for you</h2>
                            <ul className="biz-pending">
                                {pending.map((b) => (
                                    <li key={b.id}>
                                        <button type="button" className="biz-pending__open" onClick={() => openBooking(b)}>
                                            <span className="biz-num">{b.appointment_time.slice(0, 5)}</span>
                                            <span>{b.client_name}</span>
                                        </button>
                                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => confirm(b)}>Confirm</button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    <section className="biz-panel" aria-label="Your booking link">
                        <ShareLink business={business} />
                    </section>
                </aside>
            </div>
        </div>
    )
}

export default Today

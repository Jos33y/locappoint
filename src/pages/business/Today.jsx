import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Check } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import Agenda from '../../components/business/Agenda'
import StaffFilter from '../../components/business/StaffFilter'
import { DayRing } from '../../components/business/DayRing'
import { WeekRings } from '../../components/business/WeekRings'
import { PageCard, ReviewsCard } from '../../components/business/TodayCards'
import { dayFigures, weekFigures, weekKeys } from '../../services/day'
import { moneyFor, loadInsights } from '../../services/insights'
import { loadOwnerReviews } from '../../services/reviews'
import {
    addDays,
    bookingStart,
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
import '../../styles/business/overview.css'

const change = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)

const Today = () => {
    const { business, bookableMembers, activeServices, hours, me, isOwner, bookingsVersion, refreshBookings, openNewBooking, openBooking, notify } = useWorkspace()
    const [now, setNow] = useState(() => zonedNow(business.timezone))
    const [staffFilter, setStaffFilter] = useState(isOwner ? 'all' : me?.id)
    const [bookings, setBookings] = useState([])
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [reviews, setReviews] = useState(null)
    const [pageStats, setPageStats] = useState(null)
    const navigate = useNavigate()
    const money = useMemo(() => moneyFor(business.country), [business.country])

    useEffect(() => {
        const timer = setInterval(() => setNow(zonedNow(business.timezone)), 60000)
        return () => clearInterval(timer)
    }, [business.timezone])

    useEffect(() => {
        let cancelled = false
        const keys = weekKeys(now.dateKey)
        Promise.all([loadBookings(business.id, addDays(keys[0], -7), keys[6]), loadBlocks(business.id, now.dateKey, now.dateKey)])
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

    // Owner-only extras. The overview still works without them.
    useEffect(() => {
        if (!isOwner) return undefined
        let cancelled = false
        loadOwnerReviews(business.id).then((r) => { if (!cancelled) setReviews(r) }).catch(() => {})
        loadInsights(business.id, 7)
            .then((i) => { if (!cancelled && i) setPageStats({ views: i.current?.views || 0, booked: i.current?.booked_online || 0 }) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [isOwner, business.id, bookingsVersion])

    const staff = staffFilter === 'all' ? null : bookableMembers.find((m) => m.id === staffFilter) || null
    const scoped = useMemo(
        () => (staff ? bookings.filter((b) => b.staff_id === staff.id) : bookings),
        [bookings, staff]
    )
    const visible = useMemo(() => scoped.filter((b) => b.appointment_date === now.dateKey), [scoped, now.dateKey])
    const members = staff ? [staff] : bookableMembers
    const day = dayFigures({ bookings: scoped, hours, members, dateKey: now.dateKey, now })
    const week = weekFigures({ bookings: scoped, hours, members, now })
    const weekChange = change(week.earned, week.before)

    const counted = visible.filter((b) => b.status !== 'cancelled')
    const pending = visible.filter((b) => b.status === 'pending')
    const next = counted
        .filter((b) => ['pending', 'confirmed'].includes(b.status) && bookingStart(b) >= now.minutes)
        .sort((a, b) => bookingStart(a) - bookingStart(b))[0]

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
            <header className="biz-dayhead biz-ov__head">
                <h1 className="biz-dayhead__date">
                    <span className="biz-dayhead__weekday">{weekday}</span>
                    {dayMonth}
                </h1>
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

            <div className="biz-ov__grid">
                <section className="biz-ovpanel biz-ov__day" aria-label="How today is going">
                    <DayRing
                        dateKey={now.dateKey}
                        bookings={visible}
                        hours={hours}
                        staff={staff}
                        figures={day}
                        nowMinutes={now.minutes}
                        money={money}
                        onBook={(minutes) => book(minutes, staff?.id || bookableMembers[0]?.id)}
                    />
                    <div className="biz-ov__dayside">
                        {pending.length > 0 ? (
                            <div className="biz-ov__needs">
                                <h2 className="biz-ov__h2">{pending.length === 1 ? '1 booking waits for you' : `${pending.length} bookings wait for you`}</h2>
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
                            </div>
                        ) : (
                            <p className="biz-ov__calm">{counted.length ? 'Nothing needs you right now.' : 'Nothing booked today yet. Share your link to fill the ring.'}</p>
                        )}
                        {next && (
                            <button type="button" className="biz-ov__next" onClick={() => openBooking(next)}>
                                <span className="biz-ov__nextlabel">Next</span>
                                <b className="biz-num">{next.appointment_time.slice(0, 5)}</b>
                                <span>{next.client_name}{next.services?.service_name ? `, ${next.services.service_name}` : ''}</span>
                            </button>
                        )}
                        {day.lost > 0 && <p className="biz-ov__lost">{money(day.lost)} lost to no-shows today</p>}
                    </div>
                </section>

                <section className="biz-ovpanel biz-ov__week" aria-labelledby="week-title">
                    <header className="biz-ov__weekhead">
                        <h2 id="week-title" className="biz-ov__h2">This week</h2>
                        <p className="biz-ov__weekfigs">
                            <span><b className="biz-num">{money(week.earned)}</b> earned</span>
                            {weekChange !== null && (
                                <span className={`biz-ov__delta ${weekChange >= 0 ? 'is-good' : 'is-bad'}`}>
                                    {weekChange >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                                    <b className="biz-num">{Math.abs(weekChange)}%</b> against last week so far
                                </span>
                            )}
                            <span><b className="biz-num">{money(week.ahead)}</b> booked ahead</span>
                            {week.lost > 0 && <span className="is-bad"><b className="biz-num">{money(week.lost)}</b> lost to no-shows</span>}
                        </p>
                    </header>
                    <WeekRings week={week} todayKey={now.dateKey} money={money} onPick={(key) => navigate(`/portal/calendar?date=${key}`)} />
                </section>

                <section className="biz-ov__timeline" aria-label="Today's schedule">
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
                            {!(closedNow && counted.length === 0) && (
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
                            )}
                        </>
                    )}
                </section>

                <aside className="biz-ov__side">
                    {isOwner && <ReviewsCard reviews={reviews} />}
                    <PageCard business={business} stats={isOwner ? pageStats : null} />
                </aside>
            </div>
        </div>
    )
}

export default Today

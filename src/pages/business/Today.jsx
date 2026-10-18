import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Check, Plus, QrCode } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import Agenda from '../../components/business/Agenda'
import StaffFilter from '../../components/business/StaffFilter'
import { DayRing } from '../../components/business/DayRing'
import { WeekRings } from '../../components/business/WeekRings'
import { PageCard, ReviewsCard } from '../../components/business/TodayCards'
import ShareLink from '../../components/business/ShareLink'
import { DaySlip, Tomorrow, freeGaps } from '../../components/business/TodayEvening'
import { TodayBand } from '../../components/business/TodayBand'
import PosterSheet from '../../components/business/PosterSheet'
import { useDaylight } from '../../components/business/useDaylight'
import { pageUrl } from '../../services/links'
import { dayFigures, weekFigures, weekKeys } from '../../services/day'
import { moneyFor, loadInsights } from '../../services/insights'
import { loadOwnerReviews } from '../../services/reviews'
import {
    addDays,
    bookingStart,
    friendlyError,
    hasAnyBooking,
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
    const [ever, setEver] = useState(null)
    const [poster, setPoster] = useState(false)
    const daylight = useDaylight(business)
    const navigate = useNavigate()
    const money = useMemo(() => moneyFor(business.country), [business.country])

    useEffect(() => {
        const timer = setInterval(() => setNow(zonedNow(business.timezone)), 60000)
        return () => clearInterval(timer)
    }, [business.timezone])

    useEffect(() => {
        let cancelled = false
        const keys = weekKeys(now.dateKey)
        // A week past today as well: the next open day may be days away, and on a Sunday the week ahead shows.
        const until = addDays(now.dateKey, 8) > keys[6] ? addDays(now.dateKey, 8) : keys[6]
        Promise.all([loadBookings(business.id, addDays(keys[0], -7), until), loadBlocks(business.id, now.dateKey, now.dateKey)])
            .then(async ([rows, blockRows]) => {
                // Nothing in these two weeks: look once for any booking at all, so a new business
                // starts on its first-booking state instead of a page of zeros.
                const any = rows.length > 0 || (await hasAnyBooking(business.id).catch(() => true))
                if (cancelled) return
                setBookings(rows)
                setBlocks(blockRows)
                setEver(any)
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
    const thisWeek = weekFigures({ bookings: scoped, hours, members, now })

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

    const closesAt = todayWindows.length ? minutesToLabel(todayWindows[todayWindows.length - 1][1]) : null
    const fresh = !loading && ever === false

    // The evening: once the doors close the day goes on paper, and the next open day comes forward
    // (tomorrow, or the first day after it with hours).
    const tomorrowKey = [1, 2, 3, 4, 5, 6, 7].map((n) => addDays(now.dateKey, n))
        .find((k) => windowsFor(hours, staff?.id, parseDateKey(k).getDay()).length > 0) || addDays(now.dateKey, 1)
    const nextName = tomorrowKey === addDays(now.dateKey, 1) ? 'Tomorrow' : parseDateKey(tomorrowKey).toLocaleDateString('en-GB', { weekday: 'long' })
    const tomorrowWindows = windowsFor(hours, staff?.id, parseDateKey(tomorrowKey).getDay())
    const tomorrowRows = scoped
        .filter((b) => b.appointment_date === tomorrowKey && ['pending', 'confirmed'].includes(b.status))
        .sort((a, b) => bookingStart(a) - bookingStart(b))
    const tomorrow = dayFigures({ bookings: scoped, hours, members, dateKey: tomorrowKey, now })
    // A day with no hours at all: the ring shows the next open day instead of a closed circle, so
    // "closed" is said once, at the top.
    const closedDay = !loading && !fresh && todayWindows.length === 0
    // Sunday once the doors are shut: the week that matters is the one starting tomorrow.
    const weekAhead = parseDateKey(now.dateKey).getDay() === 0 && closedNow
    const week = weekAhead ? weekFigures({ bookings: scoped, hours, members, now, anchor: addDays(now.dateKey, 1) }) : thisWeek
    const weekChange = change(week.earned, week.before)
    const weekCount = week.days.reduce((s, d) => s + d.count, 0)
    const shortest = Math.min(...activeServices.map((x) => Number(x.duration_minutes) || 30), 120)
    const tomorrowFree = freeGaps(tomorrowWindows, tomorrowRows, shortest)
    const evening = !loading && !fresh && todayWindows.length > 0 && closedNow && counted.length > 0
    const showTomorrow = !loading && !fresh && closedNow
    const visits = visible.filter((b) => b.status === 'completed' || b.status === 'confirmed').length
    const online = counted.filter((b) => b.source === 'online').length

    const date = parseDateKey(now.dateKey)
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    const firstName = String(me?.display_name || '').trim().split(/\s+/)[0]
    const status = todayWindows.length === 0
        ? <>Closed today.</>
        : now.minutes < todayWindows[0][0]
            ? <>You open at <span className="biz-num">{opensAt}</span>.</>
            : closedNow ? <>Closed for the day.</> : <>Open until <span className="biz-num">{closesAt}</span>.</>
    const sunAt = daylight.light === 'dawn' ? daylight.sunrise : daylight.light === 'golden' ? daylight.sunset : null
    const sun = sunAt && <> {daylight.light === 'dawn' ? 'Sunrise' : 'Sunset'} <b className="biz-num">{sunAt}</b>{daylight.place ? ` in ${daylight.place}` : ''}.</>
    const booked = (n) => (n === 1 ? '1 booking' : `${n} bookings`)
    const nextOpen = tomorrowWindows.length ? minutesToLabel(tomorrowWindows[0][0]) : null
    // What comes next, in one sentence.
    const ahead = closedNow
        ? (nextOpen
            ? <>You open {nextName === 'Tomorrow' ? 'tomorrow' : `on ${nextName}`} at <b className="biz-num">{nextOpen}</b>{tomorrowRows.length ? <> with {booked(tomorrowRows.length)}.</> : ', nothing booked yet.'}</>
            : <>No opening hours set for the week ahead.</>)
        : now.minutes < (todayWindows[0]?.[0] ?? 0)
            ? (counted.length ? <>{booked(counted.length)} today.</> : <>Nothing booked yet.</>)
            : next
                ? <>Next at <b className="biz-num">{next.appointment_time.slice(0, 5)}</b> with {next.client_name}.</>
                : counted.length ? <>Nothing else booked today.</> : <>Nothing booked today yet.</>
    const fmt = (key, opts) => parseDateKey(key).toLocaleDateString('en-GB', opts)
    const weekRange = `${fmt(week.keys[0], { day: 'numeric' })} to ${fmt(week.keys[6], { day: 'numeric', month: 'short' })}`

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
            <TodayBand
                business={business}
                daylight={daylight}
                minutes={now.minutes}
                hello={firstName ? `${daylight.greeting}, ${firstName}` : daylight.greeting}
                status={status}
                line={<>{weekday} {dayMonth}. {ahead}{sun}</>}
            />

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

            <div className={`biz-ov__grid${fresh ? ' is-fresh' : ''}`}>
                <section className={`biz-ovpanel biz-ov__day${evening ? ' is-evening' : ''}`} aria-label={closedDay ? `${nextName}, the next open day` : 'How today is going'}>
                    {evening ? (
                        <DaySlip dateKey={now.dateKey} bookings={visible} hours={hours} staff={staff} figures={day} money={money} country={business.country} visits={visits} online={online} />
                    ) : closedDay ? (
                        <DayRing
                            dateKey={tomorrowKey}
                            bookings={tomorrowRows}
                            hours={hours}
                            staff={staff}
                            figures={tomorrow}
                            money={money}
                            country={business.country}
                            centre="ahead"
                            dayName={nextName}
                        />
                    ) : (
                        <DayRing
                            dateKey={now.dateKey}
                            bookings={visible}
                            hours={hours}
                            staff={staff}
                            figures={day}
                            nowMinutes={now.minutes}
                            money={money}
                            country={business.country}
                            centre={loading ? 'hours' : fresh ? 'fresh' : 'figures'}
                            onBook={(minutes) => book(minutes, staff?.id || bookableMembers[0]?.id)}
                        />
                    )}
                    <div className="biz-ov__dayside">
                        {fresh ? (
                            <div className="biz-first">
                                <h2 className="biz-ov__h2">Get your first booking</h2>
                                <p className="biz-first__lede">Clients pick a free time on your page, day or night, and it lands on this ring. Start with the people who already come to you.</p>
                                <ShareLink business={business} />
                                <div className="biz-first__more">
                                    <button type="button" className="btn btn--secondary" onClick={() => setPoster(true)}>
                                        <QrCode size={16} aria-hidden="true" /> QR poster for your counter
                                    </button>
                                    <button type="button" className="btn btn--ghost" onClick={() => openNewBooking({ date: now.dateKey })}>
                                        <Plus size={16} aria-hidden="true" /> Took one by phone? Add it
                                    </button>
                                </div>
                            </div>
                        ) : pending.length > 0 ? (
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
                        ) : showTomorrow ? null : (
                            <p className="biz-ov__calm">{counted.length ? 'Nothing needs you right now.' : 'Nothing booked today yet. Share your link to fill the ring.'}</p>
                        )}
                        {next && (
                            <button type="button" className="biz-ov__next" onClick={() => openBooking(next)}>
                                <span className="biz-ov__nextlabel">Next</span>
                                <b className="biz-num">{next.appointment_time.slice(0, 5)}</b>
                                <span>{next.client_name}{next.services?.service_name ? `, ${next.services.service_name}` : ''}</span>
                            </button>
                        )}
                        {showTomorrow && (
                            <Tomorrow business={business} dateKey={tomorrowKey} rows={tomorrowRows} windows={tomorrowWindows} free={tomorrowFree} title={nextName} />
                        )}
                        {day.lost > 0 && !evening && <p className="biz-ov__lost">{money(day.lost)} lost to no-shows today</p>}
                    </div>
                </section>

                {!fresh && <section className="biz-ovpanel biz-ov__week" aria-labelledby="week-title">
                    <header className="biz-ov__weekhead">
                        <div className="biz-ov__weektitle">
                            <h2 id="week-title" className="biz-ov__h2">{weekAhead ? 'The week ahead' : 'This week'}</h2>
                            <span className="biz-ov__weekrange">{weekRange}</span>
                        </div>
                        {weekAhead ? (
                            <p className="biz-ov__weekfigs">
                                <span><b className="biz-num">{weekCount}</b> booked</span>
                                <span><b className="biz-num">{money(week.ahead)}</b> expected</span>
                            </p>
                        ) : (
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
                        )}
                    </header>
                    <WeekRings week={week} todayKey={now.dateKey} money={money} onPick={(key) => navigate(`/portal/calendar?date=${key}`)} />
                    {weekAhead && (
                        <p className="biz-ov__weekdone">
                            This week, in full: <b className="biz-num">{money(thisWeek.earned)}</b> earned
                            {thisWeek.lost > 0 ? <>, <b className="biz-num">{money(thisWeek.lost)}</b> lost to no-shows</> : ', no no-shows'}.
                        </p>
                    )}
                </section>}

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
                                    <span>No bookings today. Share your link so {nextName === 'Tomorrow' ? 'tomorrow' : nextName} fills up.</span>
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
                    {isOwner && !fresh && <ReviewsCard reviews={reviews} />}
                    {(isOwner || !fresh) && <PageCard business={business} stats={isOwner ? pageStats : null} share={!fresh} />}
                </aside>
            </div>

            <PosterSheet open={poster} onClose={() => setPoster(false)} business={business} link={pageUrl(business.slug)} qrLink={pageUrl(business.slug, 'qr')} notify={notify} />
        </div>
    )
}

export default Today

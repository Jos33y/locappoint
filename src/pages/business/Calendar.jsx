import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import DayRail from '../../components/business/DayRail'
import Agenda from '../../components/business/Agenda'
import { useIsDesktop } from '../../components/business/useIsDesktop'
import StaffFilter from '../../components/business/StaffFilter'
import {
    STATUS_LABEL,
    addDays,
    formatDay,
    friendlyError,
    minutesToLabel,
    setBookingStatus,
    loadBlocks,
    loadBookings,
    shortTime,
    startOfWeek,
    zonedNow,
} from '../../services/business'
import '../../styles/business/day.css'
import '../../styles/business/calendar.css'

const Calendar = () => {
    const { business, bookableMembers, hours, me, isOwner, bookingsVersion, refreshBookings, openNewBooking, openBooking, notify } = useWorkspace()
    const isDesktop = useIsDesktop()
    const today = zonedNow(business.timezone)
    const [view, setView] = useState('day')
    const [anchor, setAnchor] = useState(today.dateKey)
    const [staffFilter, setStaffFilter] = useState(isOwner ? 'all' : me?.id)
    const [bookings, setBookings] = useState([])
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const range = useMemo(() => {
        if (view === 'day') return [anchor, anchor]
        const from = startOfWeek(anchor)
        return [from, addDays(from, 6)]
    }, [view, anchor])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        Promise.all([loadBookings(business.id, range[0], range[1]), loadBlocks(business.id, range[0], range[1])])
            .then(([rows, blockRows]) => {
                if (cancelled) return
                setBookings(rows)
                setBlocks(blockRows)
                setError('')
            })
            .catch(() => { if (!cancelled) setError('Could not load the calendar. Reload to try again.') })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [business.id, range, bookingsVersion])

    const columns = useMemo(
        () => (staffFilter === 'all' ? bookableMembers : bookableMembers.filter((m) => m.id === staffFilter)),
        [staffFilter, bookableMembers]
    )
    const visible = useMemo(
        () => bookings.filter((b) => columns.some((c) => c.id === b.staff_id)),
        [bookings, columns]
    )

    const step = view === 'day' ? 1 : 7
    const title = view === 'day'
        ? formatDay(anchor)
        : `${formatDay(range[0], { day: 'numeric', month: 'short' })} to ${formatDay(range[1], { day: 'numeric', month: 'short' })}`

    const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(range[0], i)) : []

    return (
        <div className="biz-page">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Calendar</h1>
                    <p className="biz-page__sub">{title}</p>
                </div>
                <div className="biz-seg" role="radiogroup" aria-label="View">
                    {['day', 'week'].map((option) => (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={view === option}
                            className={`biz-seg__btn${view === option ? ' is-selected' : ''}`}
                            onClick={() => setView(option)}
                        >
                            {option === 'day' ? 'Day' : 'Week'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="biz-datenav">
                <button type="button" className="biz-icon-btn" aria-label={view === 'day' ? 'Previous day' : 'Previous week'} onClick={() => setAnchor(addDays(anchor, -step))}>
                    <ChevronLeft size={20} />
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAnchor(today.dateKey)} disabled={anchor === today.dateKey}>
                    Today
                </button>
                <button type="button" className="biz-icon-btn" aria-label={view === 'day' ? 'Next day' : 'Next week'} onClick={() => setAnchor(addDays(anchor, step))}>
                    <ChevronRight size={20} />
                </button>
                <label className="biz-datenav__pick">
                    <span className="biz-visually-hidden">Go to date</span>
                    <input className="biz-input" type="date" value={anchor} onChange={(event) => event.target.value && setAnchor(event.target.value)} />
                </label>
            </div>

            <StaffFilter members={isOwner ? bookableMembers : []} value={staffFilter} onChange={setStaffFilter} />

            {error && <p className="biz-error" role="alert">{error}</p>}
            {loading && bookings.length === 0 && (
                <div className="biz-agenda-skel" aria-hidden="true">
                    {[0, 1, 2].map((i) => <span key={i} className="lc-skel" style={{ height: 76 }} />)}
                </div>
            )}

            {view === 'day' && !(loading && bookings.length === 0) && !isDesktop && (
                <Agenda
                    dateKey={anchor}
                    bookings={visible}
                    blocks={blocks}
                    hours={hours}
                    staff={staffFilter === 'all' ? null : bookableMembers.find((m) => m.id === staffFilter) || null}
                    members={bookableMembers}
                    nowMinutes={anchor === today.dateKey ? today.minutes : null}
                    past={anchor < today.dateKey}
                    onBook={(minutes, staffId) => openNewBooking({ staffId, date: anchor, time: minutesToLabel(minutes) })}
                    onOpen={openBooking}
                    onConfirm={async (booking) => {
                        try {
                            await setBookingStatus(booking.id, 'confirmed')
                            refreshBookings()
                            notify(`${booking.client_name} confirmed`)
                        } catch (err) {
                            notify(friendlyError(err))
                        }
                    }}
                />
            )}

            {view === 'day' && !(loading && bookings.length === 0) && isDesktop && (
                <DayRail
                    dateKey={anchor}
                    columns={columns}
                    bookings={visible}
                    blocks={blocks}
                    hours={hours}
                    nowMinutes={anchor === today.dateKey ? today.minutes : null}
                    onSlotTap={(staffId, minutes) => openNewBooking({
                        staffId,
                        date: anchor,
                        time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
                    })}
                    onBookingTap={openBooking}
                />
            )}

            {view === 'week' && (
                <div className="biz-week">
                    {days.map((dateKey) => {
                        const dayBookings = visible
                            .filter((b) => b.appointment_date === dateKey && b.status !== 'cancelled')
                            .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                        const isToday = dateKey === today.dateKey
                        return (
                            <section key={dateKey} className={`biz-week__day${isToday ? ' is-today' : ''}`} aria-label={formatDay(dateKey)}>
                                <button
                                    type="button"
                                    className="biz-week__head"
                                    onClick={() => { setAnchor(dateKey); setView('day') }}
                                >
                                    <span className="biz-week__dow">{formatDay(dateKey, { weekday: 'short' })}</span>
                                    <span className="biz-num biz-week__date">{formatDay(dateKey, { day: 'numeric' })}</span>
                                    <span className="biz-week__count">{dayBookings.length || ''}</span>
                                </button>
                                <ul className="biz-week__list">
                                    {dayBookings.map((booking) => (
                                        <li key={booking.id}>
                                            <button
                                                type="button"
                                                className={`biz-week__item biz-week__item--${booking.status}`}
                                                onClick={() => openBooking(booking)}
                                                aria-label={`${shortTime(booking.appointment_time)} ${booking.client_name}, ${STATUS_LABEL[booking.status]}`}
                                            >
                                                <span className="biz-num">{shortTime(booking.appointment_time)}</span>
                                                <span className="biz-week__client">{booking.client_name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    className="biz-week__add"
                                    onClick={() => openNewBooking({ date: dateKey, staffId: staffFilter !== 'all' ? staffFilter : undefined })}
                                    aria-label={`Add a booking on ${formatDay(dateKey)}`}
                                >
                                    Add
                                </button>
                            </section>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Calendar

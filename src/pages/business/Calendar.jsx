import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import DayRail from '../../components/business/DayRail'
import Agenda from '../../components/business/Agenda'
import { useIsDesktop } from '../../components/business/useIsDesktop'
import StaffFilter from '../../components/business/StaffFilter'
import WeekBoard from '../../components/business/WeekBoard'
import BlockSheet from '../../components/business/BlockSheet'
import MonthGrid from '../../components/business/MonthGrid'
import { Button } from '../../components/ui'
import { dayFigures, monthRange, shiftMonth, weekFigures } from '../../services/day'
import { moneyFor } from '../../services/insights'
import {
    addDays,
    formatDay,
    friendlyError,
    minutesToLabel,
    setBookingStatus,
    loadBlocks,
    loadBookings,
    shortTime,
    startOfWeek,
    windowsFor,
    zonedNow,
} from '../../services/business'
import { parseDateKey } from '../../services/dates'
import '../../styles/business/day.css'
import '../../styles/business/calendar.css'

const Calendar = () => {
    const { business, bookableMembers, hours, me, isOwner, bookingsVersion, refreshBookings, openNewBooking, openBooking, notify } = useWorkspace()
    const isDesktop = useIsDesktop()
    const today = zonedNow(business.timezone)
    const [view, setView] = useState('day')
    const [params, setParams] = useSearchParams()
    const [anchor, setAnchor] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : today.dateKey))
    const [staffFilter, setStaffFilter] = useState(isOwner ? 'all' : me?.id)
    const [bookings, setBookings] = useState([])
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [blockSheet, setBlockSheet] = useState(null)
    const picker = useRef(null)

    const range = useMemo(() => {
        if (view === 'day') return [anchor, anchor]
        if (view === 'month') return monthRange(anchor)
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

    const waiting = useMemo(
        () => visible.filter((b) => b.status === 'pending' && b.appointment_date === anchor).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
        [visible, anchor]
    )

    useEffect(() => {
        if (params.get('date')) setParams((prev) => { const next = new URLSearchParams(prev); next.delete('date'); return next }, { replace: true })
    }, [params, setParams])

    const money = useMemo(() => moneyFor(business.country), [business.country])
    const week = view === 'week' ? weekFigures({ bookings: visible, hours, members: columns, now: today, anchor: range[0] }) : null

    const step = view === 'day' ? 1 : 7
    const move = (dir) => setAnchor(view === 'month' ? shiftMonth(anchor, dir) : addDays(anchor, dir * step))
    const unit = { day: 'day', week: 'week', month: 'month' }[view]
    const title = view === 'day'
        ? formatDay(anchor)
        : view === 'month'
            ? formatDay(anchor, { month: 'long', year: 'numeric' })
            : range[0].slice(0, 7) === range[1].slice(0, 7)
                ? `${formatDay(range[0], { day: 'numeric' })} to ${formatDay(range[1], { day: 'numeric', month: 'long' })}`
                : `${formatDay(range[0], { day: 'numeric', month: 'long' })} to ${formatDay(range[1], { day: 'numeric', month: 'long' })}`

    // One line under the date that says what the range holds, in words, never a row of zeros.
    const inRange = visible.filter((b) => b.status !== 'cancelled' && b.appointment_date >= range[0] && b.appointment_date <= range[1])
    const toConfirm = inRange.filter((b) => b.status === 'pending').length
    const booked = inRange.length === 0 ? 'Nothing booked yet' : inRange.length === 1 ? '1 booking' : `${inRange.length} bookings`
    const confirmLine = toConfirm ? `, ${toConfirm} to confirm` : ''
    let summary = `${booked}${confirmLine}.`
    if (view === 'day') {
        const staff = staffFilter === 'all' ? null : columns[0] || null
        const windows = windowsFor(hours, staff?.id, parseDateKey(anchor).getDay())
        const fill = Math.round(dayFigures({ bookings: visible, hours, members: columns, dateKey: anchor, now: today }).fill * 100)
        summary = windows.length === 0
            ? `Closed.${inRange.length ? ` ${booked}${confirmLine}.` : ''}`
            : `Open ${minutesToLabel(windows[0][0])} to ${minutesToLabel(windows[windows.length - 1][1])}. ${booked}${confirmLine}${inRange.length ? `, ${fill}% of the day` : ''}.`
    } else if (view === 'week' && week && inRange.length) {
        summary = `${booked}${confirmLine}, ${Math.round(week.fill * 100)}% of the week.`
    }

    const pickDate = () => {
        const input = picker.current
        if (!input) return
        try { input.showPicker() } catch { input.focus() }
    }

    return (
        <div className="biz-page">
            <header className="biz-calhead">
                <div className="biz-calhead__text">
                    <p className="biz-calhead__kicker">Calendar</p>
                    <h1 className="biz-calhead__title">{title}</h1>
                    <p className="biz-calhead__sum">{loading && bookings.length === 0 ? '\u00a0' : summary}</p>
                </div>
                <div className="biz-seg" role="radiogroup" aria-label="View">
                    {['day', 'week', 'month'].map((option) => (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={view === option}
                            className={`biz-seg__btn${view === option ? ' is-selected' : ''}`}
                            onClick={() => setView(option)}
                        >
                            {{ day: 'Day', week: 'Week', month: 'Month' }[option]}
                        </button>
                    ))}
                </div>
            </header>

            <div className="biz-datenav">
                <div className="biz-datenav__step">
                    <button type="button" className="biz-icon-btn" aria-label={`Previous ${unit}`} onClick={() => move(-1)}>
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm biz-datenav__today" onClick={() => setAnchor(today.dateKey)} aria-pressed={anchor === today.dateKey}>
                        Today
                    </button>
                    <button type="button" className="biz-icon-btn" aria-label={`Next ${unit}`} onClick={() => move(1)}>
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="biz-datenav__pick">
                    <button type="button" className="biz-icon-btn" aria-label="Go to a date" onClick={pickDate}>
                        <CalendarDays size={20} aria-hidden="true" />
                    </button>
                    <input
                        ref={picker}
                        className="biz-datenav__input"
                        type="date"
                        value={anchor}
                        aria-label="Go to date"
                        tabIndex={-1}
                        onChange={(event) => event.target.value && setAnchor(event.target.value)}
                    />
                </div>
                {view === 'day' && (
                    <Button variant="secondary" icon={Ban} className="biz-datenav__block" onClick={() => setBlockSheet({ dateKey: anchor, start: today.dateKey === anchor ? Math.ceil(today.minutes / 15) * 15 : null })}>
                        Block time
                    </Button>
                )}
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
                    bookings={visible.filter((b) => b.appointment_date === anchor)}
                    blocks={blocks}
                    hours={hours}
                    staff={staffFilter === 'all' ? null : bookableMembers.find((m) => m.id === staffFilter) || null}
                    members={bookableMembers}
                    nowMinutes={anchor === today.dateKey ? today.minutes : null}
                    past={anchor < today.dateKey}
                    onBook={(minutes, staffId) => openNewBooking({ staffId, date: anchor, time: minutesToLabel(minutes) })}
                    onOpen={openBooking}
                    onBlock={(block) => setBlockSheet({ dateKey: anchor, block })}
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

            {view === 'day' && isDesktop && waiting.length > 0 && (
                <div className="biz-cal-needs" role="status">
                    <span className="biz-cal-needs__label">{waiting.length === 1 ? '1 booking waits for you' : `${waiting.length} bookings wait for you`}</span>
                    {waiting.map((b) => (
                        <button key={b.id} type="button" className="biz-cal-needs__item" onClick={() => openBooking(b)}>
                            <b className="biz-num">{shortTime(b.appointment_time)}</b> {b.client_name}
                        </button>
                    ))}
                </div>
            )}

            {view === 'day' && !(loading && bookings.length === 0) && isDesktop && (
                <DayRail
                    dateKey={anchor}
                    columns={columns}
                    bookings={visible}
                    blocks={blocks}
                    hours={hours}
                    nowMinutes={anchor === today.dateKey ? today.minutes : null}
                    past={anchor < today.dateKey}
                    onSlotTap={(staffId, minutes) => openNewBooking({
                        staffId,
                        date: anchor,
                        time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
                    })}
                    onBookingTap={openBooking}
                    onBlockTap={(block) => setBlockSheet({ dateKey: anchor, block })}
                />
            )}

            {view === 'month' && !(loading && bookings.length === 0) && (
                <MonthGrid
                    anchor={anchor}
                    range={range}
                    bookings={visible}
                    blocks={blocks}
                    hours={hours}
                    members={columns}
                    today={today}
                    onPick={(key) => { setAnchor(key); setView('day') }}
                />
            )}

            {view === 'week' && week && !(loading && bookings.length === 0) && (
                <WeekBoard
                    week={week}
                    bookings={visible}
                    todayKey={today.dateKey}
                    money={money}
                    onPickDay={(key) => { setAnchor(key); setView('day') }}
                    onOpen={openBooking}
                    onAdd={(key) => openNewBooking({ date: key, staffId: staffFilter !== 'all' ? staffFilter : undefined })}
                />
            )}
            <BlockSheet
                open={Boolean(blockSheet)}
                dateKey={blockSheet?.dateKey || anchor}
                startMinutes={blockSheet?.start}
                block={blockSheet?.block || null}
                onClose={() => setBlockSheet(null)}
                onChanged={refreshBookings}
            />
        </div>
    )
}

export default Calendar

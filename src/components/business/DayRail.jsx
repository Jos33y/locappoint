import { useEffect, useMemo, useRef } from 'react'
import { parseDateKey, toMinutes } from '../../services/dates'
import { STATUS_LABEL, bookingStart, minutesToLabel, shortTime } from '../../services/business'

const PX_PER_MINUTE = 1.4
const SNAP = 15

const windowsFor = (hours, memberId, weekday) => {
    const own = hours.filter((h) => h.staff_id === memberId)
    const source = own.length > 0 ? own : hours.filter((h) => !h.staff_id)
    return source
        .filter((h) => h.day_of_week === weekday)
        .map((h) => [toMinutes(h.start_time), toMinutes(h.end_time)])
}

const blockRange = (block, dateKey) => {
    const dayStart = new Date(`${dateKey}T00:00:00`).getTime()
    const start = Math.max(0, (new Date(block.starts_at).getTime() - dayStart) / 60000)
    const end = Math.min(24 * 60, (new Date(block.ends_at).getTime() - dayStart) / 60000)
    return [start, end]
}

const DayRail = ({ dateKey, columns, bookings, blocks, hours, nowMinutes, onSlotTap, onBookingTap }) => {
    const scrollRef = useRef(null)
    const weekday = parseDateKey(dateKey).getDay()

    const layout = useMemo(() => {
        const perColumn = columns.map((member) => ({
            member,
            windows: windowsFor(hours, member.id, weekday),
            bookings: bookings.filter((b) => b.staff_id === member.id && b.status !== 'cancelled'),
            blocks: blocks
                .filter((b) => b.staff_id === member.id || !b.staff_id)
                .map((b) => ({ ...b, range: blockRange(b, dateKey) }))
                .filter((b) => b.range[1] > b.range[0]),
        }))

        const marks = perColumn.flatMap((c) => [
            ...c.windows.flat(),
            ...c.bookings.flatMap((b) => [bookingStart(b), bookingStart(b) + b.duration_minutes]),
        ])
        const start = marks.length ? Math.floor(Math.min(...marks) / 60) * 60 : 9 * 60
        const end = marks.length ? Math.ceil(Math.max(...marks) / 60) * 60 : 18 * 60
        return { perColumn, start: Math.max(0, start), end: Math.min(24 * 60, Math.max(end, start + 60)) }
    }, [columns, bookings, blocks, hours, weekday, dateKey, nowMinutes])

    const { perColumn, start, end } = layout
    const height = (end - start) * PX_PER_MINUTE
    const y = (minutes) => (minutes - start) * PX_PER_MINUTE
    const hourMarks = []
    for (let m = start; m <= end; m += 60) hourMarks.push(m)
    const showNow = nowMinutes != null && nowMinutes >= start && nowMinutes <= end

    // Open on now, or before opening on the first booking that needs the owner, so a short laptop screen shows what matters.
    useEffect(() => {
        const box = scrollRef.current
        if (!box) return
        const all = perColumn.flatMap((c) => c.bookings)
        const pending = all.filter((b) => b.status === 'pending').map(bookingStart).sort((a, b) => a - b)[0]
        const target = showNow ? nowMinutes : pending ?? null
        box.scrollTop = target == null ? 0 : Math.max(0, y(target) - box.clientHeight / 3)
    }, [dateKey])

    const handleColumnClick = (event, memberId) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        const minutes = start + Math.floor((event.clientY - rect.top) / PX_PER_MINUTE / SNAP) * SNAP
        onSlotTap?.(memberId, Math.min(Math.max(minutes, start), end - SNAP))
    }

    return (
        <div ref={scrollRef} className={`biz-rail${columns.length > 1 ? ' biz-rail--multi' : ''}`}>
            {columns.length > 1 && (
                <div className="biz-rail__heads" aria-hidden="true">
                    <span className="biz-rail__gutter" />
                    {columns.map((member) => (
                        <span key={member.id} className="biz-rail__head">{member.display_name}</span>
                    ))}
                </div>
            )}

            <div className="biz-rail__body" style={{ height }}>
                <div className="biz-rail__gutter">
                    {hourMarks.map((m) => (
                        <span key={m} className="biz-rail__hour" style={{ top: y(m) }}>{minutesToLabel(m)}</span>
                    ))}
                </div>

                {perColumn.map((column) => (
                    <div
                        key={column.member.id}
                        className="biz-rail__col"
                        onClick={(event) => handleColumnClick(event, column.member.id)}
                        role="presentation"
                    >
                        {hourMarks.map((m) => (
                            <span key={m} className="biz-rail__line" style={{ top: y(m) }} />
                        ))}

                        {column.windows.map(([from, to]) => (
                            <span key={`${from}-${to}`} className="biz-rail__open" style={{ top: y(from), height: (to - from) * PX_PER_MINUTE }} />
                        ))}

                        {column.blocks.map((block) => (
                            <div
                                key={block.id}
                                className="biz-rail__block"
                                style={{ top: y(block.range[0]), height: (block.range[1] - block.range[0]) * PX_PER_MINUTE }}
                            >
                                <span>Blocked{block.reason ? `: ${block.reason}` : ''}</span>
                            </div>
                        ))}

                        {column.bookings.map((booking) => {
                            const from = bookingStart(booking)
                            const blockHeight = Math.max(booking.duration_minutes * PX_PER_MINUTE, 30)
                            return (
                                <button
                                    key={booking.id}
                                    type="button"
                                    className={`biz-booking biz-booking--${booking.status}${blockHeight < 56 ? ' biz-booking--compact' : ''}`}
                                    style={{ top: y(from), height: blockHeight }}
                                    onClick={() => onBookingTap?.(booking)}
                                    aria-label={`${shortTime(booking.appointment_time)} ${booking.client_name}, ${booking.services?.service_name || 'booking'}, ${STATUS_LABEL[booking.status]}`}
                                >
                                    <span className="biz-booking__time">
                                        {shortTime(booking.appointment_time)}
                                        {booking.status === 'pending' && <span className="biz-booking__flag">Needs confirming</span>}
                                    </span>
                                    <span className="biz-booking__who">{booking.client_name}</span>
                                    <span className="biz-booking__what">{booking.services?.service_name}</span>
                                </button>
                            )
                        })}
                    </div>
                ))}

                {showNow && (
                    <div className="biz-rail__now" style={{ top: y(nowMinutes) }} aria-hidden="true">
                        <span className="biz-rail__now-label">{minutesToLabel(nowMinutes)}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DayRail

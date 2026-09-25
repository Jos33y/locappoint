import { useMemo } from 'react'
import { parseDateKey } from '../../services/dates'
import { bookingStart, blockMinutes, durationLabel, minutesToLabel, shortTime, windowsFor } from '../../services/business'

const Agenda = ({ dateKey, bookings, blocks, hours, staff, members, nowMinutes, past = false, onBook, onOpen, onConfirm }) => {
    const weekday = parseDateKey(dateKey).getDay()
    const showStaff = !staff && members.length > 1

    const items = useMemo(() => {
        const rows = bookings
            .filter((b) => b.status !== 'cancelled')
            .map((b) => ({ kind: 'booking', start: bookingStart(b), end: bookingStart(b) + b.duration_minutes, booking: b }))

        const blockRows = blocks
            .filter((b) => !staff || !b.staff_id || b.staff_id === staff.id)
            .map((b) => {
                const [start, end] = blockMinutes(b, dateKey)
                return { kind: 'block', start, end, block: b }
            })
            .filter((b) => b.end > b.start)

        const gaps = []
        if (!past && (staff || members.length === 1)) {
            const busy = [...rows, ...blockRows]
                .filter((r) => r.kind === 'block' || ['pending', 'confirmed'].includes(r.booking.status))
                .map((r) => [r.start, r.end])
                .sort((a, b) => a[0] - b[0])
            const floor = nowMinutes != null ? Math.ceil(nowMinutes / 15) * 15 : 0
            windowsFor(hours, staff?.id || members[0]?.id, weekday).forEach(([open, close]) => {
                let cursor = Math.max(open, floor)
                busy.forEach(([from, to]) => {
                    if (to <= cursor || from >= close) return
                    if (from - cursor >= 15) gaps.push({ kind: 'gap', start: cursor, end: from })
                    cursor = Math.max(cursor, to)
                })
                if (close - cursor >= 15) gaps.push({ kind: 'gap', start: cursor, end: close })
            })
        }

        const all = [...rows, ...blockRows, ...gaps].sort((a, b) => a.start - b.start || (a.kind === 'gap') - (b.kind === 'gap'))
        if (nowMinutes != null) {
            const index = all.findIndex((r) => r.end > nowMinutes)
            all.splice(index === -1 ? all.length : index, 0, { kind: 'now', start: nowMinutes })
        }
        return all
    }, [bookings, blocks, hours, staff, members, weekday, dateKey, nowMinutes, past])

    const memberName = (id) => members.find((m) => m.id === id)?.display_name

    return (
        <ol className="biz-agenda">
            {items.map((item) => {
                if (item.kind === 'now') {
                    return (
                        <li key="now" className="biz-agenda__now" aria-label={`Now, ${minutesToLabel(item.start)}`}>
                            <span className="biz-num">{minutesToLabel(item.start)}</span>
                        </li>
                    )
                }

                if (item.kind === 'gap') {
                    return (
                        <li key={`gap-${item.start}`} className="biz-agenda__row biz-agenda__row--gap">
                            <span className="biz-agenda__time biz-num">{minutesToLabel(item.start)}</span>
                            <div className="biz-agenda__gap">
                                <span>
                                    Free until <span className="biz-num">{minutesToLabel(item.end)}</span>
                                    <span className="biz-agenda__len">{durationLabel(item.end - item.start)}</span>
                                </span>
                                <button
                                    type="button"
                                    className="biz-agenda__book"
                                    onClick={() => onBook(item.start, staff?.id || members[0]?.id)}
                                >
                                    Book
                                </button>
                            </div>
                        </li>
                    )
                }

                if (item.kind === 'block') {
                    return (
                        <li key={`block-${item.block.id}`} className="biz-agenda__row">
                            <span className="biz-agenda__time biz-num">{minutesToLabel(item.start)}</span>
                            <div className="biz-agenda__block">
                                {`Blocked until ${minutesToLabel(item.end)}${item.block.reason ? `, ${item.block.reason}` : ''}`}
                            </div>
                        </li>
                    )
                }

                const { booking } = item
                const done = past || (nowMinutes != null && item.end <= nowMinutes)
                return (
                    <li key={booking.id} className={`biz-agenda__row${done ? ' is-past' : ''}`}>
                        <span className="biz-agenda__time biz-num">
                            {shortTime(booking.appointment_time)}
                            <span className="biz-agenda__end">{minutesToLabel(item.end)}</span>
                        </span>
                        <div className={`biz-agenda__card biz-agenda__card--${booking.status}`}>
                            <button type="button" className="biz-agenda__open" onClick={() => onOpen(booking)}>
                                <span className="biz-agenda__who">{booking.client_name}</span>
                                <span className="biz-agenda__what">
                                    {booking.services?.service_name || 'Booking'}
                                    {showStaff && memberName(booking.staff_id) ? ` with ${memberName(booking.staff_id)}` : ''}
                                </span>
                                {booking.status !== 'confirmed' && (
                                    <span className={`biz-agenda__state biz-agenda__state--${booking.status}`}>
                                        {booking.status === 'pending' ? 'Needs confirming' : booking.status === 'completed' ? 'Completed' : 'No-show'}
                                    </span>
                                )}
                            </button>
                            {booking.status === 'pending' && (
                                <button type="button" className="biz-agenda__confirm" onClick={() => onConfirm(booking)}>
                                    Confirm
                                </button>
                            )}
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

export default Agenda

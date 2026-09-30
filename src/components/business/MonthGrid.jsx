import { useMemo } from 'react'
import { addDays, windowsFor } from '../../services/business'
import { parseDateKey } from '../../services/dates'
import { dayFigures } from '../../services/day'
import { isClosedDay } from '../../services/blocks'
import '../../styles/business/month.css'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// The month at a glance: each day's fill as a bar, so busy weeks and empty ones show before any number is read.
const MonthGrid = ({ anchor, range, bookings, blocks, hours, members, today, onPick }) => {
    const month = parseDateKey(anchor).getMonth()
    const days = useMemo(() => {
        const out = []
        for (let key = range[0]; key <= range[1]; key = addDays(key, 1)) out.push(key)
        return out
    }, [range])

    return (
        <div className="lc-month" role="grid" aria-label="Month">
            <div className="lc-month__dow" role="row">
                {DOW.map((d) => <span key={d} role="columnheader">{d}</span>)}
            </div>
            <div className="lc-month__days">
                {days.map((key) => {
                    const date = parseDateKey(key)
                    const closedByBlock = blocks.some((b) => isClosedDay(b) && b.starts_at.slice(0, 10) <= key && b.ends_at.slice(0, 10) > key)
                    const open = windowsFor(hours, null, date.getDay()).length > 0 || members.some((m) => windowsFor(hours, m.id, date.getDay()).length > 0)
                    const closed = closedByBlock || !open
                    const f = dayFigures({ bookings, hours, members, dateKey: key, now: today })
                    const pct = Math.round(f.fill * 100)
                    const label = `${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}. ${closed ? 'Closed' : `${f.count} ${f.count === 1 ? 'booking' : 'bookings'}, ${pct}% booked`}${f.pending.length ? `, ${f.pending.length} to confirm` : ''}`
                    return (
                        <button
                            key={key}
                            type="button"
                            role="gridcell"
                            className={`lc-month__day${date.getMonth() !== month ? ' is-out' : ''}${key === today.dateKey ? ' is-today' : ''}${key < today.dateKey ? ' is-past' : ''}${closed ? ' is-closed' : ''}`}
                            onClick={() => onPick(key)}
                            aria-label={label}
                        >
                            <span className="lc-month__num biz-num">{date.getDate()}</span>
                            {closed ? (
                                <span className="lc-month__closed">{closedByBlock ? 'Closed' : 'Off'}</span>
                            ) : (
                                <>
                                    <span className="lc-month__count biz-num">
                                        {f.count || ''}
                                        {f.pending.length > 0 && <i className="lc-month__pending" aria-hidden="true" />}
                                    </span>
                                    <span className="lc-month__bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                                </>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default MonthGrid

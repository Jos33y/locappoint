import { Plus } from 'lucide-react'
import { Ring } from '../ui'
import { STATUS_LABEL, formatDay, shortTime } from '../../services/business'

// The week in one piece: each day's ring heads its own list, so how full a day is and who is in it read together.
// A day with nothing booked says Open or Closed instead of a row of zeros.
const WeekBoard = ({ week, bookings, todayKey, money, onPickDay, onOpen, onAdd }) => (
    <ol className="biz-wb" aria-label="Week">
        {week.days.map((d) => {
            const rows = bookings
                .filter((b) => b.appointment_date === d.dateKey && b.status !== 'cancelled')
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
            const closed = d.capacity === 0
            const past = d.dateKey < todayKey
            const pct = Math.round(d.fill * 100)
            const amount = past ? d.earned : d.earned + d.toCome
            const state = closed ? 'Closed' : rows.length === 0 ? (past ? 'No visits' : 'Open') : `${pct}%`
            const day = formatDay(d.dateKey)
            return (
                <li key={d.dateKey} className={`biz-wb__day${d.dateKey === todayKey ? ' is-today' : ''}${closed ? ' is-closed' : ''}${past ? ' is-past' : ''}`}>
                    <div className="biz-wb__head">
                        <button
                            type="button"
                            className="biz-wb__open"
                            onClick={() => onPickDay(d.dateKey)}
                            aria-label={`${day}: ${closed ? 'closed' : rows.length ? `${rows.length} booked, ${pct}% of the day, ${money(amount)}` : past ? 'no visits' : 'open, nothing booked'}. Open the day.`}
                        >
                            <Ring value={closed ? 0 : d.fill} size={44} stroke={5} label={state} tone="brand">
                                <span className="biz-wb__num biz-num">{formatDay(d.dateKey, { day: 'numeric' })}</span>
                            </Ring>
                            <span className="biz-wb__what">
                                <span className="biz-wb__dow">{formatDay(d.dateKey, { weekday: 'short' })}</span>
                                <span className={`biz-wb__state${rows.length && !closed ? ' biz-num' : ''}`}>{state}</span>
                                {rows.length > 0 && amount > 0 && <span className="biz-wb__money biz-num">{money(amount)}</span>}
                            </span>
                        </button>
                        {!closed && !past && (
                            <button type="button" className="biz-wb__add" onClick={() => onAdd(d.dateKey)} aria-label={`Add a booking on ${day}`}>
                                <Plus size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    {rows.length > 0 && (
                        <ul className="biz-wb__list">
                            {rows.map((b) => (
                                <li key={b.id}>
                                    <button
                                        type="button"
                                        className={`biz-wb__item is-${b.status}`}
                                        onClick={() => onOpen(b)}
                                        aria-label={`${shortTime(b.appointment_time)} ${b.client_name}, ${STATUS_LABEL[b.status]}`}
                                    >
                                        <span className="biz-num">{shortTime(b.appointment_time)}</span>
                                        <span className="biz-wb__client">{b.client_name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            )
        })}
    </ol>
)

export default WeekBoard

import { Ring } from '../ui'
import { formatDay } from '../../services/business'
import '../../styles/business/overview.css'

// The week as seven small rings: how full each day is, and what it earned or holds.
export const WeekRings = ({ week, todayKey, money, onPick, selected }) => (
    <ol className="biz-weekrings" aria-label="This week">
        {week.days.map((d) => {
            const closed = d.capacity === 0
            const past = d.dateKey < todayKey
            const pct = Math.round(d.fill * 100)
            const amount = past ? d.earned : d.earned + d.toCome
            const label = `${formatDay(d.dateKey)}: ${closed ? 'closed' : `${pct}% booked, ${money(amount)} ${past ? 'earned' : 'booked'}`}`
            return (
                <li key={d.dateKey}>
                    <button
                        type="button"
                        className={`biz-weekrings__day${d.dateKey === todayKey ? ' is-today' : ''}${selected === d.dateKey ? ' is-selected' : ''}${closed ? ' is-closed' : ''}${past ? ' is-past' : ''}`}
                        onClick={() => onPick(d.dateKey)}
                        aria-label={label}
                    >
                        <span className="biz-weekrings__dow">{formatDay(d.dateKey, { weekday: 'short' })}</span>
                        <Ring value={closed ? 0 : d.fill} size={48} stroke={5} label={closed ? "Closed" : `${pct}% booked`} tone="brand">
                            <span className="biz-weekrings__num biz-num">{formatDay(d.dateKey, { day: 'numeric' })}</span>
                        </Ring>
                        <span className="biz-weekrings__fig biz-num">{closed ? 'Closed' : `${pct}%`}</span>
                        <span className="biz-weekrings__money biz-num">{closed || !amount ? '' : money(amount)}</span>
                    </button>
                </li>
            )
        })}
    </ol>
)

import { parseDateKey } from '../../../services/dates'
import { shortDate } from '../../../services/booking'

const W = 280
const H = 30
const PAD = 8
const Y = 15

// Past visits spaced by their real gaps, then the next due date, so the suggested day explains itself.
export const RhythmLine = ({ rhythm }) => {
    const dates = rhythm.recent.map((d) => parseDateKey(d))
    const due = rhythm.due_date ? parseDateKey(rhythm.due_date) : null
    const today = parseDateKey(rhythm.today)
    const first = dates[0].getTime()
    const end = Math.max(due?.getTime() || 0, today.getTime(), dates[dates.length - 1].getTime())
    const x = (date) => PAD + ((date.getTime() - first) / Math.max(1, end - first)) * (W - PAD * 2)
    const lastX = x(dates[dates.length - 1])
    const label = `Visits on ${rhythm.recent.map(shortDate).join(', ')}.${due ? ` Next due ${shortDate(rhythm.due_date)}.` : ''}`
    return (
        <svg className="lc-again__line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
            <line className="lc-again__track" x1={PAD} y1={Y} x2={W - PAD} y2={Y} />
            <line className="lc-again__done" x1={x(dates[0])} y1={Y} x2={lastX} y2={Y} />
            {due && <line className="lc-again__ahead" x1={lastX} y1={Y} x2={x(due)} y2={Y} />}
            <line className="lc-again__today" x1={x(today)} y1={Y - 9} x2={x(today)} y2={Y + 9} />
            {dates.map((d) => <circle key={d.getTime()} className="lc-again__visit" cx={x(d)} cy={Y} r="4" />)}
            {due && <circle className="lc-again__due-dot" cx={x(due)} cy={Y} r="5" />}
        </svg>
    )
}

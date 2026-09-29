import { useMemo } from 'react'
import { parseDateKey } from '../../services/dates'
import { useTip, Tip } from './useTip'

const niceMax = (value) => {
    if (value <= 0) return 0
    const power = 10 ** Math.floor(Math.log10(value))
    const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value)
    return step * power
}

const dayName = (key, options) => parseDateKey(key).toLocaleDateString('en-GB', options).replace(',', '').replace('Sept', 'Sep')

// Daily columns; past 45 days they fold into weeks so bars stay readable on a phone.
const columnsFor = (days) => {
    if (days.length <= 45) {
        return days.map((d) => ({
            key: d.day,
            earned: Number(d.earned) || 0,
            bookings: d.bookings,
            title: dayName(d.day, { weekday: 'short', day: 'numeric', month: 'short' }),
            tick: days.length <= 7 ? dayName(d.day, { weekday: 'short' }) : String(parseDateKey(d.day).getDate()),
        }))
    }
    const out = []
    for (let end = days.length; end > 0; end -= 7) {
        const chunk = days.slice(Math.max(0, end - 7), end)
        out.unshift({
            key: chunk[0].day,
            earned: chunk.reduce((sum, d) => sum + (Number(d.earned) || 0), 0),
            bookings: chunk.reduce((sum, d) => sum + d.bookings, 0),
            title: `Week of ${dayName(chunk[0].day, { day: 'numeric', month: 'short' })}`,
            tick: dayName(chunk[0].day, { day: 'numeric', month: 'short' }),
        })
    }
    return out
}

export const Columns = ({ days, money }) => {
    const { frame, tip, show, hide } = useTip()
    const cols = useMemo(() => columnsFor(days), [days])
    const top = niceMax(Math.max(0, ...cols.map((c) => c.earned)))
    const peak = cols.reduce((best, c, i) => (c.earned > (cols[best]?.earned ?? -1) ? i : best), -1)
    const every = cols.length <= 7 ? 1 : cols.length <= 14 ? 2 : 5

    return (
        <figure className="lc-ins-cols">
            <div className="lc-ins-cols__plot" ref={frame} onPointerLeave={hide}>
                <span className="lc-ins-cols__rule is-top" aria-hidden="true"><i className="biz-num">{top ? money(top) : ''}</i></span>
                <span className="lc-ins-cols__rule is-mid" aria-hidden="true" />
                <span className="lc-ins-cols__rule is-base" aria-hidden="true" />
                <div className="lc-ins-cols__bars">
                    {cols.map((c, i) => {
                        const height = top ? (c.earned / top) * 100 : 0
                        const lines = [[money(c.earned), c.title], [String(c.bookings), c.bookings === 1 ? 'booking' : 'bookings']]
                        return (
                            <button
                                key={c.key}
                                type="button"
                                className="lc-ins-cols__col"
                                aria-label={`${c.title}: ${money(c.earned)} earned, ${c.bookings} bookings`}
                                onPointerMove={(e) => show(e, lines)}
                                onFocus={(e) => show(e, lines)}
                                onBlur={hide}
                            >
                                {i === peak && c.earned > 0 && <span className="lc-ins-cols__peak biz-num" style={{ bottom: `${height}%` }}>{money(c.earned)}</span>}
                                <span className={`lc-ins-cols__bar${c.earned ? '' : ' is-zero'}`} style={{ height: `${height}%` }} />
                            </button>
                        )
                    })}
                </div>
                <Tip tip={tip} />
            </div>
            <div className="lc-ins-cols__ticks" aria-hidden="true">
                {cols.map((c, i) => <span key={c.key}>{i % every === 0 || i === cols.length - 1 ? c.tick : ''}</span>)}
            </div>
            <table className="ui-visually-hidden">
                <tbody>
                    {cols.map((c) => <tr key={c.key}><th>{c.title}</th><td>{money(c.earned)}</td><td>{c.bookings} bookings</td></tr>)}
                </tbody>
            </table>
        </figure>
    )
}

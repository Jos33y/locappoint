import { useTip, Tip } from './useTip'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LONG = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']
const pad = (h) => `${String(h).padStart(2, '0')}:00`

// Bookings by weekday and hour, within opening hours. One hue, brighter is busier, empty is plain.
export const Heatmap = ({ cells, open, close }) => {
    const { frame, tip, show, hide } = useTip()
    const first = Math.min(open, ...cells.map((c) => c.hour))
    const last = Math.max(close - 1, ...cells.map((c) => c.hour))
    const hours = Array.from({ length: Math.max(1, last - first + 1) }, (_, i) => first + i)
    const count = new Map(cells.map((c) => [`${c.dow}:${c.hour}`, c.bookings]))
    const max = Math.max(0, ...cells.map((c) => c.bookings))
    const level = (n) => (!n ? 0 : Math.max(1, Math.ceil((n / max) * 4)))
    const busiest = cells.reduce((best, c) => (c.bookings > (best?.bookings || 0) ? c : best), null)

    return (
        <figure className="lc-ins-heat">
            <div className="lc-ins-heat__grid" ref={frame} style={{ '--cols': hours.length }} onPointerLeave={hide}>
                <span aria-hidden="true" />
                {hours.map((h, i) => <span key={h} className="lc-ins-heat__hour biz-num" aria-hidden="true">{i % 3 === 0 ? String(h).padStart(2, '0') : ''}</span>)}
                {DAYS.map((d, di) => (
                    <div key={d} className="lc-ins-heat__row">
                        <span className="lc-ins-heat__day" aria-hidden="true">{d}</span>
                        {hours.map((h) => {
                            const n = count.get(`${di + 1}:${h}`) || 0
                            const lines = [[String(n), n === 1 ? 'booking' : 'bookings'], [`${LONG[di]}, ${pad(h)}`, '']]
                            return (
                                <span
                                    key={h}
                                    className={`lc-ins-heat__cell is-${level(n)}`}
                                    tabIndex={n ? 0 : -1}
                                    aria-label={`${LONG[di]} ${pad(h)}: ${n} bookings`}
                                    onPointerMove={(e) => show(e, lines)}
                                    onFocus={(e) => show(e, lines)}
                                    onBlur={hide}
                                />
                            )
                        })}
                    </div>
                ))}
                <Tip tip={tip} />
            </div>
            <figcaption className="lc-ins-heat__foot">
                {busiest ? <span>Busiest: <b>{LONG[busiest.dow - 1]} at {pad(busiest.hour)}</b></span> : <span>No bookings yet</span>}
                <span className="lc-ins-heat__scale" aria-hidden="true">
                    Fewer
                    {[1, 2, 3, 4].map((l) => <i key={l} className={`lc-ins-heat__cell is-${l}`} />)}
                    More
                </span>
            </figcaption>
        </figure>
    )
}

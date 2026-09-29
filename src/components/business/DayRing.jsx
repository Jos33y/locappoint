import { useEffect, useState } from 'react'
import { useCountUp } from '../ui'
import { bookingStart, minutesToLabel, windowsFor } from '../../services/business'
import { parseDateKey } from '../../services/dates'
import '../../styles/business/overview.css'

const TAU = Math.PI * 2

// Counting figures show whole amounts; the last frame shows the exact one, cents included.
const settle = (shown, target) => (Math.abs(shown - target) < 0.005 ? target : Math.round(shown))

const point = (c, r, turn) => [c + r * Math.cos(turn * TAU - Math.PI / 2), c + r * Math.sin(turn * TAU - Math.PI / 2)]

const arc = (c, r, from, to) => {
    const span = Math.max(0, Math.min(0.9999, to - from))
    const [x1, y1] = point(c, r, from)
    const [x2, y2] = point(c, r, from + span)
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// The day as a circle: open hours all the way round, each booking an arc, a hand for now.
// Booked time shifts from azure to amber as the day goes on: the one gradient the product uses.
export const DayRing = ({ dateKey, bookings, hours, staff, figures, nowMinutes, money, onBook, size = 248 }) => {
    const windows = windowsFor(hours, staff?.id, parseDateKey(dateKey).getDay())
    const shownFill = useCountUp(Math.round(figures.fill * 100))
    const earned = useCountUp(figures.earned)
    const toCome = useCountUp(figures.toCome)
    const [drawn, setDrawn] = useState(false)
    useEffect(() => {
        const frame = requestAnimationFrame(() => setDrawn(true))
        return () => cancelAnimationFrame(frame)
    }, [])

    const c = size / 2
    const stroke = size * 0.075
    const r = c - stroke / 2 - 6

    if (windows.length === 0) {
        return (
            <div className="biz-ring is-closed" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                    <circle className="biz-ring__closed" cx={c} cy={c} r={r} strokeWidth={stroke} />
                </svg>
                <div className="biz-ring__centre">
                    <b className="biz-ring__pct">Closed</b>
                    <span className="biz-ring__sub">No opening hours today</span>
                </div>
            </div>
        )
    }

    const open = windows[0][0]
    const close = windows[windows.length - 1][1]
    const span = close - open
    const turn = (m) => (Math.min(Math.max(m, open), close) - open) / span

    const live = bookings.filter((b) => ['pending', 'confirmed', 'completed', 'no_show'].includes(b.status) && (!staff || b.staff_id === staff.id))
    const arcs = live.map((b) => {
        const from = bookingStart(b)
        const to = from + (Number(b.duration_minutes) || 0)
        const mid = turn((from + to) / 2)
        return { id: b.id, status: b.status, from: turn(from), to: turn(to), mix: Math.round(mid * 100) }
    })

    const breaks = windows.slice(1).map((w, i) => [windows[i][1], w[0]])
    const busy = live.filter((b) => b.status !== 'no_show').map((b) => [bookingStart(b), bookingStart(b) + (Number(b.duration_minutes) || 0)]).sort((a, b) => a[0] - b[0])
    const floor = nowMinutes != null ? Math.max(open, Math.ceil(nowMinutes / 15) * 15) : open
    const gaps = []
    windows.forEach(([a, b]) => {
        let cursor = Math.max(a, floor)
        busy.forEach(([from, to]) => {
            if (to <= cursor || from >= b) return
            if (from - cursor >= 15) gaps.push([cursor, from])
            cursor = Math.max(cursor, to)
        })
        if (b - cursor >= 15) gaps.push([cursor, b])
    })

    const showNow = nowMinutes != null && nowMinutes >= open && nowMinutes <= close
    const [hx, hy] = showNow ? point(c, r, turn(nowMinutes)) : [c, c]
    const [ix, iy] = showNow ? point(c, r - stroke * 1.1, turn(nowMinutes)) : [c, c]
    const hours24 = []
    for (let m = Math.ceil(open / 60) * 60; m < close; m += 60) hours24.push(m)
    const pct = Math.round(figures.fill * 100)
    const label = `${pct}% of today's open time is booked. ${money(figures.earned)} earned, ${money(figures.toCome)} still to come.`

    return (
        <div className={`biz-ring${drawn ? ' is-drawn' : ''}${pct >= 100 ? ' is-full' : ''}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
                <circle className="biz-ring__base" cx={c} cy={c} r={r} strokeWidth={stroke} />
                {windows.map(([a, b]) => (
                    <path key={`w${a}`} className="biz-ring__open" d={arc(c, r, turn(a), turn(b))} strokeWidth={stroke} />
                ))}
                {breaks.map(([a, b]) => (
                    <path key={`b${a}`} className="biz-ring__break" d={arc(c, r, turn(a), turn(b))} strokeWidth={stroke * 0.35} />
                ))}
                {hours24.map((m) => {
                    const [x1, y1] = point(c, r + stroke / 2 + 2, turn(m))
                    const [x2, y2] = point(c, r + stroke / 2 + 6, turn(m))
                    return <line key={`t${m}`} className="biz-ring__tick" x1={x1} y1={y1} x2={x2} y2={y2} />
                })}
                {arcs.map((a) => (
                    <path
                        key={a.id}
                        className={`biz-ring__booked is-${a.status}`}
                        d={arc(c, r, a.from, a.to)}
                        strokeWidth={stroke}
                        style={a.status === 'confirmed' || a.status === 'completed' ? { stroke: `color-mix(in srgb, var(--signal) ${a.mix}%, var(--azure))` } : undefined}
                    />
                ))}
                {onBook && gaps.map(([a, b]) => (
                    <path
                        key={`g${a}`}
                        className="biz-ring__gap"
                        d={arc(c, r, turn(a), turn(b))}
                        strokeWidth={stroke * 1.8}
                        onClick={() => onBook(a)}
                    >
                        <title>{`Free ${minutesToLabel(a)} to ${minutesToLabel(b)}. Tap to book.`}</title>
                    </path>
                ))}
                {showNow && (
                    <g className="biz-ring__now">
                        <line x1={ix} y1={iy} x2={hx} y2={hy} />
                        <circle className="biz-ring__tip" cx={hx} cy={hy} r={stroke * 0.42} />
                    </g>
                )}
            </svg>
            <span className="biz-ring__open-at biz-num" aria-hidden="true">{minutesToLabel(open)}</span>
            <div className="biz-ring__centre">
                <b className="biz-ring__pct biz-num">{Math.round(shownFill)}<small>%</small></b>
                <span className="biz-ring__sub">of today booked</span>
                <span className="biz-ring__money">
                    <span><b className="biz-num">{money(settle(earned, figures.earned))}</b> earned</span>
                    <span className="is-soft"><b className="biz-num">{money(settle(toCome, figures.toCome))}</b> to come</span>
                </span>
            </div>
        </div>
    )
}

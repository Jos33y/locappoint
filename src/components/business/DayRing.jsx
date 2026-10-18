import { useEffect, useState } from 'react'
import { RollMoney, RollNumber } from './Rolling'
import { bookingStart, minutesToLabel, windowsFor } from '../../services/business'
import { parseDateKey } from '../../services/dates'
import '../../styles/business/overview.css'

const TAU = Math.PI * 2

const point = (c, r, turn) => [c + r * Math.cos(turn * TAU - Math.PI / 2), c + r * Math.sin(turn * TAU - Math.PI / 2)]

const arc = (c, r, from, to) => {
    const span = Math.max(0, Math.min(0.9999, to - from))
    const [x1, y1] = point(c, r, from)
    const [x2, y2] = point(c, r, from + span)
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// The day as a circle: open hours all the way round, each booking an arc, a hand for now.
// Booked time shifts from azure to amber as the day goes on: the one gradient the product uses.
// centre: 'figures' shows how full the day is and the money; 'hours' only the open hours (while loading);
// 'fresh' the open hours and where the first booking will land, for a business with none yet;
// 'pct' only how full the day was, for the small ring on the evening slip. paper draws it for the slip.
// 'ahead' a day still to come (dayName, such as Tomorrow): how many are booked and what they bring.
export const DayRing = ({ dateKey, bookings, hours, staff, figures, nowMinutes, money, country, onBook, centre = 'figures', paper = false, size = 248, dayName = 'Tomorrow' }) => {
    const windows = windowsFor(hours, staff?.id, parseDateKey(dateKey).getDay())
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
    const ahead = centre === 'ahead'
    const counts = centre === 'figures' || centre === 'pct' || ahead
    const openSpan = `${minutesToLabel(open)} to ${minutesToLabel(close)}`
    const label = ahead
        ? `${dayName}: ${figures.count} booked, ${money(figures.toCome)} expected. Open ${openSpan}.`
        : counts
        ? `${pct}% of today's open time is booked. ${money(figures.earned)} earned, ${money(figures.toCome)} still to come.`
        : `Open today from ${openSpan}.${centre === 'fresh' ? ' No bookings yet.' : ''}`

    return (
        <div className={`biz-ring${drawn ? ' is-drawn' : ''}${counts && pct >= 100 ? ' is-full' : ''}${counts ? '' : ' is-quiet'}${paper ? ' is-paper' : ''}${centre === 'pct' ? ' is-small' : ''}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
                <circle className="biz-ring__base" cx={c} cy={c} r={r} strokeWidth={stroke} />
                {windows.map(([a, b]) => (
                    <path key={`w${a}`} className="biz-ring__open" d={arc(c, r, turn(a), turn(b))} strokeWidth={stroke} />
                ))}
                {breaks.map(([a, b]) => (
                    <path key={`b${a}`} className="biz-ring__break" d={arc(c, r, turn(a), turn(b))} strokeWidth={2} />
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
                {!counts && gaps.map(([a, b]) => (
                    <path key={`f${a}`} className="biz-ring__free" d={arc(c, r, turn(a), turn(b))} strokeWidth={stroke} />
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
            {ahead ? (
                <div className="biz-ring__centre">
                    <span className="biz-ring__sub">{dayName}</span>
                    <b className="biz-ring__pct biz-num"><RollNumber value={figures.count} /></b>
                    <span className="biz-ring__sub">booked</span>
                    {figures.toCome > 0 && <span className="biz-ring__money"><span><b className="biz-num"><RollMoney value={figures.toCome} country={country} /></b> expected</span></span>}
                </div>
            ) : centre === 'pct' ? (
                <div className="biz-ring__centre">
                    <b className="biz-ring__pct biz-num"><RollNumber value={pct} /><small>%</small></b>
                </div>
            ) : counts ? (
                <div className="biz-ring__centre">
                    <b className="biz-ring__pct biz-num"><RollNumber value={pct} /><small>%</small></b>
                    <span className="biz-ring__sub">of today booked</span>
                    <span className="biz-ring__money">
                        <span><b className="biz-num"><RollMoney value={figures.earned} country={country} /></b> earned</span>
                        <span className="is-soft"><b className="biz-num"><RollMoney value={figures.toCome} country={country} /></b> to come</span>
                    </span>
                </div>
            ) : (
                <div className="biz-ring__centre">
                    <span className="biz-ring__sub">Open today</span>
                    <span className="biz-ring__span"><b className="biz-num">{minutesToLabel(open)}</b> to <b className="biz-num">{minutesToLabel(close)}</b></span>
                    {centre === 'fresh' && <span className="biz-ring__first">Your first booking lands here</span>}
                </div>
            )}
        </div>
    )
}

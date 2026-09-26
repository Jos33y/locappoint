import { useId, useRef, useState } from 'react'
import { Copy, Plus, X } from 'lucide-react'
import { Button, IconButton } from '../ui'
import { TimePicker } from '../ui/TimePicker'
import { WEEK, clock, dayProblem, sameWindows } from '../../services/hours'
import '../../styles/business/editors.css'

const LAST = 24 * 60 - 1
const STEP = 15
const snap = (m) => Math.round(m / STEP) * STEP
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const withBreak = (windows) => {
    const last = windows[windows.length - 1]
    if (last.end - last.start >= 180) {
        const cut = snap((last.start + last.end) / 2 - 30)
        return [...windows.slice(0, -1), { start: last.start, end: cut }, { start: cut + 60, end: last.end }]
    }
    const start = Math.min(last.end + 60, LAST - 60)
    return [...windows, { start, end: Math.min(start + 120, LAST) }]
}

const canExtend = (windows) => {
    const last = windows[windows.length - 1]
    return windows.length < 4 && (last.end - last.start >= 180 || last.end + 120 <= LAST)
}

const rangeFor = (week) => {
    const all = week.flat()
    const lo = Math.min(360, ...all.map((w) => Math.floor(w.start / 60) * 60))
    const hi = Math.max(1320, ...all.map((w) => Math.ceil(w.end / 60) * 60))
    return { lo, hi: Math.min(hi, 1440) }
}

const windowsText = (windows) => windows.map((w) => `${clock(w.start)} to ${clock(w.end)}`).join(', ')

const Handle = ({ edge, label, value, min, max, onChange, onDragStart }) => (
    <span
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={clock(value)}
        className={`biz-track__handle biz-track__handle--${edge}`}
        onPointerDown={onDragStart}
        onKeyDown={(e) => {
            const by = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP, PageDown: -60, PageUp: 60 }[e.key]
            if (by) { e.preventDefault(); onChange(clamp(value + by, min, max)) }
            if (e.key === 'Home') { e.preventDefault(); onChange(min) }
            if (e.key === 'End') { e.preventDefault(); onChange(max) }
        }}
    />
)

const Track = ({ long, windows, range, onChange, onOpen }) => {
    const ref = useRef(null)
    const span = range.hi - range.lo
    const pct = (m) => `${((clamp(m, range.lo, range.hi) - range.lo) / span) * 100}%`

    const drag = (index, edge) => (event) => {
        event.preventDefault()
        const track = ref.current
        if (!track) return
        const rect = track.getBoundingClientRect()
        const startX = event.clientX
        const original = windows[index]
        const prevEnd = index > 0 ? windows[index - 1].end : 0
        const nextStart = index < windows.length - 1 ? windows[index + 1].start : LAST
        event.currentTarget.setPointerCapture?.(event.pointerId)
        const move = (e) => {
            const delta = snap(((e.clientX - startX) / rect.width) * span)
            let next = { ...original }
            if (edge === 'start') next.start = clamp(original.start + delta, Math.max(prevEnd, 0), original.end - STEP)
            else if (edge === 'end') next.end = clamp(original.end + delta, original.start + STEP, nextStart === LAST ? LAST : nextStart)
            else {
                const length = original.end - original.start
                const start = clamp(original.start + delta, Math.max(prevEnd, 0), (nextStart === LAST ? LAST : nextStart) - length)
                next = { start, end: start + length }
            }
            onChange(windows.map((w, i) => (i === index ? next : w)))
        }
        const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
    }

    return (
        <div ref={ref} className="biz-track" role="group" aria-label={`${long} opening hours`}>
            {windows.length === 0 && <span className="biz-track__closed">Closed</span>}
            {windows.map((w, index) => {
                const prevEnd = index > 0 ? windows[index - 1].end : 0
                const nextStart = index < windows.length - 1 ? windows[index + 1].start : LAST
                const set = (patch) => onChange(windows.map((x, i) => (i === index ? { ...x, ...patch } : x)))
                return (
                    <span key={index} className="biz-track__bar" style={{ left: pct(w.start), width: `calc(${pct(w.end)} - ${pct(w.start)})` }}>
                        <span className="biz-track__body" onPointerDown={drag(index, 'move')} onDoubleClick={onOpen} />
                        <Handle edge="start" label={`${long} opens`} value={w.start} min={prevEnd} max={w.end - STEP} onChange={(start) => set({ start })} onDragStart={drag(index, 'start')} />
                        <Handle edge="end" label={`${long} closes`} value={w.end} min={w.start + STEP} max={nextStart} onChange={(end) => set({ end })} onDragStart={drag(index, 'end')} />
                    </span>
                )
            })}
        </div>
    )
}

const Day = ({ dow, long, windows, monday, range, editing, onEdit, setDay }) => {
    const nameId = useId()
    const open = windows.length > 0
    const problem = open ? dayProblem(windows) : null
    const showSame = dow !== 1 && open && monday.length > 0 && !sameWindows(windows, monday)
    const setWindow = (index, patch) => setDay(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)))
    const splits = open && windows[windows.length - 1].end - windows[windows.length - 1].start >= 180

    return (
        <li className={`biz-week__day${open ? ' is-open' : ''}${editing ? ' is-editing' : ''}${problem ? ' has-error' : ''}`}>
            <span id={nameId} className="biz-week__name">{long}</span>
            <Track long={long} windows={windows} range={range} onChange={setDay} onOpen={onEdit} />
            {open ? (
                <button type="button" className="biz-week__times" onClick={onEdit} aria-expanded={editing} aria-label={`Edit ${long} hours, ${windowsText(windows)}`}>
                    {windows.map((w) => <span key={w.start}>{clock(w.start)} to {clock(w.end)}</span>)}
                </button>
            ) : <span className="biz-week__times" aria-hidden="true" />}
            <button
                type="button"
                role="switch"
                aria-checked={open}
                aria-labelledby={nameId}
                className={`ui-switch${open ? ' is-on' : ''}`}
                onClick={() => setDay(open ? [] : (monday.length > 0 && dow !== 1 ? monday.map((w) => ({ ...w })) : [{ start: 540, end: 1080 }]))}
            >
                <span className="ui-switch__thumb" />
            </button>

            {problem && <p className="biz-week__error" role="alert">{problem}</p>}

            {editing && open && (
                <div className="biz-week__editor">
                    {windows.map((w, index) => (
                        <span key={index} className="biz-week__window">
                            <TimePicker value={w.start} label={`${long} opens`} max={LAST - STEP} invalid={Boolean(problem)} onChange={(start) => setWindow(index, { start })} />
                            <span className="biz-week__to" aria-hidden="true">to</span>
                            <TimePicker value={w.end} label={`${long} closes`} min={STEP} invalid={Boolean(problem)} onChange={(end) => setWindow(index, { end })} />
                            {windows.length > 1 && (
                                <IconButton icon={X} variant="quiet" size="sm" label={`Remove ${long} hours ${index + 1}`} onClick={() => setDay(windows.filter((_, i) => i !== index))} />
                            )}
                        </span>
                    ))}
                    <span className="biz-week__actions">
                        {canExtend(windows) && (
                            <Button variant="quiet" size="sm" icon={Plus} onClick={() => setDay(withBreak(windows))}>
                                {splits ? 'Add a break' : 'Add more hours'}
                            </Button>
                        )}
                        {showSame && (
                            <Button variant="quiet" size="sm" icon={Copy} onClick={() => setDay(monday.map((m) => ({ ...m })))}>
                                Same as Monday
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={onEdit}>Done</Button>
                    </span>
                </div>
            )}
        </li>
    )
}

const hoursLabel = (minutes) => {
    const h = Math.round((minutes / 60) * 2) / 2
    return `${h % 1 === 0 ? h : h.toFixed(1)} ${h === 1 ? 'hour' : 'hours'}`
}

export const HoursEditor = ({ week, onChange }) => {
    const [editing, setEditing] = useState(null)
    const monday = week[1]
    const range = rangeFor(week)
    const setDay = (dow) => (windows) => onChange(week.map((day, i) => (i === dow ? windows : day)))
    const differsFromMonday = WEEK.filter(({ dow }) => dow !== 1 && week[dow].length > 0 && !sameWindows(week[dow], monday))
    const openDays = week.filter((d) => d.length > 0).length
    const minutes = week.flat().reduce((sum, w) => sum + Math.max(0, w.end - w.start), 0)
    const ticks = []
    for (let m = Math.ceil(range.lo / 180) * 180; m <= range.hi; m += 180) ticks.push(m)

    return (
        <div className="biz-week">
            <div className="biz-week__head">
                <p className="biz-week__summary" aria-live="polite">
                    <strong>{openDays === 0 ? 'Closed all week' : `Open ${openDays} ${openDays === 1 ? 'day' : 'days'}`}</strong>
                    {openDays > 0 && <span>{hoursLabel(minutes)} a week</span>}
                </p>
                {monday.length > 0 && differsFromMonday.length > 1 && (
                    <Button variant="quiet" size="sm" icon={Copy} onClick={() => onChange(week.map((day, dow) => (dow !== 1 && day.length > 0 ? monday.map((w) => ({ ...w })) : day)))}>
                        Use Monday's hours every open day
                    </Button>
                )}
            </div>
            <ul className="biz-week__days">
                <li className="biz-week__axis" aria-hidden="true">
                    <span />
                    <span className="biz-week__scale">
                        {ticks.map((m) => (
                            <span key={m} style={{ left: `${((m - range.lo) / (range.hi - range.lo)) * 100}%` }}>{String(Math.floor(m / 60) % 24).padStart(2, '0')}</span>
                        ))}
                    </span>
                </li>
                {WEEK.map(({ dow, long }) => (
                    <Day
                        key={dow}
                        dow={dow}
                        long={long}
                        windows={week[dow]}
                        monday={monday}
                        range={range}
                        editing={editing === dow}
                        onEdit={() => setEditing((e) => (e === dow ? null : dow))}
                        setDay={setDay(dow)}
                    />
                ))}
            </ul>
            <p className="biz-week__hint">Drag the ends of a bar, or tap the times to set them exactly.</p>
        </div>
    )
}

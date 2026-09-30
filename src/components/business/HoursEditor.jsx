import { useState } from 'react'
import { Coffee, DoorClosed, Plus, X } from 'lucide-react'
import { Button, IconButton } from '../ui'
import { TimePicker } from '../ui/TimePicker'
import { breakLabel, clock, dayProblem } from '../../services/hours'
import { ShopClock, useNow } from './ShopClock'
import '../../styles/business/editors.css'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const LETTER = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 0: 'S' }
const NAME = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' }
const LAST = 24 * 60 - 1

const TEMPLATES = [
    { key: 'tue-sat', title: 'Tuesday to Saturday', detail: '10:00 to 19:00, lunch 14:00', groups: [{ days: [2, 3, 4, 5, 6], open: 600, close: 1140, breaks: [{ start: 840, end: 900 }] }] },
    { key: 'weekdays', title: 'Weekdays and Saturday', detail: '9:00 to 18:00, Saturday to 14:00', groups: [{ days: [1, 2, 3, 4, 5], open: 540, close: 1080, breaks: [{ start: 780, end: 840 }] }, { days: [6], open: 540, close: 840, breaks: [] }] },
    { key: 'mon-sat', title: 'Monday to Saturday', detail: '9:00 to 19:00, no break', groups: [{ days: [1, 2, 3, 4, 5, 6], open: 540, close: 1140, breaks: [] }] },
]

const MAX_BREAKS = 3

const groupFromWindows = (days, windows) => ({
    days,
    open: windows[0].start,
    close: windows[windows.length - 1].end,
    breaks: windows.slice(1).map((w, i) => ({ start: windows[i].end, end: w.start })),
})

export const groupsFromWeek = (week) => {
    const byShape = new Map()
    for (const dow of ORDER) {
        if (week[dow].length === 0) continue
        const key = JSON.stringify(week[dow])
        if (!byShape.has(key)) byShape.set(key, { days: [], windows: week[dow] })
        byShape.get(key).days.push(dow)
    }
    const groups = [...byShape.values()].map(({ days, windows }) => groupFromWindows(days, windows))
    return groups.length ? groups : [{ days: [], open: 540, close: 1080, breaks: [] }]
}

const sortedBreaks = (g) => [...(g.breaks || [])].sort((a, b) => a.start - b.start)

const windowsOf = (g) => {
    const windows = []
    let cursor = g.open
    for (const b of sortedBreaks(g)) {
        windows.push({ start: cursor, end: b.start })
        cursor = b.end
    }
    windows.push({ start: cursor, end: g.close })
    return windows
}

export const weekFromGroups = (groups) => {
    const week = [[], [], [], [], [], [], []]
    for (const g of groups) for (const dow of g.days) week[dow] = windowsOf(g)
    return week
}

export const groupProblem = (g) => {
    if (g.days.length === 0) return 'Pick at least one day'
    if (g.close <= g.open) return 'Closing time must be after opening time'
    const breaks = sortedBreaks(g)
    for (const [i, b] of breaks.entries()) {
        if (b.end <= b.start) return 'A break must end after it starts'
        if (b.start <= g.open || b.end >= g.close) return 'Breaks must sit inside your opening hours'
        if (i > 0 && b.start < breaks[i - 1].end) return 'Two breaks overlap'
    }
    return dayProblem(windowsOf(g))
}

const sameGroups = (a, b) => JSON.stringify(weekFromGroups(a)) === JSON.stringify(weekFromGroups(b))

const dayRuns = (days) => {
    const idx = [...days].map((d) => ORDER.indexOf(d)).sort((a, b) => a - b)
    const runs = []
    for (const i of idx) {
        const last = runs[runs.length - 1]
        if (last && i === last[1] + 1) last[1] = i
        else runs.push([i, i])
    }
    const labels = runs.map(([a, b]) => {
        if (a === b) return NAME[ORDER[a]]
        if (b === a + 1) return `${NAME[ORDER[a]]} and ${NAME[ORDER[b]]}`
        return `${NAME[ORDER[a]]} to ${NAME[ORDER[b]]}`
    })
    return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0] || ''
}

export const weekSentence = (groups) => {
    const real = groups.filter((g) => g.days.length > 0)
    if (real.length === 0) return 'Closed all week.'
    const parts = real.map((g) => `${dayRuns(g.days)}, ${clock(g.open)} to ${clock(g.close)}${sortedBreaks(g).map((b) => `, ${breakLabel(b).toLowerCase()} ${clock(b.start)} to ${clock(b.end)}`).join('')}`)
    const open = new Set(real.flatMap((g) => g.days))
    const closed = ORDER.filter((d) => !open.has(d))
    return `${parts.join('. ')}.${closed.length ? ` Closed ${dayRuns(closed)}.` : ''}`
}

export const WeekGlyph = ({ days, lunchDays = [] }) => (
    <span className="biz-glyph" aria-hidden="true">
        {ORDER.map((d) => (
            <span key={d} className={`${days.includes(d) ? 'is-open' : ''}${lunchDays.includes(d) ? ' has-lunch' : ''}`} />
        ))}
    </span>
)

const openWindows = (windows) => windows.filter((w) => w.end > w.start)

const axisOf = (week) => {
    const all = week.flatMap(openWindows)
    let lo = all.length ? Math.floor(Math.min(...all.map((w) => w.start)) / 60) : 9
    let hi = all.length ? Math.ceil(Math.max(...all.map((w) => w.end)) / 60) : 18
    while (hi - lo < 8) {
        if (lo > 0) lo -= 1
        if (hi - lo < 8 && hi < 24) hi += 1
    }
    const span = hi - lo
    const step = span <= 9 ? 2 : span <= 15 ? 3 : 4
    const ticks = []
    for (let h = Math.ceil(lo / step) * step; h <= hi; h += step) ticks.push(h)
    return { lo: lo * 60, hi: hi * 60, ticks }
}

const DoorSign = () => (
    <svg className="biz-sign" width="132" height="104" viewBox="0 0 132 104" aria-hidden="true">
        <path className="biz-sign__string" d="M44 30 L66 8 L88 30" />
        <circle className="biz-sign__nail" cx="66" cy="8" r="3" />
        <rect className="biz-sign__board" x="16" y="30" width="100" height="66" rx="10" />
        <rect className="biz-sign__line is-strong" x="30" y="44" width="36" height="6" rx="3" />
        {[58, 70, 82].map((y) => (
            <g key={y}>
                <rect className="biz-sign__line" x="30" y={y} width="18" height="4" rx="2" />
                <rect className="biz-sign__line" x="72" y={y} width="30" height="4" rx="2" />
            </g>
        ))}
        <circle className="biz-sign__dot" cx="104" cy="47" r="4" />
    </svg>
)

export const WeekView = ({ week, timeZone, status }) => {
    const now = useNow(timeZone)
    const axis = axisOf(week)
    const at = (m) => `${((Math.min(Math.max(m, axis.lo), axis.hi) - axis.lo) / (axis.hi - axis.lo)) * 100}%`
    const width = (w) => `${((Math.min(w.end, axis.hi) - Math.max(w.start, axis.lo)) / (axis.hi - axis.lo)) * 100}%`
    const empty = !week.some((day) => openWindows(day).length > 0)

    if (empty) {
        return (
            <section className="biz-wk biz-wk--empty">
                <DoorSign />
                <div className="biz-wk__emptytext">
                    <h2 className="biz-wk__emptytitle">Your door sign is blank</h2>
                    <p>Set the days and times you open. Clients can book any time inside them.</p>
                </div>
            </section>
        )
    }

    return (
        <section className="biz-wk" aria-label="Your week">
            {status && now && (
                <header className="biz-wk__status">
                    <ShopClock minutes={now.minutes} open={status.open} />
                    <div>
                        <p className={`biz-wk__state${status.open ? ' is-open' : ''}`}>{status.open ? 'Open now' : 'Closed now'}</p>
                        <p className="biz-wk__next">{status.text}</p>
                    </div>
                </header>
            )}
            <div className="biz-wk__axis" aria-hidden="true">
                <span className="biz-wk__scale">
                    {axis.ticks.map((h) => <span key={h} style={{ left: at(h * 60) }}>{String(h).padStart(2, '0')}</span>)}
                </span>
            </div>
            <ul className="biz-wk__rows">
                {ORDER.map((d) => {
                    const windows = openWindows(week[d])
                    const today = now?.dow === d
                    const showNow = today && now.minutes >= axis.lo && now.minutes <= axis.hi
                    const breaks = windows.slice(1).map((w, i) => ({ start: windows[i].end, end: w.start }))
                    return (
                        <li key={d} className={`biz-wk__row${today ? ' is-today' : ''}${windows.length ? '' : ' is-closed'}`}>
                            <span className="biz-wk__day">
                                {NAME[d]}
                                {today && <span className="biz-wk__today">Today</span>}
                            </span>
                            <span className="biz-wk__times">
                                {windows.length ? (
                                    <span className="biz-wk__range">
                                        <b>{clock(windows[0].start)}</b>
                                        <span className="biz-wk__to"> to </span>
                                        <b>{clock(windows[windows.length - 1].end)}</b>
                                    </span>
                                ) : (
                                    <span className="biz-wk__closed"><DoorClosed size={15} aria-hidden="true" />Closed</span>
                                )}
                                {breaks.map((g) => (
                                    <span key={g.start} className="biz-wk__lunch">
                                        <Coffee size={13} aria-hidden="true" />
                                        {`${breakLabel(g)} ${clock(g.start)} to ${clock(g.end)}`}
                                    </span>
                                ))}
                            </span>
                            <span className="biz-wk__track" aria-hidden="true">
                                {axis.ticks.map((h) => <i key={h} className="biz-wk__grid" style={{ left: at(h * 60) }} />)}
                                {windows.map((w) => <span key={w.start} className="biz-wk__bar" style={{ left: at(w.start), width: width(w) }} />)}
                                {showNow && <span className="biz-wk__now" style={{ left: at(now.minutes) }} />}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

const GroupCard = ({ group, index, taken, removable, weekEmpty, onChange, onRemove }) => {
    const starting = weekEmpty && group.days.length === 0
    const problem = starting ? null : groupProblem(group)
    const set = (patch) => onChange({ ...group, ...patch })
    const toggle = (d) => set({ days: group.days.includes(d) ? group.days.filter((x) => x !== d) : [...group.days, d] })
    const setBreak = (i, patch) => set({ breaks: group.breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
    // The first break lands around midday; later ones find the next free half hour after the last break.
    const addBreak = () => {
        const taken = sortedBreaks(group)
        const mid = Math.round(((group.open + group.close) / 2) / 60) * 60
        let start = taken.length ? taken[taken.length - 1].end + 120 : Math.max(group.open + 60, mid - 60)
        let length = taken.length ? 15 : 60
        if (start + length >= group.close) { start = group.open + 60; length = 15 }
        set({ breaks: [...group.breaks, { start, end: start + length }] })
    }

    return (
        <li className={`biz-sched__card${problem ? ' has-error' : ''}`}>
            <div className="biz-sched__top">
                <span className="biz-sched__days" role="group" aria-label={`Days in group ${index + 1}`}>
                    {ORDER.map((d) => {
                        const inOther = taken.includes(d)
                        const on = group.days.includes(d)
                        return (
                            <button
                                key={d}
                                type="button"
                                className={`biz-sched__day${on ? ' is-on' : ''}${inOther ? ' is-taken' : ''}`}
                                aria-pressed={on}
                                aria-label={inOther ? `${NAME[d]}, set below with other hours` : NAME[d]}
                                title={inOther ? `${NAME[d]} has its own hours` : undefined}
                                aria-disabled={inOther || undefined}
                                onClick={() => { if (!inOther) toggle(d) }}
                            >
                                {LETTER[d]}
                            </button>
                        )
                    })}
                </span>
            </div>

            <div className="biz-sched__line">
                <span className="biz-sched__label">Open</span>
                <TimePicker value={group.open} label={`Group ${index + 1} opens`} max={LAST - 15} onChange={(open) => set({ open })} />
                <span className="biz-sched__to">to</span>
                <TimePicker value={group.close} label={`Group ${index + 1} closes`} min={15} onChange={(close) => set({ close })} />
            </div>

            <div className="biz-sched__breaks">
                {group.breaks.length === 0 && <span className="biz-sched__none">No break. Clients can book straight through.</span>}
                {group.breaks.map((b, i) => (
                    <div key={i} className="biz-sched__brk">
                        <span className="biz-sched__label">{breakLabel(b)}</span>
                        <TimePicker value={b.start} label={`Group ${index + 1} break ${i + 1} starts`} onChange={(start) => setBreak(i, { start })} />
                        <span className="biz-sched__to">to</span>
                        <TimePicker value={b.end} label={`Group ${index + 1} break ${i + 1} ends`} onChange={(end) => setBreak(i, { end })} />
                        <IconButton icon={X} label={`Remove this ${breakLabel(b).toLowerCase()}`} variant="quiet" className="biz-sched__brkx" onClick={() => set({ breaks: group.breaks.filter((_, j) => j !== i) })} />
                    </div>
                ))}
                {group.breaks.length < MAX_BREAKS && (
                    <Button variant="quiet" icon={Plus} className="biz-sched__addbrk" onClick={addBreak}>
                        {group.breaks.length ? 'Add another break' : 'Add a break'}
                    </Button>
                )}
            </div>

            {problem && <p className="biz-sched__error" role="alert">{problem}</p>}
            {starting && <p className="biz-sched__hint">Pick the days you open.</p>}

            {removable && (
                <div className="biz-sched__foot">
                    <Button variant="quiet" size="sm" icon={X} onClick={onRemove}>Remove these days</Button>
                </div>
            )}
        </li>
    )
}

export const HoursEditor = ({ week, onChange, templates = true, timeZone, status, weekAt = 'top' }) => {
    const [groups, setGroups] = useState(() => groupsFromWeek(week))

    const commit = (next) => {
        setGroups(next)
        onChange(weekFromGroups(next))
    }

    const used = groups.flatMap((g) => g.days)
    const free = ORDER.filter((d) => !used.includes(d))
    const active = TEMPLATES.find((t) => sameGroups(t.groups, groups))?.key

    return (
        <div className="biz-sched">
            {weekAt === 'top' && <WeekView week={weekFromGroups(groups)} timeZone={timeZone} status={status} />}

            {templates && (
                <div className="biz-sched__templates" role="group" aria-label="Start from a common week">
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`biz-sched__template${active === t.key ? ' is-on' : ''}`}
                            aria-pressed={active === t.key}
                            onClick={() => commit(t.groups.map((g) => ({ ...g, days: [...g.days], breaks: g.breaks.map((b) => ({ ...b })) })))}
                        >
                            <WeekGlyph days={t.groups.flatMap((g) => g.days)} lunchDays={t.groups.filter((g) => g.breaks.length).flatMap((g) => g.days)} />
                            <span className="biz-sched__ttitle">{t.title}</span>
                            <span className="biz-sched__tdetail">{t.detail}</span>
                        </button>
                    ))}
                </div>
            )}

            <ol className="biz-sched__cards">
                {groups.map((g, i) => (
                    <GroupCard
                        key={i}
                        group={g}
                        index={i}
                        taken={groups.flatMap((x, j) => (j === i ? [] : x.days))}
                        removable={groups.length > 1}
                        weekEmpty={used.length === 0}
                        onChange={(next) => commit(groups.map((x, j) => (j === i ? next : x)))}
                        onRemove={() => commit(groups.filter((_, j) => j !== i))}
                    />
                ))}
            </ol>

            {free.length > 0 && (
                <Button
                    variant="quiet"
                    icon={Plus}
                    onClick={() => commit([...groups, { days: [free[0]], open: 600, close: 960, breaks: [] }])}
                >
                    Different hours on other days
                </Button>
            )}

            {weekAt === 'bottom' && <WeekView week={weekFromGroups(groups)} timeZone={timeZone} status={status} />}

            <p className="ui-visually-hidden" aria-live="polite">{weekSentence(groups)}</p>
        </div>
    )
}

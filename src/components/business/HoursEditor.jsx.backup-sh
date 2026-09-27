import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, IconButton } from '../ui'
import { TimePicker } from '../ui/TimePicker'
import { clock, dayProblem } from '../../services/hours'
import '../../styles/business/editors.css'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const LETTER = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 0: 'S' }
const NAME = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' }
const LAST = 24 * 60 - 1

const TEMPLATES = [
    { key: 'tue-sat', title: 'Tuesday to Saturday', detail: '10:00 to 19:00, lunch 14:00', groups: [{ days: [2, 3, 4, 5, 6], open: 600, close: 1140, lunch: { start: 840, end: 900 } }] },
    { key: 'weekdays', title: 'Weekdays and Saturday', detail: '9:00 to 18:00, Saturday to 14:00', groups: [{ days: [1, 2, 3, 4, 5], open: 540, close: 1080, lunch: { start: 780, end: 840 } }, { days: [6], open: 540, close: 840, lunch: null }] },
    { key: 'mon-sat', title: 'Monday to Saturday', detail: '9:00 to 19:00, no break', groups: [{ days: [1, 2, 3, 4, 5, 6], open: 540, close: 1140, lunch: null }] },
]

const groupFromWindows = (days, windows) => ({
    days,
    open: windows[0].start,
    close: windows[windows.length - 1].end,
    lunch: windows.length > 1 ? { start: windows[0].end, end: windows[1].start } : null,
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
    return groups.length ? groups : [{ days: [], open: 540, close: 1080, lunch: null }]
}

const windowsOf = (g) => (g.lunch ? [{ start: g.open, end: g.lunch.start }, { start: g.lunch.end, end: g.close }] : [{ start: g.open, end: g.close }])

export const weekFromGroups = (groups) => {
    const week = [[], [], [], [], [], [], []]
    for (const g of groups) for (const dow of g.days) week[dow] = windowsOf(g)
    return week
}

export const groupProblem = (g) => {
    if (g.days.length === 0) return 'Pick at least one day'
    if (g.close <= g.open) return 'Closing time must be after opening time'
    if (g.lunch) {
        if (g.lunch.end <= g.lunch.start) return 'Lunch must end after it starts'
        if (g.lunch.start <= g.open || g.lunch.end >= g.close) return 'Lunch must sit inside your opening hours'
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
    const parts = real.map((g) => `${dayRuns(g.days)}, ${clock(g.open)} to ${clock(g.close)}${g.lunch ? `, lunch ${clock(g.lunch.start)} to ${clock(g.lunch.end)}` : ''}`)
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

const GroupCard = ({ group, index, taken, removable, onChange, onRemove }) => {
    const problem = groupProblem(group)
    const set = (patch) => onChange({ ...group, ...patch })
    const toggle = (d) => set({ days: group.days.includes(d) ? group.days.filter((x) => x !== d) : [...group.days, d] })

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
                                className={`biz-sched__day${on ? ' is-on' : ''}`}
                                aria-pressed={on}
                                aria-label={inOther ? `${NAME[d]}, set in another group` : NAME[d]}
                                aria-disabled={inOther || undefined}
                                onClick={() => { if (!inOther) toggle(d) }}
                            >
                                {LETTER[d]}
                            </button>
                        )
                    })}
                </span>
                {removable && <IconButton icon={X} variant="quiet" size="sm" label={`Remove group ${index + 1}`} onClick={onRemove} />}
            </div>

            <div className="biz-sched__line">
                <span className="biz-sched__label">Open</span>
                <TimePicker value={group.open} label={`Group ${index + 1} opens`} max={LAST - 15} onChange={(open) => set({ open })} />
                <span className="biz-sched__to">to</span>
                <TimePicker value={group.close} label={`Group ${index + 1} closes`} min={15} onChange={(close) => set({ close })} />
            </div>

            <div className="biz-sched__line">
                <span className="biz-sched__label">Lunch</span>
                {group.lunch ? (
                    <>
                        <TimePicker value={group.lunch.start} label={`Group ${index + 1} lunch starts`} onChange={(start) => set({ lunch: { ...group.lunch, start } })} />
                        <span className="biz-sched__to">to</span>
                        <TimePicker value={group.lunch.end} label={`Group ${index + 1} lunch ends`} onChange={(end) => set({ lunch: { ...group.lunch, end } })} />
                    </>
                ) : <span className="biz-sched__none">No break</span>}
                <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(group.lunch)}
                    aria-label={`Lunch break for group ${index + 1}`}
                    className={`ui-switch biz-sched__switch${group.lunch ? ' is-on' : ''}`}
                    onClick={() => {
                        if (group.lunch) return set({ lunch: null })
                        const mid = Math.round(((group.open + group.close) / 2) / 60) * 60
                        return set({ lunch: { start: Math.max(group.open + 60, mid - 60), end: Math.max(group.open + 120, mid) } })
                    }}
                >
                    <span className="ui-switch__thumb" />
                </button>
            </div>

            {problem && <p className="biz-sched__error" role="alert">{problem}</p>}
        </li>
    )
}

export const HoursEditor = ({ week, onChange }) => {
    const [groups, setGroups] = useState(() => groupsFromWeek(week))

    const commit = (next) => {
        setGroups(next)
        onChange(weekFromGroups(next))
    }

    const used = groups.flatMap((g) => g.days)
    const free = ORDER.filter((d) => !used.includes(d))
    const active = TEMPLATES.find((t) => sameGroups(t.groups, groups))?.key
    const lunchDays = groups.filter((g) => g.lunch).flatMap((g) => g.days)

    return (
        <div className="biz-sched">
            <div className="biz-sched__templates" role="group" aria-label="Start from a common week">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        className={`biz-sched__template${active === t.key ? ' is-on' : ''}`}
                        aria-pressed={active === t.key}
                        onClick={() => commit(t.groups.map((g) => ({ ...g, days: [...g.days], lunch: g.lunch && { ...g.lunch } })))}
                    >
                        <WeekGlyph days={t.groups.flatMap((g) => g.days)} lunchDays={t.groups.filter((g) => g.lunch).flatMap((g) => g.days)} />
                        <span className="biz-sched__ttitle">{t.title}</span>
                        <span className="biz-sched__tdetail">{t.detail}</span>
                    </button>
                ))}
            </div>

            <ol className="biz-sched__cards">
                {groups.map((g, i) => (
                    <GroupCard
                        key={i}
                        group={g}
                        index={i}
                        taken={groups.flatMap((x, j) => (j === i ? [] : x.days))}
                        removable={groups.length > 1}
                        onChange={(next) => commit(groups.map((x, j) => (j === i ? next : x)))}
                        onRemove={() => commit(groups.filter((_, j) => j !== i))}
                    />
                ))}
            </ol>

            {free.length > 0 && (
                <Button
                    variant="quiet"
                    icon={Plus}
                    onClick={() => commit([...groups, { days: [free[0]], open: 600, close: 960, lunch: null }])}
                >
                    Different hours on other days
                </Button>
            )}

            <div className="biz-sched__summary" aria-live="polite">
                <WeekGlyph days={used} lunchDays={lunchDays} />
                <p>{weekSentence(groups)}</p>
            </div>
        </div>
    )
}

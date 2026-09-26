import { Copy, Plus, X } from 'lucide-react'
import { Button, IconButton, Switch, TimeField } from '../ui'
import { WEEK, dayProblem, sameWindows, windowsLabel } from '../../services/hours'
import '../../styles/business/editors.css'

const LAST = 24 * 60 - 1
const round15 = (m) => Math.round(m / 15) * 15

const withBreak = (windows) => {
    const last = windows[windows.length - 1]
    if (last.end - last.start >= 180) {
        const cut = round15((last.start + last.end) / 2 - 30)
        return [...windows.slice(0, -1), { start: last.start, end: cut }, { start: cut + 60, end: last.end }]
    }
    const start = Math.min(last.end + 60, LAST - 60)
    return [...windows, { start, end: Math.min(start + 120, LAST) }]
}

const canExtend = (windows) => {
    const last = windows[windows.length - 1]
    return last.end - last.start >= 180 || last.end + 120 <= LAST
}

export const HoursEditor = ({ week, onChange }) => {
    const monday = week[1]
    const setDay = (dow, windows) => onChange(week.map((day, i) => (i === dow ? windows : day)))
    const setWindow = (dow, index, patch) =>
        setDay(dow, week[dow].map((w, i) => (i === index ? { ...w, ...patch } : w)))

    const differsFromMonday = WEEK.filter(({ dow }) => dow !== 1 && week[dow].length > 0 && !sameWindows(week[dow], monday))
    const copyMondayToOpenDays = () =>
        onChange(week.map((day, dow) => (dow !== 1 && day.length > 0 ? monday.map((w) => ({ ...w })) : day)))

    return (
        <div className="biz-hours">
            {monday.length > 0 && differsFromMonday.length > 1 && (
                <div className="biz-hours__bulk">
                    <Button variant="quiet" size="sm" icon={Copy} onClick={copyMondayToOpenDays}>
                        Use Monday's hours on every open day
                    </Button>
                </div>
            )}
            <ul className="biz-hours__days">
                {WEEK.map(({ dow, long }) => {
                    const windows = week[dow]
                    const open = windows.length > 0
                    const problem = open ? dayProblem(windows) : null
                    const showSame = dow !== 1 && open && monday.length > 0 && !sameWindows(windows, monday)
                    return (
                        <li key={dow} className={`biz-hours__day${open ? ' is-open' : ''}${problem ? ' has-error' : ''}`}>
                            <Switch
                                checked={open}
                                label={long}
                                description={open ? windowsLabel(windows) : 'Closed'}
                                onChange={(on) => setDay(dow, on ? (monday.length > 0 && dow !== 1 ? monday.map((w) => ({ ...w })) : [{ start: 540, end: 1080 }]) : [])}
                            />
                            {open && (
                                <div className="biz-hours__windows">
                                    {windows.map((w, index) => (
                                        <div key={index} className="biz-hours__window">
                                            <TimeField
                                                value={w.start}
                                                label={`${long} opens`}
                                                invalid={Boolean(problem)}
                                                max={LAST - 15}
                                                onChange={(start) => setWindow(dow, index, { start })}
                                            />
                                            <span className="biz-hours__to">to</span>
                                            <TimeField
                                                value={w.end}
                                                label={`${long} closes`}
                                                invalid={Boolean(problem)}
                                                min={15}
                                                onChange={(end) => setWindow(dow, index, { end })}
                                            />
                                            {windows.length > 1 && (
                                                <IconButton
                                                    icon={X}
                                                    variant="quiet"
                                                    size="sm"
                                                    label={`Remove ${long} hours ${index + 1}`}
                                                    onClick={() => setDay(dow, windows.filter((_, i) => i !== index))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    {problem && <p className="biz-hours__error" role="alert">{problem}</p>}
                                    <div className="biz-hours__actions">
                                        {canExtend(windows) && (
                                            <Button variant="quiet" size="sm" icon={Plus} onClick={() => setDay(dow, withBreak(windows))}>
                                                {windows[windows.length - 1].end - windows[windows.length - 1].start >= 180 ? 'Add a break' : 'Add more hours'}
                                            </Button>
                                        )}
                                        {showSame && (
                                            <Button variant="quiet" size="sm" icon={Copy} onClick={() => setDay(dow, monday.map((m) => ({ ...m })))}>
                                                Same as Monday
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

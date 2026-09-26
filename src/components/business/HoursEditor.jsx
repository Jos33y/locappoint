import { useId } from 'react'
import { Copy, Plus, X } from 'lucide-react'
import { Button, IconButton } from '../ui'
import { TimePicker } from '../ui/TimePicker'
import { WEEK, dayProblem, sameWindows } from '../../services/hours'
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
    return windows.length < 4 && (last.end - last.start >= 180 || last.end + 120 <= LAST)
}

const Day = ({ dow, long, windows, monday, setDay }) => {
    const nameId = useId()
    const open = windows.length > 0
    const problem = open ? dayProblem(windows) : null
    const showSame = dow !== 1 && open && monday.length > 0 && !sameWindows(windows, monday)
    const setWindow = (index, patch) => setDay(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)))
    const splits = open && windows[windows.length - 1].end - windows[windows.length - 1].start >= 180

    return (
        <li className={`biz-hours__day${open ? ' is-open' : ''}${problem ? ' has-error' : ''}`}>
            <span id={nameId} className="biz-hours__name">{long}</span>

            <div className="biz-hours__slots">
                {!open && <span className="biz-hours__closed">Closed</span>}
                {windows.map((w, index) => (
                    <span key={index} className="biz-hours__window">
                        <TimePicker value={w.start} label={`${long} opens`} max={LAST - 15} invalid={Boolean(problem)} onChange={(start) => setWindow(index, { start })} />
                        <span className="biz-hours__to" aria-hidden="true">to</span>
                        <TimePicker value={w.end} label={`${long} closes`} min={15} invalid={Boolean(problem)} onChange={(end) => setWindow(index, { end })} />
                        {windows.length > 1 && (
                            <IconButton icon={X} variant="quiet" size="sm" label={`Remove ${long} hours ${index + 1}`} onClick={() => setDay(windows.filter((_, i) => i !== index))} />
                        )}
                    </span>
                ))}
                {problem && <p className="biz-hours__error" role="alert">{problem}</p>}
            </div>

            <span className="biz-hours__tools">
                {open && canExtend(windows) && (
                    <IconButton
                        icon={Plus}
                        variant="quiet"
                        size="sm"
                        label={splits ? `Add a break on ${long}` : `Add more hours on ${long}`}
                        title={splits ? 'Add a break' : 'Add more hours'}
                        onClick={() => setDay(withBreak(windows))}
                    />
                )}
                {showSame && (
                    <IconButton
                        icon={Copy}
                        variant="quiet"
                        size="sm"
                        label={`Same as Monday on ${long}`}
                        title="Same as Monday"
                        onClick={() => setDay(monday.map((m) => ({ ...m })))}
                    />
                )}
            </span>

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
        </li>
    )
}

export const HoursEditor = ({ week, onChange }) => {
    const monday = week[1]
    const setDay = (dow) => (windows) => onChange(week.map((day, i) => (i === dow ? windows : day)))
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
                {WEEK.map(({ dow, long }) => (
                    <Day key={dow} dow={dow} long={long} windows={week[dow]} monday={monday} setDay={setDay(dow)} />
                ))}
            </ul>
            <p className="biz-hours__legend">
                <Plus size={13} aria-hidden="true" /> adds a break
                <span aria-hidden="true">·</span>
                <Copy size={13} aria-hidden="true" /> copies Monday
            </p>
        </div>
    )
}

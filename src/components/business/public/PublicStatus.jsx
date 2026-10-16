import { Coffee } from 'lucide-react'
import { WEEK, clock } from '../../../services/hours'
import '../../../styles/public-page.css'

export const doorState = (week, now) => {
    if (!now || !week || !week.some((day) => day.length > 0)) return null
    const today = week[now.dow]
    const index = today.findIndex((w) => now.minutes >= w.start && now.minutes < w.end)
    if (index >= 0) {
        const current = today[index]
        const next = today[index + 1]
        const last = today[today.length - 1]
        return {
            tone: 'open',
            state: 'Open now',
            lead: 'Until',
            time: current.end,
            note: next ? `Lunch ${clock(current.end)} to ${clock(next.start)}, then open until ${clock(last.end)}` : null,
        }
    }
    const later = today.find((w) => w.start > now.minutes)
    if (later) {
        const opened = today.some((w) => w.end <= now.minutes)
        return opened
            ? { tone: 'lunch', state: 'On lunch break', lead: 'Back at', time: later.start, note: `Open until ${clock(today[today.length - 1].end)}` }
            : { tone: 'closed', state: 'Closed now', lead: 'Opens today at', time: later.start, note: null }
    }
    for (let i = 1; i <= 7; i++) {
        const dow = (now.dow + i) % 7
        if (week[dow].length > 0) {
            const day = i === 1 ? 'tomorrow' : WEEK.find((d) => d.dow === dow).long
            return { tone: 'closed', state: 'Closed now', lead: `Opens ${day} at`, time: week[dow][0].start, note: null }
        }
    }
    return null
}

export const placeName = (timeZone) => timeZone.split('/').pop().replace(/_/g, ' ')

export const visitorZone = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return null }
}

export const TodayStrip = ({ windows, minutes }) => {
    const lo = windows[0].start
    const hi = windows[windows.length - 1].end
    const at = (m) => ((Math.min(Math.max(m, lo), hi) - lo) / (hi - lo)) * 100
    const gaps = windows.slice(1).map((w, i) => ({ start: windows[i].end, end: w.start }))
    const showNow = minutes >= lo && minutes <= hi
    return (
        <div className="lc-pub__strip" aria-hidden="true">
            <div className="lc-pub__striptrack">
                {windows.map((w) => {
                    const cut = Math.min(Math.max(minutes, w.start), w.end)
                    return (
                        <span key={w.start} className="lc-pub__stripwin" style={{ left: `${at(w.start)}%`, width: `${at(w.end) - at(w.start)}%` }}>
                            {cut > w.start && <i className="is-past" style={{ width: `${((cut - w.start) / (w.end - w.start)) * 100}%` }} />}
                            {cut < w.end && <i style={{ width: `${((w.end - cut) / (w.end - w.start)) * 100}%` }} />}
                        </span>
                    )
                })}
                {gaps.filter((g) => minutes < g.start || minutes >= g.end).map((g) => (
                    <span key={g.start} className="lc-pub__stripgap" style={{ left: `${(at(g.start) + at(g.end)) / 2}%` }}>
                        <Coffee size={12} />
                    </span>
                ))}
                {showNow && <span className="lc-pub__stripnow" style={{ left: `${at(minutes)}%` }} />}
            </div>
            <div className="lc-pub__stripscale">
                <span>{clock(lo)}</span>
                <span>{clock(hi)}</span>
            </div>
        </div>
    )
}

// The door in one line under the business's name: open until when, or when it opens next.
export const OpenLine = ({ week, timeZone, now }) => {
    const door = doorState(week, now)
    if (!door) return null
    const zone = visitorZone()
    return (
        <p className={`lc-pub__open is-${door.tone}`}>
            <span className="lc-pub__opendot" aria-hidden="true" />
            <b>{door.state},</b>
            <span>{`${door.lead.charAt(0).toLowerCase()}${door.lead.slice(1)} ${clock(door.time)}`}</span>
            {zone && zone !== timeZone && <span className="lc-pub__zone">{placeName(timeZone)} time</span>}
        </p>
    )
}

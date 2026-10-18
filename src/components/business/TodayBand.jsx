import CityPattern from '../brand/CityPattern'
import { LIGHT_WORLDS, patternOf } from '../brand/world'

const toMinutes = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''))
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

const label = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// The sun's path over the shop today, from sunrise to sunset, and where now is on it. After sunset the
// arc is complete and now sits on the horizon past it, under the moon; before sunrise, short of it.
// Drawn only from the real sun times (daylight.js); without them there is no arc.
export const DayArc = ({ sunrise, sunset, minutes }) => {
    const rise = toMinutes(sunrise)
    const set = toMinutes(sunset)
    if (rise == null || set == null || set <= rise) return null
    const W = 420
    const H = 132
    const base = 104
    const left = 70
    const right = 330
    const cx = (left + right) / 2
    const rx = (right - left) / 2
    const ry = 78
    const up = minutes >= rise && minutes <= set
    const t = up ? (minutes - rise) / (set - rise) : minutes > set ? 1 : 0
    const sunX = cx - rx * Math.cos(Math.PI * t)
    const sunY = base - ry * Math.sin(Math.PI * t)
    const after = minutes > set
    const before = minutes < rise
    const nightX = after
        ? right + Math.min(1, (minutes - set) / Math.max(1, 24 * 60 - set)) * (W - 18 - right)
        : left - Math.min(1, minutes / Math.max(1, rise)) * (left - 18)
    const nowX = up ? sunX : nightX
    const nowY = up ? sunY : base
    const done = `M ${left} ${base} A ${rx} ${ry} 0 0 1 ${sunX.toFixed(1)} ${sunY.toFixed(1)}`
    const whole = `M ${left} ${base} A ${rx} ${ry} 0 0 1 ${right} ${base}`
    const now = label(minutes)
    const where = up ? 'the sun is up' : after ? 'after sunset' : 'before sunrise'
    return (
        <svg className="biz-band__arc" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sunrise ${sunrise}, sunset ${sunset}. Now ${now}, ${where}.`}>
            <line className="biz-band__horizon" x1="0" y1={base} x2={W} y2={base} />
            <path className="biz-band__path" d={whole} />
            {(up || after) && <path className="biz-band__walked" d={after ? whole : done} />}
            {after && <line className="biz-band__evening" x1={right} y1={base} x2={nowX} y2={base} />}
            {before && <line className="biz-band__evening" x1={nowX} y1={base} x2={left} y2={base} />}
            {!up && <path className="biz-band__moon" d={`M ${nowX - 2} ${base - 70} a 16 16 0 1 0 14 24 a 12 12 0 1 1 -14 -24 Z`} />}
            <circle className="biz-band__nowring" cx={nowX} cy={nowY} r={up ? 20 : 12} />
            <circle className="biz-band__now" cx={nowX} cy={nowY} r={up ? 12 : 6} />
            <text className="biz-band__time" x={left} y={base + 20} textAnchor="middle">{sunrise}</text>
            <text className="biz-band__time" x={right} y={base + 20} textAnchor="middle">{sunset}</text>
            <text className="biz-band__time is-now" x={nowX} y={nowY - (up ? 28 : 18)} textAnchor="middle">{now}</text>
        </svg>
    )
}

// The top of Today: the business's own world under the light of the hour, the day's state said once,
// and the sun's path. hello is the greeting, status the one line about today (open, closed), line what
// comes next. The pattern is brand art; the words and the amber "now" keep the core palette.
export const TodayBand = ({ business, daylight, minutes, hello, status, line }) => {
    const world = patternOf(business)
    return (
    <header className={`biz-dayhead biz-band is-${daylight.light}${LIGHT_WORLDS.has(world) ? ' is-paper' : ''}`}>
        <span className="biz-band__world" aria-hidden="true"><CityPattern world={world} centred size={32} /></span>
        <span className="biz-band__veil" aria-hidden="true" />
        <div className="biz-band__words">
            <p className="biz-dayhead__hello">{hello}</p>
            <h1 className="biz-dayhead__status">{status}</h1>
            <p className="biz-dayhead__line">{line}</p>
        </div>
        <DayArc sunrise={daylight.sunrise} sunset={daylight.sunset} minutes={minutes} />
    </header>
    )
}

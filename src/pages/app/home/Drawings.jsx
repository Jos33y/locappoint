import BusinessTile from '../../../components/brand/BusinessTile'
import { PIN_BODY, PIN_RING } from '../../../components/common/PinMark'
import { money } from './useSignUp'
import './drawings.css'

// Drawings for the home page, made from our own shapes: the pin, the slot, the tile, paper.
// All decorative: the words beside them carry the meaning, so every drawing is aria-hidden.

const TAU = Math.PI * 2
const point = (c, r, turn) => [c + r * Math.cos(turn * TAU - Math.PI / 2), c + r * Math.sin(turn * TAU - Math.PI / 2)]
const arc = (c, r, from, to) => {
    const span = Math.max(0, Math.min(0.9999, to - from))
    const [x1, y1] = point(c, r, from)
    const [x2, y2] = point(c, r, from + span)
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}
const hm = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// The owner's day, as on Today: open hours round the ring, each booking an arc shifting from
// azure to amber as the day goes on, a hand for now. The newest booking is marked to land once.
export const OPEN = ['09:00', '19:00']
export const DAY = [['09:00', '09:45'], ['10:00', '11:00'], ['11:15', '12:00'], ['13:00', '14:30'], ['15:30', '17:00', 'new'], ['17:15', '18:15']]
export const NOW = '15:10'

export const Ring = ({ size = 220, className = '', now = NOW }) => {
    const open = hm(OPEN[0])
    const span = hm(OPEN[1]) - open
    const turn = (t) => (hm(t) - open) / span
    const c = size / 2
    const stroke = size * 0.075
    const r = c - stroke / 2 - 6
    const booked = DAY.reduce((sum, [a, b]) => sum + hm(b) - hm(a), 0)
    // The hand shows only while the business is open; before opening and after closing there is no now.
    const showNow = now && hm(now) >= open && hm(now) <= open + span
    const [hx, hy] = showNow ? point(c, r, turn(now)) : [c, c]
    const [ix, iy] = showNow ? point(c, r - stroke * 1.1, turn(now)) : [c, c]
    const ticks = []
    for (let m = open; m < open + span; m += 60) ticks.push(m)
    return (
        <div className={`lc-home-ring ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle className="lc-home-ring__base" cx={c} cy={c} r={r} strokeWidth={stroke} />
                {ticks.map((m) => {
                    const t = (m - open) / span
                    const [x1, y1] = point(c, r + stroke / 2 + 2, t)
                    const [x2, y2] = point(c, r + stroke / 2 + 6, t)
                    return <line key={m} className="lc-home-ring__tick" x1={x1} y1={y1} x2={x2} y2={y2} />
                })}
                {DAY.map(([a, b, kind]) => {
                    const mix = Math.round(((turn(a) + turn(b)) / 2) * 100)
                    return (
                        <path
                            key={a}
                            className={`lc-home-ring__booked${kind ? ` is-${kind}` : ''}`}
                            d={arc(c, r, turn(a), turn(b))}
                            strokeWidth={stroke}
                            style={{ stroke: `color-mix(in srgb, var(--signal) ${mix}%, var(--azure))` }}
                        />
                    )
                })}
                {showNow && (
                    <g className="lc-home-ring__now">
                        <line x1={ix} y1={iy} x2={hx} y2={hy} />
                        <circle cx={hx} cy={hy} r={stroke * 0.42} />
                    </g>
                )}
            </svg>
            <div className="lc-home-ring__centre">
                <b>{Math.round((booked / span) * 100)}<small>%</small></b>
                <span>of today booked</span>
            </div>
        </div>
    )
}

// Our app icon in a notification: the azure badge.
export const Badge = ({ className = '' }) => (
    <svg className={className} viewBox="-32 -10 264 284" aria-hidden="true">
        <rect x="-32" y="-10" width="264" height="284" rx="64" fill="var(--azure)" />
        <path d={PIN_RING} fill="var(--lc-on-accent)" />
        <circle cx="100" cy="100" r="31" fill="var(--signal)" />
        <path d={PIN_BODY} fill="var(--lc-on-accent)" />
    </svg>
)

export const Alert = ({ title, line, sub, when = 'now', className = '' }) => (
    <div className={`lc-home-alert ${className}`.trim()}>
        <Badge className="lc-home-alert__badge" />
        <span className="lc-home-alert__title">{title}</span>
        <span className="lc-home-alert__when">{when}</span>
        <span className="lc-home-alert__line">{line}</span>
        {sub && <span className="lc-home-alert__sub">{sub}</span>}
    </div>
)

// The small chat mark on "Set it up with us": a speech bubble with the slot inside.
export const ChatMark = () => (
    <svg className="lc-home-chatmark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5c-4.8 0-8.5 3.3-8.5 7.6 0 2.2 1 4.1 2.6 5.5L5.4 20.5l4.2-1.9c.8.2 1.6.3 2.4.3 4.8 0 8.5-3.3 8.5-7.6S16.8 3.5 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="8" y="10" width="8" height="2.6" rx="1.3" fill="var(--signal)" />
    </svg>
)

const HOURS = [['Mon to Fri', '09:00 to 19:00'], ['Saturday', '09:00 to 15:00'], ['Sunday', 'Closed']]

// Step 1: the sign on the door, now also the page.
export const DoorSign = () => (
    <div className="lc-home-sign" aria-hidden="true">
        <span className="lc-home-sign__hook" />
        <span className="lc-home-sign__open">Open</span>
        <dl className="lc-home-sign__hours">
            {HOURS.map(([day, time]) => <div key={day}><dt>{day}</dt><dd>{time}</dd></div>)}
        </dl>
    </div>
)

// Step 2: the link sent in a chat, opening with the business's tile, name and price.
export const SharedLink = ({ city, sample, currency }) => (
    <div className="lc-home-share" aria-hidden="true">
        <div className="lc-home-share__bubble">
            <div className="lc-home-share__card">
                <BusinessTile name={`${sample.trade} in ${sample.area}`} city={city} className="lc-home-share__tile" />
                <span className="lc-home-share__name">Your business, {sample.area}</span>
                <span className="lc-home-share__meta">{sample.service} from {money(sample.price, currency)}</span>
            </div>
            <span className="lc-home-share__text">Book here next time:</span>
            <span className="lc-home-share__url">locappoint.com/your-name</span>
            <span className="lc-home-share__time">09:02</span>
        </div>
    </div>
)

// Step 3: what lands on the owner's phone.
export const Arrivals = ({ sample, currency }) => (
    <div className="lc-home-arrivals" aria-hidden="true">
        <Alert title="New booking" line={`${sample.client}, today 15:30`} sub={`${sample.service}, ${money(sample.price, currency)}`} />
        <Alert title="Reminder sent" line={`${sample.client} was reminded for 15:30`} when="13:30" className="is-quiet" />
    </div>
)

// Where clients find you: four small scenes instead of icons.
const Poster = ({ city }) => (
    <svg viewBox="0 0 96 72" aria-hidden="true">
        <rect x="10" y="6" width="40" height="56" rx="4" fill="var(--lc-paper)" transform="rotate(-5 30 34)" />
        <g transform="rotate(-5 30 34)">
            {[0, 1, 2, 3, 4].flatMap((x) => [0, 1, 2, 3, 4].map((y) => ((x * 7 + y * 3) % 4 !== 1 || (x % 4 === 0 && y % 4 === 0)) && (
                <rect key={`${x}${y}`} x={17 + x * 5.4} y={14 + y * 5.4} width="4.2" height="4.2" rx="0.8" fill="var(--lc-paper-ink)" />
            )))}
            <rect x="17" y="46" width="26" height="6" rx="3" fill="var(--azure)" />
        </g>
        <path d="M58 22h30a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H70l-7 6v-6h-5a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6Z" fill="var(--lc-raised)" stroke="var(--lc-line-strong)" />
        <rect x="59" y="28" width="11" height="11" rx="2" className={`lc-home-scene__city is-${city}`} />
        <rect x="73" y="29" width="16" height="3" rx="1.5" fill="var(--lc-ink-2)" />
        <rect x="73" y="35" width="11" height="3" rx="1.5" fill="var(--lc-info)" />
    </svg>
)

const Search = () => (
    <svg viewBox="0 0 96 72" aria-hidden="true">
        <rect x="4" y="6" width="88" height="16" rx="8" fill="var(--lc-raised)" stroke="var(--lc-line-strong)" />
        <circle cx="15" cy="14" r="3.6" fill="none" stroke="var(--lc-ink-2)" strokeWidth="1.6" />
        <path d="M17.6 16.6 20 19" stroke="var(--lc-ink-2)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="26" y="12" width="34" height="4" rx="2" fill="var(--lc-ink-3)" />
        <rect x="8" y="32" width="40" height="4" rx="2" fill="var(--lc-info)" />
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={11 + i * 6} cy="43" r="2" fill="var(--lc-ink-2)" />)}
        <rect x="42" y="41" width="22" height="4" rx="2" fill="var(--lc-ink-4)" />
        <rect x="8" y="52" width="70" height="3" rx="1.5" fill="var(--lc-line-strong)" />
        <rect x="8" y="60" width="52" height="3" rx="1.5" fill="var(--lc-line-strong)" />
    </svg>
)

const Chat = () => (
    <svg viewBox="0 0 96 72" aria-hidden="true">
        <path d="M8 8h44a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H18l-6 5v-5H8a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6Z" fill="var(--lc-raised)" stroke="var(--lc-line-strong)" />
        <rect x="9" y="15" width="34" height="3" rx="1.5" fill="var(--lc-ink-2)" />
        <rect x="9" y="21" width="22" height="3" rx="1.5" fill="var(--lc-ink-3)" />
        <path d="M44 38h44a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6h-4v5l-6-5H44a6 6 0 0 1-6-6V44a6 6 0 0 1 6-6Z" fill="var(--lc-info-tint)" stroke="var(--azure)" strokeOpacity="0.5" />
        <rect x="45" y="45" width="20" height="10" rx="2" fill="var(--lc-paper)" />
        <rect x="48" y="48.5" width="10" height="3" rx="1.5" fill="var(--lc-paper-ink)" />
        <path d="M71 50l3 3 6-6" fill="none" stroke="var(--lc-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const CityMap = ({ city }) => (
    <svg viewBox="0 0 96 72" aria-hidden="true">
        <rect x="4" y="4" width="88" height="64" rx="10" fill="var(--lc-well)" stroke="var(--lc-line)" />
        <path d="M4 26 C 30 22, 50 34, 92 28 M 30 4 C 34 30, 26 50, 32 68 M 60 4 C 58 24, 70 48, 66 68 M 4 52 C 40 48, 60 56, 92 50" fill="none" stroke="var(--lc-line-strong)" strokeWidth="3" />
        {[[22, 18, 0.07, 'var(--lc-ink-4)'], [76, 44, 0.07, 'var(--lc-ink-4)'], [44, 22, 0.13, 'var(--azure)']].map(([x, y, s, fill]) => (
            <g key={x} transform={`translate(${x - 100 * s} ${y - 262 * s}) scale(${s})`}>
                <path d={PIN_RING} fill={fill} />
                <circle cx="100" cy="100" r="31" fill={fill === 'var(--azure)' ? 'var(--signal)' : fill} />
                <path d={PIN_BODY} fill={fill} />
            </g>
        ))}
        <rect x="52" y="10" width="34" height="14" rx="4" className={`lc-home-scene__city is-${city}`} />
        <rect x="56" y="15.5" width="22" height="3" rx="1.5" fill="var(--lc-paper-ink)" />
    </svg>
)

export const SCENES = { link: Poster, google: Search, whatsapp: Chat, browse: CityMap }

// Today takes its light from the visitor's own clock, chosen once at load and never animated
// (doc 30, Today has daylight): cool dawn in the morning, clear through the day, warm ember after five.
export const daylightOf = (date = new Date()) => {
    const h = date.getHours()
    const clock = `${String(h).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    if (h < 12) return { light: 'dawn', greeting: 'Good morning', clock }
    if (h < 17) return { light: 'day', greeting: 'Good afternoon', clock }
    return { light: 'ember', greeting: 'Good evening', clock }
}

// The owner's phone: the day nearly full, and, with alert, a booking that just landed. Without a
// daylight it is the afternoon the home page shows; with one, it is the visitor's own hour.
export const OwnerPhone = ({ sample, currency, alert = true, greeting, daylight = null }) => (
    <div className={`lc-home-phone${daylight ? ` is-${daylight.light}` : ''}`} aria-hidden="true">
        <div className="lc-home-phone__screen">
            <div className="lc-home-phone__bar"><span>{daylight ? daylight.clock : NOW}</span><i /></div>
            <p className="lc-home-phone__hello">{greeting || `Good afternoon, ${sample.owner}`}</p>
            <p className="lc-home-phone__day">Today</p>
            <Ring size={196} className="lc-home-phone__ring" now={daylight ? daylight.clock : NOW} />
            <ul className="lc-home-phone__next">
                <li className="is-new"><b>15:30</b><span>{sample.client}</span><em>{sample.service}</em></li>
                <li><b>17:15</b><span>{sample.regular}</span><em>{sample.service}</em></li>
            </ul>
        </div>
        {alert && (
            <Alert
                className="lc-home-phone__alert"
                title="New booking"
                line={`${sample.client}, today 15:30`}
                sub={`${sample.service}, ${money(sample.price, currency)}`}
            />
        )}
    </div>
)

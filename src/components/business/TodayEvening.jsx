import { Link } from 'react-router-dom'
import { CalendarDays, MessageCircle } from 'lucide-react'
import { DayRing } from './DayRing'
import { RollMoney } from './Rolling'
import { bookingStart, minutesToLabel } from '../../services/business'
import { pageUrl } from '../../services/links'

// Free stretches in a day, each long enough for the shortest service.
export const freeGaps = (windows, bookings, length = 30) => {
    const busy = bookings
        .filter((b) => ['pending', 'confirmed'].includes(b.status))
        .map((b) => [bookingStart(b), bookingStart(b) + (Number(b.duration_minutes) || 0)])
        .sort((a, b) => a[0] - b[0])
    const starts = []
    windows.forEach(([a, b]) => {
        let cursor = a
        busy.forEach(([from, to]) => {
            if (to <= cursor || from >= b) return
            if (from - cursor >= length) starts.push([cursor, from])
            cursor = Math.max(cursor, to)
        })
        if (b - cursor >= length) starts.push([cursor, b])
    })
    return starts
}

const and = (items) => (items.length < 2 ? items : [items[0], ' and ', items[1]])

// After closing: the day on paper. What it made, how full it was, what went wrong.
export const DaySlip = ({ dateKey, bookings, hours, staff, figures, money, country, visits, online }) => (
    <section className="biz-slip" aria-label="Today in full">
        <div className="biz-slip__top">
            <DayRing dateKey={dateKey} bookings={bookings} hours={hours} staff={staff} figures={figures} money={money} country={country} centre="pct" paper size={112} />
            <div className="biz-slip__figure">
                <span className="biz-slip__label">Today, in full</span>
                <b className="biz-slip__money biz-num"><RollMoney value={figures.earned} country={country} /></b>
                <span className="biz-slip__label">{visits === 1 ? 'earned from 1 visit' : `earned from ${visits} visits`}</span>
            </div>
        </div>
        <dl className="biz-slip__rows">
            <div><dt>Booked online</dt><dd className="biz-num">{online}</dd></div>
            <div><dt>No-shows</dt><dd className="biz-num">{figures.lost > 0 ? money(figures.lost) : 'None'}</dd></div>
            {figures.toCome > 0 && <div><dt>Still to confirm or mark</dt><dd className="biz-num">{money(figures.toCome)}</dd></div>}
        </dl>
    </section>
)

// Tomorrow at a glance, with the free times worth sharing tonight.
export const Tomorrow = ({ business, dateKey, figures, rows, windows, free }) => {
    const first = rows[0]
    const shown = free.slice(0, 2).map(([a, b]) => `${minutesToLabel(a)} to ${minutesToLabel(b)}`)
    const text = `Free tomorrow at ${business.business_name}: ${shown.join(' and ')}. Book here: ${pageUrl(business.slug, 'wa')}`
    return (
        <section className="biz-tomorrow" aria-labelledby="tomorrow-title">
            <header className="biz-tomorrow__head">
                <h2 id="tomorrow-title" className="biz-ov__h2">Tomorrow</h2>
                <span className="biz-tomorrow__fill">
                    {windows.length === 0 ? 'Closed' : `${rows.length} booked, ${Math.round(figures.fill * 100)}%`}
                </span>
            </header>
            {windows.length === 0 ? (
                <p className="biz-tomorrow__text">You are closed tomorrow. Clients can still book the days after.</p>
            ) : (
                <p className="biz-tomorrow__text">
                    {first
                        ? <>First at <b className="biz-num">{first.appointment_time.slice(0, 5)}</b> with {first.client_name}. </>
                        : <>Nothing booked yet. Open <b className="biz-num">{minutesToLabel(windows[0][0])}</b> to <b className="biz-num">{minutesToLabel(windows[windows.length - 1][1])}</b>. </>}
                    {free.length > 0 && first && <>Still free {and(free.slice(0, 2).map(([a, b]) => <span key={a}><b className="biz-num">{minutesToLabel(a)}</b> to <b className="biz-num">{minutesToLabel(b)}</b></span>))}{free.length > 2 ? ', and more' : ''}.</>}
                    {shown.length === 0 && 'Every time is taken.'}
                </p>
            )}
            <div className="biz-tomorrow__actions">
                {windows.length > 0 && shown.length > 0 && (
                    <a className="btn btn--primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={16} aria-hidden="true" /> Share tomorrow's free times
                    </a>
                )}
                <Link className="btn btn--ghost" to={`/portal/calendar?date=${dateKey}`}>
                    <CalendarDays size={16} aria-hidden="true" /> Open tomorrow
                </Link>
            </div>
        </section>
    )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, RotateCw, Share2 } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Segmented } from '../../components/ui'
import { Columns } from '../../components/insights/Columns'
import { BarList } from '../../components/insights/BarList'
import { Funnel } from '../../components/insights/Funnel'
import { Heatmap } from '../../components/insights/Heatmap'
import { SOURCE_LABEL, change, leadLabel, loadInsights, moneyFor, percent } from '../../services/insights'
import { formatDay } from '../../services/business'
import '../../styles/business/insights.css'

const PERIODS = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
]

const short = (key) => formatDay(key, { day: 'numeric', month: 'short' }).replace('Sept', 'Sep')

const Delta = ({ now, before, upIsGood = true, money }) => {
    const pct = change(now, before)
    if (pct === null) return <span className="lc-ins-delta">New this period</span>
    if (pct === 0) return <span className="lc-ins-delta">Same as before</span>
    const good = pct > 0 === upIsGood
    const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight
    return (
        <span className={`lc-ins-delta ${good ? 'is-good' : 'is-bad'}`}>
            <Icon size={14} aria-hidden="true" />
            <b className="biz-num">{Math.abs(pct)}%</b> against {money ? money(before) : before} before
        </span>
    )
}

const Tile = ({ label, value, children }) => (
    <div className="lc-ins-tile">
        <span className="lc-ins-tile__label">{label}</span>
        <span className="lc-ins-tile__value">{value}</span>
        {children && <span className="lc-ins-tile__meta">{children}</span>}
    </div>
)

const Card = ({ title, note, children, className = '' }) => (
    <section className={`lc-ins-card ${className}`}>
        <header className="lc-ins-card__head">
            <h2>{title}</h2>
            {note && <p>{note}</p>}
        </header>
        {children}
    </section>
)

const EmptyStart = ({ onShare }) => (
    <div className="lc-ins-empty">
        <svg className="lc-ins-empty__art" width="220" height="96" viewBox="0 0 220 96" aria-hidden="true">
            <line className="lc-ins-empty__base" x1="4" y1="88" x2="216" y2="88" />
            {[26, 44, 34, 58, 48, 70, 40].map((h, i) => (
                <rect key={i} className="lc-ins-empty__col" x={14 + i * 29} y={88 - h} width="18" height={h} rx="4" />
            ))}
        </svg>
        <div className="lc-ins-empty__text">
            <h2>Your numbers land here</h2>
            <p>Money, bookings and how people find you fill in from your first visits and bookings. Your link is what brings them.</p>
        </div>
        <Button icon={Share2} onClick={onShare}>Share your link</Button>
    </div>
)

const Insights = () => {
    const { business, isOwner } = useWorkspace()
    const [days, setDays] = useState(7)
    const [state, setState] = useState({ status: 'loading', data: null })
    const money = useMemo(() => moneyFor(business.country), [business.country])

    const load = useCallback(async () => {
        setState((prev) => ({ status: prev.data ? 'refreshing' : 'loading', data: prev.data }))
        try {
            setState({ status: 'ready', data: await loadInsights(business.id, days) })
        } catch (err) {
            console.error('Insights failed:', err)
            setState((prev) => ({ status: err?.code === '42501' ? 'owner' : 'error', data: prev.data }))
        }
    }, [business.id, days])

    useEffect(() => { load() }, [load])

    const share = () => document.querySelector('.biz-topbar__share')?.click()

    if (!isOwner || state.status === 'owner') {
        return (
            <div className="biz-page lc-ins">
                <h1 className="biz-page__title">Insights</h1>
                <p className="lc-ins-none">Insights are for the owner of {business.business_name}.</p>
            </div>
        )
    }

    const d = state.data
    const now = d?.current
    const before = d?.previous
    const quiet = d && !now.bookings && !before.bookings && !now.views && !d.ahead.count
    const sources = (d?.sources || []).map((s) => ({ key: s.source, label: SOURCE_LABEL[s.source] || s.source, value: s.views, shown: String(s.views), note: `${percent(s.views, now.views)}%` }))
    const services = (d?.services || []).slice(0, 6).map((s) => ({ key: s.name, label: s.name, value: s.bookings, shown: String(s.bookings), note: money(s.value) }))
    const counted = d?.counting_since && d.counting_since > d.from ? d.counting_since : null
    const returning = now ? now.clients - now.new_clients : 0
    const lead = leadLabel(d?.lead_hours)

    return (
        <div className="biz-page lc-ins">
            <header className="lc-ins__head">
                <div>
                    <h1 className="biz-page__title">Insights</h1>
                    <p className="lc-ins__range">
                        {d ? `${short(d.from)} to ${short(d.today)}, against the ${d.days} days before` : 'Loading your numbers'}
                    </p>
                </div>
                <Segmented options={PERIODS} value={days} onChange={setDays} label="Period" />
            </header>

            {state.status === 'loading' && (
                <div className="lc-ins__skel" aria-hidden="true">
                    <span className="lc-skel" style={{ height: 112 }} />
                    <span className="lc-skel" style={{ height: 240 }} />
                </div>
            )}

            {state.status === 'error' && !d && (
                <div className="lc-ins-error" role="alert">
                    <p>We could not load your insights. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'error' && d && (
                <div className="lc-ins-error" role="alert">
                    <p>We could not refresh these numbers. They are from your last load.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {d && quiet && <EmptyStart onShare={share} />}

            {d && !quiet && (
                <div className={`lc-ins__body${state.status === 'refreshing' ? ' is-refreshing' : ''}`} aria-busy={state.status === 'refreshing'}>
                    <div className="lc-ins-kpis">
                        <div className="lc-ins-hero">
                            <span className="lc-ins-tile__label">Earned</span>
                            <span className="lc-ins-hero__value">{money(now.earned)}</span>
                            <span className="lc-ins-tile__meta">
                                <Delta now={now.earned} before={before.earned} money={money} />
                            </span>
                        </div>
                        <Tile label="Booked ahead" value={money(d.ahead.value)}>
                            {d.ahead.count} {d.ahead.count === 1 ? 'booking' : 'bookings'} in the next {d.days} days
                        </Tile>
                        <Tile label="Bookings" value={<span className="biz-num">{now.bookings}</span>}>
                            <Delta now={now.bookings} before={before.bookings} />
                        </Tile>
                        <Tile label="Lost to no-shows" value={money(now.no_show_value)}>
                            {now.no_shows} {now.no_shows === 1 ? 'no-show' : 'no-shows'}
                        </Tile>
                    </div>

                    <Card title="Earned per day" note={d.days > 45 ? 'By week. Hover or tap a column for the numbers.' : 'Hover or tap a column for the numbers.'} className="is-wide">
                        <Columns days={d.daily} money={money} />
                    </Card>

                    <div className="lc-ins-grid">
                        <Card
                            title="From visit to booking"
                            note={counted ? `Visits counted since ${short(counted)}.` : `${percent(now.booked_counted, now.views)}% of visits became a booking.`}
                        >
                            {now.views ? (
                                <Funnel steps={[
                                    { key: 'view', label: 'Opened your page', value: now.views },
                                    { key: 'start', label: 'Started a booking', value: now.starts },
                                    { key: 'time', label: 'Picked a time', value: now.times },
                                    { key: 'booked', label: 'Booked', value: now.booked_counted },
                                ]} />
                            ) : (
                                <p className="lc-ins-none">No visits counted in this period yet. Share your link and they show up here.</p>
                            )}
                        </Card>

                        <Card title="Where visitors come from" note={now.views ? `${percent(d.mobile_views, now.views)}% on a phone.` : null}>
                            <BarList rows={sources} empty="Visits show up here with where they came from." />
                        </Card>

                        <Card title="Busiest times" note="Bookings by weekday and hour, including the days ahead.">
                            <Heatmap cells={d.busiest} open={d.hours.open} close={d.hours.close} />
                        </Card>

                        <Card title="Most booked" note="Bookings and their value.">
                            <BarList rows={services} empty="Your services show up here once they are booked." />
                        </Card>
                    </div>

                    <Card title="Clients" className="is-wide">
                        <dl className="lc-ins-facts">
                            <div><dt>Clients</dt><dd className="biz-num">{now.clients}</dd></div>
                            <div><dt>New</dt><dd className="biz-num">{now.new_clients}</dd></div>
                            <div><dt>Came back</dt><dd className="biz-num">{returning}</dd></div>
                            <div><dt>Cancelled by clients</dt><dd className="biz-num">{now.cancelled_by_client}</dd></div>
                            <div><dt>Cancelled by you</dt><dd className="biz-num">{now.cancelled_by_business}</dd></div>
                            <div><dt>Clients book</dt><dd>{lead || 'Not enough yet'}</dd></div>
                        </dl>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default Insights

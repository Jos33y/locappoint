import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, Building2, CalendarCheck, CalendarDays, Gauge, MapPin, RotateCw, Smartphone, Bug, UserPlus, Waypoints } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import StatCard from '../components/StatCard'
import BarList from '../components/BarList'
import { SOURCE_LABELS as SOURCE, loadOverview, money } from '../../../services/admin'

const STATUS_ORDER = ['sent', 'pending', 'sending', 'skipped', 'failed']
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// The whole platform on one screen: what is live, what is booked, who is joining, what is failing.
const OverviewTab = ({ onGo }) => {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setError('')
        try {
            setData(await loadOverview())
        } catch (err) {
            console.error('Overview failed:', err)
            setError('Could not load the overview. Run admin.sql if it has not been run.')
        }
    }, [])

    useEffect(() => { load() }, [load])

    const head = (
        <SectionHead
            icon={Gauge}
            title="Overview"
            meta="Demo business left out"
            action={(
                <button type="button" onClick={load} className="btn btn--secondary btn--sm">
                    <RotateCw size={13} aria-hidden="true" />
                    <span>Refresh</span>
                </button>
            )}
        />
    )

    if (!data) {
        return (
            <div className="tab-content">
                {head}
                {error ? <p className="cell-note" role="alert">{error}</p> : <p className="adm-quiet">Loading</p>}
            </div>
        )
    }

    const { businesses: biz, bookings: bk, people, apps, errors_7d: errs } = data
    const daily = data.daily || []
    const appPeople = (apps.people_30d || []).reduce((sum, r) => sum + r.people, 0)
    const pushPhones = Object.values(apps.phones_with_push || {}).reduce((a, b) => a + b, 0)
    const finished = bk.completed_30d + bk.no_show_30d
    const noShowRate = finished ? Math.round((bk.no_show_30d / finished) * 100) : 0
    const messages = data.messages_7d || {}
    const failed = Object.values(messages).reduce((sum, m) => sum + (m.failed || 0), 0)

    const attention = [
        bk.waiting > 0 && { text: `${plural(bk.waiting, 'booking')} waiting for a business to confirm`, go: 'bookings' },
        failed > 0 && { text: `${plural(failed, 'message')} failed to send this week`, go: null },
        errs.distinct > 0 && { text: `${plural(errs.distinct, 'app error')} this week, ${errs.times} times in all`, go: 'errors' },
        biz.setup > 0 && { text: `${plural(biz.setup, 'business', 'businesses')} still setting up`, go: 'businesses' },
    ].filter(Boolean)

    return (
        <div className="tab-content">
            {head}
            {error && <p className="cell-note" role="alert">{error}</p>}

            {attention.length > 0 && (
                <ul className="adm-attention" aria-label="Needs a look">
                    {attention.map((a) => (
                        <li key={a.text}>
                            <AlertTriangle size={14} aria-hidden="true" />
                            <span>{a.text}</span>
                            {a.go && onGo && <button type="button" className="adm-link" onClick={() => onGo(a.go)}>Open</button>}
                        </li>
                    ))}
                </ul>
            )}

            <div className="kpi-grid adm-kpis">
                <StatCard icon={Building2} label="Live businesses" value={biz.live} subtitle={`${biz.setup} setting up, ${biz.paused} paused, ${biz.new_7d} new this week`} />
                <StatCard icon={CalendarDays} label="Bookings today" value={bk.today} accent="signal" subtitle={`${bk.next_7d} in the next 7 days`} />
                <StatCard icon={CalendarCheck} label="Bookings made, 30 days" value={bk.made_30d} accent="success" subtitle={`${bk.made_7d} this week`} sparklineData={daily.map((d) => ({ date: d.day, value: d.bookings }))} />
                <StatCard icon={UserPlus} label="New people, 30 days" value={people.new_30d} subtitle={`${people.owners} owners, ${people.clients} clients in all`} sparklineData={daily.map((d) => ({ date: d.day, value: d.signups }))} />
                <StatCard icon={Smartphone} label="App users, 30 days" value={appPeople} accent="signal" subtitle={`${pushPhones} ${pushPhones === 1 ? 'phone' : 'phones'} with notifications on`} />
                <StatCard icon={Bug} label="App errors, 7 days" value={errs.distinct} accent={errs.distinct ? 'danger' : 'success'} subtitle={errs.distinct ? `${errs.times} times in all` : 'None'} />
            </div>

            <div className="panel-grid adm-panels">
                <section className="panel" aria-labelledby="adm-money">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-money"><CalendarCheck size={12} className="panel__title-icon" aria-hidden="true" />Last 30 days</h3>
                        <span className="panel__meta">Visits so far</span>
                    </div>
                    <div className="panel__body">
                        <dl className="adm-facts">
                            {Object.entries(bk.value_30d || {}).map(([cur, total]) => (
                                <div key={cur}><dt>Booked value, {cur}</dt><dd>{money(total, cur)}</dd></div>
                            ))}
                            {Object.keys(bk.value_30d || {}).length === 0 && <div><dt>Booked value</dt><dd>None yet</dd></div>}
                            <div><dt>Visits done</dt><dd>{bk.completed_30d}</dd></div>
                            <div><dt>No-shows</dt><dd>{bk.no_show_30d}{finished ? ` (${noShowRate}%)` : ''}</dd></div>
                            <div><dt>Cancelled</dt><dd>{bk.cancelled_30d}</dd></div>
                            <div><dt>Waiting to be confirmed</dt><dd>{bk.waiting}</dd></div>
                            <div><dt>Account deletions</dt><dd>{people.deleted_30d}</dd></div>
                            <div><dt>On the waitlist</dt><dd>{data.waitlist}</dd></div>
                        </dl>
                    </div>
                </section>

                <section className="panel" aria-labelledby="adm-sources">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-sources"><Waypoints size={12} className="panel__title-icon" aria-hidden="true" />Where bookings come from</h3>
                        <span className="panel__meta">30 days</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={(bk.by_source_30d || []).map((s) => ({ label: SOURCE[s.source] || s.source, value: s.count }))}
                            total={bk.made_30d}
                            emptyLabel="No bookings in the last 30 days"
                        />
                    </div>
                </section>

                <section className="panel" aria-labelledby="adm-apps">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-apps"><Smartphone size={12} className="panel__title-icon" aria-hidden="true" />App versions in use</h3>
                        <span className="panel__meta">Signed in, 30 days</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={(apps.people_30d || []).map((a) => ({ label: `${a.platform === 'ios' ? 'iPhone' : a.platform === 'android' ? 'Android' : 'Other'} ${a.version || ''}`.trim(), value: a.people }))}
                            total={appPeople}
                            emptyLabel="Nobody has signed in on the app yet"
                        />
                    </div>
                </section>

                <section className="panel" aria-labelledby="adm-cities">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-cities"><MapPin size={12} className="panel__title-icon" aria-hidden="true" />Businesses by city</h3>
                        <span className="panel__meta">All stages</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={(biz.by_city || []).map((c) => ({ label: c.city, value: c.count }))}
                            total={(biz.by_city || []).reduce((s, c) => s + c.count, 0)}
                            emptyLabel="No businesses yet"
                        />
                    </div>
                </section>
            </div>

            <section className="panel adm-messages" aria-labelledby="adm-msg">
                <div className="panel__head">
                    <h3 className="panel__title" id="adm-msg"><Bell size={12} className="panel__title-icon" aria-hidden="true" />Messages sent, 7 days</h3>
                    <span className="panel__meta">Emails and phone notifications</span>
                </div>
                <div className="panel__body panel__body--flush">
                    {Object.keys(messages).length === 0 ? (
                        <p className="adm-quiet adm-pad">Nothing sent this week.</p>
                    ) : (
                        <div className="adm-scroll">
                        <table className="data-table adm-table">
                            <thead>
                                <tr><th>Channel</th>{STATUS_ORDER.map((s) => <th key={s}>{s === 'skipped' ? 'Not needed' : s[0].toUpperCase() + s.slice(1)}</th>)}</tr>
                            </thead>
                            <tbody>
                                {Object.entries(messages).map(([channel, counts]) => (
                                    <tr key={channel}>
                                        <td>{channel === 'push' ? 'Phone notifications' : channel === 'email' ? 'Email' : channel}</td>
                                        {STATUS_ORDER.map((s) => (
                                            <td key={s} className={s === 'failed' && counts[s] ? 'adm-bad' : 'cell-mono'}>{counts[s] || 0}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default OverviewTab

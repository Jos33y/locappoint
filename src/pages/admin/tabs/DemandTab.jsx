import { useCallback, useEffect, useState } from 'react'
import { Bell, Globe, MapPinned, Radar, RotateCw, Search, SearchX } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import StatCard from '../components/StatCard'
import BarList from '../components/BarList'
import CountryDisplay from '../components/CountryDisplay'
import { ago, loadDemand } from '../../../services/admin'
import '../../../styles/admin/demand.css'

const PERIODS = [7, 30, 90]
const CHANNEL = { web: 'Website', app: 'App', whatsapp: 'WhatsApp' }
const CITY = { porto: 'Porto', lisbon: 'Lisbon', lagos: 'Lagos' }
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const missLine = (row) => (row.misses ? `${row.misses} found nothing` : 'all answered')

// Where people want Locappoint (doc 35): every search from the website, the app and WhatsApp, where the
// searcher is, where they asked for, what we could not answer, and who asked to be told.
const DemandTab = () => {
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setError('')
        try {
            setData(await loadDemand(days))
        } catch (err) {
            console.error('Demand failed:', err)
            setError('Could not load demand. Run demand.sql if it has not been run.')
        }
    }, [days])

    useEffect(() => { load() }, [load])

    const head = (
        <SectionHead
            icon={Radar}
            title="Demand"
            meta={data ? `${plural(data.searches, 'search', 'searches')} in the last ${data.days} days` : 'Loading'}
            action={(
                <div className="adm-demand__periods">
                    {PERIODS.map((d) => (
                        <button key={d} type="button" aria-pressed={days === d} className={`btn btn--sm ${days === d ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setDays(d)}>{`${d} days`}</button>
                    ))}
                    <button type="button" onClick={load} className="btn btn--secondary btn--sm" aria-label="Refresh">
                        <RotateCw size={13} aria-hidden="true" />
                    </button>
                </div>
            )}
        />
    )

    if (error) return <div className="tab-content">{head}<p className="cell-note" role="alert">{error}</p></div>
    if (!data) return <div className="tab-content">{head}<p className="adm-quiet">Loading demand</p></div>

    const missPct = data.searches ? Math.round((data.misses / data.searches) * 100) : 0
    const abroad = data.by_origin.filter((r) => r.country && r.country !== 'NG' && r.country !== 'PT')

    return (
        <div className="tab-content adm-demand">
            {head}

            <div className="kpi-grid adm-kpis">
                <StatCard icon={Search} label="Searches" value={data.searches} subtitle={data.by_channel.map((c) => `${CHANNEL[c.channel] || c.channel} ${c.searches}`).join(', ') || 'None yet'} />
                <StatCard icon={SearchX} label="Found nothing" value={data.misses} accent={data.misses ? 'danger' : 'success'} subtitle={data.searches ? `${missPct}% of searches` : 'None yet'} />
                <StatCard icon={Globe} label="From outside Nigeria and Portugal" value={abroad.reduce((n, r) => n + r.searches, 0)} accent="signal" subtitle={abroad.length ? plural(abroad.length, 'country', 'countries') : 'None yet'} />
                <StatCard icon={Bell} label="Asked to be told" value={data.wishes} accent="success" subtitle="Tell me when" />
            </div>

            <div className="panel-grid adm-panels">
                <section className="panel" aria-labelledby="adm-dem-from">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-dem-from"><Globe size={12} className="panel__title-icon" aria-hidden="true" />Where people search from</h3>
                        <span className="panel__meta">Their country</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={data.by_origin.map((r) => ({ leading: <CountryDisplay code={r.country} />, label: missLine(r), value: r.searches }))}
                            total={data.searches}
                            emptyLabel="No searches yet"
                        />
                    </div>
                </section>

                <section className="panel" aria-labelledby="adm-dem-for">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-dem-for"><MapPinned size={12} className="panel__title-icon" aria-hidden="true" />Where they want it</h3>
                        <span className="panel__meta">City and area</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={data.by_place.map((r) => ({ label: `${CITY[r.market] || r.market || 'No city'}${r.zone ? `, ${r.zone}` : ''}: ${missLine(r)}`, value: r.searches }))}
                            total={data.searches}
                            emptyLabel="No searches yet"
                        />
                    </div>
                </section>

                <section className="panel" aria-labelledby="adm-dem-missed">
                    <div className="panel__head">
                        <h3 className="panel__title" id="adm-dem-missed"><SearchX size={12} className="panel__title-icon" aria-hidden="true" />What we could not answer</h3>
                        <span className="panel__meta">Who to bring on next</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={data.missed.map((r) => ({ label: `${r.query}${r.market ? `, ${CITY[r.market] || r.market}` : ''}`, value: r.times }))}
                            total={data.misses}
                            emptyLabel="Every search found someone"
                        />
                    </div>
                </section>
            </div>

            <section className="panel" aria-labelledby="adm-dem-wish">
                <div className="panel__head">
                    <h3 className="panel__title" id="adm-dem-wish"><Bell size={12} className="panel__title-icon" aria-hidden="true" />Tell me when</h3>
                    <span className="panel__meta">Latest 50, tell them yourself for now</span>
                </div>
                {data.latest_wishes.length === 0 ? (
                    <p className="adm-quiet adm-empty">Nobody has asked yet.</p>
                ) : (
                    <div className="data-table-wrap adm-scroll">
                        <table className="data-table adm-table">
                            <thead>
                                <tr><th>When</th><th className="adm-w-wide">Asked for</th><th>Where</th><th>From</th><th className="adm-w-wide">Contact</th></tr>
                            </thead>
                            <tbody>
                                {data.latest_wishes.map((w, i) => (
                                    <tr key={i}>
                                        <td className="cell-mono">{ago(w.created_at)}</td>
                                        <td><span className="cell-text">{w.query || 'Locappoint in their country'}</span></td>
                                        <td><span className="cell-text">{[CITY[w.market] || w.market, w.zone].filter(Boolean).join(', ') || (w.target_country ? <CountryDisplay code={w.target_country} /> : 'Anywhere')}</span></td>
                                        <td>{w.origin_country ? <CountryDisplay code={w.origin_country} /> : <span className="adm-sub">Unknown</span>}</td>
                                        <td><span className="cell-text">{w.email || w.phone}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default DemandTab

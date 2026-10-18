import { Fragment, useCallback, useEffect, useState } from 'react'
import { Bell, Check, ChevronDown, Copy, ExternalLink, Globe, Radar, RotateCw, Search, SearchCheck, SearchX } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import StatCard from '../components/StatCard'
import CountryDisplay from '../components/CountryDisplay'
import CityPattern from '../../../components/brand/CityPattern'
import { pickWorld } from '../../../components/brand/worlds'
import { PT_MUNICIPALITIES } from '../../../constants/locations'
import { ago, loadDemand, loadDemandPlace } from '../../../services/admin'
import '../../../styles/admin/demand.css'

const PERIODS = [7, 30, 90]
const CHANNEL = { web: 'Website', app: 'App', whatsapp: 'WhatsApp' }
const CITY = { porto: 'Porto', lisbon: 'Lisbon', lagos: 'Lagos' }
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const cityName = (market) => CITY[market] || market || 'No city'
const placeName = (r) => (r.zone ? `${r.zone}, ${cityName(r.market)}` : cityName(r.market))
// A place wears its home region's world, else a stable pick by its name (doc 30).
const placeWorld = (r) => pickWorld({ id: `place|${r.zone || r.market}`, city: r.zone || cityName(r.market), market: r.market }, { municipalities: PT_MUNICIPALITIES })

// One place opened: every word asked there, the busiest day, and the people waiting to be told.
const PlaceDetail = ({ row, days }) => {
    const [data, setData] = useState(null)
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        let cancelled = false
        loadDemandPlace({ market: row.market, zone: row.zone, days }).then((d) => { if (!cancelled) setData(d) }).catch(() => { if (!cancelled) setData({ queries: [], waiting: [], failed: true }) })
        return () => { cancelled = true }
    }, [row.market, row.zone, days])
    if (!data) return <div className="adm-dem-detail"><p className="adm-quiet">Loading what was asked</p></div>
    const contacts = data.waiting.map((w) => w.email || w.phone).filter(Boolean)
    const top = row.asked?.[0]?.query || data.queries[0]?.query || ''
    const copy = async () => {
        try { await navigator.clipboard.writeText(contacts.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setCopied(false) }
    }
    return (
        <div className="adm-dem-detail">
            <span className="adm-dem-detail__label">What they typed</span>
            <span className="adm-dem-detail__words">
                {data.queries.length ? data.queries.map((q) => <span key={q.query} className="adm-dem-word">{q.query}<b>{q.times}</b></span>) : <span className="adm-quiet">{data.failed ? 'Could not load the words' : 'No words kept'}</span>}
            </span>
            <span className="adm-dem-detail__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={copy} disabled={!contacts.length}>
                    {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    {copied ? 'Copied' : `Copy the waiting list (${contacts.length})`}
                </button>
                {top && (
                    <a className="btn btn--secondary btn--sm" href={`https://www.google.com/maps/search/${encodeURIComponent(`${top} ${row.zone || cityName(row.market)}`)}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} aria-hidden="true" />{`Find ${top} in ${row.zone || cityName(row.market)}`}
                    </a>
                )}
                {data.busiest && <span className="adm-dem-detail__note">{`Most searched on ${data.busiest}s`}</span>}
            </span>
        </div>
    )
}

// Where people want Locappoint (doc 35), as a list to act on: where nobody offers what was asked, what
// people could not book in time, who searched from abroad, and who asked to be told.
const DemandTab = () => {
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [open, setOpen] = useState(null)

    const load = useCallback(async () => {
        setError('')
        try {
            setData(await loadDemand(days))
        } catch (err) {
            console.error('Demand failed:', err)
            setError('Could not load demand. Run demand.sql and demand2.sql if they have not been run.')
        }
    }, [days])

    useEffect(() => { load() }, [load])
    useEffect(() => { setOpen(null) }, [days])

    const head = (
        <SectionHead
            icon={Radar}
            title="Demand"
            meta={data ? `What people asked for, last ${data.days} days` : 'Loading'}
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

    const pct = (n) => (data.searches ? Math.round((n / data.searches) * 100) : 0)
    const places = data.places || []
    const most = Math.max(1, ...places.map((p) => p.searches))
    const abroad = data.abroad || []
    const abroadTotal = abroad.reduce((n, r) => n + r.searches, 0)
    const abroadMost = Math.max(1, ...abroad.map((r) => r.searches))
    const notThen = data.not_then ?? 0
    const full = data.full ?? 0
    const noTime = full + notThen

    return (
        <div className="tab-content adm-demand">
            {head}

            <div className="kpi-grid adm-kpis">
                <StatCard icon={Search} label="Searches" value={data.searches} subtitle={[data.countries ? `From ${plural(data.countries, 'country', 'countries')}` : '', data.by_channel.map((c) => `${CHANNEL[c.channel] || c.channel} ${c.searches}`).join(', ')].filter(Boolean).join('. ') || 'None yet'} />
                <StatCard icon={SearchCheck} label="Found something to book" value={`${pct(data.found ?? 0)}%`} accent="success" subtitle={data.searches ? plural(data.found ?? 0, 'search', 'searches') : 'None yet'} />
                <StatCard icon={SearchX} label="Nobody there" value={data.misses} accent={data.misses ? 'danger' : 'success'} subtitle={data.misses ? `${pct(data.misses)}% of searches, the list to sign up from` : 'Someone offered everything'} />
                <StatCard icon={Bell} label="Asked to be told" value={data.waiting ?? data.wishes} accent="signal" subtitle={data.waiting_places ? `Waiting on ${plural(data.waiting_places, 'place')}` : 'Nobody waiting'} />
            </div>

            <div className="adm-dem-grid">
                <section className="adm-dem-card adm-dem-places" aria-labelledby="adm-dem-places">
                    <header className="adm-dem-card__head">
                        <h3 className="adm-dem-card__title" id="adm-dem-places">Nobody there: go and sign them up</h3>
                        <span className="adm-dem-card__meta">Open a place for the words and the waiting list</span>
                    </header>
                    {places.length === 0 ? (
                        <p className="adm-dem-empty">Someone offered everything asked for in these days.</p>
                    ) : (
                        <div className="adm-dem-table">
                            <div className="adm-dem-row is-head" aria-hidden="true">
                                <span className="adm-dem-row__tile" />
                                <span>Place</span>
                                <span>Asked most</span>
                                <span>Searches</span>
                                <span className="is-num">Waiting</span>
                                <span />
                            </div>
                            {places.map((r) => {
                                const key = `${r.market}|${r.zone || ''}`
                                const isOpen = open === key
                                return (
                                    <Fragment key={key}>
                                        <button type="button" className={`adm-dem-row${isOpen ? ' is-open' : ''}`} aria-expanded={isOpen} aria-label={`${placeName(r)}: ${r.searches} searches found nobody, ${r.waiting} waiting. ${isOpen ? 'Close' : 'Open'}`} onClick={() => setOpen(isOpen ? null : key)}>
                                            <span className="adm-dem-row__tile" aria-hidden="true"><CityPattern world={placeWorld(r)} centred size={12} /></span>
                                            <span className="adm-dem-row__place">{placeName(r)}</span>
                                            <span className="adm-dem-row__asked">{r.asked?.[0]?.query || ''}</span>
                                            <span className="adm-dem-row__bar"><span className="adm-dem-bar"><span style={{ width: `${Math.round((r.searches / most) * 100)}%` }} /></span><b>{r.searches}</b></span>
                                            <span className="is-num">{r.waiting}<span className="adm-dem-row__unit"> waiting</span></span>
                                            <span className="adm-dem-row__chev"><ChevronDown size={14} aria-hidden="true" /></span>
                                        </button>
                                        {isOpen && <PlaceDetail row={r} days={data.days} />}
                                    </Fragment>
                                )
                            })}
                        </div>
                    )}
                </section>

                <div className="adm-dem-side">
                    <section className="adm-dem-card" aria-labelledby="adm-dem-time">
                        <header className="adm-dem-card__head">
                            <h3 className="adm-dem-card__title" id="adm-dem-time">There, but no time that fit</h3>
                            <span className="adm-dem-card__meta">{plural(noTime, 'search', 'searches')}</span>
                        </header>
                        {noTime === 0 ? <p className="adm-dem-empty">Always someone free.</p> : (
                            <>
                                <span className="adm-dem-split" aria-hidden="true">
                                    <span className="is-out" style={{ width: `${Math.round((full / noTime) * 100)}%` }} />
                                    <span className="is-then" style={{ width: `${Math.round((notThen / noTime) * 100)}%` }} />
                                </span>
                                <dl className="adm-dem-legend">
                                    <div><dt><span className="adm-dem-key is-out" />Booked out for 3 weeks</dt><dd>{full}</dd></div>
                                    {(data.booked_out || []).slice(0, 3).map((r) => <div key={`o${r.query}${r.market}`} className="is-sub"><dt>{`${r.query}, ${cityName(r.market)}`}</dt><dd>{r.times}</dd></div>)}
                                    <div><dt><span className="adm-dem-key is-then" />Free, but not when asked</dt><dd>{notThen}</dd></div>
                                    {(data.not_then_list || []).slice(0, 3).map((r) => <div key={`t${r.query}${r.market}`} className="is-sub"><dt>{`${r.query}, ${cityName(r.market)}`}</dt><dd>{r.times}</dd></div>)}
                                </dl>
                                <p className="adm-dem-note">Booked out: more hours or more businesses there. Not when asked: tell them which hours people want.</p>
                            </>
                        )}
                    </section>

                    <section className="adm-dem-card" aria-labelledby="adm-dem-abroad">
                        <header className="adm-dem-card__head">
                            <h3 className="adm-dem-card__title" id="adm-dem-abroad"><Globe size={14} aria-hidden="true" />From countries we are not in</h3>
                            <span className="adm-dem-card__meta">{plural(abroadTotal, 'search', 'searches')}</span>
                        </header>
                        {abroad.length === 0 ? <p className="adm-dem-empty">No searches from abroad yet.</p> : (
                            <ul className="adm-dem-abroad">
                                {abroad.map((r) => (
                                    <li key={r.country}>
                                        <span className="adm-dem-abroad__who"><CountryDisplay code={r.country} />{r.top_market && <span className="adm-sub">{`mostly ${cityName(r.top_market)}`}</span>}</span>
                                        <span className="adm-dem-bar is-quiet"><span style={{ width: `${Math.round((r.searches / abroadMost) * 100)}%` }} /></span>
                                        <b>{r.searches}</b>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
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

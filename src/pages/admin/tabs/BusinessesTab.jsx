import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, ExternalLink, RotateCw, Search } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { ago, loadAdminBusinesses } from '../../../services/admin'
import { categoryLabel } from '../../../constants/categories'

const stage = (b) => {
    if (b.is_demo) return ['Demo', 'muted']
    if (!b.launched_at) return ['Setting up', 'warning']
    if (!b.is_active) return ['Paused', 'danger']
    return ['Live', 'success']
}

const FILTERS = [['all', 'All'], ['live', 'Live'], ['setup', 'Setting up'], ['paused', 'Paused'], ['demo', 'Demo']]
const KEY = { Live: 'live', 'Setting up': 'setup', Paused: 'paused', Demo: 'demo' }

// The four things a page needs before it looks finished to a client.
const setupSteps = (b) => [
    ['Services', b.services > 0],
    ['Hours', b.has_hours],
    ['Logo', b.has_logo],
    ['Description', b.has_description],
]

const BusinessesTab = ({ formatDate }) => {
    const [rows, setRows] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(null)

    const load = useCallback(async () => {
        setError('')
        try {
            setRows(await loadAdminBusinesses())
        } catch (err) {
            console.error('Businesses failed:', err)
            setError('Could not load businesses. Run admin.sql if it has not been run.')
            setRows([])
        }
    }, [])

    useEffect(() => { load() }, [load])

    const counts = useMemo(() => (rows || []).reduce((acc, b) => {
        const k = KEY[stage(b)[0]]
        acc[k] = (acc[k] || 0) + 1
        acc.all += 1
        return acc
    }, { all: 0 }), [rows])

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        return (rows || []).filter((b) => (filter === 'all' || KEY[stage(b)[0]] === filter)
            && (!q || [b.name, b.city, b.owner_name, b.owner_email, b.slug].some((v) => String(v || '').toLowerCase().includes(q))))
    }, [rows, filter, query])

    return (
        <div className="tab-content">
            <SectionHead
                icon={Building2}
                title="Businesses"
                meta={rows ? `${counts.live || 0} live, ${counts.setup || 0} setting up, ${counts.paused || 0} paused` : 'Loading'}
                action={(
                    <button type="button" onClick={load} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                )}
            />

            <div className="adm-toolbar">
                <div className="adm-chips" role="group" aria-label="Show">
                    {FILTERS.map(([key, label]) => (
                        <button key={key} type="button" className={`adm-chip${filter === key ? ' is-on' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                            {label}<span>{counts[key] || 0}</span>
                        </button>
                    ))}
                </div>
                <label className="adm-search">
                    <Search size={14} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, city or owner" aria-label="Search businesses" />
                </label>
            </div>

            {error && <p className="cell-note" role="alert">{error}</p>}
            {rows && shown.length === 0 && !error && <p className="adm-quiet adm-empty">No businesses match.</p>}

            {shown.length > 0 && (
                <div className="data-table-wrap adm-scroll">
                    <table className="data-table adm-table">
                        <thead>
                            <tr>
                                <th className="adm-w-wide">Business</th>
                                <th>Stage</th>
                                <th>Page ready</th>
                                <th>Bookings</th>
                                <th>Coming up</th>
                                <th>Rating</th>
                                <th className="adm-w-wide">Owner</th>
                                <th>Owner last in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((b) => {
                                const [label, tone] = stage(b)
                                const steps = setupSteps(b)
                                const done = steps.filter(([, ok]) => ok).length
                                return (
                                    <Fragment key={b.id}>
                                        <tr
                                            className={`data-table__row--clickable${open === b.id ? ' data-table__row--selected' : ''}`}
                                            onClick={() => setOpen(open === b.id ? null : b.id)}
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setOpen(open === b.id ? null : b.id) }}
                                            aria-expanded={open === b.id}
                                        >
                                            <td>
                                                <span className="cell-user__text">
                                                    <span className="cell-user__name">{b.name}</span>
                                                    <span className="cell-user__email">{[categoryLabel(b.category, b.category_detail), b.city].filter(Boolean).join(', ')}</span>
                                                </span>
                                            </td>
                                            <td><span className={`adm-pill adm-pill--${tone}`}>{label}</span></td>
                                            <td><span className={`adm-steps${done === steps.length ? ' is-done' : ''}`} title={steps.map(([n, ok]) => `${n}: ${ok ? 'yes' : 'missing'}`).join(', ')}>{done}/{steps.length}</span></td>
                                            <td className="cell-mono">{b.bookings}<span className="adm-sub"> {b.bookings_30d} in 30d</span></td>
                                            <td className="cell-mono">{b.upcoming}</td>
                                            <td className="cell-mono">{b.reviews ? `${b.rating} (${b.reviews})` : 'None'}</td>
                                            <td>
                                                <span className="cell-user__text">
                                                    <span className="cell-user__name">{b.owner_name || 'No name'}</span>
                                                    <span className="cell-user__email">{b.owner_email}</span>
                                                </span>
                                            </td>
                                            <td className="cell-date">{b.owner_last_seen ? ago(b.owner_last_seen) : 'Never'}</td>
                                        </tr>
                                        {open === b.id && (
                                            <tr className="adm-detail">
                                                <td colSpan={8}>
                                                    <dl className="adm-facts adm-facts--row">
                                                        <div><dt>Page</dt><dd><a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer" className="adm-link">locappoint.com/{b.slug} <ExternalLink size={12} aria-hidden="true" /></a></dd></div>
                                                        <div><dt>Joined</dt><dd>{formatDate ? formatDate(b.created_at) : ago(b.created_at)}</dd></div>
                                                        <div><dt>Went live</dt><dd>{b.launched_at ? (formatDate ? formatDate(b.launched_at) : ago(b.launched_at)) : 'Not yet'}</dd></div>
                                                        <div><dt>Last booking</dt><dd>{b.last_booking_at ? ago(b.last_booking_at) : 'None yet'}</dd></div>
                                                        <div><dt>Services</dt><dd>{b.services}</dd></div>
                                                        <div><dt>Team</dt><dd>{b.team || 1}</dd></div>
                                                        <div><dt>Contact</dt><dd>{b.owner_phone || 'No phone'}</dd></div>
                                                        <div><dt>Still missing</dt><dd>{steps.filter(([, ok]) => !ok).map(([n]) => n).join(', ') || 'Nothing'}</dd></div>
                                                    </dl>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default BusinessesTab

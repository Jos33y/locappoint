import { useEffect, useState } from 'react'
import { RotateCw, ShieldCheck } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { usePaged } from './usePaged'
import { ago } from '../../../services/admin'
import { CHECKS, ITEM_LABEL, PARTS, excuseCancellation, loadAdminReliability, loadAdminReliabilityBusiness, setBadge } from '../../../services/reliability'
import '../../../styles/admin/support.css'
import '../../../styles/admin/reliability.css'

const VIEWS = [['all', 'All'], ['badge', 'Reliable'], ['warned', 'At risk'], ['removed', 'Removed'], ['new', 'Under 10 bookings']]
const USER = ['22023', 'P0002']
const fail = (err) => (err?.message && USER.includes(err.code) ? err.message : 'That did not save. Try again.')

const Pill = ({ tone, children }) => <span className={`adm-pill adm-pill--${tone}`}>{children}</span>

// A note, then the action. Used to excuse a cancellation and to remove the badge.
const NoteAction = ({ label, hint, button, tone = 'secondary', onDo }) => {
    const [open, setOpen] = useState(false)
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    if (!open) return <button type="button" className={`btn btn--${tone} btn--sm`} onClick={() => setOpen(true)}>{button}</button>
    const go = async () => {
        setBusy(true)
        setError('')
        try {
            await onDo(note)
            setOpen(false)
            setNote('')
        } catch (err) {
            setError(fail(err))
        } finally {
            setBusy(false)
        }
    }
    return (
        <div className="adm-sup-form adm-rel-form">
            <label className="adm-sup-field">
                <span>{label}</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={hint} />
            </label>
            {error && <p className="cell-note" role="alert">{error}</p>}
            <div className="adm-sup-form__actions">
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className={`btn btn--${tone === 'secondary' ? 'primary' : tone} btn--sm`} disabled={busy} onClick={go}>{busy ? 'Working' : button}</button>
            </div>
        </div>
    )
}

const Detail = ({ row, onChanged }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [restoring, setRestoring] = useState(false)

    useEffect(() => {
        let cancelled = false
        loadAdminReliabilityBusiness(row.business_id)
            .then((data) => { if (!cancelled) setD(data) })
            .catch(() => { if (!cancelled) setError('Could not load this business. Run reliability.sql if it has not been run.') })
        return () => { cancelled = true }
    }, [row.business_id])

    const after = (data) => { setD(data); onChanged() }
    const restore = async () => {
        setRestoring(true)
        try { after(await setBadge({ businessId: row.business_id, action: 'restore' })) } catch (err) { setError(fail(err)) } finally { setRestoring(false) }
    }

    if (error) return <p className="cell-note" role="alert">{error}</p>
    if (!d) return <p className="adm-quiet">Loading</p>
    const items = d.items || []
    return (
        <div className="adm-rel-detail">
            <div className="adm-rel-cols">
                <div>
                    <h4 className="adm-rel-h4">What counted</h4>
                    {items.length === 0 ? <p className="adm-quiet">Nothing in 90 days.</p> : (
                        <ul className="adm-rel-items">
                            {items.map((it, i) => (
                                <li key={`${it.kind}-${it.appointment_id || it.ticket_number || i}`}>
                                    <div className="adm-rel-items__row">
                                        <span>
                                            <b>{ITEM_LABEL[it.kind] || it.kind}</b>
                                            <span className="adm-sub">{[it.client_name, it.date, it.time, it.ticket_number ? `#${it.ticket_number}` : '', it.waited_hours ? `waited ${it.waited_hours} h` : ''].filter(Boolean).join(', ')}</span>
                                        </span>
                                        <span className="adm-rel-items__pts">-{it.points}</span>
                                    </div>
                                    {(it.kind === 'cancel' || it.kind === 'late_cancel') && it.appointment_id && (
                                        <NoteAction
                                            label="Why it is excused (the owner does not see this)"
                                            hint="Hospital stay, letter seen in ticket 1042."
                                            button="Excuse it"
                                            onDo={async (note) => after(await excuseCancellation({ appointmentId: it.appointment_id, note }))}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {(d.excused || []).length > 0 && (
                        <>
                            <h4 className="adm-rel-h4">Excused</h4>
                            <ul className="adm-rel-items">
                                {d.excused.map((e) => <li key={e.appointment_id}><span className="adm-sub">{[e.client_name, e.date].filter(Boolean).join(', ')}: {e.note}</span></li>)}
                            </ul>
                        </>
                    )}
                </div>
                <div>
                    <h4 className="adm-rel-h4">Badge checks</h4>
                    <ul className="adm-rel-checks">
                        {CHECKS.map((c) => <li key={c.key} className={d.checks?.[c.key] ? 'is-ok' : ''}>{d.checks?.[c.key] ? 'Yes' : 'No'}: {c.label}</li>)}
                    </ul>
                    <div className="adm-rel-badge">
                        {d.removed_at ? (
                            <>
                                <p className="adm-sub">Removed {ago(d.removed_at)}: {d.removed_note}</p>
                                <button type="button" className="btn btn--secondary btn--sm" disabled={restoring} onClick={restore}>{restoring ? 'Working' : 'Restore the badge'}</button>
                            </>
                        ) : (
                            <NoteAction
                                label="Why (the owner reads this)"
                                hint="Charging clients outside Locappoint, see ticket 1050."
                                button="Remove the badge"
                                tone="danger"
                                onDo={async (note) => after(await setBadge({ businessId: row.business_id, action: 'remove', note }))}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Every business's reliability: score, parts, badge. Staff excuse a cancellation or remove the badge.
const ReliabilityTab = () => {
    const [view, setView] = useState('all')
    const [open, setOpen] = useState(null)
    const { data, error, page, pages, setPage, reload } = usePaged((args) => loadAdminReliability({ ...args, view }), [view])

    useEffect(() => { setPage(0) }, [view, setPage])
    const counts = data?.counts || {}

    return (
        <div className="tab-content">
            <SectionHead
                icon={ShieldCheck}
                title="Reliability"
                meta={data ? `${counts.badge || 0} Reliable, ${counts.warned || 0} at risk` : 'Loading'}
                action={(
                    <button type="button" onClick={reload} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                )}
            />

            <div className="adm-toolbar">
                <div className="adm-chips" role="group" aria-label="Show">
                    {VIEWS.map(([key, label]) => (
                        <button key={key} type="button" className={`adm-chip${view === key ? ' is-on' : ''}`} aria-pressed={view === key} onClick={() => setView(key)}>
                            {label}{counts[key] != null ? ` ${counts[key]}` : ''}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="cell-note" role="alert">{error.replace('admin.sql', 'reliability.sql')}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">No businesses here.</p>}

            {data && data.rows.length > 0 && (
                <ul className="adm-blk-list">
                    {data.rows.map((r) => (
                        <li key={r.business_id} className="panel adm-blk adm-rel">
                            <div className="adm-blk__head">
                                <div>
                                    <p className="adm-blk__title"><b>{r.business_name}</b>{r.city ? `, ${r.city}` : ''}</p>
                                    <p className="adm-sub">{r.bookings} bookings, {r.completed} completed in 90 days{r.kept_pct != null ? `, keeps ${r.kept_pct}%` : ''}. Updated {String(ago(r.computed_at)).toLowerCase()}.</p>
                                </div>
                                <div className="adm-rel-side">
                                    {r.shown ? <span className="adm-rel-score">{r.score}</span> : <Pill tone="muted">New</Pill>}
                                    {r.badge && <Pill tone="info">Reliable</Pill>}
                                    {r.badge && r.below_since && <Pill tone="warning">Under 85</Pill>}
                                    {r.removed_at && <Pill tone="danger">Removed</Pill>}
                                </div>
                            </div>
                            <dl className="adm-facts adm-facts--row">
                                {PARTS.map((p) => <div key={p.key}><dt>{p.label}</dt><dd>{r.parts?.[p.key] ?? p.max} of {p.max}</dd></div>)}
                            </dl>
                            <button type="button" className="adm-link adm-rel-toggle" aria-expanded={open === r.business_id} onClick={() => setOpen(open === r.business_id ? null : r.business_id)}>
                                {open === r.business_id ? 'Hide' : 'What counted, and actions'}
                            </button>
                            {open === r.business_id && <Detail row={r} onChanged={reload} />}
                        </li>
                    ))}
                </ul>
            )}

            {data && pages > 1 && (
                <nav className="adm-pager" aria-label="Pages">
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                    <span>Page {page + 1} of {pages}</span>
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
                </nav>
            )}
        </div>
    )
}

export default ReliabilityTab

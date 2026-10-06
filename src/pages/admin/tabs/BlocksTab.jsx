import { useEffect, useState } from 'react'
import { Ban, RotateCw, TriangleAlert } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { usePaged } from './usePaged'
import { ago } from '../../../services/admin'
import { REASON_LABEL, loadAdminBlocks, reviewBlock } from '../../../services/clientBlocks'
import '../../../styles/admin/support.css'

const VIEWS = [['pending', 'To review'], ['kept', 'Kept'], ['lifted', 'Lifted'], ['all', 'All']]
const REVIEW = { pending: ['To review', 'warning'], kept: ['Kept', 'muted'], lifted: ['Lifted', 'info'] }

const Pill = ({ pair }) => <span className={`adm-pill adm-pill--${pair?.[1] || 'muted'}`}>{pair?.[0]}</span>

const Review = ({ row, onDone }) => {
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const go = async (decision) => {
        setBusy(decision)
        setError('')
        try {
            await reviewBlock({ id: row.id, decision, note })
            setNote('')
            onDone()
        } catch (err) {
            setError(err?.message && ['22023', 'P0002'].includes(err.code) ? err.message : 'That did not save. Try again.')
        } finally {
            setBusy('')
        }
    }
    return (
        <div className="adm-sup-form">
            <label className="adm-sup-field">
                <span>Note for the owner (needed to lift)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why we keep it, or why we lift it." />
            </label>
            {error && <p className="cell-note" role="alert">{error}</p>}
            <div className="adm-sup-form__actions">
                <button type="button" className="btn btn--secondary btn--sm" disabled={Boolean(busy)} onClick={() => go('lifted')}>{busy === 'lifted' ? 'Working' : 'Lift the block'}</button>
                <button type="button" className="btn btn--primary btn--sm" disabled={Boolean(busy)} onClick={() => go('kept')}>{busy === 'kept' ? 'Working' : 'Keep it'}</button>
            </div>
        </div>
    )
}

// Every block a business makes, with its reason, the client's record with that business, and
// whether the business blocks a lot. Staff keep or lift each one; the owner is told.
const BlocksTab = ({ onCount }) => {
    const [view, setView] = useState('pending')
    const { data, error, page, pages, setPage, reload } = usePaged((args) => loadAdminBlocks({ ...args, review: view }), [view])

    useEffect(() => { setPage(0) }, [view, setPage])
    useEffect(() => { if (data?.counts) onCount?.(data.counts.pending) }, [data, onCount])

    const counts = data?.counts || {}

    return (
        <div className="tab-content">
            <SectionHead
                icon={Ban}
                title="Blocks"
                meta={data ? `${counts.pending || 0} to review` : 'Loading'}
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

            {error && <p className="cell-note" role="alert">{error.replace('admin.sql', 'client-blocks.sql')}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">{view === 'pending' ? 'Nothing to review.' : 'No blocks here.'}</p>}

            {data && data.rows.length > 0 && (
                <ul className="adm-blk-list">
                    {data.rows.map((r) => (
                        <li key={r.id} className="panel adm-blk">
                            <div className="adm-blk__head">
                                <div>
                                    <p className="adm-blk__title"><b>{r.business_name}</b> blocked <b>{r.name || r.email || 'a client'}</b></p>
                                    <p className="adm-sub">{ago(r.created_at)}{r.has_account ? ', has an account' : ', guest'}{r.email ? `, ${r.email}` : ''}{r.phone ? `, ...${r.phone.slice(-4)}` : ''}</p>
                                </div>
                                <Pill pair={REVIEW[r.review]} />
                            </div>
                            <p className="adm-blk__why"><b>{REASON_LABEL[r.reason] || r.reason}</b>{r.note ? `: ${r.note}` : ''}</p>
                            <dl className="adm-facts adm-facts--row">
                                <div><dt>Bookings with them</dt><dd>{r.client.bookings}</dd></div>
                                <div><dt>No-shows</dt><dd>{r.client.no_shows}</dd></div>
                                <div><dt>Late cancels</dt><dd>{r.client.late_cancels}</dd></div>
                                <div><dt>Blocked elsewhere</dt><dd>{r.client.blocked_elsewhere}</dd></div>
                            </dl>
                            {r.flag?.flagged && (
                                <p className="adm-blk__flag">
                                    <TriangleAlert size={14} aria-hidden="true" />
                                    {r.business_name} blocks a lot: {r.flag.recent} in 30 days, {r.flag.active} active of {r.flag.clients} clients this year.
                                </p>
                            )}
                            {r.ticket_id && <a className="adm-link" href={`?ticket=${r.ticket_id}#support`}>Safety ticket</a>}
                            {r.review === 'pending' ? <Review row={r} onDone={reload} /> : r.review_note && <p className="adm-sub">Note sent: {r.review_note}</p>}
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

export default BlocksTab

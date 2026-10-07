import { useEffect, useState } from 'react'
import { BadgeCheck, RotateCw } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { usePaged } from './usePaged'
import { ago } from '../../../services/admin'
import { loadAdminVerifications, reviewVerification, setGold, videoUrl } from '../../../services/verification'
import '../../../styles/admin/support.css'
import '../../../styles/admin/verification.css'

const VIEWS = [['submitted', 'To decide'], ['approved', 'Verified'], ['rejected', 'Not yet'], ['expired', 'Needs a new video'], ['started', 'Started'], ['all', 'All']]
const USER = ['22023', 'P0002']
const fail = (err) => (err?.message && USER.includes(err.code) ? err.message : 'That did not save. Try again.')
const STATUS = { submitted: ['To decide', 'warning'], approved: ['Verified', 'success'], rejected: ['Not yet', 'muted'], expired: ['Needs a new video', 'info'], none: ['Started', 'muted'] }
const ID = { verified: ['ID checked', 'success'], pending: ['ID being checked', 'info'], failed: ['ID failed', 'danger'], none: ['No ID check yet', 'muted'] }

const Pill = ({ pair }) => <span className={`adm-pill adm-pill--${pair?.[1] || 'muted'}`}>{pair?.[0]}</span>

// The walk-through, streamed from the private bucket on a link that lasts 15 minutes.
const Clip = ({ path }) => {
    const [url, setUrl] = useState('')
    const [error, setError] = useState('')
    useEffect(() => {
        let cancelled = false
        videoUrl(path).then((u) => { if (!cancelled) setUrl(u) }).catch(() => { if (!cancelled) setError('The video did not load.') })
        return () => { cancelled = true }
    }, [path])
    if (error) return <p className="cell-note">{error}</p>
    if (!url) return <p className="adm-quiet">Loading the video</p>
    return <video className="adm-ver-video" src={url} controls playsInline preload="metadata" />
}

const Decide = ({ row, onDone }) => {
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const go = async (decision) => {
        setBusy(decision)
        setError('')
        try {
            await reviewVerification({ businessId: row.business_id, decision, note })
            setNote('')
            onDone()
        } catch (err) {
            setError(fail(err))
        } finally {
            setBusy('')
        }
    }
    return (
        <div className="adm-sup-form">
            <label className="adm-sup-field">
                <span>Note for the owner (needed to say not yet)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="The street sign is not in the video. Film from the door number." />
            </label>
            {error && <p className="cell-note" role="alert">{error}</p>}
            <div className="adm-sup-form__actions">
                <button type="button" className="btn btn--secondary btn--sm" disabled={Boolean(busy)} onClick={() => go('reject')}>{busy === 'reject' ? 'Working' : 'Not yet'}</button>
                <button type="button" className="btn btn--primary btn--sm" disabled={Boolean(busy) || row.identity?.status !== 'verified'} onClick={() => go('approve')}>{busy === 'approve' ? 'Working' : 'Approve'}</button>
            </div>
        </div>
    )
}

const Remove = ({ row, onDone }) => {
    const [open, setOpen] = useState(false)
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const act = async (action) => {
        setBusy(true)
        setError('')
        try {
            await setGold({ businessId: row.business_id, action, note })
            setOpen(false)
            setNote('')
            onDone()
        } catch (err) {
            setError(fail(err))
        } finally {
            setBusy(false)
        }
    }
    if (row.removed) return <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('restore')}>{busy ? 'Working' : 'Restore the badge'}</button>
    if (!open) return <button type="button" className="btn btn--danger btn--sm" onClick={() => setOpen(true)}>Remove the badge</button>
    return (
        <div className="adm-sup-form">
            <label className="adm-sup-field">
                <span>Why (the owner reads this)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="The shop in the video is not this business." />
            </label>
            {error && <p className="cell-note" role="alert">{error}</p>}
            <div className="adm-sup-form__actions">
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => act('remove')}>{busy ? 'Working' : 'Remove the badge'}</button>
            </div>
        </div>
    )
}

// Gold badge applications: the ID result from Stripe, the walk-through video or a call request, and
// the decision. The video is deleted once we decide.
const VerificationTab = ({ onCount }) => {
    const [view, setView] = useState('submitted')
    const { data, error, page, pages, setPage, reload } = usePaged((args) => loadAdminVerifications({ ...args, view }), [view])

    useEffect(() => { setPage(0) }, [view, setPage])
    useEffect(() => { if (data?.counts) onCount?.(data.counts.submitted) }, [data, onCount])
    const counts = data?.counts || {}

    return (
        <div className="tab-content">
            <SectionHead
                icon={BadgeCheck}
                title="Verification"
                meta={data ? `${counts.submitted || 0} to decide, ${counts.approved || 0} verified` : 'Loading'}
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

            {error && <p className="cell-note" role="alert">{error.replace('admin.sql', 'verified.sql')}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">{view === 'submitted' ? 'Nothing to decide.' : 'No businesses here.'}</p>}

            {data && data.rows.length > 0 && (
                <ul className="adm-blk-list">
                    {data.rows.map((r) => (
                        <li key={r.business_id} className="panel adm-blk adm-ver">
                            <div className="adm-blk__head">
                                <div>
                                    <p className="adm-blk__title"><b>{r.business_name}</b>{r.city ? `, ${r.city}` : ''}</p>
                                    <p className="adm-sub">{[r.owner_email, r.phone, r.place?.address].filter(Boolean).join(', ')}</p>
                                </div>
                                <div className="adm-ver-pills">
                                    <Pill pair={STATUS[r.status]} />
                                    <Pill pair={ID[r.identity?.status || 'none']} />
                                    {r.reliable && <Pill pair={['Reliable', 'info']} />}
                                    {r.removed && <Pill pair={['Removed', 'danger']} />}
                                </div>
                            </div>
                            <dl className="adm-facts adm-facts--row">
                                <div><dt>ID tries</dt><dd>{r.identity?.attempts ?? 0} of 3</dd></div>
                                <div><dt>Place</dt><dd>{r.place?.kind === 'call' ? 'Asked for a call' : r.video_path ? 'Video sent' : r.place?.video_at ? 'Video seen' : 'Nothing yet'}</dd></div>
                                <div><dt>Score</dt><dd>{r.score ?? 'New'}</dd></div>
                                <div><dt>{r.status === 'approved' ? 'Verified until' : 'Sent'}</dt><dd>{r.status === 'approved' ? String(r.verified_until || '').slice(0, 10) : r.submitted_at ? ago(r.submitted_at) : 'Not yet'}</dd></div>
                            </dl>
                            {r.identity?.error && <p className="adm-sub">Stripe said: {r.identity.error}</p>}
                            {r.place?.kind === 'call' && r.status === 'submitted' && <p className="adm-blk__why"><b>Call them</b> to book 10 minutes on video: {r.phone || r.owner_email}. Approve after the call.</p>}
                            {r.video_path && <Clip path={r.video_path} />}
                            {r.review_note && r.status !== 'submitted' && <p className="adm-sub">Note sent: {r.review_note}</p>}
                            {r.removed_note && <p className="adm-sub">Removed: {r.removed_note}</p>}
                            {r.status === 'submitted' && <Decide row={r} onDone={reload} />}
                            {r.status === 'approved' && <Remove row={r} onDone={reload} />}
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

export default VerificationTab

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Ban, CalendarCheck, CircleCheck, CreditCard, Flag, History, LifeBuoy, MessageSquareReply, RotateCw, Search, ShieldAlert, Store, TriangleAlert, UserRound } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { usePaged } from './usePaged'
import {
    BOOKING_STATUS, TICKET_PRIORITY, TICKET_STATE, adminAskOther, adminRefund, adminReply, adminSetVisit, adminSuspend, adminUnsuspend,
    adminUpdateTicket, adminWarn, ago, loadAdminTicket, loadAdminTickets, shortDate,
} from '../../../services/admin'
import { CATEGORY_LABEL } from '../../../constants/support'
import { businessBlockFlag } from '../../../services/clientBlocks'
import '../../../styles/admin/support.css'

const VIEWS = [['open', 'Open'], ['waiting', 'Waiting on them'], ['resolved', 'Resolved'], ['all', 'All']]
const ACTION_LABEL = {
    refund: 'Refund', no_show: 'Marked no-show', attended: 'Marked attended', warn: 'Warning', suspend: 'Paused business',
    unsuspend: 'Resumed business', ask_other: 'Asked the other side', status: 'Status', priority: 'Priority', outcome: 'Outcome',
}
const REFUND_REASON = {
    client_cancelled: 'Cancelled in time', client_late_cancel: 'Late cancel', business_cancelled: 'Business cancelled',
    declined: 'Declined', no_show: 'No-show rule', late_payment: 'Paid late', support: 'Support',
}

const ticketFromUrl = () => new URLSearchParams(window.location.search).get('ticket')
const writeTicket = (id) => {
    const params = new URLSearchParams(window.location.search)
    if (id) params.set('ticket', id)
    else params.delete('ticket')
    const q = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`)
}

// Money to the cent: refunds are often partial.
const cents = (value, currency = 'EUR') => {
    const n = Number(value)
    if (!Number.isFinite(n)) return ''
    return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', { style: 'currency', currency, minimumFractionDigits: currency === 'NGN' ? 0 : 2, maximumFractionDigits: currency === 'NGN' ? 0 : 2 }).format(n)
}

// How long since: "12 min", "3 h", "2 d". The queue is about waiting time.
const waited = (iso) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (mins < 60) return `${mins} min`
    if (mins < 48 * 60) return `${Math.round(mins / 60)} h`
    return `${Math.round(mins / 1440)} d`
}

const errorText = (err) => (err?.message && ['22023', '42501', 'P0002'].includes(err.code) ? err.message : 'That did not work. Try again.')

const Pill = ({ pair, children }) => <span className={`adm-pill adm-pill--${pair?.[1] || 'muted'}`}>{children || pair?.[0]}</span>

// One action, opened in place: a short form, then the call. Nothing happens on a single tap.
const ActionForm = ({ title, fields, submit, danger = false, onRun, onCancel }) => {
    const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ''])))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const go = async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            await onRun(values)
        } catch (err) {
            setError(errorText(err))
            setBusy(false)
        }
    }
    return (
        <form className="adm-sup-form" onSubmit={go}>
            <p className="adm-sup-form__title">{title}</p>
            {fields.map((f) => (
                <label key={f.name} className="adm-sup-field">
                    <span>{f.label}</span>
                    {f.type === 'select' ? (
                        <select value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                            {f.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    ) : f.type === 'number' ? (
                        <input type="number" inputMode="decimal" step="0.01" min="0" max={f.max} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} required />
                    ) : (
                        <textarea rows={3} value={values[f.name]} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} required={!f.optional} />
                    )}
                    {f.hint && <small>{f.hint}</small>}
                </label>
            ))}
            {error && <p className="cell-note" role="alert">{error}</p>}
            <div className="adm-sup-form__actions">
                <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className={`btn ${danger ? 'btn--danger' : 'btn--primary'} btn--sm`} disabled={busy}>{busy ? 'Working' : submit}</button>
            </div>
        </form>
    )
}

const Ticket = ({ id, onBack, onChanged }) => {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [body, setBody] = useState('')
    const [note, setNote] = useState(false)
    const [after, setAfter] = useState('waiting')
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState('')
    const [action, setAction] = useState('')
    const [blocks, setBlocks] = useState(null)

    const load = useCallback(async () => {
        setError('')
        try {
            setData(await loadAdminTicket(id))
        } catch (err) {
            console.error('Ticket failed:', err)
            setError('Could not load this ticket. Run support-desk.sql if it has not been run.')
        }
    }, [id])

    useEffect(() => { load() }, [load])

    // How much this business blocks, beside its other history.
    const bizId = data?.business?.id
    useEffect(() => {
        if (!bizId) return undefined
        let cancelled = false
        businessBlockFlag(bizId).then((f) => { if (!cancelled) setBlocks(f) }).catch(() => {})
        return () => { cancelled = true }
    }, [bizId])

    const done = (next) => {
        setData(next)
        setAction('')
        onChanged()
    }

    const send = async (event) => {
        event.preventDefault()
        if (!body.trim()) return
        setSending(true)
        setSendError('')
        try {
            done(await adminReply({ id, body: body.trim(), note, status: note ? null : after }))
            setBody('')
        } catch (err) {
            setSendError(errorText(err))
        } finally {
            setSending(false)
        }
    }

    if (error) return <div className="tab-content"><button type="button" className="adm-link" onClick={onBack}><ArrowLeft size={14} /> Queue</button><p className="cell-note" role="alert">{error}</p></div>
    if (!data) return <div className="tab-content"><p className="adm-quiet adm-pad">Loading</p></div>

    const t = data.ticket
    const b = data.booking
    const pay = data.payment
    const biz = data.business
    const left = pay ? Math.max(0, Number(pay.amount) - Number(pay.refunded) - Number(pay.pending_refunds)) : 0
    const supportRefunded = pay?.refunds?.some((r) => r.reason === 'support')
    const set = async (patch) => done(await adminUpdateTicket({ id, ...patch }))

    const ACTIONS = {
        refund: {
            title: `Refund the client, from ${cents(left, pay?.currency)} still unrefunded`,
            submit: 'Send refund',
            danger: true,
            fields: [
                { name: 'amount', label: `Amount (${pay?.currency || 'EUR'})`, type: 'number', max: left, initial: String(left) },
                { name: 'detail', label: 'Why (staff only)', optional: true },
            ],
            run: (v) => adminRefund({ id, amount: Number(v.amount), detail: v.detail }),
        },
        no_show: {
            title: 'Mark this visit as a no-show. The written no-show rule applies to the money.',
            submit: 'Mark no-show',
            danger: true,
            fields: [{ name: 'detail', label: 'Why (staff only)', optional: true }],
            run: (v) => adminSetVisit({ id, status: 'no_show', detail: v.detail }),
        },
        attended: {
            title: 'Mark this visit as attended. Refunds already sent are not taken back.',
            submit: 'Mark attended',
            fields: [{ name: 'detail', label: 'Why (staff only)', optional: true }],
            run: (v) => adminSetVisit({ id, status: 'completed', detail: v.detail }),
        },
        warn: {
            title: 'Send a written warning. It is emailed, kept on record and counted.',
            submit: 'Send warning',
            danger: true,
            fields: [
                { name: 'target', label: 'To', type: 'select', options: [...(b || t.side === 'client' ? [['client', 'The client']] : []), ...(biz ? [['business', 'The business']] : [])], initial: b || t.side === 'client' ? 'client' : 'business' },
                { name: 'message', label: 'What they will read', placeholder: 'What was wrong, and what happens if it happens again.' },
            ],
            run: (v) => adminWarn({ id, target: v.target, message: v.message }),
        },
        suspend: {
            title: `Pause bookings for ${biz?.name}. The page stays up; the owner is told why on a ticket and cannot switch it back on.`,
            submit: 'Pause business',
            danger: true,
            fields: [{ name: 'reason', label: 'Reason the owner reads', placeholder: 'Two reports of charging outside Locappoint this week.' }],
            run: (v) => adminSuspend({ id, reason: v.reason }),
        },
        unsuspend: {
            title: `Turn bookings back on for ${biz?.name}. The owner is told.`,
            submit: 'Resume business',
            fields: [{ name: 'detail', label: 'Why (staff only)', optional: true }],
            run: (v) => adminUnsuspend({ id, detail: v.detail }),
        },
        ask: {
            title: `Ask the ${t.side === 'client' ? 'business' : 'client'} for their side, in a linked ticket.`,
            submit: 'Send question',
            fields: [{ name: 'message', label: 'Your question', placeholder: 'The client says... What happened on your side?' }],
            run: (v) => adminAskOther({ id, message: v.message }),
        },
    }
    const open = ACTIONS[action]

    return (
        <div className="tab-content adm-sup">
            <button type="button" className="adm-link adm-sup__back" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" /> Queue</button>

            <header className="adm-sup__head">
                <p className="adm-sup__ref">
                    <span>#{t.number}</span>
                    <span>{CATEGORY_LABEL[t.category] || t.category}</span>
                    <span>{t.side === 'client' ? 'From a client' : 'From a business'}</span>
                    <span>Opened {ago(t.created_at)}</span>
                </p>
                <h2 className="adm-sup__title">{t.subject}</h2>
                <div className="adm-sup__controls">
                    <label>
                        <span>Status</span>
                        <select value={t.status} onChange={(e) => set({ status: e.target.value }).catch((err) => setSendError(errorText(err)))}>
                            {Object.entries(TICKET_STATE).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Priority</span>
                        <select value={t.priority} onChange={(e) => set({ priority: Number(e.target.value) }).catch((err) => setSendError(errorText(err)))}>
                            {Object.entries(TICKET_PRIORITY).map(([k, [label]]) => <option key={k} value={k}>{`${k}, ${label}`}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Outcome</span>
                        <select value={t.outcome || ''} onChange={(e) => set({ outcome: e.target.value }).catch((err) => setSendError(errorText(err)))}>
                            <option value="">Not decided</option>
                            <option value="upheld">Upheld</option>
                            <option value="not_upheld">Not upheld</option>
                        </select>
                    </label>
                </div>
                {(t.parent_id || t.children.length > 0) && (
                    <p className="adm-sup__links">
                        {t.parent_id && <a className="adm-link" href={`?ticket=${t.parent_id}#support`}>Original report</a>}
                        {t.children.map((c) => <a key={c.id} className="adm-link" href={`?ticket=${c.id}#support`}>#{c.number}, {c.side} side, {TICKET_STATE[c.status]?.[0]}</a>)}
                    </p>
                )}
            </header>

            <div className="adm-sup__grid">
                <section className="panel adm-sup__talk" aria-label="Conversation">
                    <ol className="adm-sup-msgs">
                        {data.messages.map((m) => (
                            m.role === 'system' ? (
                                <li key={m.id} className="adm-sup-msg is-system"><p className="adm-sup-msg__body">{m.body} {new Date(m.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></li>
                            ) : (
                            <li key={m.id} className={`adm-sup-msg is-${m.role}`}>
                                <p className="adm-sup-msg__who">
                                    <b>{m.role === 'note' ? `Note, ${m.author || 'staff'}` : m.role === 'admin' ? `${m.author || 'Support'} (support)` : m.author || data.reporter.name}</b>
                                    <time dateTime={m.at}>{new Date(m.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                                </p>
                                <p className="adm-sup-msg__body">{m.body}</p>
                            </li>
                            )
                        ))}
                    </ol>
                    <form className="adm-sup-reply" onSubmit={send}>
                        <div className="adm-chips" role="group" aria-label="Write">
                            <button type="button" className={`adm-chip${!note ? ' is-on' : ''}`} aria-pressed={!note} onClick={() => setNote(false)}>Reply to them</button>
                            <button type="button" className={`adm-chip${note ? ' is-on' : ''}`} aria-pressed={note} onClick={() => setNote(true)}>Note, staff only</button>
                        </div>
                        <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} aria-label={note ? 'Note' : 'Reply'} placeholder={note ? 'Only staff see this.' : 'They get this by email, in the bell and by push.'} />
                        {sendError && <p className="cell-note" role="alert">{sendError}</p>}
                        <div className="adm-sup-reply__actions">
                            {!note && (
                                <label>
                                    <span>Then</span>
                                    <select value={after} onChange={(e) => setAfter(e.target.value)}>
                                        <option value="waiting">Waiting on them</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="open">Keep open</option>
                                    </select>
                                </label>
                            )}
                            <button type="submit" className="btn btn--primary btn--sm" disabled={sending || !body.trim()}>
                                <MessageSquareReply size={13} aria-hidden="true" />
                                <span>{sending ? 'Sending' : note ? 'Save note' : 'Send reply'}</span>
                            </button>
                        </div>
                    </form>
                </section>

                <div className="adm-sup__side">
                    <section className="panel">
                        <div className="panel__head"><h3 className="panel__title"><Flag size={12} className="panel__title-icon" aria-hidden="true" />Actions</h3></div>
                        <div className="panel__body adm-sup-actions">
                            {open ? (
                                <ActionForm key={action} {...open} onRun={async (v) => done(await open.run(v))} onCancel={() => setAction('')} />
                            ) : (
                                <>
                                    {pay && left > 0 && !supportRefunded && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('refund')}><CreditCard size={13} aria-hidden="true" /><span>Refund</span></button>}
                                    {b?.started && ['confirmed', 'completed'].includes(b.status) && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('no_show')}><Ban size={13} aria-hidden="true" /><span>Mark no-show</span></button>}
                                    {b?.started && b.status === 'no_show' && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('attended')}><CircleCheck size={13} aria-hidden="true" /><span>Mark attended</span></button>}
                                    {(b || biz || t.side === 'client') && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('warn')}><TriangleAlert size={13} aria-hidden="true" /><span>Warn</span></button>}
                                    {(b || (t.side === 'client' && biz)) && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('ask')}><MessageSquareReply size={13} aria-hidden="true" /><span>Ask the other side</span></button>}
                                    {biz && !biz.suspended_at && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('suspend')}><ShieldAlert size={13} aria-hidden="true" /><span>Pause business</span></button>}
                                    {biz?.suspended_at && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAction('unsuspend')}><Store size={13} aria-hidden="true" /><span>Resume business</span></button>}
                                    {supportRefunded && <p className="adm-quiet">A support refund was already made on this payment.</p>}
                                </>
                            )}
                        </div>
                    </section>

                    {b && (
                        <section className="panel">
                            <div className="panel__head">
                                <h3 className="panel__title"><CalendarCheck size={12} className="panel__title-icon" aria-hidden="true" />Booking</h3>
                                <Pill pair={BOOKING_STATUS[b.status]} />
                            </div>
                            <div className="panel__body">
                                <dl className="adm-facts">
                                    <div><dt>When</dt><dd>{shortDate(b.date)} {b.time}</dd></div>
                                    <div><dt>Service</dt><dd>{b.service || 'Removed'}{Number(b.people) > 1 ? `, ${b.people} people` : ''}</dd></div>
                                    {b.staff && <div><dt>With</dt><dd>{b.staff}</dd></div>}
                                    <div><dt>Where</dt><dd>{b.mode === 'at_client' ? 'At the client' : b.mode === 'online' ? 'Online' : 'At the business'}</dd></div>
                                    <div><dt>Client</dt><dd>{b.client_name}{b.has_account ? '' : ', guest'}</dd></div>
                                    {b.client_email && <div><dt>Email</dt><dd>{b.client_email}</dd></div>}
                                    {b.client_phone && <div><dt>Phone</dt><dd>{b.client_phone}</dd></div>}
                                    <div><dt>Price</dt><dd>{b.price != null ? cents(b.price, b.currency) : 'None'}</dd></div>
                                    <div><dt>Payment</dt><dd>{b.payment_status === 'at_visit' ? 'At the visit' : b.payment_status}</dd></div>
                                    {b.cancelled_by && <div><dt>Cancelled by</dt><dd>{b.cancelled_by}, {ago(b.cancelled_at)}</dd></div>}
                                    <div><dt>Booked</dt><dd>{ago(b.created_at)}</dd></div>
                                    <div><dt>Reports</dt><dd>{b.report_open ? 'Still open (48 h)' : 'Closed'}</dd></div>
                                </dl>
                            </div>
                        </section>
                    )}

                    {pay && (
                        <section className="panel">
                            <div className="panel__head"><h3 className="panel__title"><CreditCard size={12} className="panel__title-icon" aria-hidden="true" />Money</h3><span className="panel__meta">{pay.provider}</span></div>
                            <div className="panel__body">
                                <dl className="adm-facts">
                                    <div><dt>Paid</dt><dd>{cents(pay.amount, pay.currency)}{pay.method ? `, ${pay.method}` : ''}</dd></div>
                                    <div><dt>Refunded</dt><dd>{cents(pay.refunded, pay.currency)}</dd></div>
                                    {Number(pay.pending_refunds) > 0 && <div><dt>Refund on its way</dt><dd>{cents(pay.pending_refunds, pay.currency)}</dd></div>}
                                    {pay.refunds.map((r, i) => <div key={i}><dt>{REFUND_REASON[r.reason] || r.reason}, {ago(r.at)}</dt><dd>{cents(r.amount, pay.currency)}, {r.status}</dd></div>)}
                                </dl>
                            </div>
                        </section>
                    )}

                    <section className="panel">
                        <div className="panel__head"><h3 className="panel__title"><UserRound size={12} className="panel__title-icon" aria-hidden="true" />Who wrote</h3></div>
                        <div className="panel__body">
                            <dl className="adm-facts">
                                <div><dt>Name</dt><dd>{data.reporter.name}{data.reporter.has_account ? '' : ', guest'}</dd></div>
                                {data.reporter.email && <div><dt>Email</dt><dd>{data.reporter.email}</dd></div>}
                                <div><dt>Tickets</dt><dd>{data.reporter.tickets}</dd></div>
                                <div><dt>Upheld / not upheld</dt><dd>{data.reporter.upheld} / {data.reporter.not_upheld}</dd></div>
                            </dl>
                        </div>
                    </section>

                    {biz && (
                        <section className="panel">
                            <div className="panel__head">
                                <h3 className="panel__title"><Store size={12} className="panel__title-icon" aria-hidden="true" />{biz.name}</h3>
                                {biz.suspended_at ? <Pill pair={['Paused by us', 'danger']} /> : !biz.is_active ? <Pill pair={['Paused by owner', 'muted']} /> : null}
                            </div>
                            <div className="panel__body">
                                <dl className="adm-facts">
                                    {biz.suspended_reason && <div><dt>Paused</dt><dd>{biz.suspended_reason}</dd></div>}
                                    {biz.owner_email && <div><dt>Owner</dt><dd>{biz.owner_email}</dd></div>}
                                    <div><dt>Bookings, 90 days</dt><dd>{biz.bookings_90d}</dd></div>
                                    <div><dt>Cancelled by them, 90 days</dt><dd>{biz.cancelled_by_business_90d}</dd></div>
                                    <div><dt>No-shows they marked, 90 days</dt><dd>{biz.no_shows_marked_90d}</dd></div>
                                    <div><dt>Reports against / upheld</dt><dd>{biz.reports_against} / {biz.upheld_against}</dd></div>
                                    <div><dt>Warnings</dt><dd>{biz.warnings}</dd></div>
                                    {blocks && <div><dt>Blocks, 30 days / active</dt><dd>{blocks.recent} / {blocks.active}{blocks.flagged ? ', flagged' : ''}</dd></div>}
                                </dl>
                                {biz.slug && <a className="adm-link adm-sup__page" href={`/${biz.slug}`} target="_blank" rel="noopener noreferrer">Open their page</a>}
                            </div>
                        </section>
                    )}

                    {data.client && (
                        <section className="panel">
                            <div className="panel__head"><h3 className="panel__title"><UserRound size={12} className="panel__title-icon" aria-hidden="true" />Client history</h3></div>
                            <div className="panel__body">
                                <dl className="adm-facts">
                                    <div><dt>Bookings</dt><dd>{data.client.bookings}</dd></div>
                                    <div><dt>No-shows</dt><dd>{data.client.no_shows}</dd></div>
                                    <div><dt>Late cancels</dt><dd>{data.client.late_cancels}</dd></div>
                                    <div><dt>Warnings</dt><dd>{data.client.warnings}</dd></div>
                                </dl>
                            </div>
                        </section>
                    )}

                    <section className="panel">
                        <div className="panel__head"><h3 className="panel__title"><History size={12} className="panel__title-icon" aria-hidden="true" />What was done</h3></div>
                        <div className="panel__body">
                            {data.actions.length === 0 ? <p className="adm-quiet">Nothing yet.</p> : (
                                <ol className="adm-sup-log">
                                    {data.actions.map((a, i) => (
                                        <li key={i}>
                                            <b>{ACTION_LABEL[a.action] || a.action}{a.amount != null ? ` ${a.amount}` : ''}</b>
                                            {a.detail && <span>{a.detail}</span>}
                                            <small>{a.by || 'Staff'}, {ago(a.at)}</small>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

// The support queue: money and safety first, then the oldest wait. Open one to answer and act.
const SupportTab = ({ onCount }) => {
    const [view, setView] = useState('open')
    const [openId, setOpenId] = useState(ticketFromUrl)
    const { data, error, query, setQuery, page, pages, setPage, reload } = usePaged((args) => loadAdminTickets({ ...args, status: view }), [view])

    useEffect(() => { setPage(0) }, [view, setPage])
    useEffect(() => { if (data?.counts) onCount?.(data.counts.open) }, [data, onCount])

    const open = (id) => { writeTicket(id); setOpenId(id) }
    const back = () => { writeTicket(null); setOpenId(null); reload() }

    if (openId) return <Ticket key={openId} id={openId} onBack={back} onChanged={reload} />

    const counts = data?.counts || {}

    return (
        <div className="tab-content">
            <SectionHead
                icon={LifeBuoy}
                title="Support"
                meta={data ? `${counts.open || 0} open, ${counts.urgent || 0} money or safety` : 'Loading'}
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
                <label className="adm-search">
                    <Search size={14} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="#number, name, email or business" aria-label="Search tickets" />
                </label>
            </div>

            {error && <p className="cell-note" role="alert">{error.replace('admin.sql', 'support-desk.sql')}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">{view === 'open' ? 'Nothing waiting on us.' : 'No tickets here.'}</p>}

            {data && data.rows.length > 0 && (
                <div className="data-table-wrap adm-scroll">
                    <table className="data-table adm-table adm-sup-table">
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th className="adm-w-wide">About</th>
                                <th className="adm-w-wide">From</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Last</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((r) => (
                                <tr key={r.id} className={r.priority === 1 && r.status === 'open' ? 'is-urgent' : ''}>
                                    <td><button type="button" className="adm-link" onClick={() => open(r.id)}>#{r.number}</button></td>
                                    <td>
                                        <span className="cell-user__text">
                                            <button type="button" className="adm-sup-subject" onClick={() => open(r.id)}>{r.subject}</button>
                                            <span className="cell-user__email">{CATEGORY_LABEL[r.category] || r.category}{r.has_booking ? ', about a booking' : ''}{r.from_us ? ', we asked' : ''}</span>
                                        </span>
                                    </td>
                                    <td>
                                        <span className="cell-user__text">
                                            <span className="cell-user__name">{r.who}{r.guest ? ' (guest)' : ''}</span>
                                            <span className="cell-user__email">{r.side === 'business' ? 'Business' : 'Client'}{r.business_name ? `, ${r.business_name}` : ''}</span>
                                        </span>
                                    </td>
                                    <td><Pill pair={TICKET_PRIORITY[r.priority]} /></td>
                                    <td>
                                        <Pill pair={TICKET_STATE[r.status]} />
                                        {r.outcome && <span className="adm-sub"> {r.outcome === 'upheld' ? 'upheld' : 'not upheld'}</span>}
                                    </td>
                                    <td className="cell-date">{waited(r.last_message_at)}<span className="adm-sub"> {r.last_from === 'admin' ? 'since our reply' : 'since theirs'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

export default SupportTab

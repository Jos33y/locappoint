import { useEffect, useState } from 'react'
import { MessagesSquare, RotateCw, Search } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { usePaged } from './usePaged'
import { ago } from '../../../services/admin'
import { loadAdminWaThread, loadAdminWaThreads } from '../../../services/whatsapp'
import '../../../styles/admin/support.css'
import '../../../styles/admin/whatsapp.css'

const STATUS = { pending: ['Waiting', 'warning'], confirmed: ['Confirmed', 'success'], cancelled: ['Cancelled', 'muted'], completed: ['Done', 'info'], no_show: ['No-show', 'danger'] }
const KIND = { text: '', buttons: 'with buttons', list: 'with a list', interactive: 'tapped', button: 'tapped', failed: 'not delivered', undelivered: 'not delivered' }

const kindLabel = (kind) => (String(kind).startsWith('template:') ? `template ${kind.slice(9)}` : KIND[kind] ?? kind)
const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// One conversation in full: every message both ways, and the bookings made from it.
const Thread = ({ phone }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        let cancelled = false
        loadAdminWaThread(phone)
            .then((data) => { if (!cancelled) setD(data) })
            .catch(() => { if (!cancelled) setError('Could not load this conversation.') })
        return () => { cancelled = true }
    }, [phone])
    if (error) return <p className="cell-note" role="alert">{error}</p>
    if (!d) return <p className="adm-quiet">Loading the conversation</p>
    return (
        <div className="adm-wa-thread">
            {d.bookings.length > 0 && (
                <ul className="adm-wa-bookings">
                    {d.bookings.map((b) => {
                        const [label, tone] = STATUS[b.status] || [b.status, 'muted']
                        return (
                            <li key={b.id}>
                                <span className={`adm-pill adm-pill--${tone}`}>{label}</span>
                                <span><b>{b.business_name}</b>, {b.service_name}, {b.date} {b.time}</span>
                                {b.payment_status === 'paid' && <span className="adm-sub">Paid online</span>}
                            </li>
                        )
                    })}
                </ul>
            )}
            <ol className="adm-sup-msgs">
                {d.messages.map((m, i) => (
                    <li key={i} className={`adm-sup-msg${m.direction === 'out' ? ' is-admin' : ''}${m.kind === 'failed' || m.kind === 'undelivered' ? ' adm-wa-msg--fail' : ''}`}>
                        <p className="adm-sup-msg__who">
                            <span><b>{m.direction === 'out' ? 'Locappoint' : 'Them'}</b>{kindLabel(m.kind) ? `, ${kindLabel(m.kind)}` : ''}</span>
                            <span>{when(m.at)}</span>
                        </p>
                        <p className="adm-sup-msg__body">{m.body || '(no text)'}</p>
                    </li>
                ))}
            </ol>
        </div>
    )
}

// Every WhatsApp conversation, newest first: clients talking to the agent and owners on their alerts.
const WhatsAppTab = () => {
    const { data, error, query, setQuery, page, pages, setPage, reload } = usePaged((args) => loadAdminWaThreads(args))
    const [open, setOpen] = useState('')

    return (
        <div className="tab-content">
            <SectionHead
                icon={MessagesSquare}
                title="WhatsApp"
                meta={data ? `${data.total} ${data.total === 1 ? 'conversation' : 'conversations'}, kept 90 days` : 'Loading'}
                action={(
                    <button type="button" onClick={reload} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                )}
            />

            <div className="adm-toolbar">
                <label className="adm-search">
                    <Search size={14} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Number or name" aria-label="Search conversations" />
                </label>
            </div>

            {error && <p className="cell-note" role="alert">{error.replace('admin.sql', 'agent.sql')}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">No conversations yet.</p>}

            {data && data.rows.length > 0 && (
                <ul className="adm-blk-list">
                    {data.rows.map((r) => (
                        <li key={r.phone} className="panel adm-blk adm-wa">
                            <button type="button" className="adm-wa__head" aria-expanded={open === r.phone} onClick={() => setOpen(open === r.phone ? '' : r.phone)}>
                                <span className="adm-wa__who">
                                    <b>{r.linked_name || r.profile_name || 'Unknown'}</b>
                                    <span className="adm-sub">+{r.phone}{r.linked_name ? ', gets booking alerts' : ''}</span>
                                </span>
                                <span className="adm-wa__meta">
                                    {r.bookings > 0 && <span className="adm-pill adm-pill--info">{r.bookings} {r.bookings === 1 ? 'booking' : 'bookings'}</span>}
                                    <span className="adm-sub">{r.messages} messages, {ago(r.last_at)}</span>
                                </span>
                            </button>
                            {open !== r.phone && r.last_body && <p className="adm-wa__last">{r.last_body}</p>}
                            {open === r.phone && <Thread phone={r.phone} />}
                        </li>
                    ))}
                </ul>
            )}

            {data && pages > 1 && (
                <nav className="adm-pager" aria-label="Pages">
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button>
                    <span>Page {page + 1} of {pages}</span>
                    <button type="button" className="btn btn--secondary btn--sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Older</button>
                </nav>
            )}
        </div>
    )
}

export default WhatsAppTab

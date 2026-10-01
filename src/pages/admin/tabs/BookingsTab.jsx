import { useEffect, useState } from 'react'
import { CalendarCheck, RotateCw, Search } from 'lucide-react'
import SectionHead from '../components/SectionHead'
import { BOOKING_STATUS, SOURCE_LABELS, ago, loadAdminBookings, money, shortDate } from '../../../services/admin'
import { usePaged } from './usePaged'

const STATUSES = [['', 'All'], ['pending', 'Waiting'], ['confirmed', 'Confirmed'], ['completed', 'Done'], ['no_show', 'No-show'], ['cancelled', 'Cancelled']]

// Every booking on the platform, newest first. Looking only: changes happen in the business's own calendar.
const BookingsTab = () => {
    const [status, setStatus] = useState('')
    const paged = usePaged((args) => loadAdminBookings({ ...args, status }), [status])
    const { data, error, query, setQuery, page, pages, setPage, reload } = paged

    useEffect(() => { setPage(0) }, [status, setPage])

    return (
        <div className="tab-content">
            <SectionHead
                icon={CalendarCheck}
                title="Bookings"
                meta={data ? `${data.total} ${data.total === 1 ? 'booking' : 'bookings'}` : 'Loading'}
                action={(
                    <button type="button" onClick={reload} className="btn btn--secondary btn--sm">
                        <RotateCw size={13} aria-hidden="true" />
                        <span>Refresh</span>
                    </button>
                )}
            />

            <div className="adm-toolbar">
                <div className="adm-chips" role="group" aria-label="Status">
                    {STATUSES.map(([key, label]) => (
                        <button key={key || 'all'} type="button" className={`adm-chip${status === key ? ' is-on' : ''}`} aria-pressed={status === key} onClick={() => setStatus(key)}>{label}</button>
                    ))}
                </div>
                <label className="adm-search">
                    <Search size={14} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Client, email or business" aria-label="Search bookings" />
                </label>
            </div>

            {error && <p className="cell-note" role="alert">{error}</p>}
            {data && data.rows.length === 0 && !error && <p className="adm-quiet adm-empty">No bookings match.</p>}

            {data && data.rows.length > 0 && (
                <div className="data-table-wrap adm-scroll">
                    <table className="data-table adm-table">
                        <thead>
                            <tr>
                                <th>When</th>
                                <th className="adm-w-wide">Business</th>
                                <th className="adm-w-wide">Client</th>
                                <th className="adm-w-wide">Service</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Made</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((b) => {
                                const [label, tone] = BOOKING_STATUS[b.status] || [b.status, 'muted']
                                return (
                                    <tr key={b.id}>
                                        <td className="cell-mono">{shortDate(b.date)}<span className="adm-sub"> {b.time}</span></td>
                                        <td>
                                            <span className="cell-user__text">
                                                <span className="cell-user__name">{b.business}{b.is_demo ? ' (demo)' : ''}</span>
                                                <span className="cell-user__email">{SOURCE_LABELS[b.source] || b.source}</span>
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-user__text">
                                                <span className="cell-user__name">{b.client_name || 'No name'}</span>
                                                <span className="cell-user__email">{b.client_email || (b.has_account ? 'Has an account' : 'Guest')}</span>
                                            </span>
                                        </td>
                                        <td><span className="cell-text">{b.service || 'Removed service'}</span></td>
                                        <td>
                                            <span className={`adm-pill adm-pill--${tone}`}>{label}</span>
                                            {b.status === 'cancelled' && b.cancelled_by && <span className="adm-sub"> by {b.cancelled_by}</span>}
                                        </td>
                                        <td className="cell-mono">{b.price === null || b.price === undefined ? '' : Number(b.price) === 0 ? 'Free' : money(b.price, b.currency)}</td>
                                        <td className="cell-date">{ago(b.created_at)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
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

export default BookingsTab

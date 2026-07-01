import { useState } from 'react'
import { Handshake, Download } from 'lucide-react'
import CountryDisplay from '../components/CountryDisplay'
import SectionHead from '../components/SectionHead'
import StatusBadge from '../components/StatusBadge'
import PartnershipDrawer from '../components/PartnershipDrawer'

/* ============================================================
   PartnershipTab
   5-col compact table. Row click opens drawer with editable status.
   Selected uses id-lookup so status updates propagate live.
   ============================================================ */

const initial = (first, last) => {
    const f = (first || '').charAt(0)
    const l = (last || '').charAt(0)
    return (f + l).toUpperCase() || 'U'
}

// Compact relative date. "Today", "Yesterday", "3d ago", "Dec 13", "Dec 13, 2025".
const formatShort = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return ''

    const now = new Date()
    const days = Math.floor((now - date) / 86400000)

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`

    const sameYear = date.getFullYear() === now.getFullYear()
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric'
    }).format(date)
}

const EmptyCell = ({ label }) => (
    <span className="cell-empty" role="presentation" aria-label={label} />
)

const handleKeyActivate = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        callback()
    }
}

const PartnershipTab = ({ data, formatDate, onExport, onStatusChange, onDelete }) => {
    const [selectedId, setSelectedId] = useState(null)
    const count = data.length

    // Id-based lookup so status edits flow back into the drawer immediately
    const selected = selectedId ? data.find((d) => d.id === selectedId) : null

    const openDetail = (item) => setSelectedId(item.id)
    const closeDetail = () => setSelectedId(null)

    if (count === 0) {
        return (
            <div className="tab-content">
                <SectionHead icon={Handshake} title="Partnerships" meta="0 requests" />
                <div className="empty-state">
                    <div className="empty-state__icon">
                        <Handshake size={28} />
                    </div>
                    <h3 className="empty-state__title">No partnership requests yet</h3>
                    <p className="empty-state__text">
                        When organizations apply, they will appear here.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="tab-content">
            <SectionHead
                icon={Handshake}
                title="Partnerships"
                meta={`${count} ${count === 1 ? 'request' : 'requests'}`}
                action={
                    <button onClick={onExport} className="btn btn--primary btn--sm">
                        <Download size={13} aria-hidden="true" />
                        <span>Export CSV</span>
                    </button>
                }
            />

            {/* Desktop table - 5 cols */}
            <div className="data-table-wrap">
                <table className="data-table">
                    <colgroup>
                        <col style={{ width: 'auto' }} />
                        <col style={{ width: '180px' }} />
                        <col style={{ width: '160px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Contact</th>
                            <th>Organization</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Submitted</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const isSelected = selectedId === item.id
                            const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'
                            return (
                                <tr
                                    key={item.id}
                                    className={`data-table__row--clickable${isSelected ? ' data-table__row--selected' : ''}`}
                                    onClick={() => openDetail(item)}
                                    onKeyDown={(e) => handleKeyActivate(e, () => openDetail(item))}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`View details for ${fullName}`}
                                >
                                    <td>
                                        <div className="cell-user">
                                            <div className="cell-avatar" aria-hidden="true">
                                                {initial(item.first_name, item.last_name)}
                                            </div>
                                            <div className="cell-user__text">
                                                <span className="cell-user__name">{fullName}</span>
                                                <span className="cell-user__email">{item.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cell-org">
                                            <span className="cell-org__type">{item.organization_type || 'Other'}</span>
                                            {item.organization_name && (
                                                <span className="cell-org__name">{item.organization_name}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {(item.city || item.country) ? (
                                            <div className="cell-location">
                                                {item.country && <CountryDisplay code={item.country} size={14} showName={false} />}
                                                {item.city && <span className="cell-location__city">{item.city}</span>}
                                            </div>
                                        ) : <EmptyCell label="Unknown location" />}
                                    </td>
                                    <td>
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td>
                                        <span className="cell-date" title={formatDate(item.created_at)}>
                                            {formatShort(item.created_at)}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-cards">
                {data.map((item) => {
                    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'
                    return (
                        <article
                            key={item.id}
                            className="data-card data-card--clickable"
                            onClick={() => openDetail(item)}
                            onKeyDown={(e) => handleKeyActivate(e, () => openDetail(item))}
                            tabIndex={0}
                            role="button"
                            aria-label={`View details for ${fullName}`}
                        >
                            <header className="data-card__head">
                                <div className="cell-avatar" aria-hidden="true">
                                    {initial(item.first_name, item.last_name)}
                                </div>
                                <div className="data-card__identity">
                                    <h3 className="data-card__name">{fullName}</h3>
                                    <p className="data-card__email">{item.email}</p>
                                </div>
                                <StatusBadge status={item.status} />
                            </header>

                            <dl className="data-card__details">
                                <dt>Org</dt>
                                <dd className="cell-text--capitalize">
                                    {item.organization_type || 'Other'}
                                    {item.organization_name && ` · ${item.organization_name}`}
                                </dd>

                                {(item.city || item.country) && (
                                    <>
                                        <dt>Location</dt>
                                        <dd>
                                            {item.country && <CountryDisplay code={item.country} size={14} showName={false} />}
                                            {item.city && <span>{item.city}</span>}
                                        </dd>
                                    </>
                                )}

                                {item.phone && (
                                    <>
                                        <dt>Phone</dt>
                                        <dd><span className="cell-mono">{item.phone}</span></dd>
                                    </>
                                )}

                                {item.partnership_interest && (
                                    <>
                                        <dt>Interest</dt>
                                        <dd className="data-card__detail--block">
                                            <p className="data-card__note data-card__note--clamped">{item.partnership_interest}</p>
                                        </dd>
                                    </>
                                )}
                            </dl>

                            <footer className="data-card__foot">
                                <time className="data-card__date">{formatDate(item.created_at)}</time>
                            </footer>
                        </article>
                    )
                })}
            </div>

            <PartnershipDrawer
                item={selected}
                onClose={closeDetail}
                onStatusChange={onStatusChange}
                formatDate={formatDate}
                onDelete={onDelete}
            />
        </div>
    )
}

export default PartnershipTab

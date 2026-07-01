import { useState } from 'react'
import { Users, Download, MessageSquareText } from 'lucide-react'
import CountryDisplay from '../components/CountryDisplay'
import SectionHead from '../components/SectionHead'
import TypeChip from '../components/TypeChip'
import WaitlistDrawer from '../components/WaitlistDrawer'

/* ============================================================
   WaitlistTab
   6-col compact table. Row click opens detail drawer.
   Mobile cards tap into the same drawer.
   ============================================================ */

const initial = (name) => (name ? name.charAt(0).toUpperCase() : 'U')

const avatarClass = (type) => {
    if (type === 'client') return 'cell-avatar cell-avatar--signal'
    if (type === 'business') return 'cell-avatar'
    return 'cell-avatar cell-avatar--muted'
}

// Compact relative date for table. "Today", "Yesterday", "3d ago", "Dec 13", "Dec 13, 2025".
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

const NotesIndicator = ({ hasNotes }) => {
    if (!hasNotes) return <EmptyCell label="No notes" />
    return (
        <span className="notes-indicator" aria-label="Has notes">
            <MessageSquareText size={13} aria-hidden="true" />
        </span>
    )
}

const handleKeyActivate = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        callback()
    }
}

const WaitlistTab = ({ data, formatDate, onExport, onDelete }) => {
    const [selected, setSelected] = useState(null)
    const count = data.length

    const openDetail = (item) => setSelected(item)
    const closeDetail = () => setSelected(null)

    if (count === 0) {
        return (
            <div className="tab-content">
                <SectionHead icon={Users} title="Waitlist" meta="0 signups" />
                <div className="empty-state">
                    <div className="empty-state__icon">
                        <Users size={28} />
                    </div>
                    <h3 className="empty-state__title">No waitlist signups yet</h3>
                    <p className="empty-state__text">
                        When users sign up for early access, they will appear here.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="tab-content">
            <SectionHead
                icon={Users}
                title="Waitlist"
                meta={`${count} ${count === 1 ? 'signup' : 'signups'}`}
                action={
                    <button onClick={onExport} className="btn btn--primary btn--sm">
                        <Download size={13} aria-hidden="true" />
                        <span>Export CSV</span>
                    </button>
                }
            />

            {/* Desktop table - 6 cols */}
            <div className="data-table-wrap">
                <table className="data-table">
                    <colgroup>
                        <col style={{ width: 'auto' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '70px' }} />
                        <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Phone</th>
                            <th>Country</th>
                            <th>Type</th>
                            <th>Notes</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const isSelected = selected?.id === item.id
                            const rowLabel = `View details for ${item.full_name || item.email}`
                            return (
                                <tr
                                    key={item.id}
                                    className={`data-table__row--clickable${isSelected ? ' data-table__row--selected' : ''}`}
                                    onClick={() => openDetail(item)}
                                    onKeyDown={(e) => handleKeyActivate(e, () => openDetail(item))}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={rowLabel}
                                >
                                    <td>
                                        <div className="cell-user">
                                            <div className={avatarClass(item.user_type)} aria-hidden="true">
                                                {initial(item.full_name)}
                                            </div>
                                            <div className="cell-user__text">
                                                <span className="cell-user__name">{item.full_name || 'Unknown'}</span>
                                                <span className="cell-user__email">{item.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {item.phone
                                            ? <span className="cell-mono">{item.phone}</span>
                                            : <EmptyCell label="No phone" />}
                                    </td>
                                    <td>
                                        {item.country
                                            ? <CountryDisplay code={item.country} size={16} showName={false} />
                                            : <EmptyCell label="Unknown country" />}
                                    </td>
                                    <td>
                                        <TypeChip type={item.user_type} />
                                    </td>
                                    <td>
                                        <NotesIndicator hasNotes={!!item.comments} />
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
                {data.map((item) => (
                    <article
                        key={item.id}
                        className="data-card data-card--clickable"
                        onClick={() => openDetail(item)}
                        onKeyDown={(e) => handleKeyActivate(e, () => openDetail(item))}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for ${item.full_name || item.email}`}
                    >
                        <header className="data-card__head">
                            <div className={avatarClass(item.user_type)} aria-hidden="true">
                                {initial(item.full_name)}
                            </div>
                            <div className="data-card__identity">
                                <h3 className="data-card__name">{item.full_name || 'Unknown'}</h3>
                                <p className="data-card__email">{item.email}</p>
                            </div>
                            <TypeChip type={item.user_type} />
                        </header>

                        <dl className="data-card__details">
                            {item.phone && (
                                <>
                                    <dt>Phone</dt>
                                    <dd>
                                        {item.country && (
                                            <CountryDisplay code={item.country} size={14} showName={false} />
                                        )}
                                        <span className="cell-mono">{item.phone}</span>
                                    </dd>
                                </>
                            )}
                            {!item.phone && item.country && (
                                <>
                                    <dt>Country</dt>
                                    <dd>
                                        <CountryDisplay code={item.country} size={14} showName={true} />
                                    </dd>
                                </>
                            )}
                            {item.business_type && (
                                <>
                                    <dt>Business</dt>
                                    <dd className="cell-text--capitalize">{item.business_type}</dd>
                                </>
                            )}
                            {item.comments && (
                                <>
                                    <dt>Notes</dt>
                                    <dd className="data-card__detail--block">
                                        <p className="data-card__note data-card__note--clamped">{item.comments}</p>
                                    </dd>
                                </>
                            )}
                        </dl>

                        <footer className="data-card__foot">
                            <time className="data-card__date">{formatDate(item.created_at)}</time>
                        </footer>
                    </article>
                ))}
            </div>

            <WaitlistDrawer
                item={selected}
                onClose={closeDetail}
                formatDate={formatDate}
                onDelete={onDelete}
            />
        </div>
    )
}

export default WaitlistTab

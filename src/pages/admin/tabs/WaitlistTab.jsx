// WaitlistTab.jsx - Waitlist management tab
// Location: src/pages/admin/tabs/WaitlistTab.jsx

import { 
    Users, 
    Download, 
    Mail, 
    Phone, 
    Building2, 
    MessageSquare,
    Calendar,
    Sparkles
} from 'lucide-react'
import CountryDisplay from '../components/CountryDisplay'

const WaitlistTab = ({ data, formatDate, onExport }) => {
    if (data.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">
                    <Users size={48} />
                </div>
                <h3 className="empty-state__title">No waitlist signups yet</h3>
                <p className="empty-state__text">
                    When users sign up for early access, they'll appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="tab-content">
            {/* Toolbar */}
            <div className="tab-toolbar">
                <div className="tab-toolbar__info">
                    <Sparkles size={16} />
                    <span>Showing {data.length} signup{data.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={onExport} className="btn btn--primary btn--sm">
                    <Download size={16} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards">
                {data.map((item) => (
                    <div key={item.id} className="data-card">
                        <div className="data-card__header">
                            <div className="data-card__avatar">
                                {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="data-card__title-group">
                                <h3 className="data-card__name">{item.full_name}</h3>
                                <span className={`type-badge type-badge--${item.user_type}`}>
                                    {item.user_type || 'user'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="data-card__body">
                            <div className="data-card__row">
                                <Mail size={14} />
                                <span>{item.email}</span>
                            </div>
                            {item.phone && (
                                <div className="data-card__row">
                                    <Phone size={14} />
                                    <span>{item.phone}</span>
                                </div>
                            )}
                            <div className="data-card__row">
                                <CountryDisplay code={item.country} size={16} />
                            </div>
                            {item.business_type && (
                                <div className="data-card__row">
                                    <Building2 size={14} />
                                    <span className="data-card__business-type">{item.business_type}</span>
                                </div>
                            )}
                            {item.comments && (
                                <div className="data-card__row data-card__row--comments">
                                    <MessageSquare size={14} />
                                    <span>{item.comments}</span>
                                </div>
                            )}
                        </div>

                        <div className="data-card__footer">
                            <Calendar size={14} />
                            <span>{formatDate(item.created_at)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Country</th>
                            <th>Type</th>
                            <th>Business</th>
                            <th>Comments</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <div className="cell-user">
                                        <div className="cell-avatar">
                                            {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <span className="cell-name">{item.full_name}</span>
                                    </div>
                                </td>
                                <td className="cell-email">{item.email}</td>
                                <td>{item.phone || <span className="cell-empty">—</span>}</td>
                                <td>
                                    <CountryDisplay code={item.country} size={16} showName={false} />
                                </td>
                                <td>
                                    <span className={`type-badge type-badge--${item.user_type}`}>
                                        {item.user_type || 'user'}
                                    </span>
                                </td>
                                <td>
                                    {item.business_type ? (
                                        <span className="business-badge">{item.business_type}</span>
                                    ) : (
                                        <span className="cell-empty">—</span>
                                    )}
                                </td>
                                <td className="cell-comments">
                                    {item.comments || <span className="cell-empty">—</span>}
                                </td>
                                <td className="cell-date">{formatDate(item.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default WaitlistTab
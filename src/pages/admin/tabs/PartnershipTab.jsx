
// PartnershipTab.jsx - Partnership requests management tab
// Location: src/pages/admin/tabs/PartnershipTab.jsx

import { 
    Handshake, 
    Download, 
    Mail, 
    Phone, 
    Building2, 
    MapPin,
    MessageSquare,
    Calendar,
    ChevronDown
} from 'lucide-react'
import CountryDisplay from '../components/CountryDisplay'

const PartnershipTab = ({ data, formatDate, onExport, onStatusChange }) => {
    const getStatusClass = (status) => {
        switch (status) {
            case 'contacted': return 'status-badge--contacted'
            case 'approved': return 'status-badge--approved'
            case 'rejected': return 'status-badge--rejected'
            default: return 'status-badge--pending'
        }
    }

    if (data.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">
                    <Handshake size={48} />
                </div>
                <h3 className="empty-state__title">No partnership requests yet</h3>
                <p className="empty-state__text">
                    When organizations submit partnership interest, they'll appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="tab-content">
            {/* Toolbar */}
            <div className="tab-toolbar">
                <div className="tab-toolbar__info">
                    <Handshake size={16} />
                    <span>Showing {data.length} request{data.length !== 1 ? 's' : ''}</span>
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
                            <div className="data-card__avatar data-card__avatar--cyan">
                                {item.first_name?.charAt(0)?.toUpperCase() || 'P'}
                            </div>
                            <div className="data-card__title-group">
                                <h3 className="data-card__name">
                                    {item.first_name} {item.last_name}
                                </h3>
                                <span className={`status-badge ${getStatusClass(item.status)}`}>
                                    {item.status || 'pending'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="data-card__body">
                            <div className="data-card__row">
                                <Mail size={14} />
                                <span>{item.email}</span>
                            </div>
                            <div className="data-card__row">
                                <Phone size={14} />
                                <span>{item.phone}</span>
                            </div>
                            <div className="data-card__row">
                                <Building2 size={14} />
                                <span>{item.organization_type}</span>
                            </div>
                            {item.organization_name && (
                                <div className="data-card__row data-card__row--secondary">
                                    <span className="data-card__label">Organization:</span>
                                    <span>{item.organization_name}</span>
                                </div>
                            )}
                            {(item.city || item.country) && (
                                <div className="data-card__row">
                                    <MapPin size={14} />
                                    <span>
                                        {item.city && `${item.city}, `}
                                        <CountryDisplay code={item.country} showName={true} size={14} />
                                    </span>
                                </div>
                            )}
                            {item.partnership_interest && (
                                <div className="data-card__row data-card__row--comments">
                                    <MessageSquare size={14} />
                                    <span>{item.partnership_interest}</span>
                                </div>
                            )}
                        </div>

                        <div className="data-card__footer data-card__footer--between">
                            <div className="data-card__date">
                                <Calendar size={14} />
                                <span>{formatDate(item.created_at)}</span>
                            </div>
                            <div className="status-select-wrapper">
                                <select
                                    value={item.status || 'pending'}
                                    onChange={(e) => onStatusChange(item.id, e.target.value)}
                                    className={`status-select ${getStatusClass(item.status)}`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <ChevronDown size={14} className="status-select-icon" />
                            </div>
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
                            <th>Contact</th>
                            <th>Organization</th>
                            <th>Location</th>
                            <th>Interest</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <div className="cell-user">
                                        <div className="cell-avatar cell-avatar--cyan">
                                            {item.first_name?.charAt(0)?.toUpperCase() || 'P'}
                                        </div>
                                        <span className="cell-name">
                                            {item.first_name} {item.last_name}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className="cell-contact">
                                        <span>{item.email}</span>
                                        <small>{item.phone}</small>
                                    </div>
                                </td>
                                <td>
                                    <div className="cell-org">
                                        <span className="cell-org-type">{item.organization_type}</span>
                                        {item.organization_name && (
                                            <small className="cell-org-name">{item.organization_name}</small>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    {item.city || item.country ? (
                                        <div className="cell-location">
                                            <CountryDisplay code={item.country} size={16} showName={false} />
                                            {item.city && <span>{item.city}</span>}
                                        </div>
                                    ) : (
                                        <span className="cell-empty">—</span>
                                    )}
                                </td>
                                <td className="cell-comments">
                                    {item.partnership_interest || <span className="cell-empty">—</span>}
                                </td>
                                <td>
                                    <div className="status-select-wrapper">
                                        <select
                                            value={item.status || 'pending'}
                                            onChange={(e) => onStatusChange(item.id, e.target.value)}
                                            className={`status-select ${getStatusClass(item.status)}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                        <ChevronDown size={14} className="status-select-icon" />
                                    </div>
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

export default PartnershipTab
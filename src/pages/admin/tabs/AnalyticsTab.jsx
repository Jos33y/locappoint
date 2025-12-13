// AnalyticsTab.jsx - Analytics dashboard tab
// Location: src/pages/admin/tabs/AnalyticsTab.jsx

import { 
    Download, 
    Filter, 
    ChevronDown,
    Eye,
    Globe,
    Clock,
    TrendingUp,
    Monitor,
    Smartphone,
    Tablet,
    MousePointer,
    Users,
    ArrowUpRight,
    MessageCircle
} from 'lucide-react'
import StatCard from '../components/StatCard'
import CountryDisplay from '../components/CountryDisplay'

const AnalyticsTab = ({ 
    data, 
    dateRange, 
    setDateRange, 
    onExportSessions, 
    onExportEvents, 
    formatDate, 
    formatTime 
}) => {
    const { stats, sessions } = data

    const getDeviceIcon = (type) => {
        switch (type) {
            case 'mobile': return <Smartphone size={16} />
            case 'tablet': return <Tablet size={16} />
            default: return <Monitor size={16} />
        }
    }

    return (
        <div className="analytics">
            {/* Toolbar */}
            <div className="analytics__toolbar">
                <div className="analytics__filter">
                    <Filter size={16} />
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="all">All time</option>
                    </select>
                    <ChevronDown size={14} className="analytics__filter-chevron" />
                </div>
                <div className="analytics__exports">
                    <button onClick={onExportSessions} className="btn btn--glass btn--sm">
                        <Download size={14} />
                        <span>Sessions</span>
                    </button>
                    <button onClick={onExportEvents} className="btn btn--glass btn--sm">
                        <Download size={14} />
                        <span>Events</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="analytics__stats-grid">
                <StatCard
                    icon={Eye}
                    label="Total Visitors"
                    value={stats.totalVisitors || 0}
                    color="purple"
                    delay={0}
                />
                <StatCard
                    icon={Globe}
                    label="Countries"
                    value={stats.uniqueCountries || 0}
                    color="cyan"
                    delay={50}
                />
                <StatCard
                    icon={Clock}
                    label="Avg. Time"
                    value={formatTime(stats.avgTime || 0)}
                    color="amber"
                    delay={100}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Bounce Rate"
                    value={stats.bounceRate || 0}
                    suffix="%"
                    color={stats.bounceRate > 70 ? 'red' : 'green'}
                    delay={150}
                />
            </div>

            {/* Conversions Section */}
            <section className="analytics__section">
                <h3 className="analytics__section-title">
                    <Users size={18} />
                    <span>Conversions</span>
                </h3>
                <div className="analytics__conversions">
                    {/* Waitlist */}
                    <div className="conversion-card">
                        <div className="conversion-card__header">
                            <span className="conversion-card__title">Waitlist Modal</span>
                            <span className={`conversion-card__rate ${stats.waitlistConversion > 0 ? 'conversion-card__rate--success' : ''}`}>
                                {stats.waitlistConversion || 0}% conv.
                            </span>
                        </div>
                        <div className="conversion-card__body">
                            <div className="conversion-card__stat">
                                <span className="conversion-card__value">{stats.waitlistOpened || 0}</span>
                                <span className="conversion-card__label">Opened</span>
                            </div>
                            <div className="conversion-card__arrow">
                                <ArrowUpRight size={16} />
                            </div>
                            <div className="conversion-card__stat">
                                <span className="conversion-card__value conversion-card__value--success">
                                    {stats.waitlistSubmitted || 0}
                                </span>
                                <span className="conversion-card__label">Submitted</span>
                            </div>
                        </div>
                        <div className="conversion-card__glow conversion-card__glow--purple" />
                    </div>

                    {/* Partnership */}
                    <div className="conversion-card">
                        <div className="conversion-card__header">
                            <span className="conversion-card__title">Partnership Modal</span>
                            <span className={`conversion-card__rate ${stats.partnershipConversion > 0 ? 'conversion-card__rate--success' : ''}`}>
                                {stats.partnershipConversion || 0}% conv.
                            </span>
                        </div>
                        <div className="conversion-card__body">
                            <div className="conversion-card__stat">
                                <span className="conversion-card__value">{stats.partnershipOpened || 0}</span>
                                <span className="conversion-card__label">Opened</span>
                            </div>
                            <div className="conversion-card__arrow">
                                <ArrowUpRight size={16} />
                            </div>
                            <div className="conversion-card__stat">
                                <span className="conversion-card__value conversion-card__value--success">
                                    {stats.partnershipSubmitted || 0}
                                </span>
                                <span className="conversion-card__label">Submitted</span>
                            </div>
                        </div>
                        <div className="conversion-card__glow conversion-card__glow--cyan" />
                    </div>

                    {/* WhatsApp */}
                    <div className="conversion-card conversion-card--whatsapp">
                        <div className="conversion-card__header">
                            <span className="conversion-card__title">WhatsApp Channel</span>
                        </div>
                        <div className="conversion-card__body conversion-card__body--single">
                            <div className="conversion-card__stat">
                                <MessageCircle size={20} className="conversion-card__icon" />
                                <span className="conversion-card__value conversion-card__value--whatsapp">
                                    {stats.whatsappClicked || 0}
                                </span>
                                <span className="conversion-card__label">Clicked</span>
                            </div>
                        </div>
                        <div className="conversion-card__glow conversion-card__glow--green" />
                    </div>
                </div>
            </section>

            {/* Two Column Layout */}
            <div className="analytics__grid-2">
                {/* Top Countries */}
                <section className="analytics__section">
                    <h3 className="analytics__section-title">
                        <Globe size={18} />
                        <span>Top Countries</span>
                    </h3>
                    <div className="analytics__list">
                        {stats.topCountries?.length > 0 ? (
                            stats.topCountries.map(([country, count], i) => (
                                <div key={country} className="analytics__list-item">
                                    <span className="analytics__list-rank">{i + 1}</span>
                                    <CountryDisplay code={country} size={18} />
                                    <span className="analytics__list-value">{count}</span>
                                    <div className="analytics__list-bar">
                                        <div 
                                            className="analytics__list-bar-fill"
                                            style={{ width: `${(count / stats.totalVisitors) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="analytics__empty-small">No country data yet</div>
                        )}
                    </div>
                </section>

                {/* Devices & Browsers */}
                <section className="analytics__section">
                    <h3 className="analytics__section-title">
                        <Monitor size={18} />
                        <span>Devices</span>
                    </h3>
                    <div className="analytics__devices">
                        {Object.entries(stats.devices || {}).length > 0 ? (
                            Object.entries(stats.devices).map(([device, count]) => (
                                <div key={device} className="device-item">
                                    <div className="device-item__icon">
                                        {getDeviceIcon(device)}
                                    </div>
                                    <div className="device-item__info">
                                        <span className="device-item__name">{device}</span>
                                        <span className="device-item__count">
                                            {count} ({Math.round((count / stats.totalVisitors) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="device-item__bar">
                                        <div 
                                            className="device-item__bar-fill"
                                            style={{ width: `${(count / stats.totalVisitors) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="analytics__empty-small">No device data yet</div>
                        )}
                    </div>

                    <h3 className="analytics__section-title" style={{ marginTop: '24px' }}>
                        <MousePointer size={18} />
                        <span>Browsers</span>
                    </h3>
                    <div className="analytics__list analytics__list--compact">
                        {Object.entries(stats.browsers || {}).slice(0, 5).map(([browser, count]) => (
                            <div key={browser} className="analytics__list-item analytics__list-item--compact">
                                <span className="analytics__list-name">{browser}</span>
                                <span className="analytics__list-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Recent Sessions */}
            <section className="analytics__section">
                <h3 className="analytics__section-title">
                    <Users size={18} />
                    <span>Recent Sessions</span>
                </h3>
                
                {/* Mobile Cards */}
                <div className="analytics__session-cards">
                    {sessions.slice(0, 10).map((session) => (
                        <div key={session.id} className="session-card">
                            <div className="session-card__header">
                                <CountryDisplay code={session.country} size={16} />
                                <span className="session-card__time">{formatTime(session.total_time_seconds || 0)}</span>
                            </div>
                            <div className="session-card__body">
                                <div className="session-card__row">
                                    {getDeviceIcon(session.device_type)}
                                    <span>{session.browser || 'Unknown'}</span>
                                </div>
                                <div className="session-card__row">
                                    <Eye size={14} />
                                    <span>{session.page_views || 1} pages</span>
                                </div>
                            </div>
                            <div className="session-card__footer">
                                <div className="session-card__actions">
                                    {session.waitlist_submitted && <span className="action-badge action-badge--waitlist">W</span>}
                                    {session.partnership_submitted && <span className="action-badge action-badge--partner">P</span>}
                                    {session.whatsapp_clicked && <span className="action-badge action-badge--whatsapp">WA</span>}
                                </div>
                                <span className="session-card__date">{formatDate(session.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table */}
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>Device</th>
                                <th>Source</th>
                                <th>Pages</th>
                                <th>Time</th>
                                <th>Actions</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.slice(0, 20).map((session) => (
                                <tr key={session.id}>
                                    <td>
                                        <div className="cell-location">
                                            <CountryDisplay code={session.country} size={16} />
                                            {session.city && <small>{session.city}</small>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cell-device">
                                            {getDeviceIcon(session.device_type)}
                                            <span>{session.browser}</span>
                                        </div>
                                    </td>
                                    <td>{session.utm_source || session.referrer_domain || 'Direct'}</td>
                                    <td>{session.page_views || 1}</td>
                                    <td>{formatTime(session.total_time_seconds || 0)}</td>
                                    <td>
                                        <div className="cell-actions">
                                            {session.waitlist_submitted && <span className="action-badge action-badge--waitlist">W</span>}
                                            {session.partnership_submitted && <span className="action-badge action-badge--partner">P</span>}
                                            {session.whatsapp_clicked && <span className="action-badge action-badge--whatsapp">WA</span>}
                                            {!session.waitlist_submitted && !session.partnership_submitted && !session.whatsapp_clicked && <span className="cell-empty">-</span>}
                                        </div>
                                    </td>
                                    <td className="cell-date">{formatDate(session.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

export default AnalyticsTab
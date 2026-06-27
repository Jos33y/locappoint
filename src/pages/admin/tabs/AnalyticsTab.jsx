import { useState, useMemo, useEffect } from 'react'
import {
    BarChart3,
    Download,
    Filter,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    Globe,
    Clock,
    TrendingDown,
    Users,
    Handshake,
    MessageCircle,
    Smartphone,
    Monitor,
    Tablet,
    Compass,
    Activity
} from 'lucide-react'
import SectionHead from '../components/SectionHead'
import StatCard from '../components/StatCard'
import BarList from '../components/BarList'
import SessionDrawer from '../components/SessionDrawer'
import CountryDisplay, { getCountryName } from '../components/CountryDisplay'

/* ============================================================
   AnalyticsTab
   Compact KPI cards with sparklines, conversion funnels,
   geography/sources/devices/browsers panels, sessions table with
   pagination + mobile cards + session drawer.
   ============================================================ */

const PERIOD_OPTIONS = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' }
]

const PAGE_SIZE = 50

const sourceLabel = (s) =>
    s.utm_source || s.referrer_domain || 'Direct'

const getDeviceIcon = (type) => {
    const t = (type || '').toLowerCase()
    if (t === 'mobile') return Smartphone
    if (t === 'tablet') return Tablet
    return Monitor
}

const handleKeyActivate = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        callback()
    }
}

// Compact "Jun 26, 14:18" / "Jun 22 2025, 14:18" if past year
const formatSessionDateTime = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const sameYear = d.getFullYear() === now.getFullYear()
    const datePart = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric'
    }).format(d)
    const timePart = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(d)
    return `${datePart}, ${timePart}`
}

// Build daily/hourly series for sparkline
const buildSeries = (sessions, valueExtractor, granularity) => {
    if (!sessions || sessions.length === 0) return []
    const buckets = {}
    sessions.forEach((s) => {
        if (!s.created_at) return
        const key = granularity === 'hour'
            ? s.created_at.slice(0, 13)
            : s.created_at.slice(0, 10)
        if (!buckets[key]) buckets[key] = []
        buckets[key].push(s)
    })
    return Object.keys(buckets)
        .sort()
        .map((key) => ({
            date: key,
            value: valueExtractor(buckets[key])
        }))
}

const ConversionCard = ({ icon: Icon, title, rate, steps }) => (
    <div className="conversion-card">
        <div className="conversion-card__head">
            <div className="conversion-card__title">
                <Icon size={16} className="conversion-card__title-icon" aria-hidden="true" />
                <span>{title}</span>
            </div>
            <div className={`conversion-card__rate ${rate === 0 ? 'conversion-card__rate--zero' : ''}`}>
                <span className="conversion-card__rate-value">{rate}%</span>
                <span className="conversion-card__rate-label">conv</span>
            </div>
        </div>
        <div className="conversion-card__steps">
            {steps.map((step) => {
                const max = Math.max(...steps.map((s) => s.value), 1)
                const pct = (step.value / max) * 100
                return (
                    <div key={step.label} className="conversion-step">
                        <span className="conversion-step__label">{step.label}</span>
                        <div className="conversion-step__bar-wrap">
                            <div
                                className={`conversion-step__bar ${step.tone === 'success' ? 'conversion-step__bar--submitted' : ''}`}
                                style={{ width: `${pct}%` }}
                                aria-hidden="true"
                            />
                        </div>
                        <span className="conversion-step__value">{step.value}</span>
                    </div>
                )
            })}
        </div>
    </div>
)

const WhatsAppCard = ({ count }) => (
    <div className="conversion-card conversion-card--simple">
        <div className="conversion-card__head">
            <div className="conversion-card__title">
                <MessageCircle size={16} className="conversion-card__title-icon" aria-hidden="true" />
                <span>WhatsApp</span>
            </div>
        </div>
        <div className="conversion-card__big-number">
            <span className={`conversion-card__big-value ${count === 0 ? 'conversion-card__big-value--zero' : ''}`}>
                {count}
            </span>
            <span className="conversion-card__big-label">clicks</span>
        </div>
    </div>
)

const ActionIcons = ({ session }) => (
    <div className="session-action-icons">
        <span
            className={`session-action-icon ${session.waitlist_submitted ? 'session-action-icon--success' : (session.waitlist_opened ? 'session-action-icon--azure' : 'session-action-icon--muted')}`}
            title={session.waitlist_submitted ? 'Waitlist submitted' : (session.waitlist_opened ? 'Waitlist opened' : 'No waitlist action')}
        >
            <Users size={11} aria-hidden="true" />
        </span>
        <span
            className={`session-action-icon ${session.partnership_submitted ? 'session-action-icon--success' : (session.partnership_opened ? 'session-action-icon--azure' : 'session-action-icon--muted')}`}
            title={session.partnership_submitted ? 'Partnership submitted' : (session.partnership_opened ? 'Partnership opened' : 'No partnership action')}
        >
            <Handshake size={11} aria-hidden="true" />
        </span>
        <span
            className={`session-action-icon ${session.whatsapp_clicked ? 'session-action-icon--signal' : 'session-action-icon--muted'}`}
            title={session.whatsapp_clicked ? 'WhatsApp clicked' : 'No WhatsApp click'}
        >
            <MessageCircle size={11} aria-hidden="true" />
        </span>
    </div>
)

const AnalyticsTab = ({
    data,
    dateRange,
    setDateRange,
    onExportSessions,
    onExportEvents,
    formatDate,
    formatTime
}) => {
    const { sessions = [], events = [], stats = {} } = data || {}
    const [selectedSessionId, setSelectedSessionId] = useState(null)
    const [page, setPage] = useState(0)

    // Reset to first page when filter changes
    useEffect(() => {
        setPage(0)
    }, [dateRange])

    const selectedSession = selectedSessionId
        ? sessions.find((s) => s.session_id === selectedSessionId) || null
        : null

    const selectedEvents = useMemo(() => {
        if (!selectedSession) return []
        return events
            .filter((e) => e.session_id === selectedSession.session_id)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }, [selectedSession, events])

    const topCountries = stats.topCountries || []
    const devices = stats.devices || {}
    const browsers = stats.browsers || {}
    const totalVisitors = stats.totalVisitors || 0

    // Sparkline series. Hourly for 24h, daily otherwise.
    const granularity = dateRange === '24h' ? 'hour' : 'day'

    const visitorsSeries = useMemo(
        () => buildSeries(sessions, (g) => g.length, granularity),
        [sessions, granularity]
    )

    const avgTimeSeries = useMemo(
        () => buildSeries(sessions, (g) => {
            if (g.length === 0) return 0
            const total = g.reduce((acc, s) => acc + (s.total_time_seconds || 0), 0)
            return Math.round(total / g.length)
        }, granularity),
        [sessions, granularity]
    )

    const bounceSeries = useMemo(
        () => buildSeries(sessions, (g) => {
            if (g.length === 0) return 0
            const bounces = g.filter((s) => s.is_bounce).length
            return Math.round((bounces / g.length) * 100)
        }, granularity),
        [sessions, granularity]
    )

    // Subtitle for Countries card: top country with %
    const countriesSubtitle = useMemo(() => {
        if (topCountries.length === 0) return null
        const [code, count] = topCountries[0]
        const pct = totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0
        return `Top ${code} · ${pct}%`
    }, [topCountries, totalVisitors])

    const sourcesList = useMemo(() => {
        const counts = sessions.reduce((acc, s) => {
            const src = sourceLabel(s)
            acc[src] = (acc[src] || 0) + 1
            return acc
        }, {})
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
    }, [sessions])

    const deviceList = Object.entries(devices).sort((a, b) => b[1] - a[1])
    const browserList = Object.entries(browsers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages - 1)
    const startIdx = safePage * PAGE_SIZE
    const endIdx = Math.min(startIdx + PAGE_SIZE, sessions.length)
    const pageSessions = sessions.slice(startIdx, endIdx)

    const renderSessionMobileCard = (session) => {
        const DeviceIcon = getDeviceIcon(session.device_type)
        return (
            <article
                key={session.session_id || session.id}
                className="session-card"
                onClick={() => setSelectedSessionId(session.session_id)}
                onKeyDown={(e) => handleKeyActivate(e, () => setSelectedSessionId(session.session_id))}
                tabIndex={0}
                role="button"
                aria-label="View session details"
            >
                <div className="session-card__head">
                    {session.country
                        ? <CountryDisplay code={session.country} size={20} showName={false} />
                        : <span className="cell-empty" aria-label="Unknown country" />}
                    <div className="session-card__identity">
                        <span className="session-card__primary">
                            <DeviceIcon size={11} aria-hidden="true" style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {session.device_type || 'Unknown'} · {session.browser || 'Unknown'}
                        </span>
                        <span className="session-card__secondary">{sourceLabel(session)}</span>
                    </div>
                    <ActionIcons session={session} />
                </div>
                <div className="session-card__body">
                    <span className="session-card__metric">
                        <span className="session-card__metric-label">Pages</span>
                        <span>{session.page_views || 1}</span>
                    </span>
                    <span className="session-card__metric">
                        <span className="session-card__metric-label">Time</span>
                        <span>{formatTime(session.total_time_seconds || 0)}</span>
                    </span>
                </div>
                <div className="session-card__foot">
                    <span>{formatSessionDateTime(session.created_at)}</span>
                </div>
            </article>
        )
    }

    return (
        <div className="tab-content">
            <SectionHead
                icon={BarChart3}
                title="Analytics"
                meta={`${totalVisitors} ${totalVisitors === 1 ? 'visitor' : 'visitors'}`}
                action={
                    <div className="analytics-toolbar__exports">
                        <button
                            type="button"
                            onClick={onExportSessions}
                            className="btn btn--secondary btn--sm"
                            disabled={sessions.length === 0}
                        >
                            <Download size={13} aria-hidden="true" />
                            <span>Sessions</span>
                        </button>
                        <button
                            type="button"
                            onClick={onExportEvents}
                            className="btn btn--secondary btn--sm"
                            disabled={events.length === 0}
                        >
                            <Download size={13} aria-hidden="true" />
                            <span>Events</span>
                        </button>
                    </div>
                }
            />

            <div className="analytics-toolbar">
                <div className="analytics-toolbar__filters">
                    <div className="period-filter">
                        <Filter size={14} className="period-filter__icon" aria-hidden="true" />
                        <select
                            className="period-filter__select"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            aria-label="Date range"
                        >
                            {PERIOD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="period-filter__chevron" aria-hidden="true" />
                    </div>
                </div>
            </div>

            {/* KPI cards with sparklines */}
            <div className="kpi-grid">
                <StatCard
                    icon={Eye}
                    label="Total Visitors"
                    value={totalVisitors}
                    accent="azure"
                    sparklineData={visitorsSeries}
                />
                <StatCard
                    icon={Globe}
                    label="Countries"
                    value={stats.uniqueCountries || 0}
                    accent="azure"
                    subtitle={countriesSubtitle}
                />
                <StatCard
                    icon={Clock}
                    label="Avg Time"
                    value={formatTime(stats.avgTime || 0)}
                    accent="signal"
                    sparklineData={avgTimeSeries}
                />
                <StatCard
                    icon={TrendingDown}
                    label="Bounce Rate"
                    value={`${stats.bounceRate || 0}%`}
                    accent="danger"
                    sparklineData={bounceSeries}
                />
            </div>

            {/* Conversion funnels */}
            <div className="conversion-grid">
                <ConversionCard
                    icon={Users}
                    title="Waitlist"
                    rate={stats.waitlistConversion || 0}
                    steps={[
                        { label: 'Opened', value: stats.waitlistOpened || 0, tone: 'azure' },
                        { label: 'Submitted', value: stats.waitlistSubmitted || 0, tone: 'success' }
                    ]}
                />
                <ConversionCard
                    icon={Handshake}
                    title="Partnership"
                    rate={stats.partnershipConversion || 0}
                    steps={[
                        { label: 'Opened', value: stats.partnershipOpened || 0, tone: 'azure' },
                        { label: 'Submitted', value: stats.partnershipSubmitted || 0, tone: 'success' }
                    ]}
                />
                <WhatsAppCard count={stats.whatsappClicked || 0} />
            </div>

            {/* Geography + Sources */}
            <div className="panel-grid">
                <div className="panel">
                    <div className="panel__head">
                        <h3 className="panel__title">
                            <Globe size={12} className="panel__title-icon" aria-hidden="true" />
                            <span>Top Countries</span>
                        </h3>
                        <span className="panel__meta">{topCountries.length} total</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={topCountries.map(([code, count]) => ({
                                leading: <CountryDisplay code={code} size={14} showName={false} />,
                                label: getCountryName(code),
                                value: count
                            }))}
                            total={totalVisitors}
                            emptyLabel="No countries yet"
                        />
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__head">
                        <h3 className="panel__title">
                            <Compass size={12} className="panel__title-icon" aria-hidden="true" />
                            <span>Top Sources</span>
                        </h3>
                        <span className="panel__meta">{sourcesList.length} total</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={sourcesList.map(([source, count]) => ({
                                label: source,
                                value: count
                            }))}
                            total={totalVisitors}
                            emptyLabel="No source data yet"
                        />
                    </div>
                </div>
            </div>

            {/* Devices + Browsers */}
            <div className="panel-grid">
                <div className="panel">
                    <div className="panel__head">
                        <h3 className="panel__title">
                            <Monitor size={12} className="panel__title-icon" aria-hidden="true" />
                            <span>Devices</span>
                        </h3>
                        <span className="panel__meta">{deviceList.length} total</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={deviceList.map(([type, count]) => {
                                const Icon = getDeviceIcon(type)
                                return {
                                    leading: <Icon size={14} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />,
                                    label: type,
                                    value: count
                                }
                            })}
                            total={totalVisitors}
                            emptyLabel="No device data yet"
                        />
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__head">
                        <h3 className="panel__title">
                            <Activity size={12} className="panel__title-icon" aria-hidden="true" />
                            <span>Browsers</span>
                        </h3>
                        <span className="panel__meta">{browserList.length} total</span>
                    </div>
                    <div className="panel__body">
                        <BarList
                            items={browserList.map(([browser, count]) => ({
                                label: browser,
                                value: count
                            }))}
                            total={totalVisitors}
                            emptyLabel="No browser data yet"
                        />
                    </div>
                </div>
            </div>

            {/* Sessions */}
            <div className="panel">
                <div className="panel__head">
                    <h3 className="panel__title">
                        <Eye size={12} className="panel__title-icon" aria-hidden="true" />
                        <span>Sessions</span>
                    </h3>
                    <span className="panel__meta">{sessions.length} total</span>
                </div>

                {sessions.length === 0 ? (
                    <div className="bar-list__empty" style={{ padding: 'var(--space-5)' }}>
                        No sessions captured for this period.
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="data-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                            <table className="data-table">
                                <colgroup>
                                    <col style={{ width: 'auto' }} />
                                    <col style={{ width: '140px' }} />
                                    <col style={{ width: '130px' }} />
                                    <col style={{ width: '100px' }} />
                                    <col style={{ width: '150px' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Visitor</th>
                                        <th>Source</th>
                                        <th>Engagement</th>
                                        <th>Actions</th>
                                        <th>First seen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageSessions.map((session) => {
                                        const isSelected = selectedSessionId === session.session_id
                                        const DeviceIcon = getDeviceIcon(session.device_type)
                                        return (
                                            <tr
                                                key={session.session_id || session.id}
                                                className={`data-table__row--clickable${isSelected ? ' data-table__row--selected' : ''}`}
                                                onClick={() => setSelectedSessionId(session.session_id)}
                                                onKeyDown={(e) => handleKeyActivate(e, () => setSelectedSessionId(session.session_id))}
                                                tabIndex={0}
                                                role="button"
                                                aria-label="View session details"
                                            >
                                                <td>
                                                    <div className="session-meta-inline">
                                                        {session.country
                                                            ? <CountryDisplay code={session.country} size={14} showName={false} />
                                                            : <span className="session-meta-inline__chip">??</span>}
                                                        <span className="session-meta-inline__chip">
                                                            <DeviceIcon size={11} aria-hidden="true" />
                                                            <span>{session.device_type || 'unknown'}</span>
                                                        </span>
                                                        <span className="session-meta-inline__sep">·</span>
                                                        <span className="session-meta-inline__chip">{session.browser || 'unknown'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="cell-text">{sourceLabel(session)}</span>
                                                </td>
                                                <td>
                                                    <span className="cell-mono">
                                                        {session.page_views || 1}p · {formatTime(session.total_time_seconds || 0)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <ActionIcons session={session} />
                                                </td>
                                                <td>
                                                    <span className="cell-date" title={formatDate(session.created_at)}>
                                                        {formatSessionDateTime(session.created_at)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="session-card-list">
                            {pageSessions.map(renderSessionMobileCard)}
                        </div>

                        {/* Pagination */}
                        {sessions.length > PAGE_SIZE && (
                            <div className="pagination">
                                <span className="pagination__meta">
                                    {startIdx + 1}-{endIdx} of {sessions.length}
                                </span>
                                <div className="pagination__controls">
                                    <button
                                        type="button"
                                        className="pagination__btn"
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={safePage === 0}
                                    >
                                        <ChevronLeft size={12} aria-hidden="true" />
                                        <span>Prev</span>
                                    </button>
                                    <span className="pagination__meta">
                                        Page {safePage + 1} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        className="pagination__btn"
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={safePage >= totalPages - 1}
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={12} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <SessionDrawer
                session={selectedSession}
                events={selectedEvents}
                onClose={() => setSelectedSessionId(null)}
                formatDate={formatDate}
                formatTime={formatTime}
            />
        </div>
    )
}

export default AnalyticsTab

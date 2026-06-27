import { Globe, Smartphone, Monitor, Tablet, Eye } from 'lucide-react'
import DetailDrawer from './DetailDrawer'
import CountryDisplay from './CountryDisplay'

/**
 * SessionDrawer
 * Detail panel for an analytics session. Metadata + chronological event timeline.
 * Conversion events highlighted: submitted -> success, clicked -> signal, opened -> azure.
 */

const formatHHMMSS = (timestamp) => {
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
}

const formatEventName = (name) =>
    (name || 'event').replace(/_/g, ' ').toUpperCase()

const getEventTone = (event) => {
    const name = (event.event_name || '').toLowerCase()
    if (name.includes('submitted')) return 'success'
    if (name.includes('clicked') || name.includes('whatsapp')) return 'signal'
    if (name.includes('opened')) return 'azure'
    return 'muted'
}

const getDeviceIcon = (type) => {
    const t = (type || '').toLowerCase()
    if (t === 'mobile') return Smartphone
    if (t === 'tablet') return Tablet
    return Monitor
}

const sourceLabel = (s) =>
    s.utm_source || s.referrer_domain || 'Direct'

const SessionDrawer = ({ session, events, onClose, formatDate, formatTime }) => {
    const DeviceIcon = getDeviceIcon(session?.device_type)

    const header = session ? (
        <div className="detail-drawer__identity">
            <div className="detail-drawer__avatar" aria-hidden="true">
                <Eye size={18} />
            </div>
            <div className="detail-drawer__identity-text">
                <h2 className="detail-drawer__name">Session</h2>
                <p className="detail-drawer__email">{session.session_id}</p>
            </div>
        </div>
    ) : null

    return (
        <DetailDrawer
            open={!!session}
            onClose={onClose}
            header={header}
            ariaLabel="Session details"
        >
            {session && (
                <>
                    <section className="detail-section">
                        <h3 className="detail-section__title">Visitor</h3>
                        <dl className="detail-list">
                            <dt>Country</dt>
                            <dd>
                                {session.country
                                    ? <CountryDisplay code={session.country} size={16} showName={true} />
                                    : <span className="detail-list__empty">Unknown</span>}
                            </dd>

                            <dt>City</dt>
                            <dd>
                                {session.city || <span className="detail-list__empty">Unknown</span>}
                            </dd>

                            <dt>Device</dt>
                            <dd className="cell-text--capitalize">
                                <DeviceIcon size={14} aria-hidden="true" style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--text-muted)' }} />
                                {session.device_type || 'Unknown'}
                            </dd>

                            <dt>Browser</dt>
                            <dd>{session.browser || <span className="detail-list__empty">Unknown</span>}</dd>

                            <dt>Source</dt>
                            <dd>{sourceLabel(session)}</dd>
                        </dl>
                    </section>

                    <section className="detail-section">
                        <h3 className="detail-section__title">Engagement</h3>
                        <dl className="detail-list">
                            <dt>Pages</dt>
                            <dd>
                                <span className="detail-list__value-mono">{session.page_views || 1}</span>
                            </dd>
                            <dt>Time</dt>
                            <dd>
                                <span className="detail-list__value-mono">{formatTime(session.total_time_seconds || 0)}</span>
                            </dd>
                            <dt>Bounce</dt>
                            <dd>
                                <span className="detail-list__value-mono">{session.is_bounce ? 'Yes' : 'No'}</span>
                            </dd>
                            <dt>First seen</dt>
                            <dd>
                                <span className="detail-list__value-mono">{formatDate(session.created_at)}</span>
                            </dd>
                        </dl>
                    </section>

                    <section className="detail-section">
                        <h3 className="detail-section__title">
                            Event timeline {events && events.length > 0 && `(${events.length})`}
                        </h3>
                        {(!events || events.length === 0) ? (
                            <div className="event-timeline__empty">
                                No events captured for this session.
                            </div>
                        ) : (
                            <ol className="event-timeline">
                                {events.map((event, idx) => {
                                    const tone = getEventTone(event)
                                    const meta = event.event_value || event.page_path || event.event_category || ''
                                    return (
                                        <li key={event.id || idx} className={`event-timeline__item event-timeline__item--${tone}`}>
                                            <span className="event-timeline__time">
                                                {formatHHMMSS(event.created_at)}
                                            </span>
                                            <span className="event-timeline__dot" aria-hidden="true" />
                                            <div className="event-timeline__content">
                                                <span className="event-timeline__name">
                                                    {formatEventName(event.event_name)}
                                                </span>
                                                {meta && (
                                                    <span className="event-timeline__meta">{meta}</span>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ol>
                        )}
                    </section>
                </>
            )}
        </DetailDrawer>
    )
}

export default SessionDrawer

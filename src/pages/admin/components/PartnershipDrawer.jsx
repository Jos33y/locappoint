import { useState, useEffect } from 'react'
import { Copy, MessageCircle, Check, ChevronDown, Trash2 } from 'lucide-react'
import DetailDrawer from './DetailDrawer'
import CountryDisplay from './CountryDisplay'
import StatusBadge from './StatusBadge'

/**
 * PartnershipDrawer
 * Detail panel for a single partnership request. Sections:
 * Status (editable), Contact, Organization, Interest, Activity.
 * Actions: Copy email, WhatsApp deep link if phone present.
 */

const initial = (first, last) => {
    const f = (first || '').charAt(0)
    const l = (last || '').charAt(0)
    return (f + l).toUpperCase() || 'U'
}

const sanitizePhone = (phone) => (phone || '').replace(/[^\d]/g, '')

const PartnershipDrawer = ({ item, onClose, onStatusChange, formatDate, onDelete }) => {
    const [copied, setCopied] = useState(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        setConfirmingDelete(false)
        setDeleting(false)
    }, [item?.id])

    const handleDelete = async () => {
        if (!item || !onDelete || deleting) return
        setDeleting(true)
        await onDelete(item.id)
        onClose()
    }

    const copy = (text, key) => {
        if (!text || !navigator.clipboard) return
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key)
            setTimeout(() => setCopied(null), 1400)
        })
    }

    const whatsappHref = item?.phone
        ? `https://wa.me/${sanitizePhone(item.phone)}`
        : null

    const fullName = item
        ? `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'
        : ''

    const currentStatus = (item?.status || 'pending').toLowerCase()

    const header = item ? (
        <div className="detail-drawer__identity">
            <div className="detail-drawer__avatar" aria-hidden="true">
                {initial(item.first_name, item.last_name)}
            </div>
            <div className="detail-drawer__identity-text">
                <h2 className="detail-drawer__name">{fullName}</h2>
                <p className="detail-drawer__email">{item.email}</p>
                <div className="detail-drawer__identity-meta">
                    <StatusBadge status={item.status} />
                </div>
            </div>
        </div>
    ) : null

    const footer = item ? (
        <>
            {!confirmingDelete && (
                <>
                    {onDelete && (
                        <button
                            type="button"
                            className="detail-drawer__action detail-drawer__action--danger"
                            onClick={() => setConfirmingDelete(true)}
                        >
                            <Trash2 size={14} aria-hidden="true" />
                            <span>Delete</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="detail-drawer__action detail-drawer__action--secondary"
                        onClick={() => copy(item.email, 'email')}
                    >
                        {copied === 'email'
                            ? <Check size={14} aria-hidden="true" />
                            : <Copy size={14} aria-hidden="true" />}
                        <span>{copied === 'email' ? 'Copied' : 'Copy email'}</span>
                    </button>
                    {whatsappHref && (
                        <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="detail-drawer__action detail-drawer__action--primary"
                        >
                            <MessageCircle size={14} aria-hidden="true" />
                            <span>WhatsApp</span>
                        </a>
                    )}
                </>
            )}
            {confirmingDelete && (
                <>
                    <button
                        type="button"
                        className="detail-drawer__action detail-drawer__action--secondary"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                    >
                        <span>Cancel</span>
                    </button>
                    <button
                        type="button"
                        className="detail-drawer__action detail-drawer__action--danger"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        <Trash2 size={14} aria-hidden="true" />
                        <span>{deleting ? 'Deleting' : 'Confirm delete'}</span>
                    </button>
                </>
            )}
        </>
    ) : null

    return (
        <DetailDrawer
            open={!!item}
            onClose={onClose}
            header={header}
            footer={footer}
            ariaLabel="Partnership request details"
        >
            {item && (
                <>
                    <section className="detail-section">
                        <h3 className="detail-section__title">Status</h3>
                        <div className="detail-status-select-wrapper">
                            <select
                                className="detail-status-select"
                                data-status={currentStatus}
                                value={currentStatus}
                                onChange={(e) => onStatusChange(item.id, e.target.value)}
                                aria-label="Change status"
                            >
                                <option value="pending">Pending</option>
                                <option value="contacted">Contacted</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <ChevronDown size={16} className="detail-status-select-icon" aria-hidden="true" />
                        </div>
                    </section>

                    <section className="detail-section">
                        <h3 className="detail-section__title">Contact</h3>
                        <dl className="detail-list">
                            <dt>Email</dt>
                            <dd><span className="detail-list__value-mono">{item.email}</span></dd>

                            <dt>Phone</dt>
                            <dd>
                                {item.phone
                                    ? <span className="detail-list__value-mono">{item.phone}</span>
                                    : <span className="detail-list__empty">Not provided</span>}
                            </dd>

                            {(item.city || item.country) && (
                                <>
                                    <dt>Location</dt>
                                    <dd>
                                        {item.country && <CountryDisplay code={item.country} size={16} showName={true} />}
                                        {item.city && <span>{item.city}</span>}
                                    </dd>
                                </>
                            )}
                        </dl>
                    </section>

                    <section className="detail-section">
                        <h3 className="detail-section__title">Organization</h3>
                        <dl className="detail-list">
                            <dt>Type</dt>
                            <dd className="cell-text--capitalize">
                                {item.organization_type || <span className="detail-list__empty">Not specified</span>}
                            </dd>
                            {item.organization_name && (
                                <>
                                    <dt>Name</dt>
                                    <dd>{item.organization_name}</dd>
                                </>
                            )}
                        </dl>
                    </section>

                    {item.partnership_interest && (
                        <section className="detail-section">
                            <h3 className="detail-section__title">Interest</h3>
                            <blockquote className="detail-note">{item.partnership_interest}</blockquote>
                        </section>
                    )}

                    <section className="detail-section">
                        <h3 className="detail-section__title">Activity</h3>
                        <dl className="detail-list">
                            <dt>Submitted</dt>
                            <dd><span className="detail-list__value-mono">{formatDate(item.created_at)}</span></dd>
                        </dl>
                    </section>
                </>
            )}
        </DetailDrawer>
    )
}

export default PartnershipDrawer

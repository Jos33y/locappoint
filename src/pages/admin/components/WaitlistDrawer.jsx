import { useState, useEffect } from 'react'
import { Copy, MessageCircle, Check, Trash2 } from 'lucide-react'
import DetailDrawer from './DetailDrawer'
import CountryDisplay from './CountryDisplay'
import TypeChip from './TypeChip'

/**
 * WaitlistDrawer
 * Detail panel for a single waitlist signup. Sections:
 * Contact, Business (if business type), Notes, Activity.
 * Actions: Copy email, WhatsApp deep link if phone present.
 * Uses .detail-drawer__action classes (drawer-scoped, independent of .btn).
 */

const initial = (name) => (name ? name.charAt(0).toUpperCase() : 'U')

const avatarClass = (type) => {
    if (type === 'client') return 'detail-drawer__avatar detail-drawer__avatar--signal'
    if (type === 'business') return 'detail-drawer__avatar'
    return 'detail-drawer__avatar detail-drawer__avatar--muted'
}

const sanitizePhone = (phone) => (phone || '').replace(/[^\d]/g, '')

const WaitlistDrawer = ({ item, onClose, formatDate, onDelete }) => {
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

    const header = item ? (
        <div className="detail-drawer__identity">
            <div className={avatarClass(item.user_type)} aria-hidden="true">
                {initial(item.full_name)}
            </div>
            <div className="detail-drawer__identity-text">
                <h2 className="detail-drawer__name">{item.full_name || 'Unknown'}</h2>
                <p className="detail-drawer__email">{item.email}</p>
                <div className="detail-drawer__identity-meta">
                    <TypeChip type={item.user_type} />
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
            ariaLabel="Waitlist signup details"
        >
            {item && (
                <>
                    <section className="detail-section">
                        <h3 className="detail-section__title">Contact</h3>
                        <dl className="detail-list">
                            <dt>Email</dt>
                            <dd>
                                <span className="detail-list__value-mono">{item.email}</span>
                            </dd>

                            <dt>Phone</dt>
                            <dd>
                                {item.phone
                                    ? <span className="detail-list__value-mono">{item.phone}</span>
                                    : <span className="detail-list__empty">Not provided</span>}
                            </dd>

                            <dt>Country</dt>
                            <dd>
                                {item.country
                                    ? <CountryDisplay code={item.country} size={16} showName={true} />
                                    : <span className="detail-list__empty">Not provided</span>}
                            </dd>
                        </dl>
                    </section>

                    {item.user_type === 'business' && (
                        <section className="detail-section">
                            <h3 className="detail-section__title">Business</h3>
                            <dl className="detail-list">
                                <dt>Type</dt>
                                <dd className="cell-text--capitalize">
                                    {item.business_type || <span className="detail-list__empty">Not specified</span>}
                                </dd>
                            </dl>
                        </section>
                    )}

                    {item.comments && (
                        <section className="detail-section">
                            <h3 className="detail-section__title">Notes</h3>
                            <blockquote className="detail-note">{item.comments}</blockquote>
                        </section>
                    )}

                    <section className="detail-section">
                        <h3 className="detail-section__title">Activity</h3>
                        <dl className="detail-list">
                            <dt>Joined</dt>
                            <dd>
                                <span className="detail-list__value-mono">{formatDate(item.created_at)}</span>
                            </dd>
                        </dl>
                    </section>
                </>
            )}
        </DetailDrawer>
    )
}

export default WaitlistDrawer

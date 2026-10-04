import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, House, Mail, MessageCircle, Navigation, Phone, Video } from 'lucide-react'
import { Sheet } from '../ui'
import { useWorkspace } from './WorkspaceContext'
import {
    STATUS_LABEL,
    formatDay,
    formatMoney,
    friendlyError,
    getSlots,
    moveBooking,
    setBookingStatus,
    serviceLabel,
    shortTime,
    whatsappLink,
    zonedNow,
} from '../../services/business'
import { toMinutes } from '../../services/dates'
import { clientKey } from '../../services/clients'
import { loadBookingMoney, paidOnline, payMoney, refundOf, shareLabel } from '../../services/payments'
import { RECEIPT_KIND, loadReceipts, receiptUrl } from '../../services/receipts'
import { TripControl } from './TripControl'
import '../../styles/business/booking-pay.css'
import '../../styles/business/formats.css'

const ACTIONS = {
    pending: [
        { status: 'confirmed', label: 'Confirm', tone: 'primary', done: 'Booking confirmed' },
        { status: 'cancelled', label: 'Decline', tone: 'danger', done: 'Booking declined' },
    ],
    confirmed: [
        { status: 'completed', label: 'Completed', tone: 'primary', done: 'Marked completed' },
        { status: 'no_show', label: 'No-show', tone: 'secondary', done: 'Marked as no-show' },
        { status: 'cancelled', label: 'Cancel', tone: 'danger', done: 'Booking cancelled' },
    ],
}

// Completed and no-show only mean something once the visit has started; the database refuses them before.
const hasStarted = (booking, timeZone) => {
    const { dateKey, minutes } = zonedNow(timeZone || 'Europe/Lisbon')
    if (booking.appointment_date !== dateKey) return booking.appointment_date < dateKey
    return toMinutes(booking.appointment_time) <= minutes
}

const BookingDetailSheet = ({ booking, onClose }) => {
    const { business, bookableMembers, isOwner, refreshBookings, notify } = useWorkspace()
    const [moving, setMoving] = useState(false)
    const [move, setMove] = useState(null)
    const [slots, setSlots] = useState([])
    const [otherTime, setOtherTime] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [money, setMoney] = useState(null)
    const [receipts, setReceipts] = useState([])

    useEffect(() => {
        setMoving(false)
        setError('')
        if (booking) {
            setMove({ date: booking.appointment_date, time: '', staffId: booking.staff_id })
            setOtherTime(!booking.service_id)
        }
    }, [booking])

    // Receipts issued for this booking: paid online, refunded, or a visit paid at the place.
    useEffect(() => {
        setReceipts([])
        if (!booking?.id) return undefined
        let cancelled = false
        loadReceipts(booking.id)
            .then((rows) => { if (!cancelled) setReceipts(rows) })
            .catch((err) => console.error('Receipts failed:', err))
        return () => { cancelled = true }
    }, [booking?.id, booking?.status])

    // Paid online: what was refunded and the rule, so the buttons can say what they give back.
    useEffect(() => {
        setMoney(null)
        if (!paidOnline(booking)) return undefined
        let cancelled = false
        loadBookingMoney([booking.id])
            .then((rows) => { if (!cancelled) setMoney(rows.get(booking.id) || null) })
            .catch((err) => console.error('Booking money failed:', err))
        return () => { cancelled = true }
    }, [booking])

    useEffect(() => {
        if (!moving || !booking?.service_id || !move?.date) return undefined
        let cancelled = false
        getSlots({ businessId: business.id, serviceId: booking.service_id, date: move.date, staffId: move.staffId })
            .then((rows) => { if (!cancelled) setSlots(rows) })
            .catch(() => { if (!cancelled) setSlots([]) })
        return () => { cancelled = true }
    }, [moving, business.id, booking?.service_id, move?.date, move?.staffId])

    if (!booking) return null

    const staff = bookableMembers.find((m) => m.id === booking.staff_id)
    const started = hasStarted(booking, business.timezone)
    const upcoming = booking.status === 'confirmed' && !started
    const actions = (ACTIONS[booking.status] || []).filter((a) => started || !['completed', 'no_show'].includes(a.status))
    const whatsapp = whatsappLink(booking.client_phone)
    const paid = paidOnline(booking)
    const refund = paid ? refundOf({ ...booking, refund: money?.refund }) : null
    const currency = booking.currency || 'EUR'
    const price = Number(booking.price ?? booking.services?.price) || 0
    let payHint = ''
    if (paid && booking.status === 'pending') payHint = 'Declining gives the client all they paid back.'
    if (paid && booking.status === 'confirmed') {
        const noShow = money?.policy ? ` A no-show keeps ${shareLabel(money.policy.no_show_keep_pct ?? 50)} for you.` : ''
        payHint = `Cancelling gives the client all they paid back.${noShow}`
    }

    const act = async (action) => {
        setBusy(true)
        setError('')
        try {
            await setBookingStatus(booking.id, action.status)
            refreshBookings()
            notify(action.done)
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setBusy(false)
        }
    }

    const saveMove = async (event) => {
        event.preventDefault()
        if (!move.time) {
            setError('Pick a new time.')
            return
        }
        setBusy(true)
        setError('')
        try {
            await moveBooking({
                id: booking.id,
                date: move.date,
                time: move.time.length === 5 ? `${move.time}:00` : move.time,
                staffId: move.staffId !== booking.staff_id ? move.staffId : null,
            })
            refreshBookings()
            notify('Booking moved')
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={Boolean(booking)} onClose={onClose} title={booking.client_name}>
            <dl className="biz-facts">
                <div>
                    <dt>When</dt>
                    <dd>
                        {formatDay(booking.appointment_date, { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
                        <span className="biz-num">{shortTime(booking.appointment_time)}</span> for {booking.duration_minutes} min
                    </dd>
                </div>
                <div>
                    <dt>Service</dt>
                    <dd>
                        {serviceLabel(booking, 'Service removed')}
                        {(booking.price ?? booking.services?.price) != null && <span className="biz-num biz-muted"> {formatMoney(booking.price ?? booking.services.price)}</span>}
                    </dd>
                </div>
                {booking.mode === 'online' && (
                    <div>
                        <dt>Where</dt>
                        <dd className="biz-where">
                            <Video size={15} aria-hidden="true" />
                            {booking.meeting_url
                                ? <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer">Online, open the meeting</a>
                                : 'Online. Add your meeting link in Services, or send it to the client.'}
                        </dd>
                    </div>
                )}
                {booking.mode === 'at_client' && (
                    <div>
                        <dt>Where</dt>
                        <dd className="biz-where biz-where--home">
                            <span><House size={15} aria-hidden="true" />At the client's place{booking.client_zone ? `, ${booking.client_zone}` : ''}</span>
                            {['confirmed', 'completed'].includes(booking.status) && booking.client_address ? (
                                <>
                                    <span className="biz-where__addr">{booking.client_address}</span>
                                    {booking.client_landmark && <span className="biz-where__note">{booking.client_landmark}</span>}
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([booking.client_address, booking.client_zone].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Directions</a>
                                </>
                            ) : booking.status === 'pending' && <span className="biz-where__note">The full address shows once you confirm.</span>}
                            {Number(booking.travel_fee) > 0 && <span className="biz-where__note">Travel fee {formatMoney(booking.travel_fee)}</span>}
                            {booking.status === 'confirmed' && <TripControl booking={booking} timeZone={business.timezone} />}
                        </dd>
                    </div>
                )}
                {staff && bookableMembers.length > 1 && (
                    <div>
                        <dt>With</dt>
                        <dd>{staff.display_name}</dd>
                    </div>
                )}
                {paid && (
                    <div>
                        <dt>Payment</dt>
                        <dd>
                            <span className={`biz-paystate${refund ? ' is-refund' : ''}`}>{refund ? (refund.full ? 'Refunded' : 'Part refunded') : 'Paid online'}</span>
                            {refund && (
                                <span className="biz-paydetail">
                                    {payMoney(refund.amount, currency, true)} back to the client{refund.full ? '' : `, you keep ${payMoney(Math.max(price - refund.amount, 0), currency, true)}`}
                                </span>
                            )}
                        </dd>
                    </div>
                )}
                {receipts.length > 0 && (
                    <div>
                        <dt>Receipts</dt>
                        <dd className="biz-receipts">
                            {receipts.map((r) => {
                                const url = receiptUrl(r.token)
                                const send = whatsappLink(booking.client_phone, `Your ${RECEIPT_KIND[r.kind].toLowerCase()} from ${business.business_name}: ${url}`)
                                return (
                                    <span key={r.token} className="biz-receipts__row">
                                        <a href={url} target="_blank" rel="noopener noreferrer">{RECEIPT_KIND[r.kind]} {r.number}</a>
                                        {send && <a className="biz-receipts__send" href={send} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
                                    </span>
                                )
                            })}
                        </dd>
                    </div>
                )}
                <div>
                    <dt>Status</dt>
                    <dd><span className={`biz-status biz-status--${booking.status}`}>{STATUS_LABEL[booking.status]}</span></dd>
                </div>
                {booking.notes && (
                    <div>
                        <dt>Notes</dt>
                        <dd>{booking.notes}</dd>
                    </div>
                )}
            </dl>

            {(booking.client_phone || booking.client_email) && (
                <div className="biz-contact">
                    {booking.client_phone && (
                        <a className="biz-contact__btn" href={`tel:${booking.client_phone}`}>
                            <Phone size={18} /> Call
                        </a>
                    )}
                    {whatsapp && (
                        <a className="biz-contact__btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={18} /> WhatsApp
                        </a>
                    )}
                    {booking.client_email && (
                        <a className="biz-contact__btn" href={`mailto:${booking.client_email}`}>
                            <Mail size={18} /> Email
                        </a>
                    )}
                    <Link className="biz-contact__btn" to={`/portal/clients?client=${encodeURIComponent(clientKey(booking))}`} onClick={onClose}>
                        <History size={18} /> History
                    </Link>
                </div>
            )}

            {!moving && payHint && actions.length > 0 && <p className="biz-payhint">{payHint}</p>}
            {!moving && actions.length > 0 && (
                <div className="biz-actions">
                    {upcoming && (
                        <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => setMoving(true)}>
                            Move
                        </button>
                    )}
                    {actions.map((action) => (
                        <button
                            key={action.status}
                            type="button"
                            className={`btn btn--${action.tone} btn--lg`}
                            disabled={busy}
                            onClick={() => act(action)}
                        >
                            {action.label}
                        </button>
                    ))}
                    {!upcoming && (
                        <button type="button" className="btn btn--ghost btn--lg" disabled={busy} onClick={() => setMoving(true)}>
                            Move
                        </button>
                    )}
                </div>
            )}
            {!moving && upcoming && (
                <p className="biz-hint">Completed and no-show open once it starts at {shortTime(booking.appointment_time)}.</p>
            )}

            {moving && move && (
                <form className="biz-form biz-move" onSubmit={saveMove}>
                    <h3 className="biz-subhead">Move to</h3>
                    <label className="biz-field">
                        <span className="biz-field__label">Date</span>
                        <input
                            className="biz-input"
                            type="date"
                            value={move.date}
                            onChange={(event) => setMove((current) => ({ ...current, date: event.target.value, time: '' }))}
                            required
                        />
                    </label>

                    {isOwner && bookableMembers.length > 1 && (
                        <label className="biz-field">
                            <span className="biz-field__label">With</span>
                            <select
                                className="biz-input"
                                value={move.staffId}
                                onChange={(event) => setMove((current) => ({ ...current, staffId: event.target.value, time: '' }))}
                            >
                                {bookableMembers.map((member) => (
                                    <option key={member.id} value={member.id}>{member.display_name}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    <fieldset className="biz-field">
                        <legend className="biz-field__label">Time</legend>
                        {otherTime ? (
                            <input
                                className="biz-input"
                                type="time"
                                step="300"
                                value={move.time.slice(0, 5)}
                                onChange={(event) => setMove((current) => ({ ...current, time: event.target.value }))}
                                required
                            />
                        ) : slots.length === 0 ? (
                            <p className="biz-hint">No free times in opening hours that day.</p>
                        ) : (
                            <div className="biz-slots" role="radiogroup" aria-label="Free times">
                                {slots.map((slot) => (
                                    <button
                                        key={slot.slot_time}
                                        type="button"
                                        role="radio"
                                        aria-checked={move.time === slot.slot_time}
                                        className={`biz-slot${move.time === slot.slot_time ? ' is-selected' : ''}`}
                                        onClick={() => setMove((current) => ({ ...current, time: slot.slot_time }))}
                                    >
                                        {shortTime(slot.slot_time)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {booking.service_id && (
                            <button
                                type="button"
                                className="biz-textbtn"
                                onClick={() => {
                                    setOtherTime((value) => !value)
                                    setMove((current) => ({ ...current, time: '' }))
                                }}
                            >
                                {otherTime ? 'Show free times' : 'Another time, outside opening hours'}
                            </button>
                        )}
                    </fieldset>

                    <div className="biz-actions">
                        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>Move booking</button>
                        <button type="button" className="btn btn--ghost btn--lg" disabled={busy} onClick={() => setMoving(false)}>Keep as is</button>
                    </div>
                </form>
            )}

            {error && <p className="biz-error" role="alert">{error}</p>}
        </Sheet>
    )
}

export default BookingDetailSheet

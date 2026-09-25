import { useEffect, useState } from 'react'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import Sheet from './Sheet'
import { useWorkspace } from './WorkspaceContext'
import {
    STATUS_LABEL,
    formatDay,
    formatMoney,
    friendlyError,
    getSlots,
    moveBooking,
    setBookingStatus,
    shortTime,
    whatsappLink,
} from '../../services/business'

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

const BookingDetailSheet = ({ booking, onClose }) => {
    const { business, bookableMembers, isOwner, refreshBookings, notify } = useWorkspace()
    const [moving, setMoving] = useState(false)
    const [move, setMove] = useState(null)
    const [slots, setSlots] = useState([])
    const [otherTime, setOtherTime] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setMoving(false)
        setError('')
        if (booking) {
            setMove({ date: booking.appointment_date, time: '', staffId: booking.staff_id })
            setOtherTime(!booking.service_id)
        }
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
    const actions = ACTIONS[booking.status] || []
    const whatsapp = whatsappLink(booking.client_phone)

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
                        {booking.services?.service_name || 'Service removed'}
                        {booking.services && <span className="biz-num biz-muted"> {formatMoney(booking.services.price)}</span>}
                    </dd>
                </div>
                {staff && bookableMembers.length > 1 && (
                    <div>
                        <dt>With</dt>
                        <dd>{staff.display_name}</dd>
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
                </div>
            )}

            {!moving && actions.length > 0 && (
                <div className="biz-actions">
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
                    <button type="button" className="btn btn--ghost btn--lg" disabled={busy} onClick={() => setMoving(true)}>
                        Move
                    </button>
                </div>
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

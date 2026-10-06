import { useState } from 'react'
import { CalendarDays, CircleCheck, Send } from 'lucide-react'
import { Button, Status, Textarea } from '../ui'
import { CATEGORY_LABEL, TICKET_STATUS } from '../../constants/support'
import { supportError, ticketRef, whenSent } from '../../services/support'
import { shortDay } from '../../services/inbox'
import '../../styles/support.css'

const WHO = { support: 'Locappoint support', you: 'You', system: '' }

// One conversation: what it is about, every message, and the reply box. Notes from our team never
// reach this screen; the database leaves them out.
export const TicketThread = ({ ticket, onReply, onClose, compact = false }) => {
    const [body, setBody] = useState('')
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const status = TICKET_STATUS[ticket.status] || TICKET_STATUS.open
    const booking = ticket.booking

    const send = async (event) => {
        event.preventDefault()
        if (!body.trim()) { setError('Write your reply first.'); return }
        setBusy('reply')
        setError('')
        try {
            await onReply(body)
            setBody('')
        } catch (err) {
            setError(supportError(err))
        } finally {
            setBusy('')
        }
    }

    const close = async () => {
        setBusy('close')
        setError('')
        try {
            await onClose()
        } catch (err) {
            setError(supportError(err))
        } finally {
            setBusy('')
        }
    }

    return (
        <article className={`lc-sup-thread${compact ? ' is-compact' : ''}`} aria-label={`Ticket ${ticketRef(ticket)}`}>
            <header className="lc-sup-thread__head">
                <p className="lc-sup-thread__ref">
                    <span>{ticketRef(ticket)}</span>
                    <span>{CATEGORY_LABEL[ticket.category] || 'Support'}</span>
                    {ticket.from_us && <span>From Locappoint</span>}
                </p>
                <h2 className="lc-sup-thread__title">{ticket.subject}</h2>
                <div className="lc-sup-thread__state">
                    <Status tone={status.tone} size="sm">{status.label}</Status>
                    <span>{ticket.status === 'waiting' && !onClose ? 'We replied. Answer below.' : status.note}</span>
                </div>
                {booking && (
                    <p className="lc-sup-thread__booking">
                        <CalendarDays size={14} aria-hidden="true" />
                        <span>
                            {[booking.service_name, booking.client_name, booking.business_name].filter(Boolean).join(', ')}
                            {booking.date ? `, ${shortDay(booking.date)}${booking.time ? ` at ${booking.time}` : ''}` : ''}
                        </span>
                    </p>
                )}
            </header>

            <ol className="lc-sup-msgs">
                {(ticket.messages || []).map((m) => (
                    m.from === 'system' ? (
                        <li key={m.id} className="lc-sup-msg is-system"><span>{m.body}</span> <time dateTime={m.at}>{whenSent(m.at)}</time></li>
                    ) : (
                        <li key={m.id} className={`lc-sup-msg is-${m.from}`}>
                            <p className="lc-sup-msg__who">
                                <b>{m.from === 'you' && !m.mine ? 'Your team' : WHO[m.from]}</b>
                                <time dateTime={m.at}>{whenSent(m.at)}</time>
                            </p>
                            <p className="lc-sup-msg__body">{m.body}</p>
                        </li>
                    )
                ))}
            </ol>

            {ticket.can_reply !== false ? (
                <form className="lc-sup-reply" onSubmit={send} noValidate>
                    <label className="ui-field__label" htmlFor={`reply-${ticket.id}`}>{ticket.status === 'resolved' ? 'Something else? A reply opens it again' : 'Your reply'}</label>
                    <Textarea id={`reply-${ticket.id}`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={3} />
                    {error && <p className="lc-sup-form__error" role="alert">{error}</p>}
                    <div className="lc-sup-reply__actions">
                        {onClose && ticket.status !== 'resolved' && (
                            <Button variant="quiet" icon={CircleCheck} loading={busy === 'close'} onClick={close}>This is sorted</Button>
                        )}
                        <Button type="submit" icon={Send} loading={busy === 'reply'}>Send</Button>
                    </div>
                </form>
            ) : (
                <p className="lc-sup-thread__closed">Closed over 30 days ago. Open a new ticket if you still need us.</p>
            )}
        </article>
    )
}

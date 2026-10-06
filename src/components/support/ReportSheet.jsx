import { useEffect, useState } from 'react'
import { CircleCheck, Send } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Sheet, Textarea } from '../ui'
import { CATEGORIES, SUPPORT } from '../../constants/support'
import { openTicket, reportByLink, supportError, ticketRef } from '../../services/support'
import '../../styles/support.css'

// "Report a problem" on one booking, for the client or the business. Signed in it opens a ticket in
// Support; from a booking link (guests) it lives on that link. A second report on the same booking
// joins the first while it is still open.
export const ReportSheet = ({ booking, side = 'client', token = null, businessId = null, title, onDone, onClose }) => {
    const [category, setCategory] = useState('')
    const [message, setMessage] = useState('')
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(null)

    useEffect(() => {
        setCategory('')
        setMessage('')
        setErrors({})
        setSent(null)
    }, [booking?.id])

    if (!booking) return null
    const options = CATEGORIES[side].report

    const send = async (event) => {
        event.preventDefault()
        const next = {}
        if (!category) next.category = 'Pick what it is about.'
        if (message.trim().length < 10) next.message = 'Tell us what happened, so we can help first time.'
        setErrors(next)
        if (Object.keys(next).length) return
        setBusy(true)
        try {
            const result = token
                ? await reportByLink({ token, category, message })
                : await openTicket({ side, category, message, businessId, appointmentId: booking.id })
            setSent(result)
            onDone?.(result)
        } catch (err) {
            setErrors({ form: supportError(err) })
        } finally {
            setBusy(false)
        }
    }

    const urgent = category === 'payment' || category === 'safety'

    return (
        <Sheet
            open
            onClose={onClose}
            title={sent ? 'Report sent' : 'Report a problem'}
            footer={sent ? (
                <div className="lc-sup-sheet__actions">
                    {!token && <Button variant="secondary" to={`${side === 'business' ? '/portal' : '/client'}/support?t=${sent.id}`}>Open in Support</Button>}
                    <Button onClick={onClose}>Done</Button>
                </div>
            ) : (
                <div className="lc-sup-sheet__actions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="lc-sup-report" icon={Send} loading={busy}>Send report</Button>
                </div>
            )}
        >
            {sent ? (
                <div className="lc-sup-sent" role="status">
                    <CircleCheck size={28} aria-hidden="true" />
                    <p className="lc-sup-sent__title">{sent.added ? `Added to ${ticketRef(sent)}` : `Ticket ${ticketRef(sent)} is open`}</p>
                    <p>
                        A person at Locappoint reads it and replies by email{token ? ' and on this page' : ', in the bell and in Support'}, usually within one working day.
                        {urgent ? ' Payment and safety reports are answered first.' : ''}
                    </p>
                </div>
            ) : (
                <form id="lc-sup-report" className="lc-sup-form" onSubmit={send} noValidate>
                    <p className="lc-sup-form__about">{title}</p>
                    <div className={`ui-field${errors.category ? ' has-error' : ''}`}>
                        <p className="ui-field__label lc-sup-form__label" id="lc-sup-report-about">What is it about?</p>
                        <ChipGroup label="What is it about?">
                            {options.map((o) => (
                                <Chip key={o.value} selected={category === o.value} onClick={() => setCategory(o.value)}>{o.label}</Chip>
                            ))}
                        </ChipGroup>
                        {errors.category && <span className="ui-field__error" role="alert">{errors.category}</span>}
                    </div>
                    <Field label="What happened" error={errors.message} hint="Times, amounts and names help us sort it faster.">
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={5} />
                    </Field>
                    {category === 'safety' && (
                        <p className="lc-sup-form__urgent">If anyone is in danger now, call 112 first.</p>
                    )}
                    <p className="lc-sup-form__rule">
                        Reports can be made up to {SUPPORT.reportHours} hours after the visit. Both sides can report, and we look at the booking, the payment and both accounts before deciding. <a href="/legal/policies" target="_blank" rel="noopener noreferrer">Booking policies</a>
                    </p>
                    {errors.form && <p className="lc-sup-form__error" role="alert">{errors.form}</p>}
                </form>
            )}
        </Sheet>
    )
}

import { useState } from 'react'
import { Ban, CircleCheck } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Sheet, Textarea } from '../ui'
import { BLOCK_REASONS, blockClient } from '../../services/clientBlocks'
import { supportError } from '../../services/support'
import '../../styles/client-blocks.css'

// Block a client from booking online, from one of their bookings. A reason is required, and
// Locappoint reviews every block, so a business cannot quietly turn people away.
export const ClientBlockSheet = ({ booking, onDone, onClose }) => {
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)

    const send = async (event) => {
        event.preventDefault()
        const next = {}
        if (!reason) next.reason = 'Pick the reason.'
        if (reason === 'other' && note.trim().length < 10) next.note = 'Say what happened, in a sentence or two.'
        setErrors(next)
        if (Object.keys(next).length) return
        setBusy(true)
        try {
            await blockClient({ appointmentId: booking.id, reason, note })
            setDone(true)
            onDone?.()
        } catch (err) {
            setErrors({ form: supportError(err, 'That did not save. Check your connection and try again.') })
        } finally {
            setBusy(false)
        }
    }

    const name = booking.client_name || 'this client'

    return (
        <Sheet
            open
            onClose={onClose}
            title={done ? 'Client blocked' : `Block ${name}?`}
            footer={done ? <Button onClick={onClose}>Done</Button> : (
                <div className="lc-cbk-sheet__actions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="lc-cbk-form" icon={Ban} loading={busy}>Block from booking online</Button>
                </div>
            )}
        >
            {done ? (
                <div className="lc-cbk-done" role="status">
                    <CircleCheck size={28} aria-hidden="true" />
                    <p>{name} can no longer book you online. Their existing bookings stay, and you can still add them yourself.</p>
                    <p>Locappoint reviews every block and tells you what we decide. {reason === 'unsafe' ? 'Because you said rude or unsafe, we opened a safety ticket too; it is in Support.' : ''}</p>
                </div>
            ) : (
                <form id="lc-cbk-form" className="lc-cbk-form" onSubmit={send} noValidate>
                    <ul className="lc-cbk-what">
                        <li>They cannot book you online, with their account, email or phone.</li>
                        <li>They are not told they are blocked. They see that you are not taking online bookings from them.</li>
                        <li>Their bookings already made stay. You can still add them yourself.</li>
                        <li>Locappoint reviews every block. Blocks without a fair reason are lifted. <a href="/legal/policies#blocks" target="_blank" rel="noopener noreferrer">How blocks work</a></li>
                    </ul>
                    <div className={`ui-field${errors.reason ? ' has-error' : ''}`}>
                        <p className="ui-field__label lc-cbk-label">Why</p>
                        <ChipGroup label="Why">
                            {BLOCK_REASONS.map((r) => <Chip key={r.value} selected={reason === r.value} onClick={() => setReason(r.value)}>{r.label}</Chip>)}
                        </ChipGroup>
                        {errors.reason && <span className="ui-field__error" role="alert">{errors.reason}</span>}
                    </div>
                    <Field label="What happened" optional={reason !== 'other'} error={errors.note} hint="Dates and what was said help us review it quickly. The client never sees this.">
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
                    </Field>
                    {errors.form && <p className="lc-cbk-error" role="alert">{errors.form}</p>}
                </form>
            )}
        </Sheet>
    )
}

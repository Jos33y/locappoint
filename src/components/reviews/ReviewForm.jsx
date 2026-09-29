import { useState } from 'react'
import { Button, Field, Textarea } from '../ui'
import { StarPicker } from './Stars'
import { RATING_WORDS } from '../../services/reviews'
import { USER_ERRORS } from '../../services/booking'
import '../../styles/reviews.css'

export const ReviewForm = ({ initial, businessName, onSubmit, submitLabel = 'Post review', onCancel }) => {
    const [rating, setRating] = useState(initial?.rating || 0)
    const [body, setBody] = useState(initial?.body || '')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    const send = async () => {
        if (!rating) {
            setError('Pick from one to five stars')
            return
        }
        setSending(true)
        setError('')
        try {
            await onSubmit({ rating, body: body.trim() || null })
        } catch (err) {
            console.error('Review failed:', err)
            setError(USER_ERRORS.includes(err?.code) && err.message ? err.message : 'We could not post it. Check your connection and try again.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="lc-rvform">
            <div className="lc-rvform__stars">
                <StarPicker value={rating} onChange={(n) => { setRating(n); setError('') }} />
                <p className="lc-rvform__word" aria-live="polite">{rating ? RATING_WORDS[rating] : 'Tap a star'}</p>
            </div>
            <Field label={`What should others know about ${businessName}?`} optional hint={`${body.length} of 500`}>
                <Textarea value={body} rows={3} maxLength={500} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {error && <p className="lc-rvform__error" role="alert">{error}</p>}
            <div className="lc-rvform__actions">
                {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
                <Button loading={sending} onClick={send}>{submitLabel}</Button>
            </div>
            <p className="lc-rvform__note">Shown on the business page with your first name and initial.</p>
        </div>
    )
}

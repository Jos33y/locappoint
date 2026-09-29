import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button, Sheet } from '../ui'
import { ReviewForm } from './ReviewForm'
import { ReviewCard } from './ReviewCard'
import { canEdit, reviewOf } from '../../services/reviews'
import { shortDate } from '../../services/booking'
import '../../styles/reviews.css'

// Rate a past visit from the client area. After posting, the next step is booking again.
export const RateSheet = ({ booking, onSave, onAgain, onClose }) => {
    const business = booking.businesses || {}
    const existing = reviewOf(booking)
    const [saved, setSaved] = useState(null)
    const [editing, setEditing] = useState(!existing)
    const review = saved || existing
    const service = booking.services?.service_name || 'Your visit'

    const submit = async (values) => {
        const state = await onSave(booking, values)
        setSaved(state?.review || { ...values, created_at: new Date().toISOString() })
        setEditing(false)
    }

    return (
        <Sheet open onClose={onClose} title={editing ? 'How was it?' : 'Your review'}>
            <p className="lc-rate__visit"><b>{service}</b> at {business.business_name}, {shortDate(booking.appointment_date)}</p>
            {editing ? (
                <ReviewForm
                    initial={review}
                    businessName={business.business_name}
                    submitLabel={review ? 'Save changes' : 'Post review'}
                    onCancel={review ? () => setEditing(false) : null}
                    onSubmit={submit}
                />
            ) : (
                <>
                    {saved && <p className="lc-rate__thanks" role="status">Thanks. Your review is on {business.business_name}&rsquo;s page.</p>}
                    <ReviewCard review={review} businessName={business.business_name} mine />
                    <div className="lc-rate__actions">
                        {canEdit(review) && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
                        {onAgain && booking.services?.id && <Button icon={RotateCcw} onClick={() => onAgain(booking)}>Book again</Button>}
                    </div>
                </>
            )}
        </Sheet>
    )
}

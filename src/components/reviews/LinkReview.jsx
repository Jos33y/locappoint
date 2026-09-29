import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '../ui'
import { ReviewForm } from './ReviewForm'
import { ReviewCard } from './ReviewCard'
import '../../styles/reviews.css'

// The review on the manage page: ask for it after the visit, or show it with the owner's reply.
export const LinkReview = ({ state, businessName, preset, onSubmit }) => {
    const [editing, setEditing] = useState(false)
    const [thanks, setThanks] = useState(false)
    if (!state || (!state.can_review && !state.review)) return null
    const review = state.review

    const submit = async (values) => {
        await onSubmit(values)
        setEditing(false)
        setThanks(true)
    }

    if (state.can_review || editing) {
        return (
            <section className="lc-mb-review" aria-labelledby="lc-mb-review-title">
                <header className="lc-mb-review__head">
                    <span className="lc-mb__icon" aria-hidden="true"><Star size={20} /></span>
                    <div>
                        <h2 id="lc-mb-review-title" className="lc-mb__heading">How was it?</h2>
                        <p className="lc-mb-review__sub">Your review helps {businessName} and the people choosing where to book.</p>
                    </div>
                </header>
                <ReviewForm
                    initial={review || (preset ? { rating: preset } : null)}
                    businessName={businessName}
                    submitLabel={review ? 'Save changes' : 'Post review'}
                    onCancel={review ? () => setEditing(false) : null}
                    onSubmit={submit}
                />
            </section>
        )
    }

    return (
        <section className="lc-mb-review" aria-label="Your review">
            {thanks && <p className="lc-rate__thanks" role="status">Thanks. Your review is on {businessName}&rsquo;s page.</p>}
            <ReviewCard review={review} businessName={businessName} mine />
            {state.can_edit && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit review</Button>}
        </section>
    )
}

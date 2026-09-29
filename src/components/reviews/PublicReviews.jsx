import { useState } from 'react'
import { Button } from '../ui'
import { Stars, StarBars } from './Stars'
import { ReviewCard } from './ReviewCard'
import { reviewCount } from '../../services/reviews'
import '../../styles/reviews.css'

export const RatingLine = ({ reviews }) => {
    if (!reviews) return null
    if (!reviews.count) return <p className="lc-rating is-new">New on Locappoint</p>
    return (
        <a className="lc-rating" href="#reviews">
            <Stars value={Number(reviews.average)} size={14} />
            <b>{Number(reviews.average).toFixed(1)}</b>
            <span>{reviewCount(reviews.count)}</span>
        </a>
    )
}

export const PublicReviews = ({ reviews, name, onMore }) => {
    const [loading, setLoading] = useState(false)
    if (!reviews?.count) return null
    const more = async () => {
        setLoading(true)
        try { await onMore() } finally { setLoading(false) }
    }
    return (
        <section id="reviews" className="lc-pub__card lc-pub__reviews" aria-labelledby="lc-pub-reviews-title">
            <h2 id="lc-pub-reviews-title" className="lc-pub__h2">Reviews</h2>
            <div className="lc-pubrv__summary">
                <div className="lc-pubrv__score">
                    <b>{Number(reviews.average).toFixed(1)}</b>
                    <Stars value={Number(reviews.average)} size={18} />
                    <span>{reviewCount(reviews.count)}, all from people who booked</span>
                </div>
                <StarBars stars={reviews.stars} />
            </div>
            <div className="lc-pubrv__list">
                {reviews.items.map((r) => <ReviewCard key={r.id} review={r} businessName={name} />)}
            </div>
            {reviews.items.length < reviews.count && (
                <Button variant="secondary" loading={loading} onClick={more}>Show more reviews</Button>
            )}
        </section>
    )
}

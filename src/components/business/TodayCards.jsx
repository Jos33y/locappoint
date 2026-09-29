import { Link } from 'react-router-dom'
import { ArrowRight, Eye, Star } from 'lucide-react'
import ShareLink from './ShareLink'
import { Stars } from '../reviews/Stars'
import { reviewCount } from '../../services/reviews'
import '../../styles/business/overview.css'

export const ReviewsCard = ({ reviews }) => {
    if (!reviews) return null
    return (
        <Link to="/portal/reviews" className="biz-ovcard biz-ovcard--link">
            <span className="biz-ovcard__head">
                <Star size={16} aria-hidden="true" />
                <span>Reviews</span>
                <ArrowRight size={16} aria-hidden="true" className="biz-ovcard__go" />
            </span>
            {reviews.count ? (
                <>
                    <span className="biz-ovcard__figure">
                        <b className="biz-num">{Number(reviews.average).toFixed(1)}</b>
                        <Stars value={Number(reviews.average)} size={15} />
                    </span>
                    <span className="biz-ovcard__note">
                        {reviewCount(reviews.count)}
                        {reviews.waiting > 0 && <em className="is-warn">{`, ${reviews.waiting} waiting for your reply`}</em>}
                    </span>
                </>
            ) : (
                <span className="biz-ovcard__note">None yet. Clients are asked the morning after each visit.</span>
            )}
        </Link>
    )
}

export const PageCard = ({ business, stats }) => (
    <section className="biz-ovcard" aria-label="Your page">
        <span className="biz-ovcard__head">
            <Eye size={16} aria-hidden="true" />
            <span>Your page, last 7 days</span>
        </span>
        {stats && (
            <span className="biz-ovcard__pair">
                <span><b className="biz-num">{stats.views}</b> visits</span>
                <span><b className="biz-num">{stats.booked}</b> booked online</span>
            </span>
        )}
        <ShareLink business={business} />
    </section>
)

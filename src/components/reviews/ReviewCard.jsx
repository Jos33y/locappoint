import { Stars } from './Stars'
import '../../styles/reviews.css'

export const ReviewCard = ({ review, businessName, mine = false }) => (
    <article className="lc-rv">
        <header className="lc-rv__head">
            <Stars value={review.rating} size={15} />
            <span className="lc-rv__who">
                <b>{mine ? 'Your review' : review.author}</b>
                {[review.service, review.visit_month].filter(Boolean).length > 0 && <span>{[review.service, review.visit_month].filter(Boolean).join(', ')}</span>}
            </span>
        </header>
        {review.body && <p className="lc-rv__body">{review.body}</p>}
        {review.reply && (
            <div className="lc-rv__reply">
                <p className="lc-rv__replyby">Reply from {businessName}</p>
                <p>{review.reply}</p>
            </div>
        )}
    </article>
)

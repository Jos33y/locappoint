import { supabase } from '../config/supabase'
import { isAhead } from './booking'
import { parseDateKey } from './dates'
import { zonedNow } from './business'

const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const loadPublicReviews = (businessId, offset = 0, limit = 5) => rpc('public_reviews', { p_business_id: businessId, p_limit: limit, p_offset: offset })
export const reviewByLink = (token) => rpc('review_by_link', { p_token: token })
export const submitReviewByLink = ({ token, rating, body }) => rpc('submit_review_by_link', { p_token: token, p_rating: rating, p_body: body })
export const submitMyReview = ({ id, rating, body }) => rpc('submit_my_review', { p_appointment_id: id, p_rating: rating, p_body: body })
export const loadOwnerReviews = (businessId) => rpc('owner_reviews', { p_business_id: businessId })
export const replyToReview = ({ id, reply }) => rpc('reply_to_review', { p_review_id: id, p_reply: reply })
export const reportReview = ({ id, reason }) => rpc('report_review', { p_review_id: id, p_reason: reason })

export const RATING_WORDS = ['', 'Poor', 'Not great', 'Good', 'Very good', 'Excellent']

export const reviewCount = (n) => (n === 1 ? '1 review' : `${n} reviews`)

// The embedded review on a booking row: one object, or an array of one, depending on how the relation is read.
export const reviewOf = (booking) => {
    const r = booking?.reviews
    return (Array.isArray(r) ? r[0] : r) || null
}

// Mirrors review_state in the database, so the button only shows when the server would accept it.
export const canReview = (booking) => {
    if (reviewOf(booking)) return false
    const visited = booking.status === 'completed' || (booking.status === 'confirmed' && !isAhead(booking))
    if (!visited) return false
    const { dateKey } = zonedNow(booking.businesses?.timezone || 'Europe/Lisbon')
    return (parseDateKey(dateKey) - parseDateKey(booking.appointment_date)) / 86400000 <= 60
}

export const canEdit = (review) =>
    Boolean(review) && !review.reply && Date.now() - new Date(review.created_at).getTime() < 7 * 86400000

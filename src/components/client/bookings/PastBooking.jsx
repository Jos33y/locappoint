import { Link } from 'react-router-dom'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { parseDateKey } from '../../../services/dates'
import { monthShort } from '../../../services/booking'
import '../../../styles/client/client-bookings.css'
import '../../../styles/client/rebook.css'

const LABEL = { cancelled: 'Cancelled', no_show: 'Missed', completed: 'Done', pending: 'Not confirmed', confirmed: 'Done' }
const CANCELLED = { client: 'You cancelled', business: 'Cancelled by the business' }

const label = (booking) => (booking.status === 'cancelled' && CANCELLED[booking.cancelled_by]) || LABEL[booking.status] || booking.status

export const PastBooking = ({ booking, focused = false, onAgain }) => {
    const date = parseDateKey(booking.appointment_date)
    const business = booking.businesses || {}
    return (
        <li id={`booking-${booking.id}`} className={`lc-cl-past${focused ? ' is-focus' : ''}`}>
            <span className="lc-cl-past__date">
                <small>{monthShort(date)}</small>
                <b>{date.getDate()}</b>
            </span>
            <span className="lc-cl-past__text">
                <strong>{booking.services?.service_name || 'Booking'}</strong>
                <span>{business.business_name} at {(booking.appointment_time || '').slice(0, 5)}{date.getFullYear() !== new Date().getFullYear() ? `, ${date.getFullYear()}` : ''}</span>
            </span>
            <span className={`lc-cl-past__state is-${booking.status}${booking.cancelled_by ? ` by-${booking.cancelled_by}` : ''}`}>{label(booking)}</span>
            {business.slug && onAgain && booking.services?.id && (
                <button type="button" className="lc-cl-past__again" aria-label={`Book ${booking.services.service_name} again at ${business.business_name}`} onClick={() => onAgain(booking)}>
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>Book again</span>
                </button>
            )}
            {business.slug && onAgain && !booking.services?.id && (
                <Link to={`/${business.slug}`} className="lc-cl-past__again" aria-label={`See services at ${business.business_name}`}>
                    <ArrowUpRight size={15} aria-hidden="true" />
                    <span>See services</span>
                </Link>
            )}
        </li>
    )
}

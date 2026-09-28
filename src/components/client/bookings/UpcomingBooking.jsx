import { MessageCircle, Navigation, Phone, X } from 'lucide-react'
import { Button } from '../../ui'
import { BookingTicket } from '../../booking/sheet/BookingTicket'
import { whatsappLink } from '../../../services/business'
import { toMinutes } from '../../../services/dates'
import { clock } from '../../../services/hours'
import { whenLabel } from '../NextBooking'
import '../../../styles/client/client-bookings.css'

const mapsLink = (address, city) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`

export const UpcomingBooking = ({ booking, lead = false, onCancel }) => {
    const business = booking.businesses || {}
    const service = { ...booking.services, duration_minutes: booking.duration_minutes || booking.services?.duration_minutes }
    const minutes = toMinutes(booking.appointment_time)
    const confirmed = booking.status === 'confirmed'
    const whatsapp = whatsappLink(business.whatsapp, `Hi ${business.business_name}, about my booking on ${booking.appointment_date} at ${clock(minutes)}: `)
    const phone = business.phone?.replace(/\s+/g, '')

    return (
        <article className={`lc-cl-bk${lead ? ' is-lead' : ''}`}>
            <p className="lc-cl-bk__when">
                <b>{whenLabel(booking.appointment_date)}</b>
                <span>{confirmed ? 'Confirmed by the business' : 'Waiting for the business to confirm'}</span>
            </p>
            <BookingTicket
                business={business}
                service={service}
                dateKey={booking.appointment_date}
                minutes={minutes}
                stamp={confirmed ? 'Confirmed' : 'Pending'}
                stampTone={confirmed ? 'success' : 'signal'}
            />
            {booking.notes?.trim() && <p className="lc-cl-bk__note"><b>Your note:</b> {booking.notes.trim()}</p>}
            <div className="lc-cl-bk__actions">
                {business.address?.trim() && (
                    <Button variant="secondary" icon={Navigation} href={mapsLink(business.address, business.city)} target="_blank" rel="noopener noreferrer">Directions</Button>
                )}
                {whatsapp ? (
                    <Button variant="secondary" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
                ) : phone && (
                    <Button variant="secondary" icon={Phone} href={`tel:${phone}`}>Call</Button>
                )}
                <Button variant="quiet" icon={X} className="lc-cl-bk__cancel" onClick={() => onCancel(booking)}>Cancel booking</Button>
            </div>
        </article>
    )
}

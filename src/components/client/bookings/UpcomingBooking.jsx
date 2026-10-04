import { CalendarClock, Globe2, House, MessageCircle, Navigation, Phone, Video, X } from 'lucide-react'
import { Button } from '../../ui'
import { BookingTicket } from '../../booking/sheet/BookingTicket'
import { AddToCalendar } from '../../booking/AddToCalendar'
import { whatsappLink } from '../../../services/business'
import { parseDateKey, toMinutes } from '../../../services/dates'
import { bookingPrice, canChange, monthShort } from '../../../services/booking'
import { clock } from '../../../services/hours'
import { whenLabel } from '../NextBooking'
import { PaidRule, ReceiptLinks } from './PaymentNote'
import { LiveTrip } from './LiveTrip'
import { paidQuote } from '../../../services/payments'
import { isHomeVisit, isOnlineBooking, joinLink, visitPlace, yourTime } from '../../../services/formats'
import '../../../styles/client/client-bookings.css'
import '../../../styles/client/formats.css'

const mapsLink = (address, city) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`

const movedLabel = (value) => {
    const [dateKey, time] = String(value).split(/[T ]/)
    const date = parseDateKey(dateKey)
    if (!date) return null
    return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${date.getDate()} ${monthShort(date)} at ${(time || '').slice(0, 5)}`
}

export const UpcomingBooking = ({ booking, token = null, lead = false, focused = false, onCancel, onMove }) => {
    const business = booking.businesses || {}
    const service = { ...booking.services, duration_minutes: booking.duration_minutes || booking.services?.duration_minutes, price: bookingPrice(booking) }
    const minutes = toMinutes(booking.appointment_time)
    const confirmed = booking.status === 'confirmed'
    const whatsapp = whatsappLink(business.whatsapp, `Hi ${business.business_name}, about my booking on ${booking.appointment_date} at ${clock(minutes)}: `)
    const phone = business.phone?.replace(/\s+/g, '')
    const open = canChange(booking)
    const moved = booking.rescheduled_from ? movedLabel(booking.rescheduled_from) : null
    const quote = paidQuote(booking)
    const online = isOnlineBooking(booking)
    const join = joinLink(booking)
    const home = isHomeVisit(booking)
    const homePlace = home ? visitPlace(booking) : ''
    const theirTime = online ? yourTime({ dateKey: booking.appointment_date, minutes, timeZone: business.timezone || 'Europe/Lisbon' }) : null

    return (
        <article id={`booking-${booking.id}`} className={`lc-cl-bk${lead ? ' is-lead' : ''}${focused ? ' is-focus' : ''}`}>
            <p className="lc-cl-bk__when">
                <b>{whenLabel(booking.appointment_date)}</b>
                <span>{confirmed ? 'Confirmed' : 'Waiting for the business to confirm'}</span>
            </p>
            <BookingTicket
                business={business}
                service={service}
                dateKey={booking.appointment_date}
                minutes={minutes}
                stamp={confirmed ? 'Confirmed' : 'Pending'}
                stampTone={confirmed ? 'success' : 'signal'}
                quote={quote}
                paid={Boolean(quote)}
                mode={booking.mode}
                travel={booking.travel_fee}
                zone={booking.client_zone}
            />
            {home && (
                <p className="lc-fmt-zone">
                    <House size={15} aria-hidden="true" />
                    <span>
                        {homePlace ? <>{business.business_name} comes to <b>{homePlace}</b>.</> : `${business.business_name} comes to you.`}
                        {booking.client_landmark ? ` ${booking.client_landmark}` : ''}
                    </span>
                </p>
            )}
            {home && confirmed && <LiveTrip booking={booking} token={token} business={business} />}
            {online && (
                <p className="lc-fmt-zone">
                    {join ? <Video size={15} aria-hidden="true" /> : <Globe2 size={15} aria-hidden="true" />}
                    <span>
                        {join ? 'Join from this booking a few minutes before it starts.' : confirmed ? `${business.business_name} sends the join link before it starts.` : 'The join link arrives once the business confirms.'}
                        {theirTime && <> For you it starts at <b>{theirTime}</b>.</>}
                    </span>
                </p>
            )}
            <PaidRule booking={booking} />
            <ReceiptLinks booking={booking} />
            {moved && <p className="lc-cl-bk__moved">Moved from {moved}</p>}
            {booking.notes?.trim() && <p className="lc-cl-bk__note"><b>Your note:</b> {booking.notes.trim()}</p>}
            <div className="lc-cl-bk__actions">
                {join && (
                    <Button icon={Video} href={join} target="_blank" rel="noopener noreferrer">Join online</Button>
                )}
                {!online && !home && business.address?.trim() && (
                    <Button variant="secondary" icon={Navigation} href={mapsLink(business.address, business.city)} target="_blank" rel="noopener noreferrer">Directions</Button>
                )}
                {whatsapp ? (
                    <Button variant="secondary" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
                ) : phone && (
                    <Button variant="secondary" icon={Phone} href={`tel:${phone}`}>Call</Button>
                )}
                {open && booking.services?.id && (
                    <Button variant="secondary" icon={CalendarClock} onClick={() => onMove(booking)}>Change time</Button>
                )}
                {open ? (
                    <Button variant="quiet" icon={X} className="lc-cl-bk__cancel" onClick={() => onCancel(booking)}>Cancel booking</Button>
                ) : (
                    <p className="lc-cl-bk__late">Too late to change online. Message {business.business_name} if your plans change.</p>
                )}
            </div>
            {confirmed && (
                <AddToCalendar
                    compact
                    booking={{
                        id: booking.id,
                        title: `${booking.services?.service_name || 'Booking'} at ${business.business_name}`,
                        dateKey: booking.appointment_date,
                        minutes,
                        duration: service.duration_minutes,
                        timeZone: business.timezone,
                        location: online ? join || 'Online' : home ? homePlace : [business.address, business.city].filter(Boolean).join(', '),
                        details: business.whatsapp || business.phone ? `${business.business_name}: ${business.whatsapp || business.phone}` : '',
                    }}
                />
            )}
        </article>
    )
}

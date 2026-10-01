import { Store } from 'lucide-react'
import { DurationDial } from '../../business/DurationDial'
import { fullAddress } from '../../business/public/PublicFind'
import { durationLabel, menuPrice } from '../../../services/business'
import { parseDateKey } from '../../../services/dates'
import { clock } from '../../../services/hours'
import '../../../styles/client/booking-sheet.css'

const hasPrice = (price) => String(price ?? '').trim() !== '' && !Number.isNaN(Number(String(price).replace(',', '.')))

// Booking is free and nothing is charged online: a priced visit is paid at the place. Free services say nothing.
const paidAtVisit = (price) => !hasPrice(price) || Number(String(price).replace(',', '.')) > 0

export const BookingTicket = ({ business, service, dateKey, minutes, stamp, stampTone = 'signal', pay = true }) => {
    const date = parseDateKey(dateKey)
    const duration = Number(service.duration_minutes) || 0
    const meta = [duration ? durationLabel(duration) : null, hasPrice(service.price) ? menuPrice(service.price) : null].filter(Boolean).join(', ')
    return (
        <div className={`lc-bk-ticket${stamp ? ' is-stamped' : ''}`}>
            <div className="lc-bk-ticket__main">
                <p className="lc-bk-ticket__date">
                    <span className="lc-bk-ticket__wd">{date.toLocaleDateString('en-GB', { weekday: 'long' })}</span>
                    <span className="lc-bk-ticket__day">{date.getDate()}</span>
                    <span className="lc-bk-ticket__mon">{date.toLocaleDateString('en-GB', { month: 'long' })}</span>
                </p>
                <div className="lc-bk-ticket__info">
                    <p className="lc-bk-ticket__time">
                        <b>{clock(minutes)}</b>
                        {duration > 0 && <span> to {clock(minutes + duration)}</span>}
                    </p>
                    <p className="lc-bk-ticket__svc">
                        <DurationDial minutes={duration} size={18} />
                        <span>{service.service_name.trim()}</span>
                    </p>
                    {meta && <p className="lc-bk-ticket__meta">{meta}</p>}
                </div>
            </div>
            <div className="lc-bk-ticket__stub">
                <span className="lc-bk-ticket__biz">{business.business_name}</span>
                {business.address?.trim() && <span className="lc-bk-ticket__addr">{fullAddress(business.address, business.city)}</span>}
                {pay && paidAtVisit(service.price) && <span className="lc-bk-ticket__pay"><Store size={12} aria-hidden="true" />Pay at your visit</span>}
                {stamp && <span className={`lc-bk-ticket__stamp is-${stampTone}`}>{stamp}</span>}
            </div>
        </div>
    )
}

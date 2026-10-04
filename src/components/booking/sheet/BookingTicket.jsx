import { CircleCheck, CreditCard, House, Store, Video } from 'lucide-react'
import { DurationDial } from '../../business/DurationDial'
import { fullAddress } from '../../business/public/PublicFind'
import { durationLabel, menuPrice } from '../../../services/business'
import { parseDateKey } from '../../../services/dates'
import { clock } from '../../../services/hours'
import { payMoney, payWith } from '../../../services/payments'
import '../../../styles/client/booking-sheet.css'
import '../../../styles/client/pay.css'
import '../../../styles/client/formats.css'

const hasPrice = (price) => String(price ?? '').trim() !== '' && !Number.isNaN(Number(String(price).replace(',', '.')))

// The total line says how the booking is paid. Paid online, it is a small receipt: the price, the
// service fee, then the total as the loudest figure after the time.
const OnlineTotal = ({ quote, paid }) => (
    <>
        <dl className="lc-bk-quote">
            <div><dt>Price</dt><dd>{payMoney(quote.price, quote.currency, true)}</dd></div>
            {Number(quote.travel_fee) > 0 && <div><dt>Travel to you</dt><dd>{payMoney(quote.travel_fee, quote.currency, true)}</dd></div>}
            {Number(quote.client_fee) > 0 && <div><dt>Service fee</dt><dd>{payMoney(quote.client_fee, quote.currency, true)}</dd></div>}
        </dl>
        <div className={`lc-bk-ticket__total${paid ? ' is-paid' : ''}`}>
            <span className="lc-bk-ticket__how">
                {paid ? <CircleCheck size={15} aria-hidden="true" /> : <CreditCard size={14} aria-hidden="true" />}
                {paid ? 'Paid online' : `Pay now ${payWith(quote)}`}
            </span>
            <b className="lc-bk-ticket__price">{payMoney(quote.total, quote.currency, true)}</b>
        </div>
    </>
)

export const BookingTicket = ({ business, service, dateKey, minutes, stamp, stampTone = 'signal', pay = true, quote = null, paid = false, mode = 'at_business', travel = 0, zone = '' }) => {
    const date = parseDateKey(dateKey)
    const duration = Number(service.duration_minutes) || 0
    const priced = hasPrice(service.price)
    const owed = !priced || Number(String(service.price).replace(',', '.')) > 0
    const payHere = pay && owed
    const online = pay && quote?.online
    const travelFee = mode === 'at_client' ? Number(travel) || 0 : 0
    const priceNumber = Number(String(service.price).replace(',', '.')) || 0
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
                    <p className="lc-bk-ticket__svc">{service.service_name.trim()}</p>
                    {duration > 0 && (
                        <p className="lc-bk-ticket__dur">
                            <DurationDial minutes={duration} size={18} />
                            <span>{durationLabel(duration)}</span>
                        </p>
                    )}
                </div>
            </div>
            <div className="lc-bk-ticket__stub">
                <span className="lc-bk-ticket__biz">{business.business_name}</span>
                {mode === 'online' && <span className="lc-bk-ticket__addr lc-fmt-online"><Video size={14} aria-hidden="true" />Online session</span>}
                {mode === 'at_client' && <span className="lc-bk-ticket__addr lc-fmt-online"><House size={14} aria-hidden="true" />At your place{zone ? `, ${zone}` : ''}</span>}
                {mode !== 'online' && mode !== 'at_client' && business.address?.trim() && <span className="lc-bk-ticket__addr">{fullAddress(business.address, business.city)}</span>}
                {stamp && <span className={`lc-bk-ticket__stamp is-${stampTone}`}>{stamp}</span>}
            </div>
            {!online && travelFee > 0 && (
                <dl className="lc-bk-quote">
                    <div><dt>Price</dt><dd>{menuPrice(service.price)}</dd></div>
                    <div><dt>Travel to you</dt><dd>{menuPrice(travelFee)}</dd></div>
                </dl>
            )}
            {online ? <OnlineTotal quote={quote} paid={paid} /> : (priced || payHere) && (
                <div className="lc-bk-ticket__total">
                    <span className="lc-bk-ticket__how">
                        {payHere ? <><Store size={14} aria-hidden="true" />{mode === 'online' ? 'Pay the business directly' : 'Pay at your visit'}</> : 'Price'}
                    </span>
                    {priced && <b className="lc-bk-ticket__price">{menuPrice(priceNumber + travelFee)}</b>}
                </div>
            )}
        </div>
    )
}

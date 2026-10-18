import { BusinessMark } from '../../brand/BusinessFace'
import CityPattern from '../../brand/CityPattern'
import { patternOf } from '../../brand/world'
import { DurationDial } from '../../business/DurationDial'
import { durationLabel, shownPrice } from '../../../services/business'
import '../../../styles/client/booking-sheet.css'

// Where you are booking, before when: the business's logo or tile under a strap of its world, then the
// service being booked with its time and price. The price and the dial keep the core palette; the world
// lives only in the strap.
export const SheetHead = ({ business, service, duration, currency, priced }) => {
    const world = patternOf(business)
    const area = [business.neighbourhood?.trim(), business.city].filter(Boolean).join(', ')
    return (
        <div className={`lc-bk-head is-${world}`}>
            <span className="lc-bk-head__strap" aria-hidden="true"><CityPattern world={world} centred size={16} /></span>
            <div className="lc-bk-head__biz">
                <span className="lc-bk-head__mark" aria-hidden="true"><BusinessMark business={business} /></span>
                <span className="lc-bk-head__who">
                    <b>{business.business_name}</b>
                    {area && <span>{area}</span>}
                </span>
            </div>
            <div className="lc-bk-service">
                <DurationDial minutes={duration} size={32} />
                <span className="lc-bk-service__text">
                    <span className="lc-bk-service__name">{service.service_name.trim()}</span>
                    <span className="lc-bk-service__meta">{durationLabel(duration)} at {business.business_name}</span>
                </span>
                {priced && <span className="lc-bk-service__price">{shownPrice(service.price, currency)}</span>}
            </div>
        </div>
    )
}

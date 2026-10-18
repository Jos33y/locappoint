import { useState } from 'react'
import { Bell, CalendarPlus } from 'lucide-react'
import CityPattern from '../../components/brand/CityPattern'
import { OwnerPhone, daylightOf } from './home/Drawings'
import Ticket from './home/Ticket'
import { CITY_SAMPLE } from './home/content'
import { SAMPLE_PAGES } from '../../constants/sampleBusiness'

// The app on two phones, in the visitor's city: a client holding the ticket for a booking, and the
// business that booking just landed with. Drawn from the same pieces as the home page, never screenshots.

// One booking seen from both sides: the business, service and price from the city's example page,
// the people from the home page's story.
export const citySample = (code) => {
    const page = SAMPLE_PAGES[code] || SAMPLE_PAGES.porto
    const first = page.services[0]
    return {
        ...(CITY_SAMPLE[code] || CITY_SAMPLE.porto),
        service: first.service_name,
        price: Number(first.price),
        business: page.business.business_name,
        area: page.business.neighbourhood,
        currency: page.business.currency,
    }
}

const ClientPhone = ({ city, sample, daylight }) => (
    <div className={`lc-home-phone lc-dl-client is-${daylight.light}`} aria-hidden="true">
        <div className="lc-home-phone__screen">
            <div className="lc-home-phone__bar"><span>{daylight.clock}</span><i /></div>
            <p className="lc-home-phone__hello">See you at 15:30</p>
            <p className="lc-home-phone__day">Your booking</p>
            <Ticket
                city={city}
                sample={{ service: sample.service }}
                day="Today"
                time="15:30"
                who={sample.business}
                where={sample.area}
                tileName={sample.business}
                className="lc-dl-client__ticket"
            />
            <p className="lc-dl-client__remind"><Bell size={14} />We remind you at 13:30</p>
            <span className="lc-dl-client__btn"><CalendarPlus size={16} />Add to calendar</span>
        </div>
    </div>
)

export const AppStage = ({ city, world = city, light = false }) => {
    // The visitor's own hour sets the light on both screens, chosen once at load.
    const [daylight] = useState(() => daylightOf())
    const sample = citySample(city)
    return (
        <div className={`lc-dl-stage is-${city}${light ? ' is-light' : ''}`} role="img" aria-label={`The Locappoint app: ${sample.client}'s booking at ${sample.business}, and the same booking arriving on the business's phone`}>
            <span className="lc-dl-stage__wall" aria-hidden="true"><CityPattern world={world} centred /></span>
            <div className="lc-dl-stage__phone is-client">
                <ClientPhone city={world} sample={sample} daylight={daylight} />
            </div>
            <div className="lc-dl-stage__phone is-owner">
                <OwnerPhone sample={sample} currency={sample.currency} daylight={daylight} greeting={`${daylight.greeting}, ${sample.owner}`} />
            </div>
        </div>
    )
}

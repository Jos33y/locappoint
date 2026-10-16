import { PhoneFrame } from '../../components/ui'
import CityPattern from '../../components/brand/CityPattern'
import BusinessTile from '../../components/brand/BusinessTile'
import { PublicPageView } from '../../components/business/PublicPageView'
import { categoryLabel } from '../../constants/categories'
import { PT_MUNICIPALITIES } from '../../constants/locations'
import { SAMPLE_PAGES } from '../../constants/sampleBusiness'
import { savedCity } from '../../services/engine'
import Ticket from '../app/home/Ticket'

const WORLDS = ['porto', 'lagos', 'lisbon']
const GROUP_WORLD = { 'Greater Porto': 'porto', 'Greater Lisbon': 'lisbon' }

// Which city's world a business lives in: its own city when it is one of ours (or next to one),
// otherwise the city the visitor picked in the header.
export const worldOf = ({ city, country } = {}) => {
    const name = String(city || '').trim()
    if (country === 'NG' || name.toLowerCase() === 'lagos') return 'lagos'
    const group = PT_MUNICIPALITIES.find((m) => m.value === name)?.group
    if (GROUP_WORLD[group]) return GROUP_WORLD[group]
    const saved = savedCity()
    return WORLDS.includes(saved) ? saved : 'porto'
}

// The city's pattern behind the phone. Still: it sets the place, it does not perform.
export const CityWall = ({ world, className = '' }) => (
    <span className={`lc-wall is-${world} ${className}`.trim()} aria-hidden="true">
        <CityPattern city={world} centred />
    </span>
)

// Before an owner has a page: a business like theirs in their city, drawn by the real public page,
// and the ticket its client keeps. Labelled as an example, never as a booking that happened.
export const ExamplePage = ({ world }) => {
    const sample = SAMPLE_PAGES[world] || SAMPLE_PAGES.porto
    const { business, services, week } = sample
    const first = services[0]
    return (
        <figure className="lc-example" aria-label={`Example: how a ${categoryLabel(business.category).toLowerCase()} page looks on Locappoint`}>
            <figcaption className="lc-example__cap">How your page will look</figcaption>
            <div className="lc-example__stage" aria-hidden="true">
                <PhoneFrame label="Example booking page">
                    <PublicPageView business={business} services={services} week={week} preview />
                </PhoneFrame>
                <Ticket
                    city={world}
                    sample={{ service: first.service_name, price: Number(first.price) }}
                    currency={business.currency}
                    who={business.business_name}
                    where={business.neighbourhood}
                    tileName={business.business_name}
                    className="lc-example__ticket"
                />
            </div>
        </figure>
    )
}

// The go-live card: the owner's tile (or logo) on their city's pattern (or cover), their name and
// where they are, stamped Live once. It is the card the founding number joins later.
export const GoLiveCard = ({ business, world, children }) => {
    const where = [categoryLabel(business.category, business.category_detail), [business.neighbourhood?.trim(), business.city].filter(Boolean).join(', ')]
        .filter(Boolean).join(' in ')
    return (
        <div className={`lc-golive is-${world}`}>
            <div className="lc-golive__band" aria-hidden="true">
                {business.banner_url ? <img src={business.banner_url} alt="" /> : <CityPattern city={world} centred />}
            </div>
            <div className="lc-golive__body">
                <span className="lc-golive__badge" aria-hidden="true">
                    {business.logo_url
                        ? <img src={business.logo_url} alt="" />
                        : <BusinessTile name={business.business_name} city={world} className="lc-golive__tile" />}
                </span>
                <span className="lc-golive__stamp">Live</span>
                <h2 className="lc-golive__name">{business.business_name}</h2>
                {where && <p className="lc-golive__where">{where}</p>}
                {children}
            </div>
        </div>
    )
}

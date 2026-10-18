import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, RotateCw } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import CityPattern from '../../components/brand/CityPattern'
import { BusinessCover, BusinessMark } from '../../components/brand/BusinessFace'
import { Button } from '../../components/ui'
import { PlaceResult } from '../../components/client/find/PlaceResult'
import { EngineBox } from '../../components/client/find/EngineBox'
import { useFirstTimes } from '../../components/business/public/nextFree'
import { loadPlaces } from '../../services/booking'
import { askedHere } from '../../services/demand'
import { zonedNow } from '../../services/business'
import { clock, weekFromRows } from '../../services/hours'
import { useAuth } from '../../hooks/useAuth'
import { inCountry } from '../../services/cohort'
import { COUNTRY_WORLDS, pickWorld } from '../../components/brand/worlds'
import { PT_MUNICIPALITIES } from '../../constants/locations'
import { categoryLabel } from '../../constants/categories'
import { useCountry } from '../../hooks/useCountry'
import '../../styles/client/find-page.css'
import '../../styles/app/businesses.css'

const SIGN_UP = { pathname: '/auth', state: { tab: 'signup', userType: 'business' } }
const START = { pathname: '/portal', state: null }

const placesText = (n) => (n === 1 ? '1 place' : `${n} places`)
// "Just joined" shows when there is more to see than four cards.
const JOINED = 4

// The country's four worlds as doorways, the view's own world second and tallest but one, and the sun
// (or the moon) at the country's time. Amber is "now".
const Doorways = ({ country }) => {
    const [now, setNow] = useState(() => zonedNow(country.timeZone).minutes)
    useEffect(() => {
        setNow(zonedNow(country.timeZone).minutes)
        const t = setInterval(() => setNow(zonedNow(country.timeZone).minutes), 60000)
        return () => clearInterval(t)
    }, [country.timeZone])
    const four = COUNTRY_WORLDS[country.iso] || []
    const at = Math.max(0, four.indexOf(country.world))
    const worlds = [...four.slice(at), ...four.slice(0, at)]
    const order = [worlds[3], worlds[0], worlds[1], worlds[2]]
    const day = now >= 6 * 60 && now < 19 * 60
    const place = String(country.timeZone || '').split('/').pop().replace(/_/g, ' ')
    return (
        <div className="lc-br-doors" aria-hidden="true">
            <span className={`lc-br-doors__sky${day ? '' : ' is-night'}`}>
                <i />
                <span className="lc-br-doors__time">{`${clock(now)} in ${place}`}</span>
            </span>
            {order.map((w, i) => (
                <span key={w} className={`lc-br-door is-${i}`}><CityPattern world={w} centred size={i === 0 ? 28 : 40} /></span>
            ))}
        </div>
    )
}

// A business that just joined: its cover in its own world, its mark, where it is, and its next free times.
const JoinedCard = ({ place, from }) => {
    const week = useMemo(() => weekFromRows(place.hourRows || []), [place.hourRows])
    const times = useFirstTimes({ businessId: place.id, serviceId: place.firstService, week, timeZone: place.timezone || undefined, skip: place.is_demo })
    const where = [place.locality || place.neighbourhood, place.city].map((x) => String(x || '').trim()).filter(Boolean)
    const meta = [
        categoryLabel(place.category, place.category_detail),
        [...new Set(where)].join(', '),
        place.rating?.count ? place.rating.average.toFixed(1) : 'New',
    ].filter(Boolean)
    return (
        <li className="lc-br-new">
            <Link to={`/${place.slug}`} state={{ from }} className="lc-br-new__link">
                <span className="lc-br-new__cover" aria-hidden="true">
                    <BusinessCover business={place} lazy />
                    <span className="lc-br-new__mark"><BusinessMark business={place} lazy /></span>
                </span>
                <span className="lc-br-new__body">
                    <strong>{place.business_name}</strong>
                    <span className="lc-br-new__meta">{meta.join(' · ')}</span>
                    {times && (
                        <span className="lc-br-new__times" aria-label={`Free ${times.day.toLowerCase()} at ${times.list.join(', ')}`}>
                            {times.day !== 'Today' && <span className="lc-br-new__day">{times.day}</span>}
                            {times.list.map((t) => <span key={t} className="lc-br-new__time">{t}</span>)}
                        </span>
                    )}
                </span>
            </Link>
        </li>
    )
}

// Where people asked for a trade and nobody here offers it: the top one said, the rest listed.
const Asked = ({ rows, country, join }) => {
    const top = rows[0]
    const label = (r) => categoryLabel(r.category)
    const world = pickWorld({ id: `place|${top.zone}`, city: top.zone, country: country.iso }, { municipalities: PT_MUNICIPALITIES })
    return (
        <section className="lc-br-asked" aria-labelledby="lc-br-asked-title">
            <div className="lc-br-asked__text">
                <p className="lc-br-asked__eyebrow">Asked for this week, not here yet</p>
                <h2 id="lc-br-asked-title">{`${label(top)} in ${top.zone}`}</h2>
                <p className="lc-br-asked__lede">{`${top.searches} searches, nobody to book.`}</p>
                {join && <Button to={join.pathname} state={join.state} iconRight={ArrowRight}>List your business</Button>}
            </div>
            <div className="lc-br-asked__side">
                <span className="lc-br-asked__world" aria-hidden="true"><CityPattern world={world} centred size={36} /></span>
                <ul className="lc-br-asked__list">
                    {rows.map((r) => (
                        <li key={`${r.zone}|${r.category}`}><span>{`${label(r)}, ${r.zone}`}</span><b>{r.searches}</b></li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

const JoinCard = ({ join, world, wide = false }) => (
    <li className={`lc-br-join${wide ? ' is-wide' : ''}`}>
        <Link to={join.pathname} state={join.state} className="lc-br-join__link">
            <span className="lc-br-join__cover" aria-hidden="true">
                <CityPattern world={world} centred />
                <span className="lc-br-join__logo"><Plus size={18} /></span>
            </span>
            <span className="lc-br-join__body">
                <strong>{wide ? 'Be the first place people can book here' : 'Your business here'}</strong>
                <span>Free during the beta. No card, no subscription.</span>
                <span className="lc-br-join__cta">Get your booking page <ArrowRight size={14} aria-hidden="true" /></span>
            </span>
        </Link>
    </li>
)

const Businesses = () => {
    const [state, setState] = useState({ status: 'loading', places: [] })
    const [attempt, setAttempt] = useState(0)
    const [asked, setAsked] = useState([])
    const { user, hasBusiness } = useAuth()
    const join = user ? START : SIGN_UP
    // The country picked in the header (or in More options): only its places are listed.
    const [market] = useCountry()

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, status: 'loading' }))
        loadPlaces()
            .then((places) => { if (!cancelled) setState({ status: 'ready', places }) })
            .catch((err) => {
                console.error('Places failed:', err)
                if (!cancelled) setState({ status: 'error', places: [] })
            })
        return () => { cancelled = true }
    }, [attempt])

    useEffect(() => {
        let cancelled = false
        setAsked([])
        askedHere(market.iso).then((rows) => { if (!cancelled) setAsked(rows) })
        return () => { cancelled = true }
    }, [market.iso])

    const ready = state.status === 'ready'
    const places = useMemo(() => state.places.filter((p) => inCountry(p, market.code)), [state.places, market.code])
    // Newest first, real ones only: a demo never "just joined".
    const joined = useMemo(() => places.filter((p) => !p.is_demo).slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, JOINED), [places])
    // A country with nothing live yet says it is opening.
    const open = !(ready && places.length === 0)

    return (
        <div className="lc-br">
            <AppHeader />

            {/* The country first: the search, and its four worlds as doorways at its own time of day. */}
            <section className={`lc-br-top is-${market.code}`}>
                <div className="lc-br-top__inner">
                    <div className="lc-br-top__text">
                        <h1 className="lc-br-hero__title">{open ? 'The good ones near you, with the real free times.' : `${market.name} is opening on Locappoint.`}</h1>
                        {!open && <p className="lc-br-hero__lede">Set up your booking page now. Bookings open as the first businesses go live.</p>}
                        <EngineBox title="What do you need?" browseTo="/businesses" compact bare />
                    </div>
                    <Doorways country={market} />
                </div>
            </section>

            <main className="lc-br__main">
                {ready && places.length > JOINED && joined.length === JOINED && (
                    <section className="lc-br-joined" aria-labelledby="lc-br-joined-title">
                        <div className="lc-br-places__head">
                            <h2 id="lc-br-joined-title">{`Just joined, across ${market.name}`}</h2>
                            <a className="lc-br-seeall" href="#lc-br-places-title">{`See all ${places.length}`}</a>
                        </div>
                        <ul className="lc-br-joined__list">
                            {joined.map((place) => <JoinedCard key={place.id} place={place} from="/businesses" />)}
                        </ul>
                    </section>
                )}

                {asked.length > 0 && <Asked rows={asked} country={market} join={hasBusiness ? null : join} />}

                <section className="lc-br-places" aria-labelledby="lc-br-places-title">
                    <div className="lc-br-places__head">
                        <h2 id="lc-br-places-title">{ready && places.length === 0 ? `Opening soon in ${market.name}` : `Taking bookings in ${market.name}`}</h2>
                        {ready && places.length > 0 && <p>{placesText(places.length)}</p>}
                    </div>

                    {state.status === 'loading' && (
                        <ul className="lc-cl-results" aria-hidden="true">
                            {[0, 1, 2].map((i) => (
                                <li key={i} className="lc-cl-result is-skeleton">
                                    <span className="lc-skel" style={{ height: 96, borderRadius: 0 }} />
                                    <span className="lc-cl-result__body">
                                        <span className="lc-skel" style={{ width: '60%', height: 16 }} />
                                        <span className="lc-skel" style={{ width: '40%', height: 12 }} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {state.status === 'error' && (
                        <div className="lc-br-error" role="alert">
                            <p>We could not load the places. Check your connection and try again.</p>
                            <Button variant="secondary" icon={RotateCw} onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
                        </div>
                    )}

                    {ready && (
                        <ul className="lc-cl-results">
                            {places.map((place) => <PlaceResult key={place.id} place={place} from="/businesses" />)}
                            {!hasBusiness && <JoinCard join={join} world={market.world} wide={places.length === 0} />}
                        </ul>
                    )}
                </section>

                {!hasBusiness && open && asked.length === 0 && (
                    <section className="lc-br-cta">
                        <h2>Run a business in {market.name}?</h2>
                        <p>Get your own booking page on Locappoint. Free during the beta.</p>
                        <div className="lc-br-cta__buttons">
                            <Button to={join.pathname} state={join.state} iconRight={ArrowRight}>Get your booking page</Button>
                            <Button to="/partnership" variant="secondary">Apply as a partner</Button>
                        </div>
                    </section>
                )}
            </main>

            {/* The country's four worlds, end to end, above the footer. */}
            <span className="lc-br-strip" aria-hidden="true">
                {(COUNTRY_WORLDS[market.iso] || []).map((w) => <CityPattern key={w} world={w} centred size={20} />)}
            </span>
            <AppFooter />
        </div>
    )
}

export default Businesses

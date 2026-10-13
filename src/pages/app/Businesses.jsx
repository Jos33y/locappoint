import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, RotateCw } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import StreetGridCover from '../../components/business/StreetGridCover'
import { Button } from '../../components/ui'
import { PlaceResult } from '../../components/client/find/PlaceResult'
import { EngineBox } from '../../components/client/find/EngineBox'
import { loadPlaces } from '../../services/booking'
import { useAuth } from '../../hooks/useAuth'
import { CITIES, COHORT_SIZE, inMarket } from '../../services/cohort'
import { useCity } from '../../hooks/useCity'
import '../../styles/client/find-page.css'
import '../../styles/app/businesses.css'

const SIGN_UP = { pathname: '/auth', state: { tab: 'signup', userType: 'business' } }
const START = { pathname: '/portal', state: null }

const placesText = (n) => (n === 1 ? '1 place' : `${n} places`)

const CohortSlots = ({ filled }) => (
    <svg className="lc-br-slots" viewBox={`0 0 ${COHORT_SIZE * 28 - 6} 30`} aria-hidden="true">
        {Array.from({ length: COHORT_SIZE }, (_, i) => (
            <rect
                key={i}
                className={i < filled ? 'is-filled' : i === filled ? 'is-next' : ''}
                x={i * 28 + 0.75}
                y="0.75"
                width="20.5"
                height="28.5"
                rx="5"
            />
        ))}
    </svg>
)

const JoinCard = ({ join, wide = false }) => (
    <li className={`lc-br-join${wide ? ' is-wide' : ''}`}>
        <Link to={join.pathname} state={join.state} className="lc-br-join__link">
            <span className="lc-br-join__cover" aria-hidden="true">
                <StreetGridCover seed="your-business" tint="azure" />
                <span className="lc-br-join__logo"><Plus size={18} /></span>
            </span>
            <span className="lc-br-join__body">
                <strong>{wide ? 'Be the first place people can book here' : 'Your business here'}</strong>
                <span>Free during the beta. Set up takes about ten minutes.</span>
                <span className="lc-br-join__cta">Get your booking page <ArrowRight size={14} aria-hidden="true" /></span>
            </span>
        </Link>
    </li>
)

const Businesses = () => {
    const [state, setState] = useState({ status: 'loading', places: [] })
    const [attempt, setAttempt] = useState(0)
    const { user, hasBusiness } = useAuth()
    const join = user ? START : SIGN_UP
    // The city picked in the header (or here): only its places are listed.
    const [market, pickMarket] = useCity()

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

    const ready = state.status === 'ready'
    const counts = useMemo(() => CITIES.map((c) => state.places.filter((p) => inMarket(p, c.market)).length), [state.places])
    const places = useMemo(() => state.places.filter((p) => inMarket(p, market.code)), [state.places, market.code])
    const first = places.length
    const cohortOpen = first < COHORT_SIZE
    const open = market.live

    return (
        <div className="lc-br">
            <AppHeader />

            <main className="lc-br__main">
                <section className="lc-br-hero">
                    <div className="lc-br-hero__text">
                        <p className="lc-br-hero__kicker">{market.name}, {open ? 'first cohort' : 'opening soon'}</p>
                        <h1 className="lc-br-hero__title">{open ? `Book the first businesses in ${market.name}.` : `${market.name} is opening on Locappoint.`}</h1>
                        <p className="lc-br-hero__lede">
                            {open
                                ? `A first group of ten ${market.name} businesses taking bookings through Locappoint. Pick a place, choose a time and you are booked in under a minute.`
                                : `Businesses in ${market.name} can set up their booking page now. Bookings open as the first ones go live.`}
                        </p>
                    </div>

                    <div className="lc-br-count" aria-live="polite">
                        {ready ? (
                            <>
                                <p className="lc-br-count__figure">
                                    <b>{first}</b>
                                    {cohortOpen && <span>of {COHORT_SIZE}</span>}
                                </p>
                                <p className="lc-br-count__label">
                                    {cohortOpen
                                        ? `${first === 1 ? 'place' : 'places'} taking bookings in ${market.name}`
                                        : `places taking bookings in ${market.name}. The first cohort is full.`}
                                </p>
                                {cohortOpen && <CohortSlots filled={first} />}
                            </>
                        ) : (
                            <>
                                <span className="lc-skel" style={{ width: 96, height: 44 }} />
                                <span className="lc-skel" style={{ width: '70%', height: 12 }} />
                                <span className="lc-skel" style={{ width: '100%', height: 30 }} />
                            </>
                        )}
                    </div>
                </section>

                <EngineBox title="What do you need, and when?" browseTo="/businesses" />

                <ul className="lc-br-cities" aria-label="Cities">
                    {CITIES.map((city, i) => {
                        const n = counts[i]
                        const live = ready && n > 0
                        const here = city.market === market.code
                        return (
                            <li key={city.name} className={`lc-br-city${live ? ' is-live' : ''}${here ? ' is-here' : ''}`}>
                                <button type="button" className="lc-br-city__pick" onClick={() => pickMarket(city.market)} aria-pressed={here}>
                                    <strong>{city.name}</strong>
                                    <span><i aria-hidden="true" />{live ? placesText(n) : city.later}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>

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
                            {!hasBusiness && <JoinCard join={join} wide={places.length === 0} />}
                        </ul>
                    )}
                </section>

                {!hasBusiness && !(ready && places.length === 0) && (
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

            <AppFooter />
        </div>
    )
}

export default Businesses

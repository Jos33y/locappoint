import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, RotateCw } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import CityPattern from '../../components/brand/CityPattern'
import { Button } from '../../components/ui'
import { PlaceResult } from '../../components/client/find/PlaceResult'
import { EngineBox } from '../../components/client/find/EngineBox'
import { loadPlaces } from '../../services/booking'
import { useAuth } from '../../hooks/useAuth'
import { inCountry } from '../../services/cohort'
import { COUNTRIES } from '../../services/engine'
import { COUNTRY_WORLDS } from '../../components/brand/worlds'
import { categoryLabel } from '../../constants/categories'
import { useCountry } from '../../hooks/useCountry'
import '../../styles/client/find-page.css'
import '../../styles/app/businesses.css'

const SIGN_UP = { pathname: '/auth', state: { tab: 'signup', userType: 'business' } }
const START = { pathname: '/portal', state: null }

const placesText = (n) => (n === 1 ? '1 place' : `${n} places`)

// What is here, said from the real list: "Barbershops and nail studios", never a promise the city cannot keep.
const tradesIn = (places) => {
    const names = [...new Set(places.map((p) => categoryLabel(p.category, p.category_detail)).filter(Boolean))]
    if (names.length === 0) return ''
    const plural = (n) => (/(s|sh|ch|x)$/i.test(n) ? `${n}es` : /y$/i.test(n) && !/[aeiou]y$/i.test(n) ? `${n.slice(0, -1)}ies` : `${n}s`)
    const list = names.slice(0, 3).map((n, i) => (i === 0 ? plural(n) : plural(n).toLowerCase()))
    return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
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
    const { user, hasBusiness } = useAuth()
    const join = user ? START : SIGN_UP
    // The country picked in the header (or here): only its places are listed.
    const [market, pickMarket] = useCountry()

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
    const counts = useMemo(() => COUNTRIES.map((c) => state.places.filter((p) => inCountry(p, c.code)).length), [state.places])
    const places = useMemo(() => state.places.filter((p) => inCountry(p, market.code)), [state.places, market.code])
    // A country with nothing live yet says it is opening, in the title and the list alike.
    const open = !(ready && places.length === 0)
    const trades = tradesIn(places)

    return (
        <div className="lc-br">
            <AppHeader />

            <main className="lc-br__main">
                {/* The country first: one of its worlds across the top, its name in the title, and what is really here. */}
                <section className={`lc-br-hero is-${market.code}${market.light ? ' is-light' : ''}`}>
                    <span className="lc-br-hero__band" aria-hidden="true"><CityPattern world={market.world} centred size={32} /></span>
                    <div className="lc-br-hero__text">
                        <h1 className="lc-br-hero__title">{open ? `Book a free time in ${market.name}.` : `${market.name} is opening on Locappoint.`}</h1>
                        <p className="lc-br-hero__lede">
                            {!open
                                ? `Businesses in ${market.name} can set up their booking page now. Bookings open as the first ones go live.`
                                : ready && trades
                                    ? `${trades}, with their real free times.`
                                    : 'Real free times, booked in a minute.'}
                        </p>
                    </div>
                </section>

                <EngineBox title="What do you need?" browseTo="/businesses" compact />

                <ul className="lc-br-cities is-countries" aria-label="Countries">
                    {COUNTRIES.map((country, i) => {
                        const n = counts[i]
                        const live = ready && n > 0
                        const here = country.code === market.code
                        return (
                            <li key={country.code} className={`lc-br-city is-${country.code}${live ? ' is-live' : ''}${here ? ' is-here' : ''}`}>
                                <button type="button" className="lc-br-city__pick" onClick={() => pickMarket(country.code)} aria-pressed={here}>
                                    <span className="lc-br-city__strap is-four" aria-hidden="true">{COUNTRY_WORLDS[country.iso].map((w) => <CityPattern key={w} world={w} centred size={20} />)}</span>
                                    <strong>{country.name}</strong>
                                    <span><i aria-hidden="true" />{live ? placesText(n) : ready ? 'Opening soon' : 'Taking bookings'}</span>
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
                            {!hasBusiness && <JoinCard join={join} world={market.world} wide={places.length === 0} />}
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

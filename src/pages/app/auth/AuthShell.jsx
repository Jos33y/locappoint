import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoIcon from '../../../components/LogoIcon'
import { useCohort } from '../../../hooks/useCohort'
import { useCity } from '../../../hooks/useCity'

const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'

// Where the pin on the map sits, for each city taking bookings.
const SPOTS = {
    porto: { lat: '41.16\u00b0 N', lng: '8.63\u00b0 W', geo: '41.1579\u00b0 N \u00b7 8.6291\u00b0 W' },
    lagos: { lat: '6.52\u00b0 N', lng: '3.38\u00b0 E', geo: '6.5244\u00b0 N \u00b7 3.3792\u00b0 E' },
    lisbon: { lat: '38.72\u00b0 N', lng: '9.14\u00b0 W', geo: '38.7223\u00b0 N \u00b7 9.1393\u00b0 W' },
}

const AuthShell = ({
    brandTitle = 'Booking that fills your week, not your DMs.',
    brandSub = 'Local businesses in Porto, Lagos and Lisbon. Free during the beta.',
    audience = 'business',
    back = null,
    children,
}) => {
    const forBusiness = audience === 'business'
    // The visitor's city when it is taking bookings, otherwise Porto, with its map coordinates.
    const [picked] = useCity()
    const city = picked.live ? picked : { code: 'porto', name: 'Porto' }
    const spot = SPOTS[city.code] || SPOTS.porto
    const cohort = useCohort(city.code)
    const backLink = back || { to: HOME_PATH, label: 'Back to home' }

    return (
        <div className="auth-page">
            <aside className="auth-brand" aria-hidden="true">
                <div className="auth-brand__radial"></div>

                <Link to={HOME_PATH} className="auth-brand__wordmark" tabIndex={-1}>
                    <LogoIcon size={28} className="auth-brand__mark" />
                    <span>
                        <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                    </span>
                </Link>

                <div className="auth-brand__copy">
                    <h2 className="auth-brand__title">{brandTitle}</h2>
                    <p className="auth-brand__lede">{brandSub}</p>
                </div>

                <div className="auth-brand__visual">
                    <div className="auth-brand__map">
                        <div className="auth-brand__map-grid"></div>
                        <div className="auth-brand__map-glow"></div>
                        <div className="auth-brand__pin">
                            <div className="auth-brand__pin-ring"></div>
                            <div className="auth-brand__pin-ring auth-brand__pin-ring--outer"></div>
                            <LogoIcon size={56} className="auth-brand__pin-mark" />
                        </div>
                        <span className="auth-brand__tick auth-brand__tick--tl">{spot.lat}</span>
                        <span className="auth-brand__tick auth-brand__tick--tr">{spot.lng}</span>
                    </div>
                    <div className="auth-brand__coords">
                        <span className="auth-brand__coords-geo">{spot.geo}</span>
                        <span className="auth-brand__coords-sep">·</span>
                        <span className="auth-brand__coords-place">{city.name}</span>
                    </div>
                </div>

                {forBusiness && cohort && (
                    <div className="auth-brand__cohort">
                        <div className="auth-brand__cohort-head">
                            <span className="auth-brand__cohort-label">Cohort 1 in {city.name}</span>
                            <span className="auth-brand__cohort-count">
                                <span className="auth-brand__cohort-num">{cohort.count}</span>
                                <span className="auth-brand__cohort-sep">/</span>
                                <span className="auth-brand__cohort-target">{cohort.size}</span>
                            </span>
                        </div>
                        <div className="auth-brand__cohort-bar">
                            <div className="auth-brand__cohort-fill" style={{ width: `${cohort.pct}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="auth-brand__cities">
                    <span className="auth-brand__city">
                        <span className="auth-brand__city-dot auth-brand__city-dot--live"></span>
                        Porto
                    </span>
                    <span className="auth-brand__city">
                        <span className="auth-brand__city-dot auth-brand__city-dot--live"></span>
                        Lagos
                    </span>
                    <span className="auth-brand__city">
                        <span className="auth-brand__city-dot auth-brand__city-dot--live"></span>
                        Lisbon
                    </span>
                </div>
            </aside>

            <main className="auth-form-panel">
                <div className="auth-mobile-top">
                    <Link to={HOME_PATH} className="auth-mobile-top__brand">
                        <LogoIcon size={22} />
                        <span>
                            <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                        </span>
                    </Link>
                </div>

                <Link to={backLink.to} className="auth-back">
                    <ArrowLeft size={14} strokeWidth={2} />
                    <span>{backLink.label}</span>
                </Link>

                {forBusiness && cohort && (
                    <div className="auth-cohort-strip">
                        <span>Cohort 1: {cohort.count} of {cohort.size} businesses live in {city.name}</span>
                    </div>
                )}

                <div className="auth-form-panel__inner">
                    {children}
                </div>

                <p className="auth-form-panel__terms">
                    By continuing, you agree to our{' '}
                    <Link to="/terms">Terms of Service</Link>{' '}and{' '}
                    <Link to="/privacy">Privacy Policy</Link>.
                </p>
            </main>
        </div>
    )
}

export default AuthShell

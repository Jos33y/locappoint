import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoIcon from '../../../components/LogoIcon'

const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'

// Keep in step with the cohort numbers in AppHome Cta.
const COHORT_ONBOARDED = 3
const COHORT_TARGET = 10

const AuthShell = ({
    brandTitle = 'Booking that fills your week, not your DMs.',
    brandSub = 'Local businesses in Porto, Lisbon, and Lagos. Free for the first twelve months.',
    audience = 'business',
    back = null,
    children,
}) => {
    const pct = Math.round((COHORT_ONBOARDED / COHORT_TARGET) * 100)
    const forBusiness = audience === 'business'
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
                        <span className="auth-brand__tick auth-brand__tick--tl">41.16° N</span>
                        <span className="auth-brand__tick auth-brand__tick--tr">8.63° W</span>
                    </div>
                    <div className="auth-brand__coords">
                        <span className="auth-brand__coords-geo">41.1579° N · 8.6291° W</span>
                        <span className="auth-brand__coords-sep">·</span>
                        <span className="auth-brand__coords-place">Porto</span>
                    </div>
                </div>

                {forBusiness && (
                    <div className="auth-brand__cohort">
                        <div className="auth-brand__cohort-head">
                            <span className="auth-brand__cohort-label">Cohort 1 in Porto</span>
                            <span className="auth-brand__cohort-count">
                                <span className="auth-brand__cohort-num">{COHORT_ONBOARDED}</span>
                                <span className="auth-brand__cohort-sep">/</span>
                                <span className="auth-brand__cohort-target">{COHORT_TARGET}</span>
                            </span>
                        </div>
                        <div className="auth-brand__cohort-bar">
                            <div className="auth-brand__cohort-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="auth-brand__cities">
                    <span className="auth-brand__city">
                        <span className="auth-brand__city-dot auth-brand__city-dot--live"></span>
                        Porto
                    </span>
                    <span className="auth-brand__city auth-brand__city--muted">
                        <span className="auth-brand__city-dot auth-brand__city-dot--next"></span>
                        Lisbon next
                    </span>
                    <span className="auth-brand__city auth-brand__city--muted">
                        <span className="auth-brand__city-dot"></span>
                        Lagos later
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

                {forBusiness && (
                    <div className="auth-cohort-strip">
                        <span>Cohort 1: {COHORT_ONBOARDED} of {COHORT_TARGET} businesses onboarded in Porto</span>
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

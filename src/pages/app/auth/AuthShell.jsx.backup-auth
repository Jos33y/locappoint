// src/pages/app/auth/AuthShell.jsx
// Split layout: brand panel left (desktop only), form panel right.
// Brand panel leans into the location metaphor: map grid + pin + coordinates.
// Mobile hides brand panel, shows a slim cohort strip above the form.

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoIcon from '../../../components/LogoIcon'


// Dev preserves app mode through the back-to-home link.
const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'


// Cohort progress mirrors AppHome Cta. Source of truth lives there; keep
// this synced when the cohort number changes.
const COHORT_ONBOARDED = 3
const COHORT_TARGET = 10


const AuthShell = ({
    brandTitle = 'Booking that fills your week, not your DMs.',
    brandSub = 'Local businesses in Lisbon, Porto, and Lagos. Free for the first twelve months.',
    children,
}) => {
    const pct = Math.round((COHORT_ONBOARDED / COHORT_TARGET) * 100)

    return (
        <div className="auth-page">

            {/* Brand panel - desktop only */}
            <aside className="auth-brand" aria-hidden="true">
                <div className="auth-brand__radial"></div>

                <Link to={HOME_PATH} className="auth-brand__wordmark">
                    <LogoIcon size={28} className="auth-brand__mark" />
                    <span>
                        <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                    </span>
                </Link>

                <div className="auth-brand__copy">
                    <h2 className="auth-brand__title">{brandTitle}</h2>
                    <p className="auth-brand__lede">{brandSub}</p>
                </div>

                {/* Location-themed brand visual */}
                <div className="auth-brand__visual">
                    <div className="auth-brand__map">
                        <div className="auth-brand__map-grid"></div>
                        <div className="auth-brand__map-glow"></div>

                        {/* Pin = real brand mark, anchored to center */}
                        <div className="auth-brand__pin">
                            <div className="auth-brand__pin-ring"></div>
                            <div className="auth-brand__pin-ring auth-brand__pin-ring--outer"></div>
                            <LogoIcon size={56} className="auth-brand__pin-mark" />
                        </div>

                        {/* Corner coordinate ticks */}
                        <span className="auth-brand__tick auth-brand__tick--tl">38.74° N</span>
                        <span className="auth-brand__tick auth-brand__tick--tr">9.13° W</span>
                        <span className="auth-brand__tick auth-brand__tick--bl">COHORT 1</span>
                        <span className="auth-brand__tick auth-brand__tick--br">LIVE</span>
                    </div>

                    <div className="auth-brand__coords">
                        <span className="auth-brand__coords-dot"></span>
                        <span className="auth-brand__coords-geo">38.7223° N · 9.1393° W</span>
                        <span className="auth-brand__coords-sep">·</span>
                        <span className="auth-brand__coords-status">LIVE</span>
                    </div>
                </div>

                {/* Cohort progress */}
                <div className="auth-brand__cohort">
                    <div className="auth-brand__cohort-head">
                        <span className="auth-brand__cohort-label">Cohort 1</span>
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

                {/* Cities */}
                <div className="auth-brand__cities">
                    <span className="auth-brand__city">
                        <span className="auth-brand__city-dot auth-brand__city-dot--live"></span>
                        LISBON
                    </span>
                    <span className="auth-brand__city auth-brand__city--muted">
                        <span className="auth-brand__city-dot auth-brand__city-dot--next"></span>
                        PORTO
                    </span>
                    <span className="auth-brand__city auth-brand__city--muted">
                        <span className="auth-brand__city-dot"></span>
                        LAGOS
                    </span>
                </div>
            </aside>


            {/* Form panel */}
            <main className="auth-form-panel">

                {/* Mobile top strip - replaces brand panel on small screens */}
                <div className="auth-mobile-top">
                    <Link to={HOME_PATH} className="auth-mobile-top__brand">
                        <LogoIcon size={22} />
                        <span>
                            <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                        </span>
                    </Link>
                </div>

                <Link to={HOME_PATH} className="auth-back">
                    <ArrowLeft size={14} strokeWidth={2} />
                    <span>Back to home</span>
                </Link>

                {/* Mobile-only cohort strip - keeps urgency without taking real estate */}
                <div className="auth-cohort-strip">
                    <span className="auth-cohort-strip__dot"></span>
                    <span>Cohort 1 · {COHORT_ONBOARDED} of {COHORT_TARGET} businesses onboarded in Lisbon</span>
                </div>

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

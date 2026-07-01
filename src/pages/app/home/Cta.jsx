// src/pages/app/home/Cta.jsx
// Closer - cities with phase tags, cohort progress strip, final CTA.

import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import './Cta.css'


// Cohort progress. Update as Vincent closes Lisbon SMEs.
const COHORT_ONBOARDED = 3
const COHORT_TARGET = 10


const Cta = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    const handlePrimary = () => {
        if (user && userProfile) {
            const path = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(path)
            return
        }
        navigate('/auth', { state: { tab: 'signup', userType: 'business' } })
    }

    const pct = Math.round((COHORT_ONBOARDED / COHORT_TARGET) * 100)

    return (
        <section className="loca-section loca-section--s0 cta">
            <div className="cta__radial" aria-hidden="true"></div>
            <div className="container">

                <div className="cta__cities">
                    <div className="cta__city">
                        <span className="cta__city-pill cta__city-pill--live">
                            <span className="cta__city-dot cta__city-dot--live"></span>
                            Live
                        </span>
                        <span className="cta__city-name">Lisbon</span>
                        <span className="cta__city-note">Onboarding cohort 1</span>
                    </div>

                    <div className="cta__city">
                        <span className="cta__city-pill cta__city-pill--next">
                            <span className="cta__city-dot cta__city-dot--next"></span>
                            Next
                        </span>
                        <span className="cta__city-name">Porto</span>
                        <span className="cta__city-note">After 10 Lisbon businesses live</span>
                    </div>

                    <div className="cta__city">
                        <span className="cta__city-pill">
                            <span className="cta__city-dot"></span>
                            Soon
                        </span>
                        <span className="cta__city-name">Lagos</span>
                        <span className="cta__city-note">Q4 2026</span>
                    </div>
                </div>

                <div className="cta__core">
                    <h2 className="cta__title">
                        Be one of the <span className="cta__title-accent">first ten</span> in Lisbon.
                    </h2>
                    <p className="cta__lede">
                        First cohort is open. Twelve months free. Nineteen euros a month flat after. Set up in ten minutes.
                    </p>

                    <div className="cta__buttons">
                        <button onClick={handlePrimary} className="loca-btn loca-btn--primary loca-btn--lg">
                            {user ? 'Go to dashboard' : 'Start your booking page'}
                            <ArrowRight size={18} strokeWidth={2} />
                        </button>
                        <Link to="/businesses" className="loca-btn loca-btn--ghost loca-btn--lg">
                            Or browse businesses
                        </Link>
                    </div>
                </div>

                <div className="cta__cohort">
                    <div className="cta__cohort-head">
                        <span className="cta__cohort-label">Cohort 1 · Lisbon</span>
                        <span className="cta__cohort-count">
                            <span className="cta__cohort-count-num">{COHORT_ONBOARDED}</span>
                            <span className="cta__cohort-count-sep">/</span>
                            <span className="cta__cohort-count-target">{COHORT_TARGET}</span>
                            <span className="cta__cohort-count-label">onboarded</span>
                        </span>
                    </div>
                    <div className="cta__cohort-bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label="Cohort 1 progress">
                        <div className="cta__cohort-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                </div>

            </div>
        </section>
    )
}

export default Cta

// src/pages/app/home/Cta.jsx
// Closer - cities with phase tags, cohort progress strip, final CTA.

import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useCohort } from '../../../hooks/useCohort'
import { useCity } from '../../../hooks/useCity'
import './Cta.css'


const Cta = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    // The visitor's city when it is taking bookings, otherwise Porto.
    const [picked] = useCity()
    const city = picked.live ? picked : { code: 'porto', name: 'Porto' }
    const cohort = useCohort(city.code)

    const handlePrimary = () => {
        if (user && userProfile) {
            const path = '/me'
            navigate(path)
            return
        }
        navigate('/auth', { state: { tab: 'signup', userType: 'business' } })
    }

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
                        <span className="cta__city-name">Porto</span>
                        <span className="cta__city-note">Onboarding cohort 1</span>
                    </div>

                    <div className="cta__city">
                        <span className="cta__city-pill cta__city-pill--live">
                            <span className="cta__city-dot cta__city-dot--live"></span>
                            Live
                        </span>
                        <span className="cta__city-name">Lagos</span>
                        <span className="cta__city-note">Onboarding cohort 1</span>
                    </div>

                    <div className="cta__city">
                        <span className="cta__city-pill cta__city-pill--live">
                            <span className="cta__city-dot cta__city-dot--live"></span>
                            Live
                        </span>
                        <span className="cta__city-name">Lisbon</span>
                        <span className="cta__city-note">Onboarding cohort 1</span>
                    </div>
                </div>

                <div className="cta__core">
                    <h2 className="cta__title">
                        Be one of the <span className="cta__title-accent">first ten</span> in {city.name}.
                    </h2>
                    <p className="cta__lede">
                        First cohort is open. Free during the beta. Set up in ten minutes.
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

                {cohort && (
                    <div className="cta__cohort">
                        <div className="cta__cohort-head">
                            <span className="cta__cohort-label">Cohort 1 · {city.name}</span>
                            <span className="cta__cohort-count">
                                <span className="cta__cohort-count-num">{cohort.count}</span>
                                <span className="cta__cohort-count-sep">/</span>
                                <span className="cta__cohort-count-target">{cohort.size}</span>
                                <span className="cta__cohort-count-label">live</span>
                            </span>
                        </div>
                        <div className="cta__cohort-bar" role="progressbar" aria-valuenow={cohort.pct} aria-valuemin="0" aria-valuemax="100" aria-label="Cohort 1 progress">
                            <div className="cta__cohort-fill" style={{ width: `${cohort.pct}%` }}></div>
                        </div>
                    </div>
                )}

            </div>
        </section>
    )
}

export default Cta

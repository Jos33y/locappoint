// src/pages/app/home/Hero.jsx
// Hero - left copy, right layered visual (portal snippet + confirmation card).

import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Calendar, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import './Hero.css'


const Hero = () => {
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

    return (
        <section className="loca-hero">
            <div className="loca-hero__radial" aria-hidden="true"></div>
            <div className="loca-hero__grid-bg" aria-hidden="true"></div>

            <div className="container">
                <div className="loca-hero__grid">

                    <div className="loca-hero__content">
                        <span className="loca-eyebrow">
                            <span className="loca-eyebrow__dot" aria-hidden="true"></span>
                            Beta · Lisbon first
                        </span>

                        <h1 className="loca-hero__title">
                            Your booking page.<br />
                            <span className="loca-hero__title-accent">Live in ten minutes.</span>
                        </h1>

                        <p className="loca-hero__lede">
                            The booking platform for local businesses in Lisbon, Porto, and Lagos. Set your hours, share your link, fill your calendar. Free for the first twelve months.
                        </p>

                        <div className="loca-hero__cta">
                            <button onClick={handlePrimary} className="loca-btn loca-btn--primary loca-btn--lg">
                                {user ? 'Go to dashboard' : 'Get your booking page'}
                                <ArrowRight size={18} strokeWidth={2} />
                            </button>
                            <Link to="/businesses" className="loca-btn loca-btn--ghost loca-btn--lg">
                                Browse businesses
                            </Link>
                        </div>

                        <div className="loca-hero__metrics">
                            <div className="loca-hero__metric">
                                <div className="loca-hero__metric-num">12 mo</div>
                                <div className="loca-hero__metric-label">Free trial</div>
                            </div>
                            <div className="loca-hero__metric-sep" aria-hidden="true"></div>
                            <div className="loca-hero__metric">
                                <div className="loca-hero__metric-num">€19<span className="loca-hero__metric-sub">/mo</span></div>
                                <div className="loca-hero__metric-label">Flat, after</div>
                            </div>
                            <div className="loca-hero__metric-sep" aria-hidden="true"></div>
                            <div className="loca-hero__metric">
                                <div className="loca-hero__metric-num">0%</div>
                                <div className="loca-hero__metric-label">Commission</div>
                            </div>
                        </div>
                    </div>

                    <aside className="loca-hero__visual" aria-hidden="true">

                        {/* Back layer - portal "Today" snippet */}
                        <div className="hero-portal">
                            <div className="hero-portal__head">
                                <div className="hero-portal__title">
                                    <Calendar size={13} strokeWidth={2} />
                                    <span>Today</span>
                                </div>
                                <div className="hero-portal__date">SAT 28 JUN</div>
                            </div>
                            <div className="hero-portal__list">
                                <div className="hero-portal__row">
                                    <div className="hero-portal__time">09:00</div>
                                    <div className="hero-portal__name">Ana Costa</div>
                                    <div className="hero-portal__svc">Cut</div>
                                </div>
                                <div className="hero-portal__row hero-portal__row--active">
                                    <div className="hero-portal__time">10:30</div>
                                    <div className="hero-portal__name">João Pereira</div>
                                    <div className="hero-portal__svc">Cut + Beard</div>
                                </div>
                                <div className="hero-portal__row">
                                    <div className="hero-portal__time">12:00</div>
                                    <div className="hero-portal__name">Sofia Ramos</div>
                                    <div className="hero-portal__svc">Color</div>
                                </div>
                                <div className="hero-portal__row">
                                    <div className="hero-portal__time">14:30</div>
                                    <div className="hero-portal__name">Maria Silva</div>
                                    <div className="hero-portal__svc">Cut + Style</div>
                                </div>
                                <div className="hero-portal__row hero-portal__row--new">
                                    <div className="hero-portal__time">16:00</div>
                                    <div className="hero-portal__name">Bruno Alves</div>
                                    <div className="hero-portal__svc">Beard trim</div>
                                </div>
                            </div>
                            <div className="hero-portal__foot">
                                <Bell size={11} strokeWidth={2} />
                                <span>5 booked · 2 reminders sent</span>
                            </div>
                        </div>

                        {/* Front layer - confirmation card */}
                        <div className="hero-confirm">
                            <div className="hero-confirm__head">
                                <span className="hero-confirm__status">
                                    <CheckCircle2 size={12} strokeWidth={2.5} />
                                    Confirmed
                                </span>
                                <span className="hero-confirm__id">#A472</span>
                            </div>
                            <div className="hero-confirm__divider"></div>
                            <div className="hero-confirm__row">
                                <div className="hero-confirm__label">Client</div>
                                <div className="hero-confirm__value">Maria Silva</div>
                            </div>
                            <div className="hero-confirm__row">
                                <div className="hero-confirm__label">When</div>
                                <div className="hero-confirm__value">Sat 28 Jun · 14:30</div>
                            </div>
                            <div className="hero-confirm__row">
                                <div className="hero-confirm__label">Where</div>
                                <div className="hero-confirm__value">
                                    Femto&apos;s Hair Studio
                                    <span className="hero-confirm__sub">Rua Garrett 12, Lisbon</span>
                                </div>
                            </div>
                            <div className="hero-confirm__divider"></div>
                            <div className="hero-confirm__foot">
                                <svg width="11" height="11" viewBox="0 0 100 100" aria-hidden="true">
                                    <path d="M 42 6 C 22 6, 6 22, 6 42 C 6 53, 10 62, 16 70 L 42 100 L 68 70 C 74 62, 78 53, 78 42 C 78 22, 62 6, 42 6 Z" fill="var(--azure)" transform="translate(14.3 4.9) scale(0.85)" />
                                    <circle cx="62" cy="29" r="3.5" fill="var(--signal)" transform="translate(14.3 4.9) scale(0.85)" />
                                </svg>
                                <span>Booked via locappoint.com</span>
                            </div>
                        </div>

                    </aside>

                </div>
            </div>
        </section>
    )
}

export default Hero

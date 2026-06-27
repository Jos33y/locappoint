// src/pages/app/AppHome.jsx
// Public-facing home for app.locappoint.com.
// Brand-expressive rebuild. Beta visible, signup open, browse open.

import { Link, useNavigate } from 'react-router-dom'
import {
    ArrowRight,
    Scissors,
    Sparkles,
    Flower2,
    Dumbbell,
    Dog,
    GraduationCap,
    Stethoscope,
    Camera,
    Check,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import '../../styles/app/home.css'


const AppHome = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    const goDashboardOrAuth = (intent) => {
        if (user && userProfile) {
            const path = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(path)
            return
        }
        navigate('/auth', { state: { tab: 'signup', userType: intent } })
    }

    return (
        <div className="loca-home">
            <AppHeader />

            <main>

                {/* Hero - left text, right confirmation card */}
                <section className="loca-hero">
                    <div className="loca-hero__radial" aria-hidden="true"></div>
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
                                    Locappoint is the booking platform built for local businesses in Lisbon, Porto, and Lagos. Set your hours, share your link, get bookings. Free for the first twelve months.
                                </p>

                                <div className="loca-hero__cta">
                                    <button onClick={() => goDashboardOrAuth('business')} className="loca-btn loca-btn--primary loca-btn--lg">
                                        {user ? 'Go to dashboard' : 'Get your booking page'}
                                        <ArrowRight size={18} strokeWidth={2} />
                                    </button>
                                    <Link to="/businesses" className="loca-btn loca-btn--ghost loca-btn--lg">
                                        Browse businesses
                                    </Link>
                                </div>

                                <div className="loca-hero__meta">
                                    <span>Free 12 months</span>
                                    <span className="loca-hero__meta-sep" aria-hidden="true">·</span>
                                    <span>€19/month flat</span>
                                    <span className="loca-hero__meta-sep" aria-hidden="true">·</span>
                                    <span>No commission</span>
                                </div>
                            </div>

                            <aside className="loca-hero__visual" aria-hidden="true">
                                <div className="confirm-card">
                                    <div className="confirm-card__head">
                                        <span className="confirm-card__status">
                                            <span className="confirm-card__dot"></span>
                                            <span>Confirmed</span>
                                        </span>
                                        <span className="confirm-card__id">#A472</span>
                                    </div>
                                    <div className="confirm-card__divider"></div>
                                    <div className="confirm-card__row">
                                        <div className="confirm-card__label">Client</div>
                                        <div className="confirm-card__value">Maria Silva</div>
                                    </div>
                                    <div className="confirm-card__row">
                                        <div className="confirm-card__label">Service</div>
                                        <div className="confirm-card__value">Cut &amp; Style · 45 min</div>
                                    </div>
                                    <div className="confirm-card__row">
                                        <div className="confirm-card__label">When</div>
                                        <div className="confirm-card__value">Sat 28 Jun · 14:30</div>
                                    </div>
                                    <div className="confirm-card__row">
                                        <div className="confirm-card__label">Where</div>
                                        <div className="confirm-card__value">
                                            Femto&apos;s Hair Studio<br />
                                            <span className="confirm-card__sub">Rua Garrett 12, Lisbon</span>
                                        </div>
                                    </div>
                                    <div className="confirm-card__divider"></div>
                                    <div className="confirm-card__foot">
                                        <svg width="14" height="14" viewBox="0 0 100 100" aria-hidden="true">
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


                {/* How it works - 3 numbered steps */}
                <section className="loca-section">
                    <div className="container">
                        <div className="loca-section__head">
                            <span className="loca-eyebrow">How it works</span>
                            <h2 className="loca-section__title">From signup to first booking in ten minutes.</h2>
                        </div>

                        <div className="loca-steps">
                            <article className="loca-step">
                                <div className="loca-step__num">01</div>
                                <h3 className="loca-step__title">Set your hours and services</h3>
                                <p className="loca-step__body">Tell us when you&apos;re open and what you offer. Pricing, duration, buffer between slots. Standard week plus exceptions for holidays.</p>
                            </article>

                            <article className="loca-step">
                                <div className="loca-step__num">02</div>
                                <h3 className="loca-step__title">Share your link</h3>
                                <p className="loca-step__body">locappoint.com/your-name. Put it in your Instagram bio, WhatsApp status, shop window. One link, anywhere your customers find you.</p>
                            </article>

                            <article className="loca-step">
                                <div className="loca-step__num">03</div>
                                <h3 className="loca-step__title">Get bookings, automated</h3>
                                <p className="loca-step__body">Confirmations on email and WhatsApp. Reminders before each slot. Schedule fills, you focus on the work.</p>
                            </article>
                        </div>
                    </div>
                </section>


                {/* Built for - light section (rhythm break) */}
                <section className="loca-section loca-section--light">
                    <div className="container">
                        <div className="loca-section__head">
                            <span className="loca-eyebrow loca-eyebrow--on-light">Built for</span>
                            <h2 className="loca-section__title loca-section__title--on-light">Local businesses with appointments.</h2>
                            <p className="loca-section__lede loca-section__lede--on-light">Service, beauty, wellness, fitness, education, pets. If you book by time slot, Locappoint fits.</p>
                        </div>

                        <div className="loca-cats">
                            <div className="loca-cat">
                                <Scissors size={22} strokeWidth={1.5} />
                                <span>Salons</span>
                            </div>
                            <div className="loca-cat">
                                <Sparkles size={22} strokeWidth={1.5} />
                                <span>Barbershops</span>
                            </div>
                            <div className="loca-cat">
                                <Flower2 size={22} strokeWidth={1.5} />
                                <span>Spas &amp; wellness</span>
                            </div>
                            <div className="loca-cat">
                                <Dumbbell size={22} strokeWidth={1.5} />
                                <span>Fitness</span>
                            </div>
                            <div className="loca-cat">
                                <Camera size={22} strokeWidth={1.5} />
                                <span>Beauty &amp; photo</span>
                            </div>
                            <div className="loca-cat">
                                <Dog size={22} strokeWidth={1.5} />
                                <span>Pet services</span>
                            </div>
                            <div className="loca-cat">
                                <GraduationCap size={22} strokeWidth={1.5} />
                                <span>Tutoring</span>
                            </div>
                            <div className="loca-cat">
                                <Stethoscope size={22} strokeWidth={1.5} />
                                <span>Consulting</span>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Pricing */}
                <section className="loca-section">
                    <div className="container">
                        <div className="loca-section__head loca-section__head--center">
                            <span className="loca-eyebrow">Pricing</span>
                            <h2 className="loca-section__title">Free until your business pays you back.</h2>
                            <p className="loca-section__lede">Twelve months free for early businesses. Then nineteen euros a month flat, per business. No commission on bookings. Ever.</p>
                        </div>

                        <div className="loca-pricing">
                            <div className="loca-pricing__split">
                                <div className="loca-pricing__col">
                                    <div className="loca-pricing__label">First 12 months</div>
                                    <div className="loca-pricing__amount">€0</div>
                                    <div className="loca-pricing__per">free for early businesses</div>
                                </div>
                                <div className="loca-pricing__divider" aria-hidden="true"></div>
                                <div className="loca-pricing__col">
                                    <div className="loca-pricing__label">After that</div>
                                    <div className="loca-pricing__amount">
                                        €19<span className="loca-pricing__amount-sub">/mo</span>
                                    </div>
                                    <div className="loca-pricing__per">flat per business, ever</div>
                                </div>
                            </div>

                            <div className="loca-pricing__includes">
                                <h3 className="loca-pricing__includes-title">Every plan includes</h3>
                                <ul className="loca-pricing__list">
                                    <li><Check size={16} strokeWidth={2.2} /><span>Unlimited bookings</span></li>
                                    <li><Check size={16} strokeWidth={2.2} /><span>Email and WhatsApp confirmations</span></li>
                                    <li><Check size={16} strokeWidth={2.2} /><span>Public business page</span></li>
                                    <li><Check size={16} strokeWidth={2.2} /><span>Calendar sync (Google, iCal, Outlook)</span></li>
                                    <li><Check size={16} strokeWidth={2.2} /><span>Real-time availability</span></li>
                                    <li><Check size={16} strokeWidth={2.2} /><span>Zero booking commission</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>


                {/* CTA + Cities */}
                <section className="loca-section loca-section--cta">
                    <div className="container">
                        <div className="loca-cta">
                            <div className="loca-cta__cities-block">
                                <span className="loca-eyebrow">Now in</span>
                                <div className="loca-cta__cities">
                                    <span className="loca-cta__city">
                                        <span className="loca-cta__city-dot loca-cta__city-dot--active" aria-hidden="true"></span>
                                        Lisbon
                                    </span>
                                    <span className="loca-cta__city">
                                        <span className="loca-cta__city-dot" aria-hidden="true"></span>
                                        Porto
                                    </span>
                                    <span className="loca-cta__city">
                                        <span className="loca-cta__city-dot" aria-hidden="true"></span>
                                        Lagos
                                    </span>
                                </div>
                            </div>

                            <h2 className="loca-cta__title">Be one of the first.</h2>
                            <p className="loca-cta__lede">
                                We&apos;re onboarding the first cohort of businesses in Lisbon. Your spot is open. Twelve months free, then nineteen euros a month flat. Set up in ten minutes.
                            </p>

                            <div className="loca-cta__buttons">
                                <button onClick={() => goDashboardOrAuth('business')} className="loca-btn loca-btn--primary loca-btn--lg">
                                    {user ? 'Go to dashboard' : 'Start your booking page'}
                                    <ArrowRight size={18} strokeWidth={2} />
                                </button>
                                <Link to="/businesses" className="loca-btn loca-btn--ghost loca-btn--lg">
                                    Or browse businesses
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default AppHome

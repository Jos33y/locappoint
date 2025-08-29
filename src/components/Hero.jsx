const Hero = () => {
    const scrollToWaitlist = () => {
        const element = document.getElementById('waitlist')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <section className="hero" aria-labelledby="hero-title">
            <div className="container">
                <div className="hero__content">
                    <div className="hero__text">
                        <h1 id="hero-title" className="hero__title">
                            Let clients find you and book you.
                        </h1>
                        <p className="hero__subtitle">
                            Appointments for local businesses, made simple. Start free.
                        </p>
                        <div className="hero__actions">
                            <button
                                className="btn btn--primary btn--large"
                                onClick={scrollToWaitlist}
                                type="button">
                                Get Early Access
                            </button>
                            <a
                                href="https://wa.me/00000000000"
                                className="btn btn--secondary btn--large"
                                target="_blank"
                                rel="noopener noreferrer">
                                Chat on WhatsApp
                            </a>
                        </div>
                    </div>

                    <div className="hero__visual">
                        <div className="hero__illustration">
                            <svg
                                className="hero__illustration-svg"
                                viewBox="0 0 400 300"
                                xmlns="http://www.w3.org/2000/svg"
                                role="img"
                                aria-label="Illustration of appointment booking interface">
                                <defs>
                                    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#f8f9fa" />
                                    </linearGradient>
                                </defs>

                                {/* Main card */}
                                <rect x="50" y="50" width="300" height="200" rx="12" fill="url(#cardGradient)" stroke="#e6e9ef" strokeWidth="1" />

                                {/* Header */}
                                <rect x="70" y="70" width="80" height="16" rx="8" fill="#FCBC7C" />
                                <rect x="270" y="70" width="60" height="16" rx="8" fill="#25D366" />

                                {/* Calendar grid */}
                                <rect x="70" y="110" width="260" height="120" rx="6" fill="#ffffff" stroke="#e6e9ef" />

                                {/* Calendar items */}
                                <rect x="85" y="125" width="50" height="20" rx="4" fill="#FCBC7C" opacity="0.3" />
                                <rect x="145" y="125" width="50" height="20" rx="4" fill="#25D366" opacity="0.3" />
                                <rect x="205" y="125" width="50" height="20" rx="4" fill="#FCBC7C" />
                                <rect x="265" y="125" width="50" height="20" rx="4" fill="#e6e9ef" />

                                <rect x="85" y="155" width="50" height="20" rx="4" fill="#25D366" />
                                <rect x="145" y="155" width="50" height="20" rx="4" fill="#e6e9ef" />
                                <rect x="205" y="155" width="50" height="20" rx="4" fill="#FCBC7C" opacity="0.3" />
                                <rect x="265" y="155" width="50" height="20" rx="4" fill="#25D366" opacity="0.3" />

                                <rect x="85" y="185" width="50" height="20" rx="4" fill="#e6e9ef" />
                                <rect x="145" y="185" width="50" height="20" rx="4" fill="#FCBC7C" />
                                <rect x="205" y="185" width="50" height="20" rx="4" fill="#e6e9ef" />
                                <rect x="265" y="185" width="50" height="20" rx="4" fill="#25D366" />

                                {/* Floating notification */}
                                <rect x="280" y="30" width="100" height="40" rx="8" fill="#25D366" opacity="0.9" />
                                <circle cx="295" cy="45" r="3" fill="white" />
                                <rect x="305" y="40" width="60" height="4" rx="2" fill="white" />
                                <rect x="305" y="48" width="45" height="4" rx="2" fill="white" opacity="0.7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero
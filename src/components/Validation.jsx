const Validation = () => {
    return (
        <section id="validation" className="validation" aria-labelledby="validation-title">
            <div className="container">
                <div className="validation__header">
                    <h2 id="validation-title" className="validation__title section-title">
                        Join the movement
                    </h2>
                </div>

                <div className="validation__content">
                    <p className="validation__description">
                        LocAppoint is launching soon in Lisbon & Porto. Be among the first local businesses to transform how you handle bookings and grow your customer base.
                    </p>

                    <div className="validation__stats">
                        <div className="validation__stat">
                            <span className="validation__stat-number">100+</span>
                            <span className="validation__stat-label">Businesses Waiting</span>
                        </div>
                        <div className="validation__stat">
                            <span className="validation__stat-number">10+</span>
                            <span className="validation__stat-label">Service Categories</span>
                        </div>
                        <div className="validation__stat">
                            <span className="validation__stat-number">2</span>
                            <span className="validation__stat-label">Cities Launching</span>
                        </div>
                    </div>

                    <div className="validation__badges">
                        <div className="validation__badge">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>GDPR Compliant</span>
                        </div>
                        <div className="validation__badge">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <span>Secure & Private</span>
                        </div>
                        <div className="validation__badge">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                            <span>Growing Fast</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Validation
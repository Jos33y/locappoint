const Comparison = () => {
    const features = [
        { name: "Setup Time", locappoint: "10 minutes", others: "Hours/Days" },
        { name: "Monthly Cost", locappoint: "Free to start", others: "€20-€100" },
        { name: "Portuguese Interface", locappoint: true, others: false },
        { name: "WhatsApp Integration", locappoint: "Native", others: "Limited" },
        { name: "Local Support", locappoint: true, others: false },
        { name: "Transaction Fees", locappoint: "0%", others: "3-5%" },
        { name: "Technical Skills Required", locappoint: false, others: true },
        { name: "Mobile App", locappoint: "Coming soon", others: "Yes" } 
    ]

    return (
        <section className="comparison" id="comparison">
            <div className="container">
                <div className="comparison__header">
                    <span className="section-badge">The Difference</span>
                    <h2 className="section-title">
                        Why Local Businesses Choose Us
                    </h2>
                    <p className="section-subtitle">
                        Built specifically for Portuguese SMEs, not enterprise corporations
                    </p>
                </div>

                <div className="comparison__table-wrapper">
                    <div className="comparison__table">
                        <div className="comparison__table-header">
                            <div className="comparison__col comparison__col--feature">
                                Feature
                            </div>
                            <div className="comparison__col comparison__col--locappoint">
                                <div className="comparison__brand">
                                    <div className="comparison__brand-logo">LocAppoint</div>
                                    <span className="comparison__brand-badge">Recommended</span>
                                </div>
                            </div>
                            <div className="comparison__col comparison__col--others">
                                Others
                                <span className="comparison__others-subtitle">SimplyBook, Calendly, etc.</span>
                            </div>
                        </div>

                        <div className="comparison__table-body">
                            {features.map((feature, index) => (
                                <div key={index} className="comparison__row">
                                    <div className="comparison__col comparison__col--feature">
                                        {feature.name}
                                    </div>
                                    <div className="comparison__col comparison__col--locappoint">
                                        {typeof feature.locappoint === 'boolean' ? (
                                            feature.locappoint ? (
                                                <svg className="comparison__check comparison__check--yes" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="comparison__check comparison__check--no" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )
                                        ) : (
                                            <span className="comparison__value comparison__value--highlight">{feature.locappoint}</span>
                                        )}
                                    </div>
                                    <div className="comparison__col comparison__col--others">
                                        {typeof feature.others === 'boolean' ? (
                                            feature.others ? (
                                                <svg className="comparison__check comparison__check--yes" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="comparison__check comparison__check--no" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )
                                        ) : (
                                            <span className="comparison__value">{feature.others}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="comparison__cta">
                    <button
                        className="btn btn--primary btn--large"
                        onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Join 500+ Businesses
                    </button>
                </div>
            </div>
        </section>
    )
}

export default Comparison
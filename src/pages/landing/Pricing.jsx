const Pricing = () => {
    const plans = [
        {
            name: "Free",
            price: "0€",
            period: "forever",
            description: "Perfect for getting started",
            features: [
                "Up to 50 bookings/month",
                "Basic calendar",
                "Email confirmations",
                "WhatsApp integration",
                "Mobile responsive",
                "Basic support"
            ],
            cta: "Start Free",
            popular: false
        },
        {
            name: "Professional",
            price: "15€",
            period: "per month",
            description: "For growing businesses",
            features: [
                "Everything in Free",
                "Unlimited bookings",
                "SMS reminders",
                "Custom branding",
                "Analytics dashboard",
                "Priority support",
                "Remove LocAppoint branding"
            ],
            cta: "Join Waitlist",
            popular: true
        },
        {
            name: "Premium",
            price: "35€",
            period: "per month",
            description: "For established businesses",
            features: [
                "Everything in Professional",
                "Multi-location support",
                "Team management",
                "Advanced integrations",
                "Custom domain",
                "Dedicated account manager",
                "API access"
            ],
            cta: "Join Waitlist",
            popular: false
        }
    ]

    return (
        <section className="pricing" id="pricing">
            <div className="container">
                <div className="pricing__header">
                    <span className="section-badge">Pricing</span>
                    <h2 className="section-title">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="section-subtitle">
                        Start free, upgrade when you're ready. No hidden fees.
                    </p>
                </div>

                <div className="pricing__grid">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`pricing__card ${plan.popular ? 'pricing__card--popular' : ''}`}
                        >
                            {plan.popular && (
                                <div className="pricing__badge">Most Popular</div>
                            )}

                            <div className="pricing__card-header">
                                <h3 className="pricing__plan-name">{plan.name}</h3>
                                <div className="pricing__price">
                                    <span className="pricing__amount">{plan.price}</span>
                                    <span className="pricing__period">/{plan.period}</span>
                                </div>
                                <p className="pricing__description">{plan.description}</p>
                            </div>

                            <div className="pricing__card-body">
                                <ul className="pricing__features">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="pricing__feature">
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pricing__card-footer">
                                <button
                                    className={`btn btn--full ${plan.popular ? 'btn--primary' : 'btn--secondary'}`}
                                    onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pricing__note">
                    <p>🎁 <strong>Early Adopter Bonus:</strong> First 100 businesses get 3 months Premium free</p>
                </div>
            </div>
        </section>
    )
}

export default Pricing 
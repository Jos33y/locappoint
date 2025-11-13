const HowItWorks = () => {
    const steps = [
        {
            number: "01",
            title: "Create Your Profile",
            description: "Sign up in under 2 minutes. Add your business details, services, and availability. No credit card required.",
            icon: "👤"
        },
        {
            number: "02",
            title: "Customize Your Booking Page",
            description: "Set your prices, time slots, and booking rules. Make it uniquely yours with custom branding.",
            icon: "⚙️"
        },
        {
            number: "03", 
            title: "Share & Get Discovered",
            description: "Share your booking link on social media, WhatsApp, or get discovered by local clients searching for your services.",
            icon: "📱"
        },
        {
            number: "04",
            title: "Accept Bookings Automatically",
            description: "Clients book instantly, you get notified, and both get automatic reminders. It's that simple.",
            icon: "✅"
        }
    ]

    return (
        <section className="how-it-works" id="how-it-works">
            <div className="container">
                <div className="how-it-works__header">
                    <span className="section-badge">Simple Process</span>
                    <h2 className="section-title">
                        How It Works
                    </h2>
                    <p className="section-subtitle">
                        Get started in minutes, not hours. No technical skills required.
                    </p>
                </div>

                <div className="how-it-works__steps">
                    {steps.map((step, index) => (
                        <div key={index} className="step-card">
                            <div className="step-card__number">{step.number}</div>
                            <div className="step-card__icon">{step.icon}</div>
                            <h3 className="step-card__title">{step.title}</h3>
                            <p className="step-card__description">{step.description}</p>

                            {index < steps.length - 1 && (
                                <div className="step-card__connector">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="how-it-works__cta">
                    <button
                        className="btn btn--primary btn--large"
                        onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}>
                        Start Your Free Account
                    </button>
                    <p className="how-it-works__note">No credit card required • Free forever plan</p>
                </div> 
            </div>
        </section>
    )
}

export default HowItWorks
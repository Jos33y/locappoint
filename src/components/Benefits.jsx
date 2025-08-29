import Icon from './Icon'

const Benefits = () => {
    const benefits = [
        {
            icon: 'mapPin',
            title: 'Made for Portugal\'s local providers',
            description: 'Purpose-built for Portuguese SMEs with local market understanding',
            badge: '🇵🇹 PT'
        },
        {
            icon: 'zap',
            title: 'Zero cost to start, no tech setup',
            description: 'Get online in minutes without upfront costs or technical complexity'
        },
        {
            icon: 'smartphone',
            title: 'Mobile-friendly on any device',
            description: 'Works perfectly on phones, tablets, and computers for you and your clients'
        }
    ]

    return (
        <section id="benefits" className="benefits" aria-labelledby="benefits-title">
            <div className="container">
                <div className="benefits__header">
                    <h2 id="benefits-title" className="benefits__title section-title">
                        Why choose LocAppoint
                    </h2>
                    <p className="benefits__subtitle">
                        The smart choice for Portuguese local businesses
                    </p>
                </div>

                <div className="benefits__grid">
                    {benefits.map((benefit, index) => (
                        <div key={index} className="benefits__card">
                            <div className="benefits__icon">
                                <Icon
                                    name={benefit.icon}
                                    size={28}
                                    ariaLabel={`${benefit.title} icon`}
                                />
                            </div>
                            <div className="benefits__content">
                                <div className="benefits__header-row">
                                    <h3 className="benefits__card-title">{benefit.title}</h3>
                                    {benefit.badge && (
                                        <span className="benefits__badge">{benefit.badge}</span>
                                    )}
                                </div>
                                <p className="benefits__card-description">{benefit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Benefits
import Icon from './Icon'

const Features = () => {
    const features = [
        {
            icon: 'calendar',
            title: 'List your services and availability',
            description: 'Set up your schedule once and let clients book available time slots'
        },
        {
            icon: 'search',
            title: 'Clients discover & book online',
            description: 'Get found by local customers searching for your services'
        },
        {
            icon: 'bell',
            title: 'Automatic booking reminders',
            description: 'Reduce no-shows with smart SMS and email notifications'
        },
        {
            icon: 'star',
            title: 'Build credibility with reviews',
            description: 'Collect and showcase customer testimonials to grow your reputation'
        }
    ]

    return (
        <section id="features" className="features" aria-labelledby="features-title">
            <div className="container">
                <div className="features__header">
                    <h2 id="features-title" className="features__title section-title">
                        Everything you need to get booked
                    </h2>
                    <p className="features__subtitle">
                        Simple tools that work together to help your local business thrive
                    </p>
                </div>

                <div className="features__grid">
                    {features.map((feature, index) => (
                        <div key={index} className="features__item">
                            <div className="features__icon">
                                <Icon
                                    name={feature.icon}
                                    size={24}
                                    ariaLabel={`${feature.title} icon`}
                                />
                            </div>
                            <div className="features__content">
                                <h3 className="features__item-title">{feature.title}</h3>
                                <p className="features__item-description">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Features
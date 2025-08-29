import Icon from './Icon'

const Audience = () => {
    const audiences = [
        {
            icon: 'users',
            title: 'Freelancers & Solo SMEs',
            description: 'Consultants, coaches, and independent professionals who need simple booking'
        },
        {
            icon: 'scissors',
            title: 'Beauty & Personal Care',
            description: 'Hairdressers, estheticians, massage therapists, and wellness providers'
        },
        {
            icon: 'tool',
            title: 'Home & Local Services',
            description: 'Repair technicians, tutors, fitness trainers, and skilled trade professionals'
        }
    ]

    return (
        <section id="audience" className="audience" aria-labelledby="audience-title">
            <div className="container">
                <div className="audience__header">
                    <h2 id="audience-title" className="audience__title section-title">
                        Built for Portugal's local professionals
                    </h2>
                    <p className="audience__subtitle">
                        Whether you're just starting out or ready to grow, LocAppoint fits your business
                    </p>
                </div>

                <div className="audience__grid">
                    {audiences.map((audience, index) => (
                        <div key={index} className="audience__card">
                            <div className="audience__icon">
                                <Icon
                                    name={audience.icon}
                                    size={32}
                                    ariaLabel={`${audience.title} icon`}
                                />
                            </div>
                            <h3 className="audience__card-title">{audience.title}</h3>
                            <p className="audience__card-description">{audience.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Audience
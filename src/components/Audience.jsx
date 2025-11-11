const Audience = () => {
    const audiences = [
        {
            emoji: '💇',
            title: 'Beauty & Personal Care',
            description: 'Hairdressers, estheticians, massage therapists, nail technicians, and beauty professionals'
        },
        {
            emoji: '💪',
            title: 'Health & Wellness',
            description: 'Personal trainers, yoga instructors, physiotherapists, nutritionists, and wellness coaches'
        },
        {
            emoji: '🔧',
            title: 'Home & Local Services',
            description: 'Electricians, plumbers, cleaners, repair technicians, and home service providers'
        },
        {
            emoji: '💼',
            title: 'Professional Services',
            description: 'Consultants, coaches, tutors, lawyers, accountants, and business professionals'
        },
        {
            emoji: '📸',
            title: 'Creative Services',
            description: 'Photographers, designers, musicians, videographers, and creative freelancers'
        },
        {
            emoji: '🎯',
            title: 'Freelancers & Solo SMEs',
            description: 'Independent professionals who need simple booking without the complexity'
        }
    ]

    return (
        <section id="audience" className="audience" aria-labelledby="audience-title">
            <div className="container">
                <div className="audience__header">
                    <h2 id="audience-title" className="audience__title section-title">
                        Built for local professionals
                    </h2> 
                    <p className="audience__subtitle">
                        Whether you're just starting or ready to grow, LocAppoint fits your business
                    </p>
                </div>

                <div className="audience__grid">
                    {audiences.map((audience, index) => (
                        <div key={index} className="audience__card">
                            <div className="audience__icon">
                                {audience.emoji}
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
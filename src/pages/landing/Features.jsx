import { Calendar, Search, Bell, Star, MapPin, Smartphone, Zap, Users, Clock, Shield, TrendingUp, Heart } from 'lucide-react'

const Features = () => {
    const mainFeatures = [
        {
            icon: <Calendar size={28} />,
            title: 'Smart Calendar Management',
            description: 'Your availability, always up-to-date. Set your schedule once and let clients book available slots automatically.',
            features: ['Auto-sync across devices', 'Block time off easily', 'Multiple service types', 'Recurring availability']
        },
        {
            icon: <Search size={28} />,
            title: 'Local Discovery Platform',
            description: 'Get found by thousands of local clients actively searching for services like yours in Lisbon & Porto.',
            features: ['Featured in local search', 'Category listings', 'Location-based discovery', 'Client reviews']
        },
        {
            icon: <Bell size={28} />,
            title: 'Automated Reminders',
            description: 'Reduce no-shows by 80% with smart SMS and email reminders sent automatically before appointments.',
            features: ['24h advance notice', '2h last reminder', 'WhatsApp integration', 'Custom messages']
        },
        {
            icon: <Star size={28} />,
            title: 'Reputation Builder',
            description: 'Collect and showcase glowing testimonials that convert browsers into bookers.',
            features: ['Auto review requests', 'Google integration', 'Social proof badges', 'Rating showcase']
        }
    ]

    const additionalFeatures = [
        {
            icon: <MapPin size={20} />,
            title: 'Multi-location Support',
            description: 'Manage multiple locations from one dashboard'
        },
        {
            icon: <Smartphone size={20} />,
            title: 'Mobile Optimized',
            description: 'Perfect experience on any device'
        },
        {
            icon: <Zap size={20} />,
            title: 'Instant Confirmations',
            description: 'Clients get immediate booking confirmation'
        },
        {
            icon: <Users size={20} />,
            title: 'Client Management',
            description: 'Track history, notes, and preferences'
        },
        {
            icon: <Clock size={20} />,
            title: 'Flexible Scheduling',
            description: 'Set custom hours for each service'
        },
        {
            icon: <Shield size={20} />,
            title: 'GDPR Compliant',
            description: 'Full data protection and privacy'
        },
        {
            icon: <TrendingUp size={20} />,
            title: 'Analytics Dashboard',
            description: 'Track bookings, revenue, and growth'
        },
        {
            icon: <Heart size={20} />,
            title: 'Portuguese Support',
            description: 'Local team ready to help you succeed'
        }
    ]

    return (
        <section className="features" id="features">
            <div className="container">
                <div className="features__header">
                    <span className="section-badge">Core Features</span>
                    <h2 className="section-title">
                        Everything you need to succeed
                    </h2>
                    <p className="section-subtitle">
                        Powerful features designed specifically for Portuguese local businesses. 
                        Simple to use, impossible to outgrow.
                    </p>
                </div>

                {/* Main Features Grid */}
                <div className="features__main-grid">
                    {mainFeatures.map((feature, index) => (
                        <div key={index} className="feature-card feature-card--main">
                            <div className="feature-card__icon-wrapper">
                                <div className="feature-card__icon">
                                    {feature.icon}
                                </div>
                                <div className="feature-card__icon-glow"></div>
                            </div>
                            
                            <h3 className="feature-card__title">{feature.title}</h3>
                            <p className="feature-card__description">{feature.description}</p>
                            
                            <ul className="feature-card__list">
                                {feature.features.map((item, idx) => (
                                    <li key={idx} className="feature-card__list-item">
                                        <div className="feature-card__check">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Additional Features */}
                <div className="features__additional">
                    <h3 className="features__additional-title">And so much more...</h3>
                    <div className="features__additional-grid">
                        {additionalFeatures.map((feature, index) => (
                            <div key={index} className="feature-mini">
                                <div className="feature-mini__icon">
                                    {feature.icon}
                                </div>
                                <div className="feature-mini__content">
                                    <h4 className="feature-mini__title">{feature.title}</h4>
                                    <p className="feature-mini__description">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="features__cta">
                    <div className="features__cta-content">
                        <h3 className="features__cta-title">Ready to see it in action?</h3>
                        <p className="features__cta-text">
                            Join the waitlist and be among the first to experience LocAppoint when we launch.
                        </p>
                        <button
                            className="btn btn--primary btn--large"
                            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Get Early Access
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Features
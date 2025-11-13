import { Calendar, Users, Clock, Heart, Target, Zap } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import '../../styles/app/about.css'

const AppAbout = () => {
    return (
        <div className="about-page">
            <AppHeader />

            <main className="about-content">
                {/* Hero Section */}
                <section className="about-hero">
                    <div className="container">
                        <div className="about-hero-content">
                            <h1 className="about-title">
                                Making Appointments
                                <br />
                                <span className="gradient-text">Simple for Everyone</span>
                            </h1>
                            <p className="about-subtitle">
                                We believe booking appointments should be as easy as sending a message.
                                No complicated software, no payment hassles — just simple, effective booking.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Mission Section */}
                <section className="about-section">
                    <div className="container">
                        <div className="section-grid">
                            <div className="section-content">
                                <div className="section-icon">
                                    <Target size={32} />
                                </div>
                                <h2 className="section-title">Our Mission</h2>
                                <p className="section-text">
                                    LocAppoint was born from a simple observation: most appointment booking
                                    systems are overcomplicated, expensive, and difficult to use for small
                                    business owners who aren't tech-savvy.
                                </p>
                                <p className="section-text">
                                    We're on a mission to change that. We've built a platform that anyone
                                    can use — from your neighborhood barber to your local dentist — making
                                    appointment management effortless.
                                </p>
                            </div>

                            <div className="section-image">
                                <div className="image-placeholder">
                                    <Calendar size={64} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="about-section about-values">
                    <div className="container">
                        <h2 className="section-heading">What We Stand For</h2>
                        <div className="values-grid">
                            <div className="value-card">
                                <div className="value-icon">
                                    <Heart size={28} />
                                </div>
                                <h3 className="value-title">Simplicity First</h3>
                                <p className="value-text">
                                    No confusing menus or unnecessary features. Just the essentials
                                    to manage your appointments effectively.
                                </p>
                            </div>

                            <div className="value-card">
                                <div className="value-icon">
                                    <Users size={28} />
                                </div>
                                <h3 className="value-title">Built for Everyone</h3>
                                <p className="value-text">
                                    Designed with non-tech-savvy users in mind. If you can send an
                                    email, you can use LocAppoint.
                                </p>
                            </div>

                            <div className="value-card">
                                <div className="value-icon">
                                    <Zap size={28} />
                                </div>
                                <h3 className="value-title">Fast & Reliable</h3>
                                <p className="value-text">
                                    No more back-and-forth messages. Book appointments instantly
                                    and get confirmed right away.
                                </p>
                            </div>

                            <div className="value-card">
                                <div className="value-icon">
                                    <Clock size={28} />
                                </div>
                                <h3 className="value-title">Save Time</h3>
                                <p className="value-text">
                                    Automated reminders, easy rescheduling, and instant notifications
                                    save you hours every week.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Story Section */}
                <section className="about-section">
                    <div className="container">
                        <div className="section-grid section-grid-reverse">
                            <div className="section-image">
                                <div className="image-placeholder">
                                    <Users size={64} />
                                </div>
                            </div>

                            <div className="section-content">
                                <h2 className="section-title">Our Story</h2>
                                <p className="section-text">
                                    LocAppoint started when we noticed small business owners in our
                                    community struggling with appointment management. They were either
                                    using expensive, complex software or still relying on pen and paper.
                                </p>
                                <p className="section-text">
                                    We knew there had to be a better way. So we built LocAppoint —
                                    a platform that's powerful enough for businesses but simple enough
                                    for anyone to use from day one.
                                </p>
                                <p className="section-text">
                                    Today, we're helping businesses across Portugal save time, reduce
                                    no-shows, and provide better service to their clients.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="about-section about-stats">
                    <div className="container">
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-number">100+</div>
                                <div className="stat-label">Businesses</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">5,000+</div>
                                <div className="stat-label">Appointments Booked</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">95%</div>
                                <div className="stat-label">Client Satisfaction</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">24/7</div>
                                <div className="stat-label">Support Available</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="about-section about-cta">
                    <div className="container">
                        <div className="cta-content">
                            <h2 className="cta-title">Ready to Get Started?</h2>
                            <p className="cta-text">
                                Join hundreds of businesses that trust LocAppoint for their
                                appointment management.
                            </p>
                            <div className="cta-buttons">
                                <a href="/app/auth" className="btn btn--primary btn--large">
                                    Create Free Account
                                </a>
                                <a href="/app/contact" className="btn btn--secondary btn--large">
                                    Talk to Our Team
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <AppFooter />
        </div>
    )
}

export default AppAbout
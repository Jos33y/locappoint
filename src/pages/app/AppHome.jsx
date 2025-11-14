import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import '../../styles/app/home.css'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'

const AppHome = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    // Smart navigation - go to dashboard if logged in, auth if not
    const handleGetStarted = () => {
        if (user && userProfile) {
            // User is logged in, redirect to their dashboard
            const dashboardPath = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(dashboardPath)
        } else {
            // User not logged in, go to auth page
            navigate('/app/auth', { state: { tab: 'signup' } })
        }
    }

    // Smart navigation with user type pre-selection
    const handleSignUpAs = (userType) => {
        if (user && userProfile) {
            // Already logged in, go to dashboard
            const dashboardPath = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(dashboardPath)
        } else {
            // Not logged in, go to auth with pre-selected user type
            navigate('/app/auth', { state: { tab: 'signup', userType } })
        }
    }

    return (
        <div className="app-home">
            <AppHeader />

            {/* Hero Section */}
            <section className="app-hero">
                <div className="container">
                    <div className="app-hero-content">
                        <h1 className="app-hero-title">
                            Simple Appointment
                            <br />
                            <span className="gradient-text">Booking for Businesses</span>
                        </h1>
                        <p className="app-hero-subtitle">
                            Create your business profile, set your availability, and start accepting
                            appointments. No complicated setup, no payment processing. Just simple booking.
                        </p>

                        <div className="app-hero-cta">
                            <button
                                onClick={handleGetStarted}
                                className="btn btn--primary btn--large">
                                {user ? 'Go to Dashboard' : 'Create Free Account'}
                                <ArrowRight size={20} />
                            </button>
                            <Link to="/app/businesses" className="btn btn--secondary btn--large">
                                Browse Businesses
                            </Link>
                        </div>

                        {/* Quick Stats */}
                        <div className="app-quick-stats">
                            <div className="quick-stat">
                                <Calendar size={20} />
                                <span>Easy Scheduling</span>
                            </div>
                            <div className="quick-stat">
                                <Users size={20} />
                                <span>Client Management</span>
                            </div>
                            <div className="quick-stat">
                                <Clock size={20} />
                                <span>Real-time Availability</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Features */}
            <section className="app-features">
                <div className="container">
                    <div className="app-features-grid">
                        <div className="app-feature-card">
                            <div className="feature-icon">
                                <Users size={32} />
                            </div>
                            <h3>For Businesses</h3>
                            <p>Create your profile, add services, set your schedule, and share your booking link.</p>
                            <button
                                onClick={() => handleSignUpAs('business')}
                                className="feature-link"
                            >
                                {user ? 'Go to Dashboard' : 'Sign Up as Business'} →
                            </button>
                        </div>

                        <div className="app-feature-card">
                            <div className="feature-icon">
                                <Calendar size={32} />
                            </div>
                            <h3>For Clients</h3>
                            <p>Search for businesses, book appointments, and manage your bookings all in one place.</p>
                            <button
                                onClick={() => handleSignUpAs('client')}
                                className="feature-link"
                            >
                                {user ? 'Go to Dashboard' : 'Sign Up as Client'} →
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    )
}

export default AppHome
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Search, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/client/client.css'

const ClientHome = () => {
    const { userProfile } = useAuth()
    const navigate = useNavigate()
    const [upcomingAppointments, setUpcomingAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchCategory, setSearchCategory] = useState('')
    const [searchCity, setSearchCity] = useState('')

    useEffect(() => {
        fetchUpcomingAppointments()
    }, [])

    const fetchUpcomingAppointments = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    businesses (
                        business_name,
                        slug,
                        city
                    ),
                    services (
                        service_name,
                        duration_minutes
                    )
                `)
                .eq('client_email', userProfile.email)
                .gte('appointment_date', today)
                .in('status', ['pending', 'confirmed'])
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true })
                .limit(3)

            if (error) throw error
            setUpcomingAppointments(data || [])
        } catch (error) {
            console.error('Error fetching upcoming appointments:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleQuickSearch = (e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (searchQuery) params.append('q', searchQuery)
        if (searchCategory) params.append('category', searchCategory)
        if (searchCity) params.append('city', searchCity)
        
        navigate(`/client/search?${params.toString()}`)
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A'
        const [hours, minutes] = timeString.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        return `${displayHour}:${minutes} ${ampm}`
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="client-home">
            {/* Welcome Section */}
            <div className="welcome-section">
                <h1>Welcome back, {userProfile?.full_name || 'there'}!</h1>
                <p>Find and book appointments with local businesses</p>
            </div>

            {/* Quick Search */}
            <div className="quick-search">
                <h2>Find a Business</h2>
                <form onSubmit={handleQuickSearch} className="search-form">
                    <div className="search-input-group">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by business name or service..."
                            className="input"
                        />
                        <select
                            value={searchCategory}
                            onChange={(e) => setSearchCategory(e.target.value)}
                            className="input"
                        >
                            <option value="">All Categories</option>
                            <option value="Salon">Salon</option>
                            <option value="Spa">Spa</option>
                            <option value="Barbershop">Barbershop</option>
                            <option value="Dental">Dental</option>
                            <option value="Clinic">Clinic</option>
                            <option value="Gym">Gym</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Other">Other</option>
                        </select>
                        <select
                            value={searchCity}
                            onChange={(e) => setSearchCity(e.target.value)}
                            className="input"
                        >
                            <option value="">All Cities</option>
                            <option value="Lisbon">Lisbon</option>
                            <option value="Porto">Porto</option>
                            <option value="Braga">Braga</option>
                            <option value="Faro">Faro</option>
                            <option value="Coimbra">Coimbra</option>
                            <option value="Cascais">Cascais</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn--primary">
                        <Search size={18} />
                        Search
                    </button>
                </form>
            </div>

            {/* Upcoming Appointments */}
            <div className="upcoming-section">
                <div className="section-header">
                    <h2>Upcoming Appointments</h2>
                    <Link to="/client/appointments" className="link">
                        View All →
                    </Link>
                </div>

                {upcomingAppointments.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} className="empty-state-icon" />
                        <h3>No upcoming appointments</h3>
                        <p>Search for businesses and book your first appointment!</p>
                        <Link to="/client/search" className="btn btn--primary">
                            <Search size={18} />
                            Find Businesses
                        </Link>
                    </div>
                ) : (
                    <div className="upcoming-appointments-list">
                        {upcomingAppointments.map((appointment) => (
                            <div key={appointment.id} className="upcoming-appointment-card">
                                <div className="appointment-date-badge">
                                    <div className="date-day">
                                        {new Date(appointment.appointment_date).getDate()}
                                    </div>
                                    <div className="date-month">
                                        {new Date(appointment.appointment_date).toLocaleDateString('en', {
                                            month: 'short'
                                        })}
                                    </div>
                                </div>

                                <div className="appointment-content" style={{ flex: 1 }}>
                                    <h3 style={{ 
                                        fontSize: 'var(--text-base)', 
                                        fontWeight: 'var(--font-weight-semibold)',
                                        color: 'var(--text-primary)',
                                        margin: '0 0 var(--space-2) 0'
                                    }}>
                                        {appointment.businesses?.business_name}
                                    </h3>
                                    <p style={{ 
                                        fontSize: 'var(--text-sm)', 
                                        color: 'var(--accent-secondary)',
                                        margin: '0 0 var(--space-2) 0'
                                    }}>
                                        {appointment.services?.service_name}
                                    </p>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: 'var(--space-3)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                            <Calendar size={14} />
                                            {formatDate(appointment.appointment_date)}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                            <Clock size={14} />
                                            {formatTime(appointment.appointment_time)}
                                        </span>
                                        {appointment.businesses?.city && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                                <MapPin size={14} />
                                                {appointment.businesses.city}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className={`status-badge status-${appointment.status}`}>
                                        {appointment.status}
                                    </span>
                                </div>

                                <Link 
                                    to={`/client/appointments`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 'var(--space-2)',
                                        color: 'var(--accent-primary)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                >
                                    <ArrowRight size={20} />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/client/search" className="action-card">
                        <Search size={32} className="action-icon" />
                        <h3>Find Businesses</h3>
                        <p>Search for salons, spas, clinics and more</p>
                    </Link>

                    <Link to="/client/appointments" className="action-card">
                        <Calendar size={32} className="action-icon" />
                        <h3>My Appointments</h3>
                        <p>View and manage your bookings</p>
                    </Link>

                    <Link to="/client/profile" className="action-card">
                        <Search size={32} className="action-icon" />
                        <h3>Update Profile</h3>
                        <p>Manage your account settings</p>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ClientHome
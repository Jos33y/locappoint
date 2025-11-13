import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
    BarChart3,
    Clock,
    CheckCircle,
    PartyPopper,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Settings,
    Copy,
    ExternalLink,
    Building2
} from 'lucide-react'
import '../../styles/dashboard.css'

const PortalDashboard = () => {
    const { userProfile } = useAuth()
    const [stats, setStats] = useState({
        totalAppointments: 0,
        pendingAppointments: 0,
        confirmedAppointments: 0,
        completedAppointments: 0,
    })
    const [recentAppointments, setRecentAppointments] = useState([])
    const [business, setBusiness] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch business info
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('user_id', userProfile.id)
                .single()

            if (businessError) throw businessError
            setBusiness(businessData)

            // Fetch appointments
            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select('*')
                .eq('business_id', businessData.id)
                .order('appointment_date', { ascending: false })
                .limit(5)

            if (appointmentsError) throw appointmentsError
            setRecentAppointments(appointmentsData || [])

            // Calculate stats
            const total = appointmentsData?.length || 0
            const pending = appointmentsData?.filter((a) => a.status === 'pending').length || 0
            const confirmed = appointmentsData?.filter((a) => a.status === 'confirmed').length || 0
            const completed = appointmentsData?.filter((a) => a.status === 'completed').length || 0

            setStats({
                totalAppointments: total,
                pendingAppointments: pending,
                confirmedAppointments: confirmed,
                completedAppointments: completed,
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const copyBusinessLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`)
        // You can add a toast notification here
        alert('Business link copied to clipboard!')
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        )
    }

    if (!business) {
        return (
            <div className="empty-state">
                <Building2 size={64} className="empty-state-icon" />
                <h2>Welcome to LocAppoint!</h2>
                <p>Let's set up your business profile to start accepting appointments.</p>
                <a href="/portal/profile" className="btn btn--primary">
                    Create Business Profile
                </a>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {userProfile?.full_name}!</h1>
                    <p className="dashboard-subtitle">Here's what's happening with your business today.</p>
                </div>
                <a href="/portal/profile" className="btn btn--secondary btn--small">
                    Edit Profile
                </a>
            </div>

            {/* Business Info Card */}
            <div className="business-info-card">
                <div className="business-logo">
                    {business.logo_url ? (
                        <img src={business.logo_url} alt={business.business_name} />
                    ) : (
                        <div className="logo-placeholder">{business.business_name.charAt(0)}</div>
                    )}
                </div>
                <div className="business-details">
                    <h2>{business.business_name}</h2>
                    <p className="business-slug">locappoint.com/{business.slug}</p>
                    <div className="business-meta">
                        <span className="business-category">
                            <Briefcase size={16} />
                            {business.category}
                        </span>
                        <span className="business-city">
                            <MapPin size={16} />
                            {business.city}
                        </span>
                    </div>
                </div>
                <div className="business-actions">
                    <button className="btn btn--outline btn--small" onClick={copyBusinessLink}>
                        <Copy size={16} />
                        Copy Link
                    </button>
                    <a
                        href={`/${business.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--outline btn--small"
                    >
                        <ExternalLink size={16} />
                        View Public Page
                    </a>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <BarChart3 size={32} className="stat-icon" />
                    <div className="stat-content">
                        <p className="stat-label">Total Appointments</p>
                        <p className="stat-number">{stats.totalAppointments}</p>
                    </div>
                </div>

                <div className="stat-card stat-pending">
                    <Clock size={32} className="stat-icon stat-icon-pending" />
                    <div className="stat-content">
                        <p className="stat-label">Pending</p>
                        <p className="stat-number">{stats.pendingAppointments}</p>
                    </div>
                </div>

                <div className="stat-card stat-confirmed">
                    <CheckCircle size={32} className="stat-icon stat-icon-confirmed" />
                    <div className="stat-content">
                        <p className="stat-label">Confirmed</p>
                        <p className="stat-number">{stats.confirmedAppointments}</p>
                    </div>
                </div>

                <div className="stat-card stat-completed">
                    <PartyPopper size={32} className="stat-icon stat-icon-completed" />
                    <div className="stat-content">
                        <p className="stat-label">Completed</p>
                        <p className="stat-number">{stats.completedAppointments}</p>
                    </div>
                </div>
            </div>

            {/* Recent Appointments */}
            <div className="recent-section">
                <div className="section-header">
                    <h2>Recent Appointments</h2>
                    <a href="/portal/appointments" className="link">
                        View All →
                    </a>
                </div>

                {recentAppointments.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} className="empty-state-icon" />
                        <p>No appointments yet. Share your business link to start receiving bookings!</p>
                    </div>
                ) : (
                    <div className="appointments-list">
                        {recentAppointments.map((appointment) => (
                            <div key={appointment.id} className="appointment-card">
                                <div className="appointment-date">
                                    <div className="date-day">
                                        {new Date(appointment.appointment_date).getDate()}
                                    </div>
                                    <div className="date-month">
                                        {new Date(appointment.appointment_date).toLocaleDateString('en', {
                                            month: 'short',
                                        })}
                                    </div>
                                </div>

                                <div className="appointment-details">
                                    <h3>{appointment.client_name}</h3>
                                    <p className="appointment-time">
                                        <Clock size={14} />
                                        {appointment.appointment_time}
                                    </p>
                                    <p className="appointment-contact">
                                        <Mail size={14} />
                                        {appointment.client_email}
                                        <Phone size={14} />
                                        {appointment.client_phone}
                                    </p>
                                    {appointment.notes && (
                                        <p className="appointment-notes">{appointment.notes}</p>
                                    )}
                                </div>

                                <div className="appointment-status">
                                    <span className={`status-badge status-${appointment.status}`}>
                                        {appointment.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <a href="/portal/services" className="action-card">
                        <Briefcase size={40} className="action-icon" />
                        <h3>Manage Services</h3>
                        <p>Add or edit your services and pricing</p>
                    </a>

                    <a href="/portal/availability" className="action-card">
                        <Clock size={40} className="action-icon" />
                        <h3>Set Availability</h3>
                        <p>Configure your working hours</p>
                    </a>

                    <a href="/portal/appointments" className="action-card">
                        <Calendar size={40} className="action-icon" />
                        <h3>View Appointments</h3>
                        <p>Manage all your bookings</p>
                    </a>

                    <a href="/portal/profile" className="action-card">
                        <Settings size={40} className="action-icon" />
                        <h3>Business Settings</h3>
                        <p>Update your business information</p>
                    </a>
                </div>
            </div>
        </div>
    )
}


export default PortalDashboard 
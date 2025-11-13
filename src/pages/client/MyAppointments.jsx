import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, Clock, MapPin, Phone, Mail, X, AlertTriangle, CheckCircle } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/client/client.css'

const ClientAppointments = () => {
    const { userProfile } = useAuth()
    const [appointments, setAppointments] = useState([])
    const [filteredAppointments, setFilteredAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState('upcoming')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [cancellingId, setCancellingId] = useState(null)

    useEffect(() => {
        fetchAppointments()
    }, [])

    useEffect(() => {
        filterAppointments()
    }, [appointments, activeFilter])

    const fetchAppointments = async () => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    businesses (
                        business_name,
                        slug,
                        city,
                        phone,
                        email
                    ),
                    services (
                        service_name,
                        duration_minutes,
                        price
                    )
                `)
                .eq('client_email', userProfile.email)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false })

            if (error) throw error
            setAppointments(data || [])
        } catch (error) {
            console.error('Error fetching appointments:', error)
            setError('Failed to load appointments')
        } finally {
            setLoading(false)
        }
    }

    const filterAppointments = () => {
        const today = new Date().toISOString().split('T')[0]
        let filtered = []

        switch (activeFilter) {
            case 'upcoming':
                filtered = appointments.filter(apt =>
                    apt.appointment_date >= today &&
                    ['pending', 'confirmed'].includes(apt.status)
                )
                break
            case 'past':
                filtered = appointments.filter(apt =>
                    apt.appointment_date < today ||
                    apt.status === 'completed'
                )
                break
            case 'cancelled':
                filtered = appointments.filter(apt => apt.status === 'cancelled')
                break
            default:
                filtered = appointments
        }

        setFilteredAppointments(filtered)
    }

    const handleCancelAppointment = async (appointmentId) => {
        if (!confirm('Are you sure you want to cancel this appointment?')) {
            return
        }

        setCancellingId(appointmentId)
        setError('')
        setSuccess('')

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId)

            if (error) throw error

            setAppointments(prev => prev.map(apt =>
                apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
            ))

            setSuccess('Appointment cancelled successfully')
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error cancelling appointment:', error)
            setError('Failed to cancel appointment')
        } finally {
            setCancellingId(null)
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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

    const getFilterCounts = () => {
        const today = new Date().toISOString().split('T')[0]
        return {
            upcoming: appointments.filter(apt =>
                apt.appointment_date >= today &&
                ['pending', 'confirmed'].includes(apt.status)
            ).length,
            past: appointments.filter(apt =>
                apt.appointment_date < today ||
                apt.status === 'completed'
            ).length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading appointments...</p>
            </div>
        )
    }

    const counts = getFilterCounts()

    return (
        <div className="my-appointments-page">
            <div className="page-header">
                <div>
                    <h1>My Appointments</h1>
                    <p className="page-subtitle">View and manage your bookings</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Filters */}
            <div className="appointments-filters">
                <button
                    className={`appointment-filter-btn ${activeFilter === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('upcoming')}
                >
                    Upcoming
                    <span className="tab-count">{counts.upcoming}</span>
                </button>
                <button
                    className={`appointment-filter-btn ${activeFilter === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('past')}
                >
                    Past
                    <span className="tab-count">{counts.past}</span>
                </button>
                <button
                    className={`appointment-filter-btn ${activeFilter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('cancelled')}
                >
                    Cancelled
                    <span className="tab-count">{counts.cancelled}</span>
                </button>
            </div>

            {/* Appointments List */}
            {filteredAppointments.length === 0 ? (
                <div className="empty-state">
                    <Calendar size={48} className="empty-state-icon" />
                    <h2>No {activeFilter} appointments</h2>
                    <p>
                        {activeFilter === 'upcoming'
                            ? "You don't have any upcoming appointments. Search for businesses to book!"
                            : `No ${activeFilter} appointments found.`
                        }
                    </p>
                    {activeFilter === 'upcoming' && (
                        <Link to="/client/search" className="btn btn--primary">
                            Find Businesses
                        </Link>
                    )}
                </div>
            ) : (
                <div className="my-appointments-list">
                    {filteredAppointments.map((appointment) => (
                        <div key={appointment.id} className="my-appointment-card">
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

                            <div className="appointment-info-section">
                                <h3 className="appointment-business-name">
                                    {appointment.businesses?.business_name}
                                </h3>
                                <p className="appointment-service-name">
                                    {appointment.services?.service_name}
                                </p>

                                <div className="appointment-details-row">
                                    <div className="appointment-detail-item">
                                        <Calendar size={14} />
                                        <span>{formatDate(appointment.appointment_date)}</span>
                                    </div>
                                    <div className="appointment-detail-item">
                                        <Clock size={14} />
                                        <span>{formatTime(appointment.appointment_time)}</span>
                                    </div>
                                    {appointment.services?.duration_minutes && (
                                        <div className="appointment-detail-item">
                                            <span>{appointment.services.duration_minutes} min</span>
                                        </div>
                                    )}
                                    {appointment.services?.price && (
                                        <div className="appointment-detail-item">
                                            <span>€{parseFloat(appointment.services.price).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {appointment.businesses?.city && (
                                    <div className="appointment-details-row">
                                        <div className="appointment-detail-item">
                                            <MapPin size={14} />
                                            <span>{appointment.businesses.city}</span>
                                        </div>
                                    </div>
                                )}

                                {appointment.businesses && (appointment.businesses.phone || appointment.businesses.email) && (
                                    <div className="appointment-details-row">
                                        {appointment.businesses.phone && (
                                            <div className="appointment-detail-item">
                                                <Phone size={14} />
                                                <span>{appointment.businesses.phone}</span>
                                            </div>
                                        )}
                                        {appointment.businesses.email && (
                                            <div className="appointment-detail-item">
                                                <Mail size={14} />
                                                <span>{appointment.businesses.email}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {appointment.notes && (
                                    <div style={{
                                        marginTop: 'var(--space-3)',
                                        padding: 'var(--space-3)',
                                        background: 'rgba(6, 182, 212, 0.05)',
                                        borderLeft: '3px solid var(--accent-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                            Notes:
                                        </strong>
                                        {appointment.notes}
                                    </div>
                                )}
                            </div>

                            <div className="appointment-actions-section">
                                <span
                                    className={`status-badge status-${appointment.status}`}
                                >
                                    {appointment.status}
                                </span>

                                {['pending', 'confirmed'].includes(appointment.status) && (
                                    <div className="appointment-action-buttons">
                                        <button
                                            onClick={() => handleCancelAppointment(appointment.id)}
                                            className="btn btn--small btn-cancel"
                                            disabled={cancellingId === appointment.id}
                                        >
                                            <X size={14} />
                                            {cancellingId === appointment.id ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    </div>
                                )}

                                {appointment.businesses?.slug && (
                                    <Link
                                        to={`/${appointment.businesses.slug}`}
                                        className="btn btn--small btn--outline"
                                    >
                                        View Business
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ClientAppointments
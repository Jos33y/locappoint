import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Calendar, Clock, Mail, Phone, User, CheckCircle, XCircle, MoreVertical, Filter } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'
import '../../styles/portal/appointments.css'

const PortalAppointments = () => {
    const { userProfile } = useAuth()
    const [business, setBusiness] = useState(null)
    const [appointments, setAppointments] = useState([])
    const [filteredAppointments, setFilteredAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState('all')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const statusColors = {
        pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '#f59e0b' },
        confirmed: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '#10b981' },
        cancelled: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '#ef4444' },
        completed: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '#8b5cf6' },
    }

    useEffect(() => {
        fetchBusinessAndAppointments()
    }, [])

    useEffect(() => {
        filterAppointments()
    }, [appointments, activeFilter])

    const fetchBusinessAndAppointments = async () => {
        try {
            // Get business
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', userProfile.id)
                .single()

            if (businessError) throw businessError
            setBusiness(businessData)

            // Get appointments with service details
            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    services (
                        service_name,
                        duration_minutes,
                        price
                    )
                `)
                .eq('business_id', businessData.id)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false })

            if (appointmentsError) throw appointmentsError
            setAppointments(appointmentsData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
            setError('Failed to load appointments')
        } finally {
            setLoading(false)
        }
    }

    const filterAppointments = () => {
        if (activeFilter === 'all') {
            setFilteredAppointments(appointments)
        } else {
            setFilteredAppointments(appointments.filter(apt => apt.status === activeFilter))
        }
    }

    const handleStatusChange = async (appointmentId, newStatus) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', appointmentId)

            if (error) throw error

            setAppointments(prev => prev.map(apt =>
                apt.id === appointmentId ? { ...apt, status: newStatus } : apt
            ))

            setSuccess(`Appointment ${newStatus}`)
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error updating appointment:', error)
            setError('Failed to update appointment')
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

    const getStatusCounts = () => {
        return {
            all: appointments.length,
            pending: appointments.filter(a => a.status === 'pending').length,
            confirmed: appointments.filter(a => a.status === 'confirmed').length,
            cancelled: appointments.filter(a => a.status === 'cancelled').length,
            completed: appointments.filter(a => a.status === 'completed').length,
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

    if (!business) {
        return (
            <div className="empty-state">
                <Calendar size={64} className="empty-state-icon" />
                <h2>Create Business Profile First</h2>
                <p>You need to set up your business profile before managing appointments.</p>
                <a href="/portal/profile" className="btn btn--primary">
                    Create Business Profile
                </a>
            </div>
        )
    }

    const counts = getStatusCounts()

    return (
        <div className="appointments-page">
            <div className="page-header">
                <div>
                    <h1>Appointments</h1>
                    <p className="page-subtitle">Manage your bookings and schedule</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}>
                    All
                    <span className="tab-count">{counts.all}</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('pending')}>
                    Pending
                    <span className="tab-count pending">{counts.pending}</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'confirmed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('confirmed')}>
                    Confirmed
                    <span className="tab-count confirmed">{counts.confirmed}</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('completed')}>
                    Completed
                    <span className="tab-count completed">{counts.completed}</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('cancelled')}>
                    Cancelled
                    <span className="tab-count cancelled">{counts.cancelled}</span>
                </button>
            </div>

            {/* Appointments List */}
            {filteredAppointments.length === 0 ? (
                <div className="empty-state">
                    <Calendar size={48} className="empty-state-icon" />
                    <h2>No {activeFilter !== 'all' ? activeFilter : ''} appointments</h2>
                    <p>
                        {activeFilter === 'all'
                            ? "You don't have any appointments yet. Share your business link to start receiving bookings!"
                            : `No ${activeFilter} appointments at the moment.`
                        }
                    </p>
                </div>
            ) : (
                <div className="appointments-list">
                    {filteredAppointments.map((appointment) => (
                        <div key={appointment.id} className="appointment-item">
                            <div className="appointment-date-badge">
                                <div className="date-day">
                                    {new Date(appointment.appointment_date).getDate()}
                                </div>
                                <div className="date-month">
                                    {new Date(appointment.appointment_date).toLocaleDateString('en', {
                                        month: 'short',
                                    })}
                                </div>
                            </div>

                            <div className="appointment-content">
                                <div className="appointment-main">
                                    <div className="appointment-info">
                                        <h3 className="client-name">
                                            <User size={16} />
                                            {appointment.client_name}
                                        </h3>

                                        <div className="appointment-details-grid">
                                            <div className="detail-item">
                                                <Calendar size={14} />
                                                <span>{formatDate(appointment.appointment_date)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <Clock size={14} />
                                                <span>{formatTime(appointment.appointment_time)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <Mail size={14} />
                                                <span>{appointment.client_email}</span>
                                            </div>
                                            <div className="detail-item">
                                                <Phone size={14} />
                                                <span>{appointment.client_phone}</span>
                                            </div>
                                        </div>

                                        {appointment.services && (
                                            <div className="service-info">
                                                <strong>Service:</strong> {appointment.services.service_name}
                                                <span className="service-meta">
                                                    {appointment.services.duration_minutes} min • €{parseFloat(appointment.services.price).toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        {appointment.notes && (
                                            <div className="appointment-notes">
                                                <strong>Notes:</strong> {appointment.notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="appointment-actions">
                                        <span
                                            className="status-badge"
                                            style={{
                                                background: statusColors[appointment.status].bg,
                                                color: statusColors[appointment.status].color,
                                                borderColor: statusColors[appointment.status].border
                                            }}>
                                            {appointment.status}
                                        </span>

                                        {appointment.status === 'pending' && (
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                                                    className="btn btn--small btn-confirm"
                                                    title="Confirm">
                                                    <CheckCircle size={14} />
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                                    className="btn btn--small btn-cancel"
                                                    title="Cancel">
                                                    <XCircle size={14} />
                                                    Decline
                                                </button>
                                            </div>
                                        )}

                                        {appointment.status === 'confirmed' && (
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleStatusChange(appointment.id, 'completed')}
                                                    className="btn btn--small btn-complete"
                                                    title="Mark as completed">
                                                    <CheckCircle size={14} />
                                                    Complete
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                                    className="btn btn--small btn-cancel"
                                                    title="Cancel">
                                                    <XCircle size={14} />
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PortalAppointments
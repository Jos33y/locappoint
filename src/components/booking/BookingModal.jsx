import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { X, Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle } from 'lucide-react'
import '../../styles/client/client.css'

const BookingModal = ({ business, service, onClose, onSuccess }) => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    
    const [step, setStep] = useState(1)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedTime, setSelectedTime] = useState(null)
    const [availableSlots, setAvailableSlots] = useState([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    
    const [formData, setFormData] = useState({
        name: userProfile?.full_name || '',
        email: userProfile?.email || user?.email || '',
        phone: userProfile?.phone || '',
        notes: ''
    })
    const [errors, setErrors] = useState({})

    // Restore pending booking state on mount
    useEffect(() => {
        const pendingBooking = sessionStorage.getItem('pendingBooking')
        if (pendingBooking && user) {
            try {
                const booking = JSON.parse(pendingBooking)
                if (booking.serviceId === service.id) {
                    // Restore date and time
                    const date = new Date(booking.date)
                    setSelectedDate(date)
                    setSelectedTime(booking.time)
                    setStep(2) // Go to time selection step (will show selected time)
                    
                    // After a brief moment, move to form step
                    setTimeout(() => {
                        setStep(3)
                    }, 500)
                }
            } catch (error) {
                console.error('Error restoring booking:', error)
            }
        }
    }, [])

    useEffect(() => {
        if (selectedDate) {
            fetchAvailableSlots()
        }
    }, [selectedDate])

    const fetchAvailableSlots = async () => {
        if (!selectedDate) return

        setLoading(true)
        try {
            const dayOfWeek = selectedDate.getDay()
            
            // Get business availability for this day
            const { data: availability, error: availError } = await supabase
                .from('availability')
                .select('*')
                .eq('business_id', business.id)
                .eq('day_of_week', dayOfWeek)
                .eq('is_active', true)

            if (availError) throw availError

            if (!availability || availability.length === 0) {
                setAvailableSlots([])
                setLoading(false)
                return
            }

            // Get existing appointments for this date
            const { data: appointments, error: aptError } = await supabase
                .from('appointments')
                .select('appointment_time, service_id')
                .eq('business_id', business.id)
                .eq('appointment_date', selectedDate.toISOString().split('T')[0])
                .in('status', ['pending', 'confirmed'])

            if (aptError) throw aptError

            // Generate time slots
            const slots = generateTimeSlots(availability, appointments || [], service.duration_minutes)
            setAvailableSlots(slots)

        } catch (error) {
            console.error('Error fetching slots:', error)
            setAvailableSlots([])
        } finally {
            setLoading(false)
        }
    }

    const generateTimeSlots = (availability, appointments, serviceDuration) => {
        const slots = []
        
        availability.forEach(window => {
            let currentTime = parseTime(window.start_time)
            const endTime = parseTime(window.end_time)
            
            while (currentTime < endTime) {
                // Check if service fits in remaining window
                const slotEnd = addMinutes(currentTime, serviceDuration)
                if (slotEnd <= endTime) {
                    const timeString = formatTime(currentTime)
                    const isBooked = appointments.some(apt => apt.appointment_time === timeString)
                    
                    if (!isBooked) {
                        slots.push({
                            time: timeString,
                            display: timeString,
                            available: true
                        })
                    }
                }
                currentTime = addMinutes(currentTime, 30) // 30-min intervals
            }
        })
        
        return slots.sort((a, b) => a.time.localeCompare(b.time))
    }

    const parseTime = (timeString) => {
        const [hours, minutes] = timeString.split(':').map(Number)
        return hours * 60 + minutes
    }

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
    }

    const addMinutes = (time, minutes) => {
        return time + minutes
    }

    const handleDateSelect = (date) => {
        setSelectedDate(date)
        setSelectedTime(null)
        setStep(2)
    }

    const handleTimeSelect = (time) => {
        setSelectedTime(time)
        
        // Check if user is logged in before proceeding to form
        if (!user) {
            // Save booking state to resume after login
            const bookingState = {
                businessSlug: business.slug,
                serviceId: service.id,
                date: selectedDate.toISOString(),
                time: time
            }
            sessionStorage.setItem('pendingBooking', JSON.stringify(bookingState))
            
            // Redirect to auth page
            navigate('/app/auth', { 
                state: { 
                    tab: 'signin',
                    returnTo: `/${business.slug}`,
                    message: 'Please sign in to complete your booking'
                } 
            })
            return
        }
        
        setStep(3)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = () => {
        const newErrors = {}
        
        if (!formData.name.trim()) newErrors.name = 'Name is required'
        if (!formData.email.trim()) newErrors.email = 'Email is required'
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
        
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return

        setLoading(true)
        try {
            const appointmentData = {
                business_id: business.id,
                client_id: user?.id || null,
                service_id: service.id,
                appointment_date: selectedDate.toISOString().split('T')[0],
                appointment_time: selectedTime,
                client_name: formData.name,
                client_email: formData.email,
                client_phone: formData.phone,
                notes: formData.notes,
                status: 'pending'
            }

            const { data, error } = await supabase
                .from('appointments')
                .insert([appointmentData])
                .select()
                .single()

            if (error) throw error

            setSuccess(true)
            setTimeout(() => {
                onSuccess()
            }, 2000)

        } catch (error) {
            console.error('Error creating appointment:', error)
            alert('Failed to create appointment. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Generate next 30 days for calendar
    const generateCalendarDays = () => {
        const days = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            days.push(date)
        }
        
        return days
    }

    const calendarDays = generateCalendarDays()

    if (success) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="success-message">
                        <CheckCircle size={64} color="#10b981" />
                        <h2>Booking Confirmed!</h2>
                        <p>Your appointment has been booked successfully.</p>
                        <p className="text-muted">
                            Date: {selectedDate?.toLocaleDateString()}<br />
                            Time: {selectedTime}<br />
                            Service: {service.service_name}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content booking-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2>Book: {service.service_name}</h2>
                        <p className="text-muted">
                            {service.duration_minutes} min • €{service.price}
                        </p>
                    </div>
                    <button onClick={onClose} className="btn-close">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="booking-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <Calendar size={20} />
                        <span>Date</span>
                    </div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <Clock size={20} />
                        <span>Time</span>
                    </div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <User size={20} />
                        <span>Details</span>
                    </div>
                </div>

                {/* Step 1: Select Date */}
                {step === 1 && (
                    <div className="booking-step-content">
                        <h3>Select a Date</h3>
                        <div className="calendar-grid">
                            {calendarDays.map((date, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleDateSelect(date)}
                                    className={`calendar-day ${selectedDate?.toDateString() === date.toDateString() ? 'selected' : ''}`}
                                >
                                    <span className="day-name">
                                        {date.toLocaleDateString('en', { weekday: 'short' })}
                                    </span>
                                    <span className="day-number">
                                        {date.getDate()}
                                    </span>
                                    <span className="day-month">
                                        {date.toLocaleDateString('en', { month: 'short' })}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Time */}
                {step === 2 && (
                    <div className="booking-step-content">
                        <button onClick={() => setStep(1)} className="btn btn--ghost">
                            ← Change Date
                        </button>
                        <h3>Select a Time</h3>
                        <p className="text-muted">
                            {selectedDate?.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        
                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="empty-state">
                                <p>No available slots for this date. Please select another date.</p>
                            </div>
                        ) : (
                            <div className="time-slots-grid">
                                {availableSlots.map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                                    >
                                        {slot.display.substring(0, 5)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Enter Details */}
                {step === 3 && (
                    <div className="booking-step-content">
                        <button onClick={() => setStep(2)} className="btn btn--ghost">
                            ← Change Time
                        </button>
                        <h3>Your Details</h3>
                        <p className="text-muted">
                            {selectedDate?.toLocaleDateString()} at {selectedTime?.substring(0, 5)}
                        </p>

                        <form onSubmit={handleSubmit} className="booking-form">
                            <div className="form-group">
                                <label htmlFor="name">
                                    <User size={16} />
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`input ${errors.name ? 'error' : ''}`}
                                    placeholder="Your full name"
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">
                                    <Mail size={16} />
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`input ${errors.email ? 'error' : ''}`}
                                    placeholder="your.email@example.com"
                                />
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">
                                    <Phone size={16} />
                                    Phone *
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className={`input ${errors.phone ? 'error' : ''}`}
                                    placeholder="+351 912 345 678"
                                />
                                {errors.phone && <span className="error-message">{errors.phone}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">
                                    <MessageSquare size={16} />
                                    Notes (Optional)
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="input"
                                    rows="3"
                                    placeholder="Any special requests or notes..."
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn--primary"
                                style={{ width: '100%' }}
                                disabled={loading}>
                                {loading ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BookingModal
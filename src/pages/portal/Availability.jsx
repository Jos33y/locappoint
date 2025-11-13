import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Clock, Save, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import '../../styles/dashboard.css'
import '../../styles/forms.css'
import '../../styles/portal/availability.css'

const PortalAvailability = () => {
    const { userProfile } = useAuth()
    const [business, setBusiness] = useState(null)
    const [availability, setAvailability] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const daysOfWeek = [
        { id: 0, name: 'Sunday', short: 'Sun' },
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' },
        { id: 6, name: 'Saturday', short: 'Sat' },
    ]

    // Initialize with default closed schedule
    const initializeSchedule = () => {
        return daysOfWeek.map(day => ({
            day_of_week: day.id,
            start_time: '09:00',
            end_time: '18:00',
            is_active: false,
            isNew: true
        }))
    }

    useEffect(() => {
        fetchBusinessAndAvailability()
    }, [])

    const fetchBusinessAndAvailability = async () => {
        try {
            // Get business
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', userProfile.id)
                .single()

            if (businessError) throw businessError
            setBusiness(businessData)

            // Get availability
            const { data: availabilityData, error: availabilityError } = await supabase
                .from('availability')
                .select('*')
                .eq('business_id', businessData.id)
                .order('day_of_week')

            if (availabilityError) throw availabilityError

            // Merge with default schedule
            const schedule = daysOfWeek.map(day => {
                const existing = availabilityData?.find(a => a.day_of_week === day.id)
                return existing || {
                    day_of_week: day.id,
                    start_time: '09:00',
                    end_time: '18:00',
                    is_active: false,
                    isNew: true
                }
            })

            setAvailability(schedule)
        } catch (error) {
            console.error('Error fetching data:', error)
            setError('Failed to load availability')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleDay = (dayIndex) => {
        setAvailability(prev => prev.map((slot, idx) => 
            idx === dayIndex ? { ...slot, is_active: !slot.is_active } : slot
        ))
        setError('')
        setSuccess('')
    }

    const handleTimeChange = (dayIndex, field, value) => {
        setAvailability(prev => prev.map((slot, idx) => 
            idx === dayIndex ? { ...slot, [field]: value } : slot
        ))
        setError('')
        setSuccess('')
    }

    const handleCopyToAll = (dayIndex) => {
        const sourceDay = availability[dayIndex]
        setAvailability(prev => prev.map(slot => ({
            ...slot,
            start_time: sourceDay.start_time,
            end_time: sourceDay.end_time,
            is_active: sourceDay.is_active
        })))
        setSuccess('Schedule copied to all days')
        setTimeout(() => setSuccess(''), 2000)
    }

    const validateSchedule = () => {
        for (let i = 0; i < availability.length; i++) {
            const slot = availability[i]
            if (slot.is_active) {
                if (!slot.start_time || !slot.end_time) {
                    setError(`Please set times for ${daysOfWeek[i].name}`)
                    return false
                }
                if (slot.start_time >= slot.end_time) {
                    setError(`End time must be after start time for ${daysOfWeek[i].name}`)
                    return false
                }
            }
        }
        return true
    }

    const handleSave = async () => {
        if (!validateSchedule()) return

        setSaving(true)
        setError('')
        setSuccess('')

        try {
            // Delete all existing availability for this business
            const { error: deleteError } = await supabase
                .from('availability')
                .delete()
                .eq('business_id', business.id)

            if (deleteError) throw deleteError

            // Insert only active days
            const activeSlots = availability
                .filter(slot => slot.is_active)
                .map(slot => ({
                    business_id: business.id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_active: true
                }))

            if (activeSlots.length > 0) {
                const { error: insertError } = await supabase
                    .from('availability')
                    .insert(activeSlots)

                if (insertError) throw insertError
            }

            setSuccess('Availability saved successfully!')
            
            // Refresh data
            await fetchBusinessAndAvailability()
            
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error saving availability:', error)
            setError('Failed to save availability')
        } finally {
            setSaving(false)
        }
    }

    const setCommonHours = (preset) => {
        let hours = { start: '09:00', end: '18:00' }
        
        switch(preset) {
            case 'business':
                hours = { start: '09:00', end: '18:00' }
                break
            case 'retail':
                hours = { start: '10:00', end: '20:00' }
                break
            case 'restaurant':
                hours = { start: '12:00', end: '22:00' }
                break
            case 'salon':
                hours = { start: '09:00', end: '19:00' }
                break
            case 'gym':
                hours = { start: '06:00', end: '22:00' }
                break
        }

        setAvailability(prev => prev.map((slot, idx) => ({
            ...slot,
            start_time: hours.start,
            end_time: hours.end,
            is_active: idx >= 1 && idx <= 5 // Mon-Fri active
        })))
        setSuccess('Preset hours applied')
        setTimeout(() => setSuccess(''), 2000)
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading availability...</p>
            </div>
        )
    }

    if (!business) {
        return (
            <div className="empty-state">
                <Clock size={64} className="empty-state-icon" />
                <h2>Create Business Profile First</h2>
                <p>You need to set up your business profile before setting availability.</p>
                <a href="/portal/profile" className="btn btn--primary">
                    Create Business Profile
                </a>
            </div>
        )
    }

    return (
        <div className="availability-page">
            <div className="page-header">
                <div>
                    <h1>Availability</h1>
                    <p className="page-subtitle">Set your weekly schedule and working hours</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn btn--primary"
                    disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Schedule'}
                </button>
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

            {/* Quick Presets */}
            <div className="presets-section">
                <h3>Quick Presets</h3>
                <div className="presets-grid">
                    <button
                        onClick={() => setCommonHours('business')}
                        className="preset-btn">
                        Business Hours<br/>
                        <small>Mon-Fri 9am-6pm</small>
                    </button>
                    <button
                        onClick={() => setCommonHours('retail')}
                        className="preset-btn">
                        Retail Hours<br/>
                        <small>Mon-Fri 10am-8pm</small>
                    </button>
                    <button
                        onClick={() => setCommonHours('restaurant')}
                        className="preset-btn">
                        Restaurant Hours<br/>
                        <small>Mon-Fri 12pm-10pm</small>
                    </button>
                    <button
                        onClick={() => setCommonHours('salon')}
                        className="preset-btn">
                        Salon Hours<br/>
                        <small>Mon-Fri 9am-7pm</small>
                    </button>
                    <button
                        onClick={() => setCommonHours('gym')}
                        className="preset-btn">
                        Gym Hours<br/>
                        <small>Mon-Fri 6am-10pm</small>
                    </button>
                </div>
            </div>

            {/* Weekly Schedule */}
            <div className="schedule-section">
                <h3>Weekly Schedule</h3>
                
                <div className="schedule-list">
                    {availability.map((slot, index) => {
                        const day = daysOfWeek[index]
                        return (
                            <div key={day.id} className={`day-row ${slot.is_active ? 'active' : 'inactive'}`}>
                                <div className="day-header">
                                    <button
                                        onClick={() => handleToggleDay(index)}
                                        className="day-toggle"
                                    >
                                        {slot.is_active ? (
                                            <ToggleRight size={24} className="toggle-icon active" />
                                        ) : (
                                            <ToggleLeft size={24} className="toggle-icon inactive" />
                                        )}
                                    </button>
                                    <div className="day-name">
                                        <strong>{day.name}</strong>
                                        {!slot.is_active && <span className="closed-badge">Closed</span>}
                                    </div>
                                </div>

                                {slot.is_active && (
                                    <div className="day-times">
                                        <div className="time-input-group">
                                            <label>Open</label>
                                            <input
                                                type="time"
                                                value={slot.start_time}
                                                onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                                            />
                                        </div>
                                        <span className="time-separator">to</span>
                                        <div className="time-input-group">
                                            <label>Close</label>
                                            <input
                                                type="time"
                                                value={slot.end_time}
                                                onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleCopyToAll(index)}
                                            className="btn btn--outline btn--small"
                                            title="Copy to all days"
                                        >
                                            Copy to All
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Tips */}
            <div className="tips-section">
                <h4>💡 Tips</h4>
                <ul>
                    <li>Toggle days on/off to set which days you're open</li>
                    <li>Use "Copy to All" to quickly apply the same hours to every day</li>
                    <li>Use Quick Presets for common schedules</li>
                    <li>Make sure end time is after start time</li>
                    <li>Don't forget to click "Save Schedule" when done</li>
                </ul>
            </div>
        </div>
    )
}

export default PortalAvailability
import { useState } from 'react'
import { Handshake, User, Phone, Mail, Building2, MessageSquare } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { supabase } from '../../config/supabase'
import '../../styles/app/partnership.css'

const AppPartnership = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organizationType: '',
        organizationName: '',
        city: '',
        country: '',
        partnershipInterest: ''
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('') 

    const organizationTypes = [
        'Events & Entertainment',
        'Healthcare Services',
        'Beauty & Wellness',
        'Legal Services',
        'Home Services',
        'Auto Services',
        'Education & Tutoring',
        'Fitness & Sports',
        'Restaurant & Food',
        'Other'
    ]

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validation
        if (!formData.firstName || !formData.lastName || !formData.email ||
            !formData.phone || !formData.organizationType) {
            setError('Please fill in all required fields')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: dbError } = await supabase
                .from('partnership_requests')
                .insert([{
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    organization_type: formData.organizationType,
                    organization_name: formData.organizationName,
                    city: formData.city,
                    country: formData.country,
                    partnership_interest: formData.partnershipInterest
                }])

            if (dbError) throw dbError

            setSuccess(true)
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                organizationType: '',
                organizationName: '',
                city: '',
                country: '',
                partnershipInterest: ''
            })

            // Hide success message after 5 seconds
            setTimeout(() => setSuccess(false), 5000)

        } catch (error) {
            console.error('Error submitting partnership request:', error)
            setError('Failed to submit request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="partnership-page">
            <AppHeader />

            <main className="partnership-content">
                <div className="container">
                    {/* Hero Section */}
                    <div className="partnership-hero">
                        <div className="hero-icon">
                            <Handshake size={48} />
                        </div>
                        <h1>Early Partnership Program</h1>
                        <p>
                            Join us as a founding partner and help shape the future of appointment
                            booking for service professionals
                        </p>
                    </div>

                    {/* Form */}
                    <div className="partnership-form-container">
                        <form onSubmit={handleSubmit} className="partnership-form">
                            {/* Success Message */}
                            {success && (
                                <div className="alert alert--success">
                                    <span>✓</span>
                                    Thank you! We'll review your application and contact you within 48 hours.
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="alert alert--error">
                                    <span>!</span>
                                    {error}
                                </div>
                            )}

                            {/* Personal Information */}
                            <div className="form-section">
                                <div className="section-header">
                                    <User size={20} />
                                    <h2>Personal Information</h2>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="firstName">First Name *</label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lastName">Last Name *</label>
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="form-section">
                                <div className="section-header">
                                    <Phone size={20} />
                                    <h2>Contact Information</h2>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="email">
                                            <Mail size={14} />
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="phone">
                                            <Phone size={14} />
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+351 912 345 678"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Organization Information */}
                            <div className="form-section">
                                <div className="section-header">
                                    <Building2 size={20} />
                                    <h2>Organization Information</h2>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="organizationType">Organization Type *</label>
                                    <select
                                        id="organizationType"
                                        name="organizationType"
                                        value={formData.organizationType}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select type...</option>
                                        {organizationTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="organizationName">Organization/Business Name</label>
                                    <input
                                        type="text"
                                        id="organizationName"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder="Your business name (if applicable)"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="city">City</label>
                                        <input
                                            type="text"
                                            id="city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="Lisbon, Porto, Lagos..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="country">Country</label>
                                        <input
                                            type="text"
                                            id="country"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            placeholder="Portugal, Nigeria..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Partnership Interest */}
                            <div className="form-section">
                                <div className="section-header">
                                    <MessageSquare size={20} />
                                    <h2>Partnership Interest</h2>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="partnershipInterest">
                                        Tell us why you're interested in partnering with LocAppoint
                                    </label>
                                    <textarea
                                        id="partnershipInterest"
                                        name="partnershipInterest"
                                        value={formData.partnershipInterest}
                                        onChange={handleChange}
                                        rows="5"
                                        placeholder="Share your goals, challenges, or how you envision using LocAppoint..."
                                    ></textarea>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn--primary btn--large"
                                disabled={loading}
                                style={{ width: '100%' }}
                            >
                                {loading ? 'Submitting...' : 'Submit Partnership Request'}
                            </button>

                            <p className="form-footer-text">
                                We'll review your application and contact you within 48 hours
                            </p>
                        </form>
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    )
}

export default AppPartnership
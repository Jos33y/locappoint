// PartnershipModal.jsx - Partnership modal with AI aesthetic (pure CSS)
// Location: src/pages/landing/PartnershipModal.jsx

import { useState, useEffect } from 'react'
import { 
    X, 
    Handshake, 
    User, 
    Mail, 
    Phone, 
    Building2, 
    MapPin, 
    MessageSquare,
    CheckCircle, 
    AlertCircle, 
    Loader2,
    ChevronDown
} from 'lucide-react'
import { supabase } from '../../config/supabase'

const PartnershipModal = ({ isOpen, onClose }) => {
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
    const [isClosing, setIsClosing] = useState(false)

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

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSuccess(false)
            setError('')
            setIsClosing(false)
        }
    }, [isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen])

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            onClose()
            setIsClosing(false)
        }, 300)
    }

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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: dbError } = await supabase
                .from('partnership_requests')
                .insert([{
                    first_name: formData.firstName.trim(),
                    last_name: formData.lastName.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    organization_type: formData.organizationType,
                    organization_name: formData.organizationName.trim() || null,
                    city: formData.city.trim() || null,
                    country: formData.country.trim() || null,
                    partnership_interest: formData.partnershipInterest.trim() || null
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

        } catch (err) {
            console.error('Error submitting partnership request:', err)
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div 
            className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
            onClick={handleClose}
        >
            <div 
                className={`modal partnership-modal ${isClosing ? 'modal--closing' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background effects */}
                <div className="modal__bg">
                    <div className="modal__orb modal__orb--1" />
                    <div className="modal__orb modal__orb--2" />
                    <div className="modal__grid" />
                </div>

                {/* Close button */}
                <button 
                    className="modal__close" 
                    onClick={handleClose}
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="modal__content">
                    {!success ? (
                        <>
                            {/* Header */}
                            <div className="modal__header">
                                <div className="modal__icon modal__icon--cyan">
                                    <Handshake size={24} />
                                </div>
                                <h2 className="modal__title">Become a Partner</h2>
                                <p className="modal__subtitle">
                                    Join our early partnership program and grow with us
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="modal__form">
                                {/* Error message */}
                                {error && (
                                    <div className="modal__alert modal__alert--error">
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Name row */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-firstName">
                                            <User size={14} />
                                            First Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="First name"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-lastName">
                                            Last Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Last name"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Contact row */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-email">
                                            <Mail size={14} />
                                            Email <span className="required">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="partner-email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="your@email.com"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-phone">
                                            <Phone size={14} />
                                            Phone <span className="required">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="partner-phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+351 912 345 678"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Organization Type */}
                                <div className="modal__field">
                                    <label htmlFor="partner-organizationType">
                                        <Building2 size={14} />
                                        Organization Type <span className="required">*</span>
                                    </label>
                                    <div className="modal__select-wrapper">
                                        <select
                                            id="partner-organizationType"
                                            name="organizationType"
                                            value={formData.organizationType}
                                            onChange={handleChange}
                                            disabled={loading}
                                            required
                                        >
                                            <option value="">Select type...</option>
                                            {organizationTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="modal__select-icon" />
                                    </div>
                                </div>

                                {/* Organization Name */}
                                <div className="modal__field">
                                    <label htmlFor="partner-organizationName">
                                        Organization Name <span className="optional">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="partner-organizationName"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder="Your business name"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Location row */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-city">
                                            <MapPin size={14} />
                                            City <span className="optional">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="Lisbon, Porto, Lagos..."
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-country">
                                            Country <span className="optional">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-country"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            placeholder="Portugal, Nigeria..."
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Partnership Interest */}
                                <div className="modal__field">
                                    <label htmlFor="partner-interest">
                                        <MessageSquare size={14} />
                                        Why partner with us? <span className="optional">(optional)</span>
                                    </label>
                                    <textarea
                                        id="partner-interest"
                                        name="partnershipInterest"
                                        value={formData.partnershipInterest}
                                        onChange={handleChange}
                                        placeholder="Share your goals or how you'd like to collaborate..."
                                        rows="3"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    className="modal__submit modal__submit--cyan"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Handshake size={18} />
                                            <span>Submit Partnership Request</span>
                                        </>
                                    )}
                                </button>

                                <p className="modal__privacy">
                                    We'll review your application and contact you within 48 hours.
                                </p>
                            </form>
                        </>
                    ) : (
                        /* Success state */
                        <div className="modal__success">
                            <div className="modal__success-icon modal__success-icon--cyan">
                                <CheckCircle size={48} />
                            </div>
                            <h2>Application Received!</h2>
                            <p>
                                Thanks for your interest in partnering with LocAppoint. 
                                We'll review your application and get back to you within 48 hours.
                            </p>
                            <button
                                type="button"
                                className="modal__submit modal__submit--cyan"
                                onClick={handleClose}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PartnershipModal
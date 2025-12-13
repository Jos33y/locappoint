// PartnershipModal.jsx - Partnership modal with Analytics
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
    Globe, 
    MessageSquare,
    CheckCircle, 
    AlertCircle, 
    Loader2,
    ChevronDown
} from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'
import { COUNTRIES } from '../../constants/countries'
import { useUserCountry } from '../../hooks/useUserCountry'
import { trackFormSubmit } from '../../services/analytics'

const PartnershipModal = ({ isOpen, onClose }) => {
    const { t } = useLandingTranslation()
    const { countryCode } = useUserCountry()
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

    const organizationTypes = t('partnershipModal.orgTypes')

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

    // Auto-set country from detected location
    useEffect(() => {
        if (countryCode && !formData.country) {
            setFormData(prev => ({ ...prev, country: countryCode }))
        }
    }, [countryCode])

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
            setError(t('partnershipModal.errorRequired'))
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError(t('partnershipModal.errorEmail'))
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
                    country: formData.country || null,
                    partnership_interest: formData.partnershipInterest.trim() || null
                }])

            if (dbError) throw dbError

            // Track successful submission
            await trackFormSubmit('partnership', {
                country: formData.country,
                organizationType: formData.organizationType
            })

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
            setError(t('partnershipModal.errorGeneric'))
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

                <div className="modal__content">
                    {!success ? (
                        <>
                            {/* Header */}
                            <div className="modal__header modal__header--cyan">
                                <div className="modal__icon modal__icon--cyan">
                                    <Handshake size={28} />
                                </div>
                                <h2>{t('partnershipModal.title')}</h2>
                                <p>{t('partnershipModal.subtitle')}</p>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="modal__alert modal__alert--error">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="modal__form">
                                {/* Name row */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-firstName">
                                            <User size={14} />
                                            {t('partnershipModal.firstName')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.firstName')}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-lastName">
                                            <User size={14} />
                                            {t('partnershipModal.lastName')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.lastName')}
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
                                            {t('partnershipModal.email')} <span className="required">*</span>
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
                                            {t('partnershipModal.phone')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="partner-phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.phonePlaceholder')}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Organization Type */}
                                <div className="modal__field">
                                    <label htmlFor="partner-organizationType">
                                        <Building2 size={14} />
                                        {t('partnershipModal.orgType')} <span className="required">*</span>
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
                                            <option value="">{t('partnershipModal.orgTypePlaceholder')}</option>
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
                                        {t('partnershipModal.orgName')} <span className="optional">({t('common.optional')})</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="partner-organizationName"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder={t('partnershipModal.orgNamePlaceholder')}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Location row - City text input, Country dropdown */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-city">
                                            <MapPin size={14} />
                                            {t('partnershipModal.city')} <span className="optional">({t('common.optional')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.cityPlaceholder')}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-country">
                                            <Globe size={14} />
                                            {t('partnershipModal.country')} <span className="optional">({t('common.optional')})</span>
                                        </label>
                                        <div className="modal__select-wrapper">
                                            <select
                                                id="partner-country"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                disabled={loading}
                                            >
                                                <option value="">{t('partnershipModal.countryPlaceholder')}</option>
                                                {COUNTRIES.map(country => (
                                                    <option key={country.code} value={country.code}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="modal__select-icon" />
                                        </div>
                                    </div>
                                </div>

                                {/* Partnership Interest */}
                                <div className="modal__field">
                                    <label htmlFor="partner-interest">
                                        <MessageSquare size={14} />
                                        {t('partnershipModal.interest')} <span className="optional">({t('common.optional')})</span>
                                    </label>
                                    <textarea
                                        id="partner-interest"
                                        name="partnershipInterest"
                                        value={formData.partnershipInterest}
                                        onChange={handleChange}
                                        placeholder={t('partnershipModal.interestPlaceholder')}
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
                                            <span>{t('partnershipModal.submitting')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Handshake size={18} />
                                            <span>{t('partnershipModal.submit')}</span>
                                        </>
                                    )}
                                </button>

                                <p className="modal__privacy">
                                    {t('partnershipModal.privacy')}
                                </p>
                            </form>
                        </>
                    ) : (
                        /* Success state */
                        <div className="modal__success">
                            <div className="modal__success-icon modal__success-icon--cyan">
                                <CheckCircle size={48} />
                            </div>
                            <h2>{t('partnershipModal.successTitle')}</h2>
                            <p>
                                {t('partnershipModal.successMessage')}
                            </p>
                            <button
                                type="button"
                                className="modal__submit modal__submit--cyan"
                                onClick={handleClose}
                            >
                                {t('partnershipModal.successBtn')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PartnershipModal
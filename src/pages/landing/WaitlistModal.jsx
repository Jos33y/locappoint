// WaitlistModal.jsx - Waitlist signup modal with Analytics
// Location: src/components/landing/WaitlistModal.jsx

import { useState, useEffect } from 'react'
import { X, Sparkles, User, Mail, Phone, Globe, Users, Briefcase, MessageSquare, ChevronDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'
import { COUNTRIES, BUSINESS_TYPES } from '../../constants/countries'
import { useUserCountry } from '../../hooks/useUserCountry'
import { supabase } from '../../config/supabase'
import { trackFormSubmit } from '../../services/analytics'
import '../../styles/landing/modals-additions.css'

const WaitlistModal = ({ isOpen, onClose }) => {
    const { t } = useLandingTranslation()
    const { countryCode } = useUserCountry()
    const [isClosing, setIsClosing] = useState(false)
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        country: '',
        userType: '',
        businessType: '',
        comments: ''
    })
    
    const [status, setStatus] = useState('idle') // idle | submitting | success | error
    const [errorMessage, setErrorMessage] = useState('')

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
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

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        
        // Clear business type if switching away from business
        if (name === 'userType' && value !== 'business') {
            setFormData(prev => ({ ...prev, businessType: '' }))
        }
    }

    const validateForm = () => {
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.country || !formData.userType) {
            setErrorMessage(t('waitlistModal.errorRequired'))
            return false
        }
        
        if (formData.userType === 'business' && !formData.businessType) {
            setErrorMessage(t('waitlistModal.errorRequired'))
            return false
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setErrorMessage(t('waitlistModal.errorEmail'))
            return false
        }
        
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage('')
        
        if (!validateForm()) {
            setStatus('error')
            return
        }
        
        setStatus('submitting')
        
        try {
            const { error } = await supabase
                .from('waitlist')
                .insert([{
                    full_name: formData.fullName.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim() || null,
                    country: formData.country,
                    user_type: formData.userType,
                    business_type: formData.userType === 'business' ? formData.businessType : null,
                    comments: formData.comments.trim() || null
                }])
            
            if (error) throw error
            
            // Track successful submission
            await trackFormSubmit('waitlist', {
                userType: formData.userType,
                businessType: formData.businessType,
                country: formData.country
            })
            
            setStatus('success')
        } catch (error) {
            console.error('Waitlist submission error:', error)
            setErrorMessage(t('waitlistModal.errorGeneric'))
            setStatus('error')
        }
    }

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                country: '',
                userType: '',
                businessType: '',
                comments: ''
            })
            setStatus('idle')
            setErrorMessage('')
            setIsClosing(false)
            onClose()
        }, 300)
    }

    if (!isOpen) return null

    return (
        <div 
            className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
            onClick={handleClose}
        >
            <div 
                className={`modal ${isClosing ? 'modal--closing' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Background effects */}
                <div className="modal__bg">
                    <div className="modal__grid" />
                    <div className="modal__orb modal__orb--1" />
                    <div className="modal__orb modal__orb--2" />
                </div>

                {/* Close button */}
                <button className="modal__close" onClick={handleClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div className="modal__content">
                    {/* Success State */}
                    {status === 'success' ? (
                        <div className="modal__success">
                            <div className="modal__success-icon">
                                <CheckCircle size={40} />
                            </div>
                            <h2>{t('waitlistModal.successTitle')}</h2>
                            <p>{t('waitlistModal.successMessage')}</p>
                            <button 
                                type="button" 
                                className="modal__submit"
                                onClick={handleClose}
                            >
                                {t('waitlistModal.successBtn')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="modal__header">
                                <div className="modal__icon">
                                    <Sparkles size={24} />
                                </div>
                                <h2>{t('waitlistModal.title')}</h2>
                                <p>{t('waitlistModal.subtitle')}</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="modal__form">
                                {/* Full Name */}
                                <div className="modal__field">
                                    <label>
                                        <User size={14} />
                                        {t('waitlistModal.fullName')}
                                        <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.fullNamePlaceholder')}
                                        autoComplete="name"
                                    />
                                </div>

                                {/* Email */}
                                <div className="modal__field">
                                    <label>
                                        <Mail size={14} />
                                        {t('waitlistModal.email')}
                                        <span className="required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.emailPlaceholder')}
                                        autoComplete="email"
                                    />
                                </div>

                                {/* Phone & Country - Side by Side */}
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label>
                                            <Phone size={14} />
                                            {t('waitlistModal.phone')}
                                            <span className="optional">({t('common.optional')})</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder={t('waitlistModal.phonePlaceholder')}
                                            autoComplete="tel"
                                        />
                                    </div>
                                    
                                    <div className="modal__field">
                                        <label>
                                            <Globe size={14} />
                                            {t('waitlistModal.country')}
                                            <span className="required">*</span>
                                        </label>
                                        <div className="modal__select-wrapper">
                                            <select
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                            >
                                                <option value="">{t('waitlistModal.countryPlaceholder')}</option>
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

                                {/* User Type */}
                                <div className="modal__field">
                                    <label>
                                        <Users size={14} />
                                        {t('waitlistModal.userType')}
                                        <span className="required">*</span>
                                    </label>
                                    <div className="modal__select-wrapper">
                                        <select
                                            name="userType"
                                            value={formData.userType}
                                            onChange={handleChange}
                                        >
                                            <option value="">{t('waitlistModal.userTypePlaceholder')}</option>
                                            <option value="client">{t('waitlistModal.userTypeClient')}</option>
                                            <option value="business">{t('waitlistModal.userTypeBusiness')}</option>
                                        </select>
                                        <ChevronDown size={16} className="modal__select-icon" />
                                    </div>
                                </div>

                                {/* Business Type - Conditional */}
                                {formData.userType === 'business' && (
                                    <div className="modal__field modal__field--animate">
                                        <label>
                                            <Briefcase size={14} />
                                            {t('waitlistModal.businessType')}
                                            <span className="required">*</span>
                                        </label>
                                        <div className="modal__select-wrapper">
                                            <select
                                                name="businessType"
                                                value={formData.businessType}
                                                onChange={handleChange}
                                            >
                                                <option value="">{t('waitlistModal.businessTypePlaceholder')}</option>
                                                {BUSINESS_TYPES.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {t(type.labelKey)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="modal__select-icon" />
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                <div className="modal__field">
                                    <label>
                                        <MessageSquare size={14} />
                                        {t('waitlistModal.comments')}
                                        <span className="optional">({t('common.optional')})</span>
                                    </label>
                                    <textarea
                                        name="comments"
                                        value={formData.comments}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.commentsPlaceholder')}
                                        rows={3}
                                    />
                                </div>

                                {/* Error Message */}
                                {status === 'error' && errorMessage && (
                                    <div className="modal__alert modal__alert--error">
                                        <AlertCircle size={16} />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button 
                                    type="submit" 
                                    className="modal__submit"
                                    disabled={status === 'submitting'}
                                >
                                    {status === 'submitting' ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            {t('waitlistModal.submitting')}
                                        </>
                                    ) : (
                                        t('waitlistModal.submit')
                                    )}
                                </button>

                                {/* Privacy Note */}
                                <p className="modal__privacy">{t('waitlistModal.privacy')}</p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WaitlistModal
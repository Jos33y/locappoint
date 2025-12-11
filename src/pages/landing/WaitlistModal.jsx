// WaitlistModal.jsx - Waitlist modal with AI aesthetic (Translated)
// Location: src/pages/landing/WaitlistModal.jsx

import { useState, useEffect } from 'react'
import { X, Sparkles, Mail, User, MapPin, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const WaitlistModal = ({ isOpen, onClose }) => {
    const { t } = useLandingTranslation()
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        cityService: '',
        comments: ''
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [isClosing, setIsClosing] = useState(false)

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
        
        const trimmedData = {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            cityService: formData.cityService.trim(),
            comments: formData.comments.trim()
        }

        // Validation
        if (!trimmedData.fullName || !trimmedData.email || !trimmedData.cityService) {
            setError(t('waitlistModal.errorRequired'))
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedData.email)) {
            setError(t('waitlistModal.errorEmail'))
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: dbError } = await supabase
                .from('waitlist')
                .insert([{
                    full_name: trimmedData.fullName,
                    email: trimmedData.email,
                    city_service: trimmedData.cityService,
                    comments: trimmedData.comments || null
                }])

            if (dbError) throw dbError

            setSuccess(true)
            setFormData({
                fullName: '',
                email: '',
                cityService: '',
                comments: ''
            })

        } catch (err) {
            console.error('Error saving to waitlist:', err)
            setError(t('waitlistModal.errorGeneric'))
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
                className={`modal waitlist-modal ${isClosing ? 'modal--closing' : ''}`}
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
                    aria-label={t('common.close')}
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="modal__content">
                    {!success ? (
                        <>
                            {/* Header */}
                            <div className="modal__header">
                                <div className="modal__icon">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="modal__title">{t('waitlistModal.title')}</h2>
                                <p className="modal__subtitle">
                                    {t('waitlistModal.subtitle')}
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

                                {/* Full Name */}
                                <div className="modal__field">
                                    <label htmlFor="waitlist-fullName">
                                        <User size={14} />
                                        {t('waitlistModal.fullName')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="waitlist-fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.fullName')}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="modal__field">
                                    <label htmlFor="waitlist-email">
                                        <Mail size={14} />
                                        {t('waitlistModal.email')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="waitlist-email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="your@email.com"
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                {/* City & Service */}
                                <div className="modal__field">
                                    <label htmlFor="waitlist-cityService">
                                        <MapPin size={14} />
                                        {t('waitlistModal.cityService')} <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="waitlist-cityService"
                                        name="cityService"
                                        value={formData.cityService}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.cityServicePlaceholder')}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                {/* Comments */}
                                <div className="modal__field">
                                    <label htmlFor="waitlist-comments">
                                        <MessageSquare size={14} />
                                        {t('waitlistModal.comments')} <span className="optional">{t('common.optional')}</span>
                                    </label>
                                    <textarea
                                        id="waitlist-comments"
                                        name="comments"
                                        value={formData.comments}
                                        onChange={handleChange}
                                        placeholder={t('waitlistModal.commentsPlaceholder')}
                                        rows="3"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    className="modal__submit"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>{t('waitlistModal.submitting')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            <span>{t('waitlistModal.submit')}</span>
                                        </>
                                    )}
                                </button>

                                <p className="modal__privacy">
                                    {t('waitlistModal.privacy')}
                                </p>
                            </form>
                        </>
                    ) : (
                        /* Success state */
                        <div className="modal__success">
                            <div className="modal__success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>{t('waitlistModal.successTitle')}</h2>
                            <p>
                                {t('waitlistModal.successMessage')}
                            </p>
                            <button
                                type="button"
                                className="modal__submit"
                                onClick={handleClose}
                            >
                                {t('waitlistModal.successBtn')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WaitlistModal
// WaitlistModal - Two-step email-first capture, old visual language.

import { useState, useEffect } from 'react'
import {
    X, Sparkles, User, Mail, Phone, Globe, Users, Briefcase, MessageSquare,
    ChevronDown, Loader2, CheckCircle, AlertCircle
} from 'lucide-react'
import { useT } from '../../hooks/useT'
import { COUNTRIES, BUSINESS_TYPES } from '../../constants/countries'
import { useUserCountry } from '../../hooks/useUserCountry'
import { supabase } from '../../config/supabase'
import { trackFormSubmit } from '../../services/analytics'

const WaitlistModal = ({ isOpen, onClose, initialEmail = '' }) => {
    const t = useT()
    const { countryCode } = useUserCountry()

    const [step, setStep] = useState(1)
    const [isClosing, setIsClosing] = useState(false)

    const [formData, setFormData] = useState({
        email: '', country: '', fullName: '', phone: '',
        userType: '', businessType: '', comments: ''
    })

    const [status, setStatus] = useState('idle')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (isOpen && initialEmail) {
            setFormData((prev) => ({ ...prev, email: initialEmail }))
        }
    }, [isOpen, initialEmail])

    useEffect(() => {
        if (countryCode && !formData.country) {
            setFormData((prev) => ({ ...prev, country: countryCode }))
        }
    }, [countryCode])

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && isOpen) handleClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (name === 'userType' && value !== 'business') {
            setFormData((prev) => ({ ...prev, businessType: '' }))
        }
    }

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            setIsClosing(false)
            setStep(1)
            setStatus('idle')
            setErrorMessage('')
            setFormData({
                email: '', country: '', fullName: '', phone: '',
                userType: '', businessType: '', comments: ''
            })
            onClose && onClose()
        }, 300)
    }

    const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

    const handleStep1Submit = async (e) => {
        e.preventDefault()
        if (!validateEmail(formData.email)) {
            setErrorMessage(t('waitlistModal.errorEmail', 'Please enter a valid email'))
            setStatus('error')
            return
        }
        setErrorMessage('')
        setStatus('submitting')

        try {
            const payload = {
                email: formData.email.trim().toLowerCase(),
                country: formData.country || countryCode || null
            }
            const { error } = await supabase
                .from('waitlist')
                .upsert(payload, { onConflict: 'email' })
            if (error) throw error
            trackFormSubmit('waitlist_step1', payload)
            setStatus('idle')
            setStep(2)
        } catch (err) {
            console.error('Waitlist step 1 error:', err)
            setErrorMessage(t('waitlistModal.errorGeneric', 'Something went wrong. Try again.'))
            setStatus('error')
        }
    }

    const handleStep2Submit = async (e) => {
        e.preventDefault()
        if (!formData.userType) {
            setErrorMessage(t('waitlistModal.errorRequired', 'Pick one to continue'))
            setStatus('error')
            return
        }
        if (formData.userType === 'business' && !formData.businessType) {
            setErrorMessage(t('waitlistModal.errorRequired', 'Pick one to continue'))
            setStatus('error')
            return
        }
        setErrorMessage('')
        setStatus('submitting')

        try {
            const payload = {
                email: formData.email.trim().toLowerCase(),
                country: formData.country || countryCode || null,
                full_name: formData.fullName.trim() || null,
                phone: formData.phone.trim() || null,
                user_type: formData.userType,
                business_type: formData.userType === 'business' ? formData.businessType : null,
                comments: formData.comments.trim() || null
            }
            const { error } = await supabase
                .from('waitlist')
                .upsert(payload, { onConflict: 'email' })
            if (error) throw error
            trackFormSubmit('waitlist_step2', payload)
            setStatus('success')
        } catch (err) {
            console.error('Waitlist step 2 error:', err)
            setErrorMessage(t('waitlistModal.errorGeneric', 'Something went wrong. Try again.'))
            setStatus('error')
        }
    }

    return (
        <div
            className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
            onClick={handleClose}
        >
            <div
                className={`modal ${isClosing ? 'modal--closing' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal__bg" aria-hidden="true">
                    <div className="modal__grid" />
                    <div className="modal__orb modal__orb--1" />
                    <div className="modal__orb modal__orb--2" />
                </div>

                <button className="modal__close" onClick={handleClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div className="modal__content">
                    {status === 'success' ? (
                        <div className="modal__success">
                            <div className="modal__success-icon">
                                <CheckCircle size={40} />
                            </div>
                            <h2>{t('waitlistModal.successTitle', 'You are on the list')}</h2>
                            <p>{t('waitlistModal.successMessage', 'We will email you the moment Lisbon launches. Until then, expect build updates if you want them.')}</p>
                            <button type="button" className="modal__submit" onClick={handleClose}>
                                {t('waitlistModal.successBtn', 'Done')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="modal__header">
                                <div className="modal__icon"><Sparkles size={24} /></div>
                                <h2 className="modal__title">
                                    {step === 1
                                        ? t('waitlistModal.title1', 'Join the waitlist')
                                        : t('waitlistModal.title2', 'Tell us a bit more')}
                                </h2>
                                <p className="modal__subtitle">
                                    {step === 1
                                        ? t('waitlistModal.subtitle1', 'First 100 Lisbon businesses get 12 months free, then €19/mo. No commission.')
                                        : t('waitlistModal.subtitle2', 'Optional but helpful. Skip what you do not want to answer.')}
                                </p>
                            </div>

                            <div className="modal__steps">
                                <div className={`modal__step ${step >= 1 ? 'is-active' : ''}`}>
                                    <span className="modal__step-num">1</span>
                                    <span className="modal__step-label">{t('waitlistModal.stepEmail', 'EMAIL')}</span>
                                </div>
                                <span className="modal__step-line" />
                                <div className={`modal__step ${step >= 2 ? 'is-active' : ''}`}>
                                    <span className="modal__step-num">2</span>
                                    <span className="modal__step-label">{t('waitlistModal.stepProfile', 'PROFILE')}</span>
                                </div>
                            </div>

                            {step === 1 && (
                                <form onSubmit={handleStep1Submit} className="modal__form">
                                    <div className="modal__field">
                                        <label>
                                            <Mail size={14} />
                                            {t('waitlistModal.email', 'Email')}
                                            <span className="required">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder={t('waitlistModal.emailPlaceholder', 'you@business.com')}
                                            autoComplete="email"
                                            inputMode="email"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    {status === 'error' && errorMessage && (
                                        <div className="modal__alert modal__alert--error">
                                            <AlertCircle size={16} />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}

                                    <button type="submit" className="modal__submit" disabled={status === 'submitting'}>
                                        {status === 'submitting' ? (
                                            <><Loader2 size={18} className="spin" /> {t('waitlistModal.submitting', 'Saving')}</>
                                        ) : (
                                            t('waitlistModal.continue', 'Continue')
                                        )}
                                    </button>

                                    <p className="modal__privacy">
                                        {t('waitlistModal.privacy', 'We send one welcome email. No spam. GDPR compliant.')}
                                    </p>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={handleStep2Submit} className="modal__form">
                                    <div className="modal__field">
                                        <label>
                                            <User size={14} />
                                            {t('waitlistModal.fullName', 'Full name')}
                                            <span className="optional">({t('common.optional', 'optional')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            placeholder={t('waitlistModal.fullNamePlaceholder', 'How should we call you?')}
                                            autoComplete="name"
                                        />
                                    </div>

                                    <div className="modal__row">
                                        <div className="modal__field">
                                            <label>
                                                <Phone size={14} />
                                                {t('waitlistModal.phone', 'Phone')}
                                                <span className="optional">({t('common.optional', 'optional')})</span>
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder={t('waitlistModal.phonePlaceholder', '+351 ...')}
                                                autoComplete="tel"
                                            />
                                        </div>

                                        <div className="modal__field">
                                            <label>
                                                <Globe size={14} />
                                                {t('waitlistModal.country', 'Country')}
                                            </label>
                                            <div className="modal__select-wrapper">
                                                <select name="country" value={formData.country} onChange={handleChange}>
                                                    <option value="">
                                                        {t('waitlistModal.countryPlaceholder', 'Select country')}
                                                    </option>
                                                    {COUNTRIES.map((c) => (
                                                        <option key={c.code} value={c.code}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="modal__select-icon" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="modal__field">
                                        <label>
                                            <Users size={14} />
                                            {t('waitlistModal.userType', 'You are a')}
                                            <span className="required">*</span>
                                        </label>
                                        <div className="modal__select-wrapper">
                                            <select name="userType" value={formData.userType} onChange={handleChange} required>
                                                <option value="">{t('waitlistModal.userTypePlaceholder', 'Pick one')}</option>
                                                <option value="client">{t('waitlistModal.userTypeClient', 'Client')}</option>
                                                <option value="business">{t('waitlistModal.userTypeBusiness', 'Business')}</option>
                                            </select>
                                            <ChevronDown size={16} className="modal__select-icon" />
                                        </div>
                                    </div>

                                    {formData.userType === 'business' && (
                                        <div className="modal__field modal__field--animate">
                                            <label>
                                                <Briefcase size={14} />
                                                {t('waitlistModal.businessType', 'Type of business')}
                                                <span className="required">*</span>
                                            </label>
                                            <div className="modal__select-wrapper">
                                                <select
                                                    name="businessType"
                                                    value={formData.businessType}
                                                    onChange={handleChange}
                                                    required
                                                >
                                                    <option value="">
                                                        {t('waitlistModal.businessTypePlaceholder', 'Pick one')}
                                                    </option>
                                                    {BUSINESS_TYPES.map((bt) => (
                                                        <option key={bt.value} value={bt.value}>
                                                            {t(bt.labelKey || `businessTypes.${bt.value}`, bt.label || bt.value)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="modal__select-icon" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="modal__field">
                                        <label>
                                            <MessageSquare size={14} />
                                            {t('waitlistModal.comments', 'Anything else')}
                                            <span className="optional">({t('common.optional', 'optional')})</span>
                                        </label>
                                        <textarea
                                            name="comments"
                                            value={formData.comments}
                                            onChange={handleChange}
                                            placeholder={t('waitlistModal.commentsPlaceholder', 'Tell us what you are looking for')}
                                            rows={3}
                                        />
                                    </div>

                                    {status === 'error' && errorMessage && (
                                        <div className="modal__alert modal__alert--error">
                                            <AlertCircle size={16} />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}

                                    <button type="submit" className="modal__submit" disabled={status === 'submitting'}>
                                        {status === 'submitting' ? (
                                            <><Loader2 size={18} className="spin" /> {t('waitlistModal.submitting', 'Saving')}</>
                                        ) : (
                                            t('waitlistModal.submit', 'Done')
                                        )}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WaitlistModal

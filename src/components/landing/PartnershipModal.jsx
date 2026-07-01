// PartnershipModal - Old structure verbatim, token-swapped to brand foundation.

import { useState, useEffect } from 'react'
import {
    X, Handshake, User, Mail, Phone, Building2, MapPin, Globe, MessageSquare,
    CheckCircle, AlertCircle, Loader2, ChevronDown
} from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useT } from '../../hooks/useT'
import { COUNTRIES } from '../../constants/countries'
import { useUserCountry } from '../../hooks/useUserCountry'
import { trackFormSubmit } from '../../services/analytics'

// Default organization types if i18n doesn't supply them (string array).
const DEFAULT_ORG_TYPES = [
    'Investor', 'Advisor', 'Distributor', 'Reseller', 'Agency', 'Other'
]

const PartnershipModal = ({ isOpen, onClose }) => {
    const t = useT()
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

    // Pull org types from i18n if present, else use defaults.
    const orgTypesFromT = t('partnershipModal.orgTypes')
    const organizationTypes = Array.isArray(orgTypesFromT) ? orgTypesFromT : DEFAULT_ORG_TYPES

    useEffect(() => {
        if (isOpen) {
            setSuccess(false)
            setError('')
            setIsClosing(false)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    useEffect(() => {
        if (countryCode && !formData.country) {
            setFormData((prev) => ({ ...prev, country: countryCode }))
        }
    }, [countryCode])

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && isOpen) handleClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
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
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.firstName || !formData.lastName || !formData.email ||
            !formData.phone || !formData.organizationType) {
            setError(t('partnershipModal.errorRequired', 'Please fill in the required fields'))
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError(t('partnershipModal.errorEmail', 'Please enter a valid email'))
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
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim(),
                    organization_type: formData.organizationType,
                    organization_name: formData.organizationName.trim() || null,
                    city: formData.city.trim() || null,
                    country: formData.country || null,
                    partnership_interest: formData.partnershipInterest.trim() || null
                }])

            if (dbError) throw dbError

            await trackFormSubmit('partnership', {
                country: formData.country,
                organizationType: formData.organizationType
            })

            setSuccess(true)
            setFormData({
                firstName: '', lastName: '', email: '', phone: '',
                organizationType: '', organizationName: '', city: '', country: '',
                partnershipInterest: ''
            })
        } catch (err) {
            console.error('Partnership submission error:', err)
            setError(t('partnershipModal.errorGeneric', 'Something went wrong. Try again.'))
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
                <div className="modal__bg" aria-hidden="true">
                    <div className="modal__orb modal__orb--1" />
                    <div className="modal__orb modal__orb--2" />
                    <div className="modal__grid" />
                </div>

                <button className="modal__close" onClick={handleClose} aria-label="Close modal">
                    <X size={20} />
                </button>

                <div className="modal__content">
                    {!success ? (
                        <>
                            <div className="modal__header">
                                <div className="modal__icon">
                                    <Handshake size={28} />
                                </div>
                                <h2 className="modal__title">
                                    {t('partnershipModal.title', 'Become a partner')}
                                </h2>
                                <p className="modal__subtitle">
                                    {t('partnershipModal.subtitle', 'Investors, advisors, distributors. Tell us how you want to work together.')}
                                </p>
                            </div>

                            {error && (
                                <div className="modal__alert modal__alert--error">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="modal__form">
                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-firstName">
                                            <User size={14} />
                                            {t('partnershipModal.firstName', 'First name')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.firstName', 'First name')}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-lastName">
                                            <User size={14} />
                                            {t('partnershipModal.lastName', 'Last name')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.lastName', 'Last name')}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-email">
                                            <Mail size={14} />
                                            {t('partnershipModal.email', 'Email')} <span className="required">*</span>
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
                                            {t('partnershipModal.phone', 'Phone')} <span className="required">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="partner-phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.phonePlaceholder', '+351 ...')}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="modal__field">
                                    <label htmlFor="partner-organizationType">
                                        <Building2 size={14} />
                                        {t('partnershipModal.orgType', 'Organization type')} <span className="required">*</span>
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
                                            <option value="">
                                                {t('partnershipModal.orgTypePlaceholder', 'Pick one')}
                                            </option>
                                            {organizationTypes.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="modal__select-icon" />
                                    </div>
                                </div>

                                <div className="modal__field">
                                    <label htmlFor="partner-organizationName">
                                        {t('partnershipModal.orgName', 'Organization name')} <span className="optional">({t('common.optional', 'optional')})</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="partner-organizationName"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder={t('partnershipModal.orgNamePlaceholder', 'Your company or fund')}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="modal__row">
                                    <div className="modal__field">
                                        <label htmlFor="partner-city">
                                            <MapPin size={14} />
                                            {t('partnershipModal.city', 'City')} <span className="optional">({t('common.optional', 'optional')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="partner-city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder={t('partnershipModal.cityPlaceholder', 'Lisbon')}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="modal__field">
                                        <label htmlFor="partner-country">
                                            <Globe size={14} />
                                            {t('partnershipModal.country', 'Country')} <span className="optional">({t('common.optional', 'optional')})</span>
                                        </label>
                                        <div className="modal__select-wrapper">
                                            <select
                                                id="partner-country"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                disabled={loading}
                                            >
                                                <option value="">
                                                    {t('partnershipModal.countryPlaceholder', 'Select country')}
                                                </option>
                                                {COUNTRIES.map((country) => (
                                                    <option key={country.code} value={country.code}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="modal__select-icon" />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal__field">
                                    <label htmlFor="partner-interest">
                                        <MessageSquare size={14} />
                                        {t('partnershipModal.interest', 'Tell us what you have in mind')} <span className="optional">({t('common.optional', 'optional')})</span>
                                    </label>
                                    <textarea
                                        id="partner-interest"
                                        name="partnershipInterest"
                                        value={formData.partnershipInterest}
                                        onChange={handleChange}
                                        placeholder={t('partnershipModal.interestPlaceholder', 'Investor, advisor, channel, etc')}
                                        rows="3"
                                        disabled={loading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="modal__submit"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>{t('partnershipModal.submitting', 'Sending')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Handshake size={18} />
                                            <span>{t('partnershipModal.submit', 'Send')}</span>
                                        </>
                                    )}
                                </button>

                                <p className="modal__privacy">
                                    {t('partnershipModal.privacy', 'We will only contact you about this partnership inquiry.')}
                                </p>
                            </form>
                        </>
                    ) : (
                        <div className="modal__success">
                            <div className="modal__success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>{t('partnershipModal.successTitleV2', 'Application received')}</h2>
                            <p>{t('partnershipModal.successMessageV2', 'We will review what you sent and reach out when we have a response.')}</p>
                            <button
                                type="button"
                                className="modal__submit"
                                onClick={handleClose}
                            >
                                {t('partnershipModal.successBtn', 'Done')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PartnershipModal

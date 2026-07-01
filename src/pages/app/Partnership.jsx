// src/pages/app/Partnership.jsx
// Partnership - multi-section form. Supabase insert into partnership_requests.

import { useState } from 'react'
import { Handshake, User, AtSign, Building2, MessageSquare, Send, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import '../../styles/app/home.css'
import '../../styles/app/partnership.css'


// Aligned to AppHome BuiltFor categories.
const organizationTypes = [
    'Salons & Hair',
    'Barbershops',
    'Spas & Wellness',
    'Fitness',
    'Beauty & Photo',
    'Pet Services',
    'Tutoring',
    'Consulting',
    'Other',
]


const Partnership = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organizationType: '',
        organizationName: '',
        city: '',
        country: '',
        partnershipInterest: '',
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.firstName || !formData.lastName || !formData.email ||
            !formData.phone || !formData.organizationType) {
            setError('First name, last name, email, phone, and organization type are required.')
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
                    partnership_interest: formData.partnershipInterest,
                }])

            if (dbError) throw dbError

            setSuccess(true)
            setFormData({
                firstName: '', lastName: '', email: '', phone: '',
                organizationType: '', organizationName: '', city: '', country: '',
                partnershipInterest: '',
            })
            setTimeout(() => setSuccess(false), 6000)
        } catch (err) {
            console.error('Partnership submit failed:', err)
            setError('Could not submit. Try again, or email partners@locappoint.com.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="partnership-page">
            <AppHeader />

            <main>

                {/* Hero */}
                <section className="loca-section loca-section--s0 part__hero">
                    <div className="container">
                        <div className="part__hero-inner">
                            <span className="part__hero-icon" aria-hidden="true">
                                <Handshake size={20} strokeWidth={1.8} />
                            </span>
                            <span className="loca-eyebrow">
                                <span className="loca-eyebrow__dot" aria-hidden="true"></span>
                                Founding partners program
                            </span>
                            <h1 className="part__hero-title">
                                Help us build the booking platform <span className="loca-section__title-accent">for your industry.</span>
                            </h1>
                            <p className="part__hero-lede">
                                Founding partners get direct input on features, founder-tier pricing locked for life, and a co-marketing slot when we open their city. Apply below.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Form */}
                <section className="loca-section loca-section--s1 part__main">
                    <div className="container">
                        <form onSubmit={handleSubmit} className="part-form" noValidate>

                            {success && (
                                <div className="form-alert form-alert--success" role="status">
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Application received. We will review and reply within 48 hours.</span>
                                </div>
                            )}

                            {error && (
                                <div className="form-alert form-alert--error" role="alert">
                                    <AlertCircle size={14} strokeWidth={2.2} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Personal */}
                            <fieldset className="part-form__group">
                                <legend className="part-form__legend">
                                    <span className="part-form__legend-num">01</span>
                                    <span className="part-form__legend-ico"><User size={14} strokeWidth={2} /></span>
                                    <span className="part-form__legend-text">Personal</span>
                                </legend>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label htmlFor="firstName">First name *</label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="lastName">Last name *</label>
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
                            </fieldset>

                            {/* Contact */}
                            <fieldset className="part-form__group">
                                <legend className="part-form__legend">
                                    <span className="part-form__legend-num">02</span>
                                    <span className="part-form__legend-ico"><AtSign size={14} strokeWidth={2} /></span>
                                    <span className="part-form__legend-text">Contact</span>
                                </legend>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label htmlFor="email">Email *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="phone">Phone *</label>
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
                            </fieldset>

                            {/* Organization */}
                            <fieldset className="part-form__group">
                                <legend className="part-form__legend">
                                    <span className="part-form__legend-num">03</span>
                                    <span className="part-form__legend-ico"><Building2 size={14} strokeWidth={2} /></span>
                                    <span className="part-form__legend-text">Organization</span>
                                </legend>
                                <div className="form-field">
                                    <label htmlFor="organizationType">Category *</label>
                                    <select
                                        id="organizationType"
                                        name="organizationType"
                                        value={formData.organizationType}
                                        onChange={handleChange}
                                        required>
                                        <option value="">Select category...</option>
                                        {organizationTypes.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="organizationName">Business name</label>
                                    <input
                                        type="text"
                                        id="organizationName"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder="If applicable"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-field">
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
                                    <div className="form-field">
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
                            </fieldset>

                            {/* Interest */}
                            <fieldset className="part-form__group">
                                <legend className="part-form__legend">
                                    <span className="part-form__legend-num">04</span>
                                    <span className="part-form__legend-ico"><MessageSquare size={14} strokeWidth={2} /></span>
                                    <span className="part-form__legend-text">Interest</span>
                                </legend>
                                <div className="form-field">
                                    <label htmlFor="partnershipInterest">
                                        How do you see Locappoint fitting your business?
                                    </label>
                                    <textarea
                                        id="partnershipInterest"
                                        name="partnershipInterest"
                                        value={formData.partnershipInterest}
                                        onChange={handleChange}
                                        rows="5"
                                        placeholder="Goals, what is broken today, what would make this a yes..."
                                    />
                                </div>
                            </fieldset>

                            <button
                                type="submit"
                                className="loca-btn loca-btn--primary loca-btn--lg part-form__submit"
                                disabled={loading}>
                                {loading ? 'Submitting...' : (
                                    <>
                                        <Send size={16} strokeWidth={2} />
                                        Submit application
                                    </>
                                )}
                            </button>

                            <p className="part-form__foot">
                                We review every application. Reply within 48 hours.
                            </p>
                        </form>
                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default Partnership

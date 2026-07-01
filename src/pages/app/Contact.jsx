// src/pages/app/Contact.jsx
// Contact - info cards + form. Supabase insert into contact_messages.

import { useState } from 'react'
import { Mail, Phone, MapPin, Send, Check, AlertCircle, MessageSquare } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import '../../styles/app/home.css'
import '../../styles/app/contact.css'


// WhatsApp Business number for direct chat. Pre-fills opening message.
const WHATSAPP_URL = 'https://wa.me/351912345678?text=' + encodeURIComponent("Hi Locappoint, I'd like to chat about ")


const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
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

        if (!formData.name || !formData.email || !formData.message) {
            setError('Name, email, and message are required.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: dbError } = await supabase
                .from('contact_messages')
                .insert([{
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    subject: formData.subject,
                    message: formData.message,
                }])

            if (dbError) throw dbError

            setSuccess(true)
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
            setTimeout(() => setSuccess(false), 6000)
        } catch (err) {
            console.error('Contact submit failed:', err)
            setError('Could not send. Try again, or email hello@locappoint.com.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="contact-page">
            <AppHeader />

            <main>

                {/* Hero */}
                <section className="loca-section loca-section--s0 contact__hero">
                    <div className="container">
                        <div className="contact__hero-inner">
                            <span className="loca-eyebrow">
                                <span className="loca-eyebrow__dot" aria-hidden="true"></span>
                                Contact
                            </span>
                            <h1 className="contact__hero-title">
                                Talk to us <span className="loca-section__title-accent">directly.</span>
                            </h1>
                            <p className="contact__hero-lede">
                                Questions about cohort 1, the booking flow, or partnering. We read every message and reply within 24 hours.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Info + Form */}
                <section className="loca-section loca-section--s1 contact__main">
                    <div className="container">
                        <div className="contact__grid">

                            {/* Info side */}
                            <aside className="contact__info">
                                <article className="info-card">
                                    <span className="info-card__ico">
                                        <Mail size={16} strokeWidth={2} />
                                    </span>
                                    <div className="info-card__copy">
                                        <div className="info-card__label">Email</div>
                                        <a href="mailto:hello@locappoint.com" className="info-card__value">hello@locappoint.com</a>
                                        <div className="info-card__note">We reply within 24 hours</div>
                                    </div>
                                </article>

                                <article className="info-card">
                                    <span className="info-card__ico">
                                        <Phone size={16} strokeWidth={2} />
                                    </span>
                                    <div className="info-card__copy">
                                        <div className="info-card__label">Phone</div>
                                        <a href="tel:+351912345678" className="info-card__value">+351 912 345 678</a>
                                        <div className="info-card__note">Mon to Fri, 09:00 to 18:00 WET</div>
                                    </div>
                                </article>

                                <article className="info-card info-card--whatsapp">
                                    <span className="info-card__ico info-card__ico--whatsapp">
                                        <MessageSquare size={16} strokeWidth={2} />
                                    </span>
                                    <div className="info-card__copy">
                                        <div className="info-card__label">WhatsApp</div>
                                        <a
                                            href={WHATSAPP_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="info-card__value">
                                            Open chat
                                        </a>
                                        <div className="info-card__note">Fastest path to us. Same number as phone.</div>
                                    </div>
                                </article>

                                <article className="info-card">
                                    <span className="info-card__ico">
                                        <MapPin size={16} strokeWidth={2} />
                                    </span>
                                    <div className="info-card__copy">
                                        <div className="info-card__label">Based in</div>
                                        <div className="info-card__value">Lisbon, Portugal</div>
                                        <div className="info-card__note">Lagos team building remotely</div>
                                    </div>
                                </article>

                                <div className="info-card__meta">
                                    <span className="info-card__meta-dot"></span>
                                    <span>Cohort 1 open in Lisbon</span>
                                </div>
                            </aside>

                            {/* Form side */}
                            <div className="contact__form-wrap">
                                <form onSubmit={handleSubmit} className="contact-form" noValidate>
                                    <div className="contact-form__head">
                                        <h2 className="contact-form__title">Send a message</h2>
                                        <p className="contact-form__sub">Required fields marked with an asterisk.</p>
                                    </div>

                                    {success && (
                                        <div className="form-alert form-alert--success" role="status">
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>Message received. We will reply within 24 hours.</span>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="form-alert form-alert--error" role="alert">
                                            <AlertCircle size={14} strokeWidth={2.2} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="form-field">
                                        <label htmlFor="name">Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Your full name"
                                            required
                                        />
                                    </div>

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
                                            <label htmlFor="phone">Phone</label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+351 912 345 678"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="subject">Subject</label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="What is this about?"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="message">Message *</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            rows="6"
                                            placeholder="Tell us how we can help."
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="loca-btn loca-btn--primary loca-btn--lg contact-form__submit"
                                        disabled={loading}>
                                        {loading ? 'Sending...' : (
                                            <>
                                                <Send size={16} strokeWidth={2} />
                                                Send message
                                            </>
                                        )}
                                    </button>

                                    <p className="contact-form__foot">
                                        Or email us directly at <a href="mailto:hello@locappoint.com">hello@locappoint.com</a>
                                    </p>
                                </form>
                            </div>

                        </div>
                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default Contact

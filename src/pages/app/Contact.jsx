import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/Appheader'
import AppFooter from '../../components/common/Appfooter'
import '../../styles/app/contact.css'


const AppContact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validation
        if (!formData.name || !formData.email || !formData.message) {
            setError('Please fill in all required fields')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Store contact message in database (you'll need to create this table)
            const { error: dbError } = await supabase
                .from('contact_messages')
                .insert([{
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    subject: formData.subject,
                    message: formData.message
                }])

            if (dbError) throw dbError

            setSuccess(true)
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            })

            // Hide success message after 5 seconds
            setTimeout(() => setSuccess(false), 5000)

        } catch (error) {
            console.error('Error submitting contact form:', error)
            setError('Failed to send message. Please try again or email us directly.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="contact-page">
            <AppHeader />

            <main className="contact-content">
                {/* Hero Section */}
                <section className="contact-hero">
                    <div className="container">
                        <div className="contact-hero-content">
                            <h1 className="contact-title">
                                Get in <span className="gradient-text">Touch</span>
                            </h1>
                            <p className="contact-subtitle">
                                Have a question or need help? We'd love to hear from you.
                                Send us a message and we'll respond as soon as possible.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Main Content */}
                <section className="contact-main">
                    <div className="container">
                        <div className="contact-grid">
                            {/* Contact Info Cards */}
                            <div className="contact-info">
                                <div className="info-card">
                                    <div className="info-icon">
                                        <Mail size={24} />
                                    </div>
                                    <div className="info-content">
                                        <h3 className="info-title">Email Us</h3>
                                        <p className="info-text">
                                            Send us an email anytime
                                        </p>
                                        <a href="mailto:hello@locappoint.com" className="info-link">
                                            hello@locappoint.com
                                        </a>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <div className="info-icon">
                                        <Phone size={24} />
                                    </div>
                                    <div className="info-content">
                                        <h3 className="info-title">Call Us</h3>
                                        <p className="info-text">
                                            Mon-Fri from 9am to 6pm
                                        </p>
                                        <a href="tel:+351912345678" className="info-link">
                                            +351 912 345 678
                                        </a>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <div className="info-icon">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="info-content">
                                        <h3 className="info-title">Visit Us</h3>
                                        <p className="info-text">
                                            Come say hello at our office
                                        </p>
                                        <p className="info-link">
                                            Avenida da Liberdade<br />
                                            1250-096 Lisbon, Portugal
                                        </p>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <div className="info-icon">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div className="info-content">
                                        <h3 className="info-title">Live Chat</h3>
                                        <p className="info-text">
                                            Chat with our support team
                                        </p>
                                        <button className="info-link-button">
                                            Start Chat
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="contact-form-container">
                                <form onSubmit={handleSubmit} className="contact-form">
                                    <h2 className="form-heading">Send us a Message</h2>

                                    {/* Success Message */}
                                    {success && (
                                        <div className="alert alert--success">
                                            <span>✓</span>
                                            Thank you! We've received your message and will get back to you soon.
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="alert alert--error">
                                            <span>!</span>
                                            {error}
                                        </div>
                                    )}

                                    <div className="form-group">
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
                                        <div className="form-group">
                                            <label htmlFor="email">Email *</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="your@email.com"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
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

                                    <div className="form-group">
                                        <label htmlFor="subject">Subject</label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="What's this about?"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">Message *</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            rows="6"
                                            placeholder="Tell us how we can help..."
                                            required
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn--primary btn--large"
                                        disabled={loading}
                                        style={{ width: '100%' }}
                                    >
                                        {loading ? (
                                            'Sending...'
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Send Message
                                            </>
                                        )}
                                    </button>

                                    <p className="form-footer-text">
                                        We typically respond within 24 hours
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

export default AppContact
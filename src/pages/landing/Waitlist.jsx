import { useState } from 'react'
import { WHATSAPP_NO } from '../../config'
import { supabase } from '../../config/supabase'

const Waitlist = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        cityService: '',
        comments: ''
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear message when user starts typing
        if (message.text) setMessage({ type: '', text: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: '', text: '' }) 

        // Trim all fields
        const trimmedData = {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            cityService: formData.cityService.trim(),
            comments: formData.comments.trim()
        }

        // Simple validation - check required fields
        if (!trimmedData.fullName || !trimmedData.email || !trimmedData.cityService) {
            setMessage({
                type: 'error',
                text: 'Please fill in all required fields.'
            })
            setLoading(false)
            return
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedData.email)) {
            setMessage({
                type: 'error',
                text: 'Please enter a valid email address.'
            })
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase
                .from('waitlist')
                .insert([
                    {
                        full_name: trimmedData.fullName,
                        email: trimmedData.email,
                        city_service: trimmedData.cityService,
                        comments: trimmedData.comments || null
                    }
                ])

            if (error) throw error

            // Success
            setMessage({
                type: 'success',
                text: '🎉 Success! You\'re on the early access list!'
            })
            
            // Clear form
            setFormData({
                fullName: '',
                email: '',
                cityService: '',
                comments: ''
            })
        } catch (error) {
            console.error('Error saving to waitlist:', error)
            setMessage({
                type: 'error',
                text: 'Something went wrong. Please try again or contact us on WhatsApp.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <section id="waitlist" className="waitlist" aria-labelledby="waitlist-title">
            <div className="container">
                <div className="waitlist__content">
                    <div className="waitlist__header">
                        <h2 id="waitlist-title" className="waitlist__title section-title">
                            Join the early access list
                        </h2>
                        <p className="waitlist__subtitle">
                            Be the first to know when LocAppoint launches in your city
                        </p>
                    </div>

                    <div className="waitlist__form-container">
                        <form className="waitlist__form" onSubmit={handleSubmit} noValidate>
                            <div className="form-group">
                                <label htmlFor="fullName" className="form-label">
                                    Full Name <span className="form-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    name="fullName"
                                    className="form-input"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loading}
                                    aria-describedby="fullName-error"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email" className="form-label">
                                    Email Address <span className="form-required">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loading}
                                    aria-describedby="email-error"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="cityService" className="form-label">
                                    City & Type of Service You Offer <span className="form-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="cityService"
                                    name="cityService"
                                    className="form-input"
                                    placeholder="e.g., Lisbon – Fitness Trainer"
                                    value={formData.cityService}
                                    onChange={handleInputChange}
                                    required
                                    disabled={loading}
                                    aria-describedby="cityService-error"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="comments" className="form-label">
                                    Comments (optional)
                                </label>
                                <textarea
                                    id="comments"
                                    name="comments"
                                    className="form-input form-textarea"
                                    rows="4"
                                    placeholder="Tell us about your business or any specific needs..."
                                    value={formData.comments}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>

                            {message.text && (
                                <div className={`form-message form-message--${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="waitlist__actions">
                                <button
                                    type="submit"
                                    className="btn btn--primary btn--large btn--full"
                                    disabled={loading}
                                >
                                    {loading ? 'Joining...' : 'Join the Early Access List'}
                                </button>

                                <a
                                    href={`https://wa.me/${WHATSAPP_NO}`}
                                    className="btn btn--secondary btn--large btn--full"
                                    target="_blank"
                                    rel="noopener noreferrer">
                                    Chat with Us on WhatsApp
                                </a>
                            </div>
                        </form>

                        <p className="waitlist__privacy">
                            We'll only use this to update you about the launch. No spam.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Waitlist
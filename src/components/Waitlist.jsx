import { useState } from 'react'

const Waitlist = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        cityService: '',
        comments: ''
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // Form is non-functional as requested - just visual feedback
        console.log('Form would submit:', formData)
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
                                    placeholder="e.g., Lisbon — Fitness Trainer"
                                    value={formData.cityService}
                                    onChange={handleInputChange}
                                    required
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
                                />
                            </div>

                            <div className="waitlist__actions">
                                <button
                                    type="button"
                                    className="btn btn--primary btn--large btn--full"
                                >
                                    Join the Early Access List
                                </button>

                                <a
                                    href="https://wa.me/00000000000"
                                    className="btn btn--secondary btn--large btn--full"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
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
import { useState } from 'react'
import { WHATSAPP_NO } from '../../config'

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null)

    const faqs = [
        {
            question: "When will LocAppoint launch in my city?",
            answer: "We're launching in Lisbon and Porto first. Join the waitlist to be notified when we expand to your city. Early adopters get 3 months premium free!"
        }, 
        {
            question: "Is it really free? What's the catch?",
            answer: "Yes! Our free plan includes up to 50 bookings per month, which is perfect for small businesses. We offer premium plans with more features, but you can stay free forever if it fits your needs."
        },
        {
            question: "How is this different from Google Calendar or Calendly?",
            answer: "LocAppoint is built specifically for local service businesses with features like local discovery, Portuguese interface, WhatsApp integration, and no technical setup required. We help clients find you, not just book you."
        },
        {
            question: "Can clients book without creating an account?",
            answer: "Absolutely! Clients can book with just their name, phone, and email. No account creation needed, making it super easy for your customers."
        },
        {
            question: "Do you support Portuguese payment methods?",
            answer: "Yes! We integrate with MB Way, Multibanco, and other local payment options. International cards are also supported."
        },
        {
            question: "What happens to my data if I cancel?",
            answer: "You own your data. You can export all your bookings and client information anytime. If you cancel, we keep your data for 30 days before permanent deletion."
        },
        {
            question: "Can I cancel anytime?",
            answer: "Yes, no contracts or commitments. You can upgrade, downgrade, or cancel anytime with just one click."
        },
        {
            question: "Do you offer support in Portuguese?",
            answer: "Sim! Our entire platform and support team operate in Portuguese. You can reach us via WhatsApp, email, or chat."
        },
        {
            question: "How do clients find my business?",
            answer: "Clients can find you through local search on our platform, your unique booking link you share, or through your website/social media. We optimize your profile for local discovery."
        },
        {
            question: "Can I use this for multiple locations?",
            answer: "Yes! Premium plans support multiple locations with separate calendars and staff management."
        }
    ]

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section className="faq" id="faq">
            <div className="container">
                <div className="faq__header">
                    <span className="section-badge">Questions</span>
                    <h2 className="section-title">
                        Frequently Asked Questions
                    </h2>
                    <p className="section-subtitle">
                        Everything you need to know about LocAppoint
                    </p>
                </div>

                <div className="faq__content">
                    <div className="faq__list">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className={`faq__item ${openIndex === index ? 'faq__item--open' : ''}`}
                            >
                                <button
                                    className="faq__question"
                                    onClick={() => toggleFAQ(index)}
                                    aria-expanded={openIndex === index}
                                >
                                    <span>{faq.question}</span>
                                    <svg
                                        className="faq__icon"
                                        width="24"
                                        height="24"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>
                                <div className="faq__answer">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="faq__cta-box">
                        <div className="faq__cta-content">
                            <h3>Still have questions?</h3>
                            <p>Can't find the answer you're looking for? Chat with our friendly team.</p>
                            <div className="faq__cta-buttons">
                                <a
                                    href={`https://wa.me/${WHATSAPP_NO}`}
                                    className="btn btn--whatsapp"
                                    target="_blank"
                                    rel="noopener noreferrer">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Chat on WhatsApp
                                </a>
                                <button
                                    className="btn btn--secondary"
                                    onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Join Waitlist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default FAQ
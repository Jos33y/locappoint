// FAQ.jsx - Enhanced FAQ section with numbered items and CTA
// Location: src/pages/landing/FAQ.jsx

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle, Plus, Minus } from 'lucide-react'

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null)

    const faqs = [
        {
            question: 'Is LocAppoint really free to start?',
            answer: 'Yes! You can create your profile, list your services, and start accepting bookings completely free. We only charge a small transaction fee when you get paid through our platform. No hidden fees, no monthly subscriptions required to get started.'
        },
        {
            question: 'Do I need technical skills to use LocAppoint?',
            answer: 'Not at all. LocAppoint is designed for busy business owners, not tech experts. If you can use WhatsApp, you can use LocAppoint. Our setup wizard guides you through everything step by step.'
        },
        {
            question: 'How do clients find my business?',
            answer: 'Your business appears in the LocAppoint marketplace where clients search for local services. You also get a unique booking link to share on social media, WhatsApp, Instagram, and anywhere else. Clients can book directly without needing to call or message.'
        },
        {
            question: 'What if a client needs to cancel or reschedule?',
            answer: 'Clients can easily reschedule or cancel through their booking confirmation. You set your own cancellation policy, and we enforce it automatically. No awkward conversations needed.'
        },
        {
            question: 'How do automatic reminders work?',
            answer: 'We send SMS and email reminders to your clients before their appointments. You choose when reminders go out. This alone reduces no-shows by up to 90% for most businesses.'
        },
        {
            question: 'Can I accept payments through LocAppoint?',
            answer: 'Yes! You can require deposits, full prepayment, or let clients pay at the venue. We support multiple payment methods including cards and mobile money. Funds are transferred directly to your account.'
        },
        {
            question: 'What happens when I go on holiday?',
            answer: 'Simply block out dates in your calendar. No bookings will be accepted for those times. You can also set specific working hours for each day of the week.'
        },
        {
            question: 'Is my data and my clients\' data secure?',
            answer: 'Absolutely. We use bank-level encryption and are fully GDPR compliant. Your data is yours, we never sell it to third parties or use it for advertising.'
        }
    ]

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section className="faq" id="faq">
            {/* Background */}
            <div className="faq__bg">
                <div className="faq__grid-pattern" />
                <div className="faq__glow faq__glow--1" />
                <div className="faq__glow faq__glow--2" />
                
                {/* Decorative circles */}
                <div className="faq__circle faq__circle--1" />
                <div className="faq__circle faq__circle--2" />
            </div>

            <div className="container">
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <HelpCircle size={14} />
                        <span>FAQ</span>
                    </div>
                    <h2 className="section-title">
                        Questions? 
                        <span className="ai-gradient-text"> We've got answers</span>
                    </h2>
                    <p className="section-subtitle">
                        Everything you need to know about getting started with LocAppoint.
                    </p>
                </motion.div>

                <motion.div 
                    className="faq__list"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {faqs.map((faq, index) => (
                        <motion.div 
                            key={index}
                            className={`faq__item ${openIndex === index ? 'faq__item--open' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                        >
                            {/* Glow line when open */}
                            <div className="faq__item-glow" />
                            
                            <button
                                className="faq__question"
                                onClick={() => toggleFAQ(index)}
                                type="button"
                                aria-expanded={openIndex === index}
                            >
                                {/* Number badge */}
                                <span className="faq__number">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                
                                <span className="faq__question-text">{faq.question}</span>
                                
                                <motion.div
                                    className="faq__icon"
                                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    {openIndex === index ? (
                                        <Minus size={18} />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                </motion.div>
                            </button>
                            
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        className="faq__answer"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <p>{faq.answer}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div 
                    className="faq__cta"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <div className="faq__cta-content">
                        <MessageCircle size={20} />
                        <div className="faq__cta-text">
                            <span className="faq__cta-title">Still have questions?</span>
                            <span className="faq__cta-subtitle">We're here to help you get started</span>
                        </div>
                    </div>
                    <button 
                        className="faq__cta-btn"
                        onClick={() => window.openWaitlistModal?.()}
                    >
                        Contact Us
                        <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default FAQ
// Faq - Accordion with numbered items and a bottom CTA. Lift-and-swap from old.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, MessageCircle, ArrowRight } from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const FALLBACK_FAQS = [
    {
        question: 'When does Locappoint launch in my city?',
        answer: 'We are launching in Lisbon first. Porto follows once we have 10 Lisbon businesses live. Lagos comes third. Join the waitlist and we will notify you when it opens in your area.'
    },
    {
        question: 'How much will Locappoint cost?',
        answer: 'The first 100 businesses in Lisbon get 12 months free. After that, it is 19 euro per month flat. No commission on bookings, ever.'
    },
    {
        question: 'Do I need technical skills to use it?',
        answer: 'No. Setup takes about ten minutes: add your services, set your availability, share your booking link. We handle the rest.'
    },
    {
        question: 'How will my clients book?',
        answer: 'You get a public booking page at locappoint.com/your-name. Share that link in your bio, on flyers, or directly with clients. They book in seconds, no app needed.'
    },
    {
        question: 'Will Locappoint work on my phone?',
        answer: 'Yes. The dashboard works on any device. You can also install it like an app on your phone for one-tap access.'
    },
    {
        question: 'Is my data safe?',
        answer: 'Yes. We are GDPR compliant and your data stays on EU servers. We do not sell data and we do not run ads.'
    }
]

const Faq = () => {
    const t = useT()
    const [openIndex, setOpenIndex] = useState(null)

    const raw = t('faq.items', null)
    const faqs = Array.isArray(raw) && raw.length > 0 ? raw : FALLBACK_FAQS

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i)

    const handleCtaClick = () => {
        if (typeof window !== 'undefined' && typeof window.openWaitlistModal === 'function') {
            window.openWaitlistModal()
        }
    }

    return (
        <section className="faq" id="faq">
            <div className="faq__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="faq__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="faq__editorial">
                        <span className="faq__editorial-rule" aria-hidden="true" />
                        <span className="faq__editorial-text">
                            {t('faq.eyebrow', 'FREQUENTLY ASKED')}
                        </span>
                    </div>
                    <h2 className="faq__title">
                        {t('faq.title', 'Everything you')}{' '}
                        <span className="faq__title-accent">
                            {t('faq.titleHighlight', 'need to know')}
                        </span>
                    </h2>
                    <p className="faq__subtitle">
                        {t('faq.subtitle', 'Short answers to what early supporters have been asking.')}
                    </p>
                </motion.header>

                <motion.div
                    className="faq__list"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {faqs.map((item, index) => {
                        const isOpen = openIndex === index
                        return (
                            <motion.div
                                key={index}
                                className={`faq__item ${isOpen ? 'faq__item--open' : ''}`}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
                            >
                                <button
                                    type="button"
                                    className="faq__question"
                                    onClick={() => toggle(index)}
                                    aria-expanded={isOpen}
                                >
                                    <span className="faq__number">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="faq__question-text">{item.question}</span>
                                    <span className="faq__icon" aria-hidden="true">
                                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                                    </span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            className="faq__answer"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: EASE }}
                                        >
                                            <p>{item.answer}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </motion.div>

                <motion.div
                    className="faq__cta"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                >
                    <div className="faq__cta-left">
                        <span className="faq__cta-icon" aria-hidden="true">
                            <MessageCircle size={18} strokeWidth={1.75} />
                        </span>
                        <div className="faq__cta-text">
                            <span className="faq__cta-title">
                                {t('faq.ctaTitle', 'Still have questions?')}
                            </span>
                            <span className="faq__cta-subtitle">
                                {t('faq.ctaSubtitle', 'Join the waitlist and message us directly.')}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="faq__cta-btn"
                        onClick={handleCtaClick}
                    >
                        <span>{t('faq.ctaBtn', 'Join the waitlist')}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default Faq

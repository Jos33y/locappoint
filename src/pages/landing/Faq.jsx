// FAQ.jsx - Enhanced FAQ section with numbered items and CTA (Translated)
// Location: src/pages/landing/FAQ.jsx

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle, Plus, Minus } from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const FAQ = () => {
    const { t } = useLandingTranslation()
    const [openIndex, setOpenIndex] = useState(null)

    const faqs = t('faq.items')

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
                        <span>{t('faq.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('faq.title')}
                        <span className="ai-gradient-text">{t('faq.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('faq.subtitle')}
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
                            <span className="faq__cta-title">{t('faq.ctaTitle')}</span>
                            <span className="faq__cta-subtitle">{t('faq.ctaSubtitle')}</span>
                        </div>
                    </div>
                    <button 
                        className="faq__cta-btn"
                        onClick={() => window.openWaitlistModal?.()}
                    >
                        {t('faq.ctaBtn')}
                        <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default FAQ
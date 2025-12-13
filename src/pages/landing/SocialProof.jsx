// SocialProof.jsx - Social proof and testimonials section
// Location: src/pages/landing/SocialProof.jsx

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Quote, 
    Star, 
    ChevronLeft, 
    ChevronRight,
    Sparkles,
    Building2,
    Users,
    TrendingUp
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const SocialProof = () => {
    const { t } = useLandingTranslation()
    const [activeIndex, setActiveIndex] = useState(0)

    const testimonials = t('socialProof.testimonials')

    // Stats bar data
    const proofStats = [
        {
            icon: Building2,
            value: '100+',
            label: t('socialProof.stats.businesses')
        },
        {
            icon: Users,
            value: '500+',
            label: t('socialProof.stats.waitlist')
        },
        {
            icon: TrendingUp,
            value: '10+',
            label: t('socialProof.stats.industries')
        }
    ]

    const nextTestimonial = () => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }

    const prevTestimonial = () => {
        setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    }

    return (
        <section className="social-proof" id="testimonials">
            {/* Background */}
            <div className="social-proof__bg">
                <div className="social-proof__grid-pattern" />
                <div className="social-proof__glow social-proof__glow--1" />
                <div className="social-proof__glow social-proof__glow--2" />
            </div>

            <div className="container">
                {/* Header */}
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <Sparkles size={14} />
                        <span>{t('socialProof.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('socialProof.title')}
                        <span className="ai-gradient-text">{t('socialProof.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('socialProof.subtitle')}
                    </p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div 
                    className="social-proof__stats"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {proofStats.map((stat, index) => (
                        <div key={index} className="social-proof__stat">
                            <div className="social-proof__stat-icon">
                                <stat.icon size={18} />
                            </div>
                            <div className="social-proof__stat-content">
                                <span className="social-proof__stat-value">{stat.value}</span>
                                <span className="social-proof__stat-label">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Testimonials Carousel */}
                <motion.div 
                    className="social-proof__carousel"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {/* Quote icon decoration */}
                    <div className="social-proof__quote-icon">
                        <Quote size={48} />
                    </div>

                    {/* Testimonial Card */}
                    <div className="social-proof__testimonial-wrapper">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                className="social-proof__testimonial"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {/* Stars */}
                                <div className="social-proof__stars">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            size={18} 
                                            fill="#FBBF24" 
                                            color="#FBBF24" 
                                        />
                                    ))}
                                </div>

                                {/* Quote text */}
                                <blockquote className="social-proof__quote">
                                    "{testimonials[activeIndex].quote}"
                                </blockquote>

                                {/* Author */}
                                <div className="social-proof__author">
                                    <div className="social-proof__avatar">
                                        <span>{testimonials[activeIndex].name.charAt(0)}</span>
                                    </div>
                                    <div className="social-proof__author-info">
                                        <span className="social-proof__author-name">
                                            {testimonials[activeIndex].name}
                                        </span>
                                        <span className="social-proof__author-role">
                                            {testimonials[activeIndex].role}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <div className="social-proof__nav">
                        <button 
                            className="social-proof__nav-btn"
                            onClick={prevTestimonial}
                            aria-label="Previous testimonial"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {/* Dots */}
                        <div className="social-proof__dots">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    className={`social-proof__dot ${index === activeIndex ? 'social-proof__dot--active' : ''}`}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`Go to testimonial ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button 
                            className="social-proof__nav-btn"
                            onClick={nextTestimonial}
                            aria-label="Next testimonial"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </motion.div>

                {/* Bottom trust text */}
                <motion.p 
                    className="social-proof__trust-text"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    {t('socialProof.trustText')}
                </motion.p>
            </div>
        </section>
    )
}

export default SocialProof
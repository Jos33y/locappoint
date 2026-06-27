// SocialProof - 3 trust stats + testimonial carousel. Real quotes from waitlist signups.
// Lift-and-swap of old layout with brand-token palette.

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Quote,
    Star,
    ChevronLeft,
    ChevronRight,
    Building2,
    Users,
    TrendingUp
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const FALLBACK_TESTIMONIALS = [
    {
        name: 'Carlos Okonkwo',
        role: 'Barbershop Owner, Lagos',
        quote: "My clients always ask if they can book online. I've been waiting for an affordable solution that understands local businesses."
    }
]

const SocialProof = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()
    const [activeIndex, setActiveIndex] = useState(0)

    const raw = t('socialProof.testimonials', null)
    const testimonials = Array.isArray(raw) && raw.length > 0 ? raw : FALLBACK_TESTIMONIALS

    const proofStats = [
        {
            icon: Building2,
            accent: 'azure',
            value: t('socialProof.stats.businessesValue', '100+'),
            label: t('socialProof.stats.businesses', 'Businesses on waitlist')
        },
        {
            icon: Users,
            accent: 'signal',
            value: t('socialProof.stats.waitlistValue', '500+'),
            label: t('socialProof.stats.waitlist', 'People interested')
        },
        {
            icon: TrendingUp,
            accent: 'success',
            value: t('socialProof.stats.industriesValue', '10+'),
            label: t('socialProof.stats.industries', 'Industries served')
        }
    ]

    const nextTestimonial = () => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }

    const prevTestimonial = () => {
        setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    }

    const active = testimonials[activeIndex] || FALLBACK_TESTIMONIALS[0]

    return (
        <section className="social-proof" id="testimonials">
            <div className="social-proof__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="social-proof__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="social-proof__editorial">
                        <span className="social-proof__editorial-rule" aria-hidden="true" />
                        <span className="social-proof__editorial-text">
                            {t('socialProof.eyebrow', 'TRUSTED BY BUSINESSES')}
                        </span>
                    </div>
                    <h2 className="social-proof__title">
                        {t('socialProof.title', 'See what early')}{' '}
                        <span className="social-proof__title-accent">
                            {t('socialProof.titleHighlight', 'supporters say')}
                        </span>
                    </h2>
                    <p className="social-proof__subtitle">
                        {t('socialProof.subtitle', 'Business owners are already excited about what LocAppoint will bring to their operations.')}
                    </p>
                </motion.header>

                <motion.div
                    className="social-proof__stats"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                >
                    {proofStats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <div key={index} className={`social-proof__stat social-proof__stat--${stat.accent}`}>
                                <span className={`social-proof__stat-icon social-proof__stat-icon--${stat.accent}`}>
                                    <Icon size={18} strokeWidth={1.75} />
                                </span>
                                <div className="social-proof__stat-content">
                                    <span className="social-proof__stat-value">{stat.value}</span>
                                    <span className="social-proof__stat-label">{stat.label}</span>
                                </div>
                            </div>
                        )
                    })}
                </motion.div>

                <motion.div
                    className="social-proof__carousel"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                >
                    <div className="social-proof__quote-icon" aria-hidden="true">
                        <Quote size={26} strokeWidth={1.5} />
                    </div>

                    <div className="social-proof__testimonial-wrap">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                className="social-proof__testimonial"
                                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -40 }}
                                transition={{ duration: 0.4, ease: EASE }}
                            >
                                <div className="social-proof__stars" aria-label="5 out of 5 stars">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill="var(--signal)" color="var(--signal)" />
                                    ))}
                                </div>

                                <blockquote className="social-proof__quote">
                                    &ldquo;{active.quote}&rdquo;
                                </blockquote>

                                <div className="social-proof__author">
                                    <span className="social-proof__avatar" aria-hidden="true">
                                        {active.name?.charAt(0) || '?'}
                                    </span>
                                    <div className="social-proof__author-info">
                                        <span className="social-proof__author-name">{active.name}</span>
                                        <span className="social-proof__author-role">{active.role}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="social-proof__nav">
                        <button
                            type="button"
                            className="social-proof__nav-btn"
                            onClick={prevTestimonial}
                            aria-label="Previous testimonial"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="social-proof__dots">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`social-proof__dot ${index === activeIndex ? 'social-proof__dot--active' : ''}`}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`Testimonial ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            className="social-proof__nav-btn"
                            onClick={nextTestimonial}
                            aria-label="Next testimonial"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </motion.div>

                <motion.p
                    className="social-proof__trust"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    {t('socialProof.trustText', 'Real feedback from business owners on our waitlist.')}
                </motion.p>
            </div>
        </section>
    )
}

export default SocialProof

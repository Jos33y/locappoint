// HowItWorks - Vertical 4-step timeline with animated progress fill and traveling dot.
// Brand tokens swap of the original purple/cyan/green/amber design.

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
    UserPlus,
    Search,
    CalendarCheck,
    TrendingUp,
    ArrowRight
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const HowItWorks = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()
    const timelineRef = useRef(null)
    const isInView = useInView(timelineRef, { once: true, margin: '-100px' })

    const steps = [
        {
            icon: UserPlus,
            number: '01',
            accent: 'azure',
            title: t('how.profile.title', 'Create Your Profile'),
            description: t('how.profile.body', 'Sign up in minutes. Add your services, pricing, and availability. No technical skills required.')
        },
        {
            icon: Search,
            number: '02',
            accent: 'signal',
            title: t('how.discovered.title', 'Get Discovered'),
            description: t('how.discovered.body', 'Your business appears on our marketplace. Share your booking link on social media and WhatsApp.')
        },
        {
            icon: CalendarCheck,
            number: '03',
            accent: 'success',
            title: t('how.bookings.title', 'Accept Bookings'),
            description: t('how.bookings.body', 'Clients book directly into your calendar. Confirmations and reminders are sent automatically.')
        },
        {
            icon: TrendingUp,
            number: '04',
            accent: 'azure',
            title: t('how.grow.title', 'Grow Your Business'),
            description: t('how.grow.body', 'Focus on your craft. Let LocAppoint handle scheduling, reminders, and client management.')
        }
    ]

    const handleCtaClick = () => {
        if (typeof window !== 'undefined' && typeof window.openWaitlistModal === 'function') {
            window.openWaitlistModal()
        }
    }

    return (
        <section className="how-it-works" id="how-it-works">
            <div className="how-it-works__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="how-it-works__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="how-it-works__editorial">
                        <span className="how-it-works__editorial-rule" aria-hidden="true" />
                        <span className="how-it-works__editorial-text">
                            {t('how.eyebrow', 'GETTING STARTED')}
                        </span>
                    </div>
                    <h2 className="how-it-works__title">
                        {t('how.title', 'Ready in')}{' '}
                        <span className="how-it-works__title-accent">
                            {t('how.titleHighlight', 'minutes')}
                        </span>
                    </h2>
                    <p className="how-it-works__subtitle">
                        {t('how.subtitle', 'Getting started is simple. No complicated setup, no hidden fees.')}
                    </p>
                </motion.header>

                <div className="how-it-works__timeline" ref={timelineRef}>
                    <div className="how-it-works__progress-track" aria-hidden="true">
                        <motion.div
                            className="how-it-works__progress-fill"
                            initial={{ scaleY: 0 }}
                            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                        />
                        {!prefersReducedMotion && (
                            <motion.div
                                className="how-it-works__progress-dot"
                                initial={{ top: '0%', opacity: 0 }}
                                animate={isInView ? {
                                    top: ['0%', '100%'],
                                    opacity: [0, 1, 1, 0]
                                } : {}}
                                transition={{ duration: 2, ease: 'easeInOut', delay: 0.5 }}
                            />
                        )}
                    </div>

                    {steps.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <motion.div
                                key={index}
                                className={`how-it-works__step how-it-works__step--${step.accent}`}
                                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -32 }}
                                whileInView={{
                                    opacity: 1,
                                    x: 0,
                                    transition: {
                                        duration: 0.6,
                                        delay: prefersReducedMotion ? 0 : index * 0.15,
                                        ease: EASE
                                    }
                                }}
                                viewport={{ once: true }}
                            >
                                <div className="how-it-works__indicator">
                                    <span
                                        className="how-it-works__ring how-it-works__ring--1"
                                        aria-hidden="true"
                                    />
                                    <span
                                        className="how-it-works__ring how-it-works__ring--2"
                                        aria-hidden="true"
                                    />
                                    <span className={`how-it-works__icon how-it-works__icon--${step.accent}`}>
                                        <Icon size={20} strokeWidth={1.5} />
                                    </span>
                                    <span className="how-it-works__number">
                                        {step.number}
                                    </span>
                                </div>

                                <div className="how-it-works__card">
                                    <h3 className="how-it-works__step-title">{step.title}</h3>
                                    <p className="how-it-works__step-description">{step.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <motion.div
                    className="how-it-works__cta-wrap"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                >
                    <button
                        type="button"
                        className="how-it-works__cta"
                        onClick={handleCtaClick}
                    >
                        <span>{t('how.cta', 'Get started today')}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default HowItWorks

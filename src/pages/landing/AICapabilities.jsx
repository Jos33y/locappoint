// AICapabilities - Powered by AI section. Brain centerpiece, 5 capability cards (3 row 1, 2 row 2 split).

import { motion, useReducedMotion } from 'framer-motion'
import {
    Eye,
    Brain,
    CalendarCheck,
    ShieldCheck,
    Star,
    BarChart3
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const AICapabilities = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()

    const capabilities = [
        {
            icon: Eye,
            accent: 'azure',
            title: t('ai.cap1.title', 'AI Visibility Engine'),
            description: t('ai.cap1.description', 'Our AI analyzes search patterns and client behavior to boost your visibility. Get matched with clients actively searching for your services.'),
            features: [
                t('ai.cap1.feature1', 'Smart search ranking'),
                t('ai.cap1.feature2', 'Personalized recommendations'),
                t('ai.cap1.feature3', 'Local SEO optimization')
            ]
        },
        {
            icon: CalendarCheck,
            accent: 'success',
            title: t('ai.cap2.title', 'Smart Booking System'),
            description: t('ai.cap2.description', 'Intelligent scheduling that learns your preferences. Auto-fills gaps, prevents conflicts, and optimizes your calendar for maximum efficiency.'),
            features: [
                t('ai.cap2.feature1', 'Predictive scheduling'),
                t('ai.cap2.feature2', 'Smart gap filling'),
                t('ai.cap2.feature3', 'Conflict prevention')
            ]
        },
        {
            icon: ShieldCheck,
            accent: 'signal',
            title: t('ai.cap3.title', 'Compliance Assistant'),
            description: t('ai.cap3.description', 'Stay compliant without the headache. AI monitors regulatory requirements and automatically handles GDPR, data protection, and consent management.'),
            features: [
                t('ai.cap3.feature1', 'Auto GDPR compliance'),
                t('ai.cap3.feature2', 'Consent tracking'),
                t('ai.cap3.feature3', 'Data protection alerts')
            ]
        },
        {
            icon: Star,
            accent: 'signal',
            title: t('ai.cap4.title', 'Reputation Builder'),
            description: t('ai.cap4.description', 'AI-powered review management that identifies happy clients and encourages reviews at the perfect moment. Build trust on autopilot.'),
            features: [
                t('ai.cap4.feature1', 'Smart review timing'),
                t('ai.cap4.feature2', 'Sentiment analysis'),
                t('ai.cap4.feature3', 'Response suggestions')
            ]
        },
        {
            icon: BarChart3,
            accent: 'azure',
            title: t('ai.cap5.title', 'Insight Dashboard'),
            description: t('ai.cap5.description', 'Transform data into action. AI analyzes your business patterns, predicts trends, and delivers personalized recommendations to grow revenue.'),
            features: [
                t('ai.cap5.feature1', 'Revenue predictions'),
                t('ai.cap5.feature2', 'Client insights'),
                t('ai.cap5.feature3', 'Growth recommendations')
            ]
        }
    ]

    const gridVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.1,
                delayChildren: 0.1
            }
        }
    }

    const cardVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: EASE }
        }
    }

    return (
        <section className="ai-capabilities" id="ai">
            <div className="ai-capabilities__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="ai-capabilities__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="ai-capabilities__editorial">
                        <span className="ai-capabilities__editorial-rule" aria-hidden="true" />
                        <span className="ai-capabilities__editorial-text">
                            {t('ai.eyebrow', 'POWERED BY AI')}
                        </span>
                    </div>
                    <h2 className="ai-capabilities__title">
                        {t('ai.title', 'Intelligence that works')}{' '}
                        <span className="ai-capabilities__title-accent">
                            {t('ai.titleHighlight', 'for you')}
                        </span>
                    </h2>
                    <p className="ai-capabilities__subtitle">
                        {t('ai.subtitle', 'LocAppoint uses advanced AI to automate the tedious, optimize the complex, and give you superpowers to compete with the big players.')}
                    </p>
                </motion.header>

                <motion.div
                    className="ai-capabilities__core-wrap"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                >
                    <div className="ai-capabilities__core" aria-hidden="true">
                        <span className="ai-capabilities__core-ring ai-capabilities__core-ring--1" />
                        <span className="ai-capabilities__core-ring ai-capabilities__core-ring--2" />
                        <span className="ai-capabilities__core-ring ai-capabilities__core-ring--3" />
                        <span className="ai-capabilities__core-center">
                            <Brain size={28} strokeWidth={1.5} />
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    className="ai-capabilities__grid"
                    variants={gridVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                >
                    {capabilities.map((cap, i) => {
                        const Icon = cap.icon
                        return (
                            <motion.article
                                key={i}
                                className={`ai-card ai-card--${cap.accent}`}
                                variants={cardVariants}
                            >
                                <div className="ai-card__content">
                                    <span className={`ai-card__icon ai-card__icon--${cap.accent}`}>
                                        <Icon size={20} strokeWidth={1.5} />
                                    </span>
                                    <h3 className="ai-card__title">{cap.title}</h3>
                                    <p className="ai-card__description">{cap.description}</p>
                                    <ul className="ai-card__features">
                                        {cap.features.map((feat, j) => (
                                            <li key={j} className="ai-card__feature">
                                                <span
                                                    className={`ai-card__feature-dot ai-card__feature-dot--${cap.accent}`}
                                                    aria-hidden="true"
                                                />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.article>
                        )
                    })}
                </motion.div>

                <motion.p
                    className="ai-capabilities__footer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
                >
                    {t('ai.footer', 'All AI features included. No extra cost. No complicated setup.')}
                </motion.p>
            </div>
        </section>
    )
}

export default AICapabilities

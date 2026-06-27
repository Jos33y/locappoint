// ClientValue - The marketplace side. What clients get from Locappoint.
// Six benefits, lift-and-swap from old layout with brand-token palette.

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
    Search,
    Calendar,
    Clock,
    Star,
    Shield,
    Smartphone,
    ArrowRight
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const ClientValue = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()
    const ref = useRef(null)
    useInView(ref, { once: true, margin: '-100px' })

    const benefits = [
        {
            icon: Search,
            accent: 'azure',
            title: t('clientValue.discover.title', 'Discover Professionals'),
            description: t('clientValue.discover.description', 'Find verified local professionals in your area with real reviews.')
        },
        {
            icon: Calendar,
            accent: 'signal',
            title: t('clientValue.book.title', 'Book Instantly'),
            description: t('clientValue.book.description', 'See real-time availability and book in seconds, 24/7.')
        },
        {
            icon: Clock,
            accent: 'success',
            title: t('clientValue.time.title', 'Save Time'),
            description: t('clientValue.time.description', 'No more phone calls or waiting for replies. Book when it suits you.')
        },
        {
            icon: Star,
            accent: 'signal',
            title: t('clientValue.reviews.title', 'Trusted Reviews'),
            description: t('clientValue.reviews.description', 'Make confident decisions based on real client feedback.')
        },
        {
            icon: Shield,
            accent: 'azure',
            title: t('clientValue.secure.title', 'Secure Payments'),
            description: t('clientValue.secure.description', 'Pay safely online or at the venue. Your data is always protected.')
        },
        {
            icon: Smartphone,
            accent: 'success',
            title: t('clientValue.mobile.title', 'Book Anywhere'),
            description: t('clientValue.mobile.description', 'Use any device to manage your appointments on the go.')
        }
    ]

    return (
        <section className="client-value" id="for-clients" ref={ref}>
            <div className="client-value__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="client-value__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="client-value__editorial">
                        <span className="client-value__editorial-rule" aria-hidden="true" />
                        <span className="client-value__editorial-text">
                            {t('clientValue.eyebrow', 'FOR CLIENTS')}
                        </span>
                    </div>
                    <h2 className="client-value__title">
                        {t('clientValue.title', 'Finding services just got')}{' '}
                        <span className="client-value__title-accent">
                            {t('clientValue.titleHighlight', 'easier')}
                        </span>
                    </h2>
                    <p className="client-value__subtitle">
                        {t('clientValue.subtitle', 'Discover top-rated local professionals, book instantly, and enjoy a seamless experience from start to finish.')}
                    </p>
                </motion.header>

                <div className="client-value__grid">
                    {benefits.map((benefit, index) => {
                        const Icon = benefit.icon
                        return (
                            <motion.article
                                key={index}
                                className={`client-value__card client-value__card--${benefit.accent}`}
                                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 28 }}
                                whileInView={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.5,
                                        delay: prefersReducedMotion ? 0 : index * 0.08,
                                        ease: EASE
                                    }
                                }}
                                viewport={{ once: true }}
                            >
                                <div className="client-value__icon-wrap">
                                    <span className="client-value__icon-ring" aria-hidden="true" />
                                    <span className={`client-value__icon client-value__icon--${benefit.accent}`}>
                                        <Icon size={22} strokeWidth={1.5} />
                                    </span>
                                </div>
                                <h3 className="client-value__card-title">{benefit.title}</h3>
                                <p className="client-value__card-description">{benefit.description}</p>
                                <span className="client-value__arrow" aria-hidden="true">
                                    <ArrowRight size={16} />
                                </span>
                            </motion.article>
                        )
                    })}
                </div>

                <motion.p
                    className="client-value__footnote"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                >
                    {t('clientValue.footnote', 'Join the waitlist to be notified when we launch in your area.')}
                </motion.p>
            </div>
        </section>
    )
}

export default ClientValue

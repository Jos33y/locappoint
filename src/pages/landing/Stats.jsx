// Stats - The cost of phone-and-DM bookings. Three no-show stats with motion stagger.

import { motion, useReducedMotion } from 'framer-motion'
import { Wallet, Phone, BellRing } from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const Stats = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()

    const stats = [
        {
            icon: Wallet,
            value: '\u20AC45K',
            label: t('stats.stat1', 'Average lost per year to missed appointments per business'),
            accent: 'azure'
        },
        {
            icon: Phone,
            value: '15-25%',
            label: t('stats.stat2', 'No-show rate on phone-based bookings'),
            accent: 'signal'
        },
        {
            icon: BellRing,
            value: '<25%',
            label: t('stats.stat3', 'Reduction in no-shows with automated reminders'),
            accent: 'success'
        }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.12,
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
        <section className="stats" id="stats">
            <div className="stats__ambient" aria-hidden="true" />

            <div className="container">
                <motion.div
                    className="stats__editorial"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, ease: EASE }}
                >
                    <span className="stats__editorial-rule" aria-hidden="true" />
                    <span className="stats__editorial-text">
                        {t('stats.eyebrow', 'THE COST')}
                    </span>
                </motion.div>

                <motion.div
                    className="stats__grid"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                >
                    {stats.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <motion.div
                                key={i}
                                className={`stats__card stats__card--${stat.accent}`}
                                variants={cardVariants}
                            >
                                <span className="stats__card-rule" aria-hidden="true" />
                                <div className="stats__card-row">
                                    <span className="stats__card-icon">
                                        <Icon size={18} strokeWidth={1.75} />
                                    </span>
                                    <div className="stats__card-value">{stat.value}</div>
                                </div>
                                <div className="stats__card-label">{stat.label}</div>
                            </motion.div>
                        )
                    })}
                </motion.div>

                <motion.p
                    className="stats__source"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
                >
                    {t('stats.source', 'SOURCES: BOULEVARD 2025, VOCALY AI 2025, EDEN INDUSTRY ANALYSIS')}
                </motion.p>
            </div>
        </section>
    )
}

export default Stats

// Features - Core capabilities. Bento with matching-row-span cards and unified internal spacing.

import { motion, useReducedMotion } from 'framer-motion'
import {
    Calendar,
    Bell,
    CreditCard,
    Users,
    BarChart3,
    Smartphone,
    Globe,
    Check
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const BOOKED_DAYS = [3, 7, 12, 15, 19, 23, 28]
const TODAY = 10
const CHART_BARS = [30, 38, 45, 52, 48, 60, 67, 72, 78, 75, 88, 95]

const Features = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()

    const gridVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.08,
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
        <section className="features" id="features">
            <div className="features__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="features__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="features__editorial">
                        <span className="features__editorial-rule" aria-hidden="true" />
                        <span className="features__editorial-text">
                            {t('features.eyebrow', 'CORE FEATURES')}
                        </span>
                    </div>
                    <h2 className="features__title">
                        {t('features.title', 'The essentials,')}{' '}
                        <span className="features__title-accent">
                            {t('features.titleHighlight', 'done right')}
                        </span>
                    </h2>
                    <p className="features__subtitle">
                        {t('features.subtitle', 'Everything you need to manage bookings professionally, without the complexity.')}
                    </p>
                </motion.header>

                <motion.div
                    className="features__bento"
                    variants={gridVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                >
                    {/* Large 1: 24/7 Online Booking + mini calendar (2x2) */}
                    <motion.article
                        className="features__card features__card--large"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--azure">
                                    <Calendar size={20} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.booking.title', '24/7 Online Booking')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.booking.body', 'Let clients book appointments anytime, anywhere. Your calendar stays updated automatically while you focus on what matters.')}
                                </p>
                            </div>

                            <div className="features__card-visual">
                                <div className="features__mini-calendar">
                                    <div className="features__mini-calendar-header">
                                        DECEMBER 2025
                                    </div>
                                    <div className="features__mini-calendar-grid">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                            <div key={`lbl-${i}`} className="features__mini-calendar-day-label">{d}</div>
                                        ))}
                                        {Array.from({ length: 31 }, (_, i) => {
                                            const day = i + 1
                                            const booked = BOOKED_DAYS.includes(day)
                                            const today = day === TODAY
                                            return (
                                                <div
                                                    key={day}
                                                    className={[
                                                        'features__mini-calendar-day',
                                                        booked ? 'features__mini-calendar-day--booked' : '',
                                                        today ? 'features__mini-calendar-day--today' : ''
                                                    ].filter(Boolean).join(' ')}
                                                >
                                                    {day}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.article>

                    {/* Large 2: Automatic Reminders + notification stack (2x2) */}
                    <motion.article
                        className="features__card features__card--large"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--signal">
                                    <Bell size={20} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.reminders.title', 'Automatic Reminders')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.reminders.body', 'Reduce no-shows with email and WhatsApp reminders sent automatically. Configurable timing per business, in the language your clients speak.')}
                                </p>
                            </div>

                            <div className="features__card-visual">
                                <div className="features__notif-label">
                                    <span className="features__notif-label-dot" aria-hidden="true" />
                                    <span>{t('features.reminders.activity', 'AUTOMATED ACTIVITY')}</span>
                                </div>
                                <div className="features__notif-stack">
                                    <div className="features__notif features__notif--reminder">
                                        <Bell size={14} strokeWidth={1.75} />
                                        <span>{t('features.reminders.notif1', 'Reminder: Tomorrow 10:00')}</span>
                                    </div>
                                    <div className="features__notif features__notif--reminder">
                                        <Bell size={14} strokeWidth={1.75} />
                                        <span>{t('features.reminders.notif2', 'Sofia M. - 30 min reminder')}</span>
                                    </div>
                                    <div className="features__notif features__notif--confirmed">
                                        <Check size={14} strokeWidth={2.5} />
                                        <span>{t('features.reminders.notif3', 'Booking confirmed!')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.article>

                    {/* Wide: Real-time Analytics + chart (4x1) */}
                    <motion.article
                        className="features__card features__card--wide"
                        variants={cardVariants}
                    >
                        <div className="features__card-content features__card-content--row">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--azure">
                                    <BarChart3 size={20} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.analytics.title', 'Real-time Analytics')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.analytics.body', 'Understand your business with insights on bookings, revenue, peak hours, and client retention.')}
                                </p>
                            </div>
                            <div className="features__mini-chart" aria-hidden="true">
                                <div className="features__mini-chart-bars">
                                    {CHART_BARS.map((h, i) => (
                                        <div
                                            key={i}
                                            className="features__mini-chart-bar"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                                <div className="features__mini-chart-line">
                                    <svg viewBox="0 0 280 100" preserveAspectRatio="none">
                                        <path
                                            d="M 0,72 C 35,68 60,55 105,48 S 175,30 230,18 L 280,10"
                                            stroke="var(--azure)"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </motion.article>

                    {/* Small 1: Easy Payments */}
                    <motion.article
                        className="features__card features__card--small"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--success features__card-icon--small">
                                    <CreditCard size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.payments.title', 'Easy Payments')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.payments.body', 'Accept deposits and full payments online.')}
                                </p>
                            </div>
                        </div>
                    </motion.article>

                    {/* Small 2: Client Management */}
                    <motion.article
                        className="features__card features__card--small"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--success features__card-icon--small">
                                    <Users size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.clients.title', 'Client Management')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.clients.body', 'History, preferences, and notes per client.')}
                                </p>
                            </div>
                        </div>
                    </motion.article>

                    {/* Small 3: Mobile First */}
                    <motion.article
                        className="features__card features__card--small"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--signal features__card-icon--small">
                                    <Smartphone size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.mobile.title', 'Mobile First')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.mobile.body', 'Works perfectly on any device.')}
                                </p>
                            </div>
                        </div>
                    </motion.article>

                    {/* Small 4: Multi-Language */}
                    <motion.article
                        className="features__card features__card--small"
                        variants={cardVariants}
                    >
                        <div className="features__card-content">
                            <div className="features__card-head">
                                <div className="features__card-icon features__card-icon--azure features__card-icon--small">
                                    <Globe size={18} strokeWidth={1.5} />
                                </div>
                                <h3 className="features__card-title">
                                    {t('features.languages.title', 'Multi-Language')}
                                </h3>
                                <p className="features__card-description">
                                    {t('features.languages.body', 'English and Portuguese at launch.')}
                                </p>
                            </div>
                        </div>
                    </motion.article>
                </motion.div>
            </div>
        </section>
    )
}

export default Features

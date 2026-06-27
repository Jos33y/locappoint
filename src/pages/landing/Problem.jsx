// Problem - Without LocAppoint vs With LocAppoint. Two-column comparison with motion.

import { motion, useReducedMotion } from 'framer-motion'
import {
    X,
    Check,
    Phone,
    Clock,
    Calendar,
    Users,
    TrendingUp,
    Bell,
    Zap,
    ArrowRight
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const Problem = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()

    const problems = [
        { icon: Phone,    text: t('problem.problem1', 'Losing clients to missed calls and messages') },
        { icon: Clock,    text: t('problem.problem2', 'Wasting hours on scheduling and reminders') },
        { icon: Calendar, text: t('problem.problem3', 'Double bookings and calendar chaos') },
        { icon: Users,    text: t('problem.problem4', 'No way for new clients to find you') }
    ]

    const solutions = [
        { icon: Bell,       text: t('problem.solution1', 'Clients book 24/7, even when you sleep') },
        { icon: Calendar,   text: t('problem.solution2', 'Smart scheduling with automatic reminders') },
        { icon: TrendingUp, text: t('problem.solution3', 'Get discovered by thousands of local clients') },
        { icon: Users,      text: t('problem.solution4', 'Build loyalty with seamless rebooking') }
    ]

    const problemVariants = {
        hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -24 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.5,
                delay: prefersReducedMotion ? 0 : i * 0.08,
                ease: EASE
            }
        })
    }

    const solutionVariants = {
        hidden: { opacity: 0, x: prefersReducedMotion ? 0 : 24 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.5,
                delay: prefersReducedMotion ? 0 : i * 0.08 + 0.15,
                ease: EASE
            }
        })
    }

    const handleCtaClick = () => {
        if (typeof window !== 'undefined' && typeof window.openWaitlistModal === 'function') {
            window.openWaitlistModal()
        }
    }

    return (
        <section className="problem-solution" id="problem">
            <div className="problem-solution__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="problem-solution__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="problem-solution__editorial">
                        <span className="problem-solution__editorial-rule" aria-hidden="true" />
                        <span className="problem-solution__editorial-text">
                            {t('problem.eyebrow', 'THE REALITY')}
                        </span>
                    </div>
                    <h2 className="problem-solution__title">
                        {t('problem.title', 'Running a local business is')}{' '}
                        <span className="problem-solution__title-accent">
                            {t('problem.titleHighlight', 'hard enough')}
                        </span>
                    </h2>
                    <p className="problem-solution__subtitle">
                        {t('problem.subtitle', 'You started your business to do what you love, not to spend hours managing bookings.')}
                    </p>
                </motion.header>

                <div className="problem-solution__layout">
                    <motion.div
                        className="problem-solution__column problem-solution__column--problems"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.5, ease: EASE }}
                    >
                        <div className="problem-solution__column-header">
                            <span className="problem-solution__icon-badge problem-solution__icon-badge--danger">
                                <X size={16} strokeWidth={2.5} />
                            </span>
                            <span>{t('problem.without', 'WITHOUT LOCAPPOINT')}</span>
                        </div>

                        <ul className="problem-solution__list">
                            {problems.map((item, index) => {
                                const Icon = item.icon
                                return (
                                    <motion.li
                                        key={index}
                                        className="problem-solution__item problem-solution__item--problem"
                                        custom={index}
                                        variants={problemVariants}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, margin: '-40px' }}
                                    >
                                        <span className="problem-solution__item-mark problem-solution__item-mark--danger">
                                            <X size={14} strokeWidth={3} />
                                        </span>
                                        <span className="problem-solution__item-icon problem-solution__item-icon--danger">
                                            <Icon size={18} />
                                        </span>
                                        <span className="problem-solution__item-text">{item.text}</span>
                                    </motion.li>
                                )
                            })}
                        </ul>
                    </motion.div>

                    <div className="problem-solution__divider" aria-hidden="true">
                        <span className="problem-solution__divider-line" />
                        <span className="problem-solution__vs">
                            <Zap size={20} />
                        </span>
                        <span className="problem-solution__divider-line" />
                    </div>

                    <motion.div
                        className="problem-solution__column problem-solution__column--solutions"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                    >
                        <div className="problem-solution__column-header">
                            <span className="problem-solution__icon-badge problem-solution__icon-badge--success">
                                <Check size={16} strokeWidth={2.5} />
                            </span>
                            <span>{t('problem.with', 'WITH LOCAPPOINT')}</span>
                        </div>

                        <ul className="problem-solution__list">
                            {solutions.map((item, index) => {
                                const Icon = item.icon
                                return (
                                    <motion.li
                                        key={index}
                                        className="problem-solution__item problem-solution__item--solution"
                                        custom={index}
                                        variants={solutionVariants}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, margin: '-40px' }}
                                    >
                                        <span className="problem-solution__item-mark problem-solution__item-mark--success">
                                            <Check size={14} strokeWidth={3} />
                                        </span>
                                        <span className="problem-solution__item-icon problem-solution__item-icon--success">
                                            <Icon size={18} />
                                        </span>
                                        <span className="problem-solution__item-text">{item.text}</span>
                                    </motion.li>
                                )
                            })}
                        </ul>
                    </motion.div>
                </div>

                <motion.div
                    className="problem-solution__cta-wrap"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                >
                    <button
                        type="button"
                        className="problem-solution__cta"
                        onClick={handleCtaClick}
                    >
                        <span>{t('problem.transform', 'Transform your business operations today')}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default Problem

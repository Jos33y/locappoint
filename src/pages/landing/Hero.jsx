// Hero - Old structure preserved. Editorial lead-in, brand tokens, reduced background effects.

import { motion } from 'framer-motion'
import { useT } from '../../hooks/useT'
import HeroDashboard from './HeroDashboard'

const Hero = ({ onWaitlistClick, onPartnershipClick }) => {
    const t = useT()

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
        }
    }

    return (
        <section className="hero" id="hero">
            <div className="hero__bg" aria-hidden="true">
                <div className="hero__grid" />
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
            </div>

            <div className="container">
                <div className="hero__layout">
                    <motion.div
                        className="hero__content"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div className="hero__editorial" variants={itemVariants}>
                            <span className="hero__editorial-rule" />
                            <span className="hero__editorial-text">
                                {t('hero.editorial', 'BUILT FOR LOCAL BUSINESSES')}
                            </span>
                        </motion.div>

                        <motion.h1 className="hero__title" variants={itemVariants}>
                            <span className="hero__title-line">{t('hero.titleLine1', 'Get Discovered.')}</span>
                            <span className="hero__title-line hero__title-gradient">{t('hero.titleLine2', 'Get Booked.')}</span>
                            <span className="hero__title-line">{t('hero.titleLine3', 'Grow Your Business.')}</span>
                        </motion.h1>

                        <motion.p className="hero__subtitle" variants={itemVariants}>
                            {t('hero.subtitle', 'The all-in-one booking platform for local businesses. Accept bookings 24/7 and grow your revenue on autopilot.')}
                        </motion.p>

                        <motion.div className="hero__buttons" variants={itemVariants}>
                            <button
                                type="button"
                                className="hero__btn hero__btn--primary"
                                onClick={onWaitlistClick}
                            >
                                <span>{t('hero.btnPrimary', 'Join the Waitlist')}</span>
                            </button>

                            <button
                                type="button"
                                className="hero__btn hero__btn--secondary"
                                onClick={onPartnershipClick}
                            >
                                {t('hero.btnSecondary', 'Early Partnership')}
                            </button>
                        </motion.div>

                        <motion.div className="hero__trust" variants={itemVariants}>
                            <span className="hero__trust-item">{t('hero.trust1', 'Free to start')}</span>
                            <span className="hero__trust-dot" />
                            <span className="hero__trust-item">{t('hero.trust2', 'No technical skills needed')}</span>
                            <span className="hero__trust-dot" />
                            <span className="hero__trust-item">{t('hero.trust3', 'GDPR compliant')}</span>
                        </motion.div>
                    </motion.div>

                    <div className="hero__dashboard-wrapper">
                        <HeroDashboard />
                    </div>
                </div>
            </div>

            <div className="hero__fade" aria-hidden="true" />
        </section>
    )
}

export default Hero

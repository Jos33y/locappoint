// Ctasection.jsx - Enhanced Final Call to Action with particles and effects
// Location: src/pages/landing/Ctasection.jsx

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Rocket, Star, Zap, CheckCircle } from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const FinalCTA = ({ onWaitlistClick, onPartnershipClick }) => {
    const { t } = useLandingTranslation()
    
    // Generate floating particles
    const particles = [...Array(20)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5
    }))

    // Floating icons data
    const floatingIcons = [
        { Icon: Star, x: '10%', y: '20%', delay: 0 },
        { Icon: Zap, x: '85%', y: '25%', delay: 1 },
        { Icon: Rocket, x: '15%', y: '75%', delay: 2 },
        { Icon: Sparkles, x: '90%', y: '70%', delay: 0.5 },
    ]

    // Trust points using translations
    const trustPoints = [
        t('finalCta.trustFree'),
        t('finalCta.trustNoCard'),
        t('finalCta.trustLaunch')
    ]

    return (
        <section className="final-cta" id="cta">
            {/* Background */}
            <div className="final-cta__bg">
                <div className="final-cta__grid-pattern" />
                
                {/* Floating particles */}
                <div className="final-cta__particles">
                    {particles.map((particle) => (
                        <motion.div
                            key={particle.id}
                            className="final-cta__particle"
                            style={{
                                left: `${particle.x}%`,
                                top: `${particle.y}%`,
                                width: particle.size,
                                height: particle.size,
                            }}
                            animate={{
                                y: [0, -30, 0],
                                opacity: [0.2, 0.6, 0.2],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: particle.duration,
                                delay: particle.delay,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>

                {/* Floating icons */}
                {floatingIcons.map(({ Icon, x, y, delay }, index) => (
                    <motion.div
                        key={index}
                        className="final-cta__floating-icon"
                        style={{ left: x, top: y }}
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, index % 2 === 0 ? 10 : -10, 0],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{
                            duration: 5 + index,
                            delay: delay,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <Icon size={20} />
                    </motion.div>
                ))}
            </div>

            <div className="container">
                <motion.div 
                    className="final-cta__card"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Card background effects */}
                    <div className="final-cta__card-bg">
                        <div className="final-cta__orb final-cta__orb--1" />
                        <div className="final-cta__orb final-cta__orb--2" />
                        <div className="final-cta__orb final-cta__orb--3" />
                    </div>

                    {/* Animated border */}
                    <div className="final-cta__border" />

                    <div className="final-cta__content">
                        {/* Animated icon */}
                        <motion.div 
                            className="final-cta__icon"
                            animate={{ 
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                        >
                            <div className="final-cta__icon-ring final-cta__icon-ring--1" />
                            <div className="final-cta__icon-ring final-cta__icon-ring--2" />
                            <Sparkles size={32} />
                        </motion.div>

                        <motion.h2 
                            className="final-cta__title"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            {t('finalCta.title')}
                        </motion.h2>
                        
                        <motion.p 
                            className="final-cta__subtitle"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            {t('finalCta.subtitle')}
                        </motion.p>

                        <motion.div 
                            className="final-cta__buttons"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            {/* Primary CTA with pulse effect */}
                            <motion.button
                                className="final-cta__btn final-cta__btn--primary"
                                onClick={onWaitlistClick}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="final-cta__btn-pulse" />
                                <span className="final-cta__btn-text">{t('finalCta.btnPrimary')}</span>
                                <ArrowRight size={18} />
                            </motion.button>
                            
                            <motion.button
                                className="final-cta__btn final-cta__btn--secondary"
                                onClick={onPartnershipClick}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {t('finalCta.btnSecondary')}
                            </motion.button>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div 
                            className="final-cta__trust-list"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            {trustPoints.map((point, index) => (
                                <div key={index} className="final-cta__trust-item">
                                    <CheckCircle size={14} />
                                    <span>{point}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default FinalCTA
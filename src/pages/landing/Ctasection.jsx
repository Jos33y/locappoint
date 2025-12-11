// FinalCTA.jsx - Enhanced Final Call to Action with particles and effects
// Location: src/pages/landing/FinalCTA.jsx

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Rocket, Star, Zap } from 'lucide-react'

const FinalCTA = ({ onWaitlistClick, onPartnershipClick }) => {
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
                            Ready to grow your business?
                        </motion.h2>
                        
                        <motion.p 
                            className="final-cta__subtitle"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            Join 100+ businesses already on the waitlist. Be among the first to launch when we go live.
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
                                <span className="final-cta__btn-text">Join the Waitlist</span>
                                <ArrowRight size={18} />
                            </motion.button>
                            
                            <motion.button
                                className="final-cta__btn final-cta__btn--secondary"
                                onClick={onPartnershipClick}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Become a Partner
                            </motion.button>
                        </motion.div>

                        <motion.p 
                            className="final-cta__note"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <Zap size={14} />
                            <span>Free to join • No credit card required • Launch early 2025</span>
                        </motion.p>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default FinalCTA
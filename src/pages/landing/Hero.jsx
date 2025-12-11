// Hero.jsx - Premium hero with floating dashboard mockup
// Location: src/pages/landing/Hero.jsx

import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import HeroDashboard from './HeroDashboard'

const Hero = ({ onWaitlistClick, onPartnershipClick }) => {

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
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
        <section className="hero">
            {/* Lively AI Background */}
            <div className="hero__bg">
                <div className="hero__grid" />
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
                <div className="hero__orb hero__orb--3" />
                <div className="hero__center-glow" />
                <div className="hero__particles">
                    <span /><span /><span /><span /><span />
                </div>
            </div>

            <div className="container">
                <div className="hero__layout">
                    {/* Left side - Text content */}
                    <motion.div 
                        className="hero__content"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div className="hero__badge" variants={itemVariants}>
                            <Rocket size={12} />
                            <span>Launching Soon</span>
                        </motion.div>

                        <motion.h1 className="hero__title" variants={itemVariants}>
                            <span className="hero__title-line">Get Discovered.</span>
                            <span className="hero__title-line hero__title-gradient">Get Booked.</span>
                            <span className="hero__title-line">Grow Your Business.</span>
                        </motion.h1>

                        <motion.p className="hero__subtitle" variants={itemVariants}>
                            The all-in-one booking platform for local businesses. Accept bookings 24/7 and grow your revenue on autopilot.
                        </motion.p>

                        <motion.div className="hero__buttons" variants={itemVariants}>
                            <button
                                className="hero__btn hero__btn--primary"
                                onClick={onWaitlistClick}
                            >
                                <span>Join the Waitlist</span>
                            </button>
                            
                            <button
                                className="hero__btn hero__btn--secondary"
                                onClick={onPartnershipClick}
                            >
                                Early Partnership
                            </button>
                        </motion.div>

                        <motion.div className="hero__trust" variants={itemVariants}>
                            <span className="hero__trust-item">Free to start</span>
                            <span className="hero__trust-dot" />
                            <span className="hero__trust-item">No technical skills needed</span>
                            <span className="hero__trust-dot" />
                            <span className="hero__trust-item">GDPR compliant</span>
                        </motion.div>
                    </motion.div>

                    {/* Right side - Dashboard mockup */}
                    <div className="hero__dashboard-wrapper">
                        <HeroDashboard />
                    </div>
                </div>
            </div>

            {/* Bottom fade */}
            <div className="hero__fade" />
        </section>
    )
}

export default Hero
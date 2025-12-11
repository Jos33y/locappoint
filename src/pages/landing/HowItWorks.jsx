// HowItWorks.jsx - Enhanced How It Works with animated timeline (Translated)
// Location: src/pages/landing/HowItWorks.jsx

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
    Rocket, 
    UserPlus, 
    Search, 
    CalendarCheck, 
    TrendingUp,
    Sparkles
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const HowItWorks = () => {
    const { t } = useLandingTranslation()
    const containerRef = useRef(null)
    const isInView = useInView(containerRef, { once: true, margin: "-100px" })
    
    const stepsData = t('howItWorks.steps')
    const stepIcons = [UserPlus, Search, CalendarCheck, TrendingUp]
    const stepMeta = [
        { number: '01', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)', color: '#8B5CF6', colorRgb: '139, 92, 246' },
        { number: '02', gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', color: '#06B6D4', colorRgb: '6, 182, 212' },
        { number: '03', gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', color: '#10B981', colorRgb: '16, 185, 129' },
        { number: '04', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#F59E0B', colorRgb: '245, 158, 11' }
    ]
    
    const steps = stepsData.map((step, index) => ({
        icon: stepIcons[index],
        title: step.title,
        description: step.description,
        ...stepMeta[index]
    }))

    return (
        <section className="how-it-works" id="how-it-works">
            {/* Background */}
            <div className="how-it-works__bg">
                <div className="how-it-works__grid-pattern" />
                <div className="how-it-works__glow how-it-works__glow--1" />
                <div className="how-it-works__glow how-it-works__glow--2" />
                
                {/* Floating particles */}
                <div className="how-it-works__particles">
                    {[...Array(8)].map((_, i) => (
                        <div 
                            key={i} 
                            className="how-it-works__particle"
                            style={{
                                left: `${10 + (i * 12)}%`,
                                top: `${15 + (i % 3) * 30}%`,
                                animationDelay: `${i * 0.5}s`
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Floating decorative icons */}
            <motion.div 
                className="how-it-works__float how-it-works__float--1"
                animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                <Sparkles size={18} />
            </motion.div>
            <motion.div 
                className="how-it-works__float how-it-works__float--2"
                animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
                <Rocket size={16} />
            </motion.div>

            <div className="container">
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <Rocket size={14} />
                        <span>{t('howItWorks.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('howItWorks.title')}
                        <span className="ai-gradient-text">{t('howItWorks.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('howItWorks.subtitle')}
                    </p>
                </motion.div>

                <div className="how-it-works__timeline" ref={containerRef}>
                    {/* Animated progress line */}
                    <div className="how-it-works__progress-track">
                        <motion.div 
                            className="how-it-works__progress-fill"
                            initial={{ scaleY: 0 }}
                            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        />
                        {/* Glowing dot that travels down */}
                        <motion.div 
                            className="how-it-works__progress-dot"
                            initial={{ top: '0%', opacity: 0 }}
                            animate={isInView ? { 
                                top: ['0%', '100%'],
                                opacity: [0, 1, 1, 0]
                            } : {}}
                            transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                        />
                    </div>

                    {/* Steps */}
                    {steps.map((step, index) => (
                        <motion.div 
                            key={index}
                            className="how-it-works__step"
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ 
                                opacity: 1, 
                                x: 0,
                                transition: {
                                    duration: 0.6,
                                    delay: index * 0.15,
                                    ease: [0.22, 1, 0.36, 1]
                                }
                            }}
                            viewport={{ once: true }}
                        >
                            {/* Step indicator with icon */}
                            <div className="how-it-works__indicator">
                                {/* Pulsing rings */}
                                <div 
                                    className="how-it-works__ring how-it-works__ring--1"
                                    style={{ borderColor: `rgba(${step.colorRgb}, 0.3)` }}
                                />
                                <div 
                                    className="how-it-works__ring how-it-works__ring--2"
                                    style={{ borderColor: `rgba(${step.colorRgb}, 0.2)` }}
                                />
                                
                                {/* Icon circle */}
                                <motion.div 
                                    className="how-it-works__icon-circle"
                                    style={{ background: step.gradient }}
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <step.icon size={22} strokeWidth={1.5} />
                                </motion.div>
                                
                                {/* Step number */}
                                <div 
                                    className="how-it-works__number"
                                    style={{ color: step.color }}
                                >
                                    {step.number}
                                </div>
                            </div>

                            {/* Content card */}
                            <motion.div 
                                className="how-it-works__card"
                                whileHover={{ 
                                    y: -6,
                                    transition: { duration: 0.3 }
                                }}
                            >
                                {/* Top glow line */}
                                <div 
                                    className="how-it-works__card-glow"
                                    style={{ background: step.gradient }}
                                />
                                
                                {/* Corner orb */}
                                <div 
                                    className="how-it-works__card-orb"
                                    style={{ background: step.gradient }}
                                />

                                <h3 className="how-it-works__title">{step.title}</h3>
                                <p className="how-it-works__description">{step.description}</p>
                                
                                {/* Decorative arrow for flow */}
                                {index < steps.length - 1 && (
                                    <div className="how-it-works__flow-hint">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path 
                                                d="M10 4L10 16M10 16L5 11M10 16L15 11" 
                                                stroke={step.color}
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity="0.5"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA hint */}
                <motion.button 
                    className="how-it-works__cta-hint"
                    onClick={() => window.openWaitlistModal?.()}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                >
                    <span>{t('howItWorks.cta')}</span>
                    <div className="how-it-works__cta-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M5 12H19M19 12L12 5M19 12L12 19" 
                                stroke="url(#arrow-gradient)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <defs>
                                <linearGradient id="arrow-gradient" x1="5" y1="12" x2="19" y2="12">
                                    <stop stopColor="#8B5CF6"/>
                                    <stop offset="1" stopColor="#06B6D4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </motion.button>
            </div>
        </section>
    )
}

export default HowItWorks
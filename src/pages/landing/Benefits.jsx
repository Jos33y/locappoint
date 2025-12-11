// Benefits.jsx - Enhanced Why LocAppoint section with animated stats (Translated)
// Location: src/pages/landing/Benefits.jsx

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
    Clock, 
    TrendingUp, 
    Heart, 
    Wallet, 
    Award,
    Sparkles,
    CheckCircle2
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

// Animated counter hook
const useCountUp = (end, duration = 2000, startCounting = false) => {
    const [count, setCount] = useState(0)
    
    useEffect(() => {
        if (!startCounting) return
        
        let startTime = null
        const endValue = parseInt(end) || 0
        
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(easeOut * endValue))
            
            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }
        
        requestAnimationFrame(animate)
    }, [end, duration, startCounting])
    
    return count
}

// Circular progress component
const CircularProgress = ({ value, max, color, colorRgb }) => {
    const radius = 36
    const circumference = 2 * Math.PI * radius
    const progress = (value / max) * circumference
    
    return (
        <div className="benefits__progress-ring">
            <svg width="88" height="88" viewBox="0 0 88 88">
                {/* Background circle */}
                <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="4"
                />
                {/* Progress circle */}
                <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    fill="none"
                    stroke={`url(#gradient-${color.replace('#', '')})`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    transform="rotate(-90 44 44)"
                    style={{ transition: 'stroke-dashoffset 2s ease-out' }}
                />
                {/* Gradient definition */}
                <defs>
                    <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={color} stopOpacity="0.5" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Glow effect */}
            <div 
                className="benefits__progress-glow"
                style={{ background: `rgba(${colorRgb}, 0.3)` }}
            />
        </div>
    )
}

// Individual benefit card
const BenefitCard = ({ benefit, index, isInView }) => {
    const count = useCountUp(benefit.numericValue, 2000 + index * 300, isInView)
    
    return (
        <motion.div 
            className="benefits__card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { 
                    duration: 0.6, 
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1] 
                }
            }}
            viewport={{ once: true }}
            whileHover={{ 
                y: -10,
                transition: { duration: 0.3 } 
            }}
        >
            {/* Top glow line */}
            <div 
                className="benefits__card-glow"
                style={{ background: benefit.gradient }}
            />

            {/* Corner orb */}
            <div 
                className="benefits__card-orb"
                style={{ background: benefit.gradient }}
            />

            {/* Left side - Icon with rings */}
            <div className="benefits__visual">
                {/* Pulsing rings */}
                <div 
                    className="benefits__ring benefits__ring--1"
                    style={{ borderColor: `rgba(${benefit.colorRgb}, 0.3)` }}
                />
                <div 
                    className="benefits__ring benefits__ring--2"
                    style={{ borderColor: `rgba(${benefit.colorRgb}, 0.2)` }}
                />
                
                {/* Icon */}
                <div 
                    className="benefits__icon"
                    style={{ background: benefit.gradient }}
                >
                    <benefit.icon size={26} strokeWidth={1.5} />
                </div>
            </div>

            {/* Right side - Content */}
            <div className="benefits__content">
                <h3 className="benefits__title">{benefit.title}</h3>
                <p className="benefits__description">{benefit.description}</p>
                
                {/* Stat with circular progress */}
                <div className="benefits__stat-wrapper">
                    <CircularProgress 
                        value={isInView ? benefit.numericValue : 0}
                        max={benefit.maxValue}
                        color={benefit.color}
                        colorRgb={benefit.colorRgb}
                    />
                    <div className="benefits__stat-content">
                        <span 
                            className="benefits__stat-value"
                            style={{ 
                                background: benefit.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            {benefit.prefix}{count}{benefit.suffix}
                        </span>
                        <span className="benefits__stat-label">{benefit.statLabel}</span>
                    </div>
                </div>
            </div>

            {/* Check badge */}
            <div 
                className="benefits__badge"
                style={{ background: benefit.gradient }}
            >
                <CheckCircle2 size={14} />
            </div>
        </motion.div>
    )
}

const Benefits = () => {
    const { t } = useLandingTranslation()
    const containerRef = useRef(null)
    const isInView = useInView(containerRef, { once: true, margin: "-100px" })
    
    const benefitsData = t('benefits.items')
    const benefitIcons = [Clock, TrendingUp, Heart, Wallet]
    const benefitMeta = [
        { numericValue: 10, maxValue: 15, prefix: '', suffix: '+', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)', color: '#8B5CF6', colorRgb: '139, 92, 246' },
        { numericValue: 3, maxValue: 5, prefix: '', suffix: 'x', gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', color: '#06B6D4', colorRgb: '6, 182, 212' },
        { numericValue: 90, maxValue: 100, prefix: '', suffix: '%', gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', color: '#10B981', colorRgb: '16, 185, 129' },
        { numericValue: 30, maxValue: 50, prefix: '+', suffix: '%', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#F59E0B', colorRgb: '245, 158, 11' }
    ]
    
    const benefits = benefitsData.map((item, index) => ({
        icon: benefitIcons[index],
        title: item.title,
        description: item.description,
        statLabel: item.statLabel,
        ...benefitMeta[index]
    }))

    return (
        <section className="benefits" id="benefits" ref={containerRef}>
            {/* Background */}
            <div className="benefits__bg">
                <div className="benefits__grid-pattern" />
                <div className="benefits__glow benefits__glow--1" />
                <div className="benefits__glow benefits__glow--2" />
                <div className="benefits__glow benefits__glow--3" />
                
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i}
                        className="benefits__particle"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                            animationDelay: `${i * 0.8}s`
                        }}
                    />
                ))}
            </div>

            {/* Floating decorative elements */}
            <motion.div 
                className="benefits__float benefits__float--1"
                animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                <Award size={18} />
            </motion.div>
            <motion.div 
                className="benefits__float benefits__float--2"
                animate={{ y: [0, 12, 0], rotate: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
                <Sparkles size={16} />
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
                        <Award size={14} />
                        <span>{t('benefits.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('benefits.title')}
                        <span className="ai-gradient-text">{t('benefits.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('benefits.subtitle')}
                    </p>
                </motion.div>

                <div className="benefits__grid">
                    {benefits.map((benefit, index) => (
                        <BenefitCard 
                            key={index}
                            benefit={benefit}
                            index={index}
                            isInView={isInView}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Benefits
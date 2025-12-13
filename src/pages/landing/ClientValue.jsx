// ClientValue.jsx - Value proposition for clients (people booking services)
// Location: src/pages/landing/ClientValue.jsx

import { motion } from 'framer-motion'
import { 
    Search, 
    Calendar, 
    Clock, 
    Star, 
    Shield, 
    Smartphone,
    Users
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const ClientValue = () => {
    const { t } = useLandingTranslation()

    const benefits = [
        {
            icon: Search,
            title: t('clientValue.benefits.discover.title'),
            description: t('clientValue.benefits.discover.description'),
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
            color: '#8B5CF6',
            colorRgb: '139, 92, 246'
        },
        {
            icon: Calendar,
            title: t('clientValue.benefits.book.title'),
            description: t('clientValue.benefits.book.description'),
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
            color: '#06B6D4',
            colorRgb: '6, 182, 212'
        },
        {
            icon: Clock,
            title: t('clientValue.benefits.time.title'),
            description: t('clientValue.benefits.time.description'),
            gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            color: '#10B981',
            colorRgb: '16, 185, 129'
        },
        {
            icon: Star,
            title: t('clientValue.benefits.reviews.title'),
            description: t('clientValue.benefits.reviews.description'),
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            color: '#F59E0B',
            colorRgb: '245, 158, 11'
        },
        {
            icon: Shield,
            title: t('clientValue.benefits.secure.title'),
            description: t('clientValue.benefits.secure.description'),
            gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            color: '#6366F1',
            colorRgb: '99, 102, 241'
        },
        {
            icon: Smartphone,
            title: t('clientValue.benefits.mobile.title'),
            description: t('clientValue.benefits.mobile.description'),
            gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
            color: '#EC4899',
            colorRgb: '236, 72, 153'
        }
    ]

    return (
        <section className="client-value" id="for-clients">
            {/* Background - matches audience section */}
            <div className="client-value__bg">
                <div className="client-value__grid-pattern" />
                <div className="client-value__glow client-value__glow--1" />
                <div className="client-value__glow client-value__glow--2" />
                
                {/* Floating icons in background */}
                <div className="client-value__floating-icons">
                    {[Search, Calendar, Star, Shield, Smartphone].map((Icon, i) => (
                        <motion.div
                            key={i}
                            className="client-value__floating-icon"
                            style={{
                                left: `${15 + i * 18}%`,
                                top: `${20 + (i % 3) * 25}%`,
                            }}
                            animate={{
                                y: [0, -15, 0],
                                rotate: [0, i % 2 === 0 ? 8 : -8, 0],
                                opacity: [0.08, 0.15, 0.08]
                            }}
                            transition={{
                                duration: 5 + i,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.5
                            }}
                        >
                            <Icon size={24} />
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="container">
                {/* Header - uses global section-header pattern */}
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge section-badge--cyan">
                        <Users size={14} />
                        <span>{t('clientValue.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('clientValue.title')}
                        <span className="ai-gradient-text">{t('clientValue.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('clientValue.subtitle')}
                    </p>
                </motion.div>

                {/* Benefits Grid - matches audience card structure */}
                <div className="client-value__grid">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            className="client-value__card"
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            whileInView={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                transition: {
                                    duration: 0.5,
                                    delay: index * 0.08,
                                    ease: [0.22, 1, 0.36, 1]
                                }
                            }}
                            viewport={{ once: true }}
                            whileHover={{ 
                                y: -8,
                                transition: { duration: 0.3 } 
                            }}
                        >
                            {/* Top glow line */}
                            <div 
                                className="client-value__card-glow"
                                style={{ background: benefit.gradient }}
                            />
                            
                            {/* Ambient orb */}
                            <div 
                                className="client-value__card-orb"
                                style={{ background: benefit.gradient }}
                            />

                            {/* Icon with ring effect */}
                            <div className="client-value__icon-wrapper">
                                <div 
                                    className="client-value__icon-ring"
                                    style={{ borderColor: `rgba(${benefit.colorRgb}, 0.3)` }}
                                />
                                <div 
                                    className="client-value__icon"
                                    style={{ background: benefit.gradient }}
                                >
                                    <benefit.icon size={24} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="client-value__content">
                                <h3 className="client-value__title">{benefit.title}</h3>
                                <p className="client-value__description">{benefit.description}</p>
                            </div>

                            {/* Arrow indicator on hover */}
                            <div className="client-value__arrow">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path 
                                        d="M4 10H16M16 10L11 5M16 10L11 15" 
                                        stroke={benefit.color}
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA - matches audience pattern */}
                <motion.div 
                    className="client-value__cta"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <span>{t('clientValue.ctaText')}</span>
                </motion.div>
            </div>
        </section>
    )
}

export default ClientValue
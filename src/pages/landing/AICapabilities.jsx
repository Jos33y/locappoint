// AICapabilities.jsx - AI Features section (Translated)
// Location: src/pages/landing/AICapabilities.jsx

import { motion } from 'framer-motion'
import { 
    Sparkles, 
    Brain, 
    Shield, 
    Star, 
    BarChart3,
    Zap,
    Bot
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const AICapabilities = () => {
    const { t } = useLandingTranslation()
    const capabilitiesData = t('ai.capabilities')
    
    const icons = [Sparkles, Brain, Shield, Star, BarChart3]
    const gradients = [
        'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
        'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
        'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
        'linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%)'
    ]

    const capabilities = capabilitiesData.map((cap, index) => ({
        icon: icons[index],
        title: cap.title,
        description: cap.description,
        features: cap.features,
        gradient: gradients[index]
    }))

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    }

    return (
        <section className="ai-capabilities" id="ai">
            {/* Animated background */}
            <div className="ai-capabilities__bg">
                <div className="ai-capabilities__grid-pattern" />
                <div className="ai-capabilities__glow ai-capabilities__glow--1" />
                <div className="ai-capabilities__glow ai-capabilities__glow--2" />
                <div className="ai-capabilities__particles" />
            </div>

            <div className="container">
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="ai-capabilities__badge">
                        <Bot size={14} />
                        <span>{t('ai.badge')}</span>
                        <Zap size={12} className="ai-capabilities__badge-pulse" />
                    </div>
                    
                    <h2 className="section-title">
                        {t('ai.title')}
                        <span className="ai-gradient-text">{t('ai.titleHighlight')}</span>
                    </h2>
                    
                    <p className="section-subtitle">
                        {t('ai.subtitle')}
                    </p>
                </motion.div>

                {/* Central AI Visual */}
                <motion.div 
                    className="ai-capabilities__visual"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="ai-capabilities__core">
                        <div className="ai-capabilities__core-ring ai-capabilities__core-ring--1" />
                        <div className="ai-capabilities__core-ring ai-capabilities__core-ring--2" />
                        <div className="ai-capabilities__core-ring ai-capabilities__core-ring--3" />
                        <div className="ai-capabilities__core-center">
                            <Brain size={32} />
                        </div>
                    </div>
                </motion.div>

                {/* Capabilities Grid */}
                <motion.div 
                    className="ai-capabilities__grid"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {capabilities.map((item, index) => (
                        <motion.div 
                            key={index}
                            className="ai-card"
                            variants={itemVariants}
                            whileHover={{ 
                                y: -8, 
                                transition: { duration: 0.3 } 
                            }}
                        >
                            {/* Card glow effect */}
                            <div 
                                className="ai-card__glow"
                                style={{ background: item.gradient }}
                            />
                            
                            {/* Card content */}
                            <div className="ai-card__content">
                                <div 
                                    className="ai-card__icon"
                                    style={{ background: item.gradient }}
                                >
                                    <item.icon size={24} strokeWidth={1.5} />
                                </div>
                                
                                <h3 className="ai-card__title">{item.title}</h3>
                                <p className="ai-card__description">{item.description}</p>
                                
                                <ul className="ai-card__features">
                                    {item.features.map((feature, idx) => (
                                        <li key={idx} className="ai-card__feature">
                                            <span 
                                                className="ai-card__feature-dot"
                                                style={{ background: item.gradient }}
                                            />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Animated border */}
                            <div className="ai-card__border" />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom tagline */}
                <motion.div 
                    className="ai-capabilities__footer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <p>
                        <Sparkles size={16} />
                        {t('ai.footer')}
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

export default AICapabilities
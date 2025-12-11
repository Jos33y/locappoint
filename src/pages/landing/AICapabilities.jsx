// AICapabilities.jsx - AI Features section
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

const AICapabilities = () => {
    const capabilities = [
        {
            icon: Sparkles,
            title: 'AI Visibility Engine',
            description: 'Our AI analyzes search patterns and client behavior to boost your visibility. Get matched with clients actively searching for your services.',
            features: ['Smart search ranking', 'Personalized recommendations', 'Local SEO optimization'],
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
        },
        {
            icon: Brain,
            title: 'Smart Booking System',
            description: 'Intelligent scheduling that learns your preferences. Auto-fills gaps, prevents conflicts, and optimizes your calendar for maximum efficiency.',
            features: ['Predictive scheduling', 'Smart gap filling', 'Conflict prevention'],
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)'
        },
        {
            icon: Shield,
            title: 'Compliance Assistant',
            description: 'Stay compliant without the headache. AI monitors regulatory requirements and automatically handles GDPR, data protection, and consent management.',
            features: ['Auto GDPR compliance', 'Consent tracking', 'Data protection alerts'],
            gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)'
        },
        {
            icon: Star,
            title: 'Reputation Builder',
            description: 'AI-powered review management that identifies happy clients and encourages reviews at the perfect moment. Build trust on autopilot.',
            features: ['Smart review timing', 'Sentiment analysis', 'Response suggestions'],
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
        },
        {
            icon: BarChart3,
            title: 'Insight Dashboard',
            description: 'Transform data into action. AI analyzes your business patterns, predicts trends, and delivers personalized recommendations to grow revenue.',
            features: ['Revenue predictions', 'Client insights', 'Growth recommendations'],
            gradient: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%)'
        }
    ]

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
                        <span>Powered by AI</span>
                        <Zap size={12} className="ai-capabilities__badge-pulse" />
                    </div>
                    
                    <h2 className="section-title">
                        Intelligence that works
                        <span className="ai-gradient-text"> for you</span>
                    </h2>
                    
                    <p className="section-subtitle">
                        LocAppoint uses advanced AI to automate the tedious, optimize the complex, and give you superpowers to compete with the big players.
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
                        All AI features included. No extra cost. No complicated setup.
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

export default AICapabilities
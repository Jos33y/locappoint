// Features.jsx - Bento Grid Layout (Translated)
// Location: src/pages/landing/Features.jsx

import { motion } from 'framer-motion'
import { 
    Calendar, 
    Bell, 
    CreditCard, 
    Users, 
    BarChart3, 
    Globe,
    Smartphone,
    CheckCircle,
    Zap
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const Features = () => {
    const { t } = useLandingTranslation()
    const days = t('features.days')

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
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    }

    return (
        <section className="features" id="features">
            {/* Background */}
            <div className="features__bg">
                <div className="features__grid-pattern" />
                <div className="features__glow features__glow--1" />
                <div className="features__glow features__glow--2" />
            </div>

            <div className="container">
                {/* Section Header */}
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <Zap size={12} />
                        <span>{t('features.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('features.title')}
                        <span className="ai-gradient-text">{t('features.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('features.subtitle')}
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <motion.div 
                    className="features__bento"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    {/* Large Card - Online Booking */}
                    <motion.div 
                        className="features__card features__card--large"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                                <Calendar size={24} />
                            </div>
                            <h3 className="features__card-title">{t('features.onlineBooking.title')}</h3>
                            <p className="features__card-description">
                                {t('features.onlineBooking.description')}
                            </p>
                            
                            {/* Mini Calendar Visual */}
                            <div className="features__card-visual">
                                <div className="features__mini-calendar">
                                    <div className="features__mini-calendar-header">
                                        <span>{t('features.onlineBooking.month')}</span>
                                    </div>
                                    <div className="features__mini-calendar-grid">
                                        {days.map((day, i) => (
                                            <span key={i} className="features__mini-calendar-day-label">{day}</span>
                                        ))}
                                        {[...Array(31)].map((_, i) => (
                                            <motion.span 
                                                key={i} 
                                                className={`features__mini-calendar-day ${[3, 7, 12, 15, 19, 23, 28].includes(i + 1) ? 'features__mini-calendar-day--booked' : ''} ${i + 1 === 10 ? 'features__mini-calendar-day--today' : ''}`}
                                                initial={{ scale: 0 }}
                                                whileInView={{ scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.8 + i * 0.02 }}
                                            >
                                                {i + 1}
                                            </motion.span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Medium Card - Smart Reminders */}
                    <motion.div 
                        className="features__card features__card--medium"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}>
                                <Bell size={22} />
                            </div>
                            <h3 className="features__card-title">{t('features.reminders.title')}</h3>
                            <p className="features__card-description">
                                {t('features.reminders.description')}
                            </p>
                            
                            {/* Notification Stack Visual */}
                            <div className="features__notif-stack">
                                <motion.div 
                                    className="features__notif features__notif--1"
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                                >
                                    <Bell size={14} />
                                    <span>{t('features.reminders.notif1')}</span>
                                </motion.div>
                                <motion.div 
                                    className="features__notif features__notif--2"
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                                >
                                    <CheckCircle size={14} />
                                    <span>{t('features.reminders.notif2')}</span>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Card - Payments */}
                    <motion.div 
                        className="features__card features__card--small"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                <CreditCard size={20} />
                            </div>
                            <h3 className="features__card-title">{t('features.payments.title')}</h3>
                            <p className="features__card-description">
                                {t('features.payments.description')}
                            </p>
                        </div>
                    </motion.div>

                    {/* Small Card - Client Management */}
                    <motion.div 
                        className="features__card features__card--small"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                                <Users size={20} />
                            </div>
                            <h3 className="features__card-title">{t('features.clients.title')}</h3>
                            <p className="features__card-description">
                                {t('features.clients.description')}
                            </p>
                        </div>
                    </motion.div>

                    {/* Wide Card - Analytics */}
                    <motion.div 
                        className="features__card features__card--wide"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)' }} />
                        <div className="features__card-content">
                            <div className="features__card-row">
                                <div className="features__card-text">
                                    <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                                        <BarChart3 size={22} />
                                    </div>
                                    <h3 className="features__card-title">{t('features.analytics.title')}</h3>
                                    <p className="features__card-description">
                                        {t('features.analytics.description')}
                                    </p>
                                </div>
                                
                                {/* Mini Chart Visual */}
                                <div className="features__mini-chart">
                                    <div className="features__mini-chart-bars">
                                        {[35, 52, 41, 68, 55, 78, 62, 89, 71, 95].map((height, i) => (
                                            <motion.div 
                                                key={i}
                                                className="features__mini-chart-bar"
                                                initial={{ height: 0 }}
                                                whileInView={{ height: `${height}%` }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                                            />
                                        ))}
                                    </div>
                                    <div className="features__mini-chart-line">
                                        <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                                            <motion.path 
                                                d="M0,50 Q25,45 50,35 T100,25 T150,15 T200,5"
                                                fill="none"
                                                stroke="url(#chartGradient)"
                                                strokeWidth="2"
                                                initial={{ pathLength: 0 }}
                                                whileInView={{ pathLength: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.8, duration: 1.5 }}
                                            />
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#06B6D4" />
                                                    <stop offset="100%" stopColor="#8B5CF6" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Card - Mobile */}
                    <motion.div 
                        className="features__card features__card--small"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #A855F7, #9333EA)' }}>
                                <Smartphone size={20} />
                            </div>
                            <h3 className="features__card-title">{t('features.mobile.title')}</h3>
                            <p className="features__card-description">
                                {t('features.mobile.description')}
                            </p>
                        </div>
                    </motion.div>

                    {/* Small Card - Multi-language */}
                    <motion.div 
                        className="features__card features__card--small"
                        variants={itemVariants}
                    >
                        <div className="features__card-glow" style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }} />
                        <div className="features__card-content">
                            <div className="features__card-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                                <Globe size={20} />
                            </div>
                            <h3 className="features__card-title">{t('features.language.title')}</h3>
                            <p className="features__card-description">
                                {t('features.language.description')}
                            </p>
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </section>
    )
}

export default Features
// Features.jsx - Bento Grid Layout
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

const Features = () => {

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
                        <span>Core Features</span>
                    </div>
                    <h2 className="section-title">
                        The essentials,
                        <span className="ai-gradient-text"> done right</span>
                    </h2>
                    <p className="section-subtitle">
                        Everything you need to manage bookings professionally, without the complexity.
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
                            <h3 className="features__card-title">24/7 Online Booking</h3>
                            <p className="features__card-description">
                                Let clients book appointments anytime, anywhere. Your calendar stays updated automatically while you focus on what matters.
                            </p>
                            
                            {/* Mini Calendar Visual */}
                            <div className="features__card-visual">
                                <div className="features__mini-calendar">
                                    <div className="features__mini-calendar-header">
                                        <span>December 2025</span>
                                    </div>
                                    <div className="features__mini-calendar-grid">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
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
                            <h3 className="features__card-title">Automatic Reminders</h3>
                            <p className="features__card-description">
                                Reduce no-shows by up to 70% with SMS and email reminders sent automatically.
                            </p>
                            
                            {/* Notification Stack Visual */}
                            <div className="features__notif-stack">
                                <motion.div 
                                    className="features__notif features__notif--1"
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                                >
                                    <Bell size={14} />
                                    <span>Reminder: Tomorrow 10:00</span>
                                </motion.div>
                                <motion.div 
                                    className="features__notif features__notif--2"
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                                >
                                    <CheckCircle size={14} />
                                    <span>Booking confirmed!</span>
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
                            <h3 className="features__card-title">Easy Payments</h3>
                            <p className="features__card-description">
                                Accept deposits and full payments online.
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
                            <h3 className="features__card-title">Client Management</h3>
                            <p className="features__card-description">
                                Track history, preferences, and notes.
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
                                    <h3 className="features__card-title">Real-time Analytics</h3>
                                    <p className="features__card-description">
                                        Understand your business with insights on bookings, revenue, peak hours, and client retention.
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
                            <h3 className="features__card-title">Mobile First</h3>
                            <p className="features__card-description">
                                Works perfectly on any device.
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
                            <h3 className="features__card-title">Multi-Language</h3>
                            <p className="features__card-description">
                                English & Portuguese supported.
                            </p>
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </section>
    )
}

export default Features
// DashboardMockup.jsx - Animated dashboard preview
// Location: src/pages/landing/DashboardMockup.jsx

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Calendar,
    Users,
    TrendingUp,
    Clock,
    Bell,
    Sparkles,
    Check,
    Scissors,
    Star
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const DashboardMockup = () => {
    const { t, language } = useLandingTranslation()
    const [isInView, setIsInView] = useState(false)
    const [showNotification, setShowNotification] = useState(false)
    const [visibleAppointments, setVisibleAppointments] = useState(0)
    const [showAiInsight, setShowAiInsight] = useState(false)
    const [aiText, setAiText] = useState('')
    const containerRef = useRef(null)

    // Get current day with leading zero
    const currentDay = new Date().getDate().toString().padStart(2, '0')
    
    // Get formatted date string based on language
    const today = new Date()
    const formattedDate = today.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    })
    // Capitalize first letter
    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

    const stats = [
        { icon: Calendar, value: currentDay, label: t('productPreview.dashboard.bookings'), color: '#8B5CF6', static: true },
        { icon: Users, value: 8, label: t('productPreview.dashboard.clients'), color: '#06B6D4' },
        { icon: TrendingUp, value: 98, label: t('productPreview.dashboard.showRate'), suffix: '%', color: '#10B981' }
    ]

    const appointments = t('productPreview.dashboard.appointments')
    const aiInsightText = t('productPreview.dashboard.aiInsight')

    // Intersection Observer to trigger animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isInView) {
                    setIsInView(true)
                }
            },
            { threshold: 0.3 }
        )

        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        return () => observer.disconnect()
    }, [isInView])

    // Animation sequence when in view
    useEffect(() => {
        if (!isInView) return

        // Show notification after 1s
        const notifTimer = setTimeout(() => setShowNotification(true), 1000)
        
        // Hide notification after 4s
        const hideNotifTimer = setTimeout(() => setShowNotification(false), 4000)

        // Reveal appointments one by one
        const apptTimers = appointments.map((_, index) => 
            setTimeout(() => setVisibleAppointments(index + 1), 1500 + (index * 400))
        )

        // Show AI insight after appointments
        const aiTimer = setTimeout(() => setShowAiInsight(true), 3000)

        // Type AI text
        const typeTimer = setTimeout(() => {
            let i = 0
            const typeInterval = setInterval(() => {
                if (i <= aiInsightText.length) {
                    setAiText(aiInsightText.slice(0, i))
                    i++
                } else {
                    clearInterval(typeInterval)
                }
            }, 30)
        }, 3200)

        return () => {
            clearTimeout(notifTimer)
            clearTimeout(hideNotifTimer)
            apptTimers.forEach(clearTimeout)
            clearTimeout(aiTimer)
            clearTimeout(typeTimer)
        }
    }, [isInView, appointments, aiInsightText])

    return (
        <div className="dashboard-mockup" ref={containerRef}>
            {/* Browser Frame */}
            <div className="dashboard-mockup__frame">
                {/* Title Bar */}
                <div className="dashboard-mockup__titlebar">
                    <div className="dashboard-mockup__dots">
                        <span className="dashboard-mockup__dot dashboard-mockup__dot--red" />
                        <span className="dashboard-mockup__dot dashboard-mockup__dot--yellow" />
                        <span className="dashboard-mockup__dot dashboard-mockup__dot--green" />
                    </div>
                    <div className="dashboard-mockup__url">
                        <span>locappoint.com/dashboard</span>
                    </div>
                    <div className="dashboard-mockup__titlebar-spacer" />
                </div>

                {/* Dashboard Content */}
                <div className="dashboard-mockup__content">
                    {/* Sidebar */}
                    <div className="dashboard-mockup__sidebar">
                        <div className="dashboard-mockup__logo">
                            <div className="dashboard-mockup__logo-icon">
                                <Scissors size={16} />
                            </div>
                            <span>Bella Hair</span>
                        </div>
                        <div className="dashboard-mockup__nav">
                            <div className="dashboard-mockup__nav-item dashboard-mockup__nav-item--active">
                                <Calendar size={16} />
                                <span>{t('productPreview.dashboard.nav.dashboard')}</span>
                            </div>
                            <div className="dashboard-mockup__nav-item">
                                <Clock size={16} />
                                <span>{t('productPreview.dashboard.nav.appointments')}</span>
                            </div>
                            <div className="dashboard-mockup__nav-item">
                                <Users size={16} />
                                <span>{t('productPreview.dashboard.nav.clients')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="dashboard-mockup__main">
                        {/* Header */}
                        <div className="dashboard-mockup__header">
                            <div>
                                <h3 className="dashboard-mockup__greeting">{t('productPreview.dashboard.greeting')}</h3>
                                <p className="dashboard-mockup__date">{displayDate}</p>
                            </div>
                            
                            {/* Notification Bell */}
                            <div className="dashboard-mockup__bell">
                                <Bell size={18} />
                                <AnimatePresence>
                                    {showNotification && (
                                        <motion.span 
                                            className="dashboard-mockup__bell-badge"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            1
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Notification Toast */}
                        <AnimatePresence>
                            {showNotification && (
                                <motion.div 
                                    className="dashboard-mockup__toast"
                                    initial={{ opacity: 0, y: -20, x: 20 }}
                                    animate={{ opacity: 1, y: 0, x: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: "spring", damping: 20 }}
                                >
                                    <div className="dashboard-mockup__toast-icon">
                                        <Check size={14} />
                                    </div>
                                    <div className="dashboard-mockup__toast-content">
                                        <span className="dashboard-mockup__toast-title">{t('productPreview.dashboard.toast.title')}</span>
                                        <span className="dashboard-mockup__toast-text">{t('productPreview.dashboard.toast.text')}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stats Grid */}
                        <div className="dashboard-mockup__stats">
                            {stats.map((stat, index) => (
                                <motion.div 
                                    key={index}
                                    className="dashboard-mockup__stat-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.3 + (index * 0.1) }}
                                >
                                    <div 
                                        className="dashboard-mockup__stat-icon"
                                        style={{ background: `${stat.color}20`, color: stat.color }}
                                    >
                                        <stat.icon size={16} />
                                    </div>
                                    <div className="dashboard-mockup__stat-info">
                                        {stat.static ? (
                                            <span className="dashboard-mockup__stat-value">{stat.value}</span>
                                        ) : (
                                            <CountUp 
                                                end={stat.value} 
                                                suffix={stat.suffix || ''} 
                                                isInView={isInView}
                                                delay={500 + (index * 100)}
                                            />
                                        )}
                                        <span className="dashboard-mockup__stat-label">{stat.label}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Appointments List */}
                        <div className="dashboard-mockup__appointments">
                            <h4 className="dashboard-mockup__section-title">
                                <Calendar size={14} />
                                {t('productPreview.dashboard.upcomingTitle')}
                            </h4>
                            <div className="dashboard-mockup__appointment-list">
                                {appointments.map((apt, index) => (
                                    <motion.div 
                                        key={index}
                                        className="dashboard-mockup__appointment"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={visibleAppointments > index ? { opacity: 1, x: 0 } : {}}
                                        transition={{ type: "spring", damping: 20 }}
                                    >
                                        <div className="dashboard-mockup__appointment-time">{apt.time}</div>
                                        <div className="dashboard-mockup__appointment-info">
                                            <span className="dashboard-mockup__appointment-name">{apt.name}</span>
                                            <span className="dashboard-mockup__appointment-service">{apt.service}</span>
                                        </div>
                                        <div className="dashboard-mockup__appointment-status">
                                            <Check size={12} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* AI Insight */}
                        <AnimatePresence>
                            {showAiInsight && (
                                <motion.div 
                                    className="dashboard-mockup__ai-insight"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="dashboard-mockup__ai-icon">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="dashboard-mockup__ai-content">
                                        <span className="dashboard-mockup__ai-label">{t('productPreview.dashboard.aiLabel')}</span>
                                        <span className="dashboard-mockup__ai-text">
                                            {aiText}
                                            <span className="dashboard-mockup__ai-cursor">|</span>
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Reflection */}
            <div className="dashboard-mockup__reflection" />
        </div>
    )
}

// CountUp component for animated numbers
const CountUp = ({ end, suffix = '', isInView, delay = 0 }) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!isInView) return

        const timer = setTimeout(() => {
            let start = 0
            const duration = 1000
            const increment = end / (duration / 16)
            
            const counter = setInterval(() => {
                start += increment
                if (start >= end) {
                    setCount(end)
                    clearInterval(counter)
                } else {
                    setCount(Math.floor(start))
                }
            }, 16)

            return () => clearInterval(counter)
        }, delay)

        return () => clearTimeout(timer)
    }, [isInView, end, delay])

    return (
        <span className="dashboard-mockup__stat-value">
            {count}{suffix}
        </span>
    )
}

export default DashboardMockup
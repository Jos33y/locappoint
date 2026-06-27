// HeroDashboard - Old structure preserved. Token swap only.

import { motion } from 'framer-motion'
import { Calendar, Clock, User, Bell, TrendingUp, CheckCircle, Star, MapPin } from 'lucide-react'
import { useT } from '../../hooks/useT'

const HeroDashboard = () => {
    const t = useT()

    const currentDay = new Date().getDate().toString().padStart(2, '0')

    const timeSlots = [
        { time: '09:00', status: 'booked',    name: 'Maria S.' },
        { time: '10:30', status: 'available' },
        { time: '12:00', status: 'booked',    name: 'João P.' },
        { time: '14:00', status: 'available' },
        { time: '15:30', status: 'booked',    name: 'Ana R.' },
        { time: '17:00', status: 'available' }
    ]

    // Stat tints map to brand tokens via CSS classes (not inline styles).
    const stats = [
        { key: 'today',   label: t('heroDashboard.today',   'TODAY'),   value: currentDay, icon: Calendar,    tint: 'azure'   },
        { key: 'revenue', label: t('heroDashboard.revenue', 'REVENUE'), value: '€847',     icon: TrendingUp,  tint: 'success' },
        { key: 'rating',  label: t('heroDashboard.rating',  'RATING'),  value: '4.9',      icon: Star,        tint: 'signal'  }
    ]

    const notifications = [
        { text: t('heroDashboard.notifConfirmed', 'New booking confirmed'), time: '2m ago' },
        { text: t('heroDashboard.notifReminder',  'Reminder sent to Maria'), time: '5m ago' }
    ]

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

    return (
        <div className="hero-dashboard" aria-hidden="true">
            <div className="hero-dashboard__glow hero-dashboard__glow--1" />

            <motion.div
                className="hero-dashboard__container"
                initial={{ opacity: 0, y: 40, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="hero-dashboard__header">
                    <div className="hero-dashboard__header-left">
                        <div className="hero-dashboard__avatar"><span>BS</span></div>
                        <div className="hero-dashboard__business">
                            <span className="hero-dashboard__business-name">{t('heroDashboard.businessName', 'Beauty Studio')}</span>
                            <span className="hero-dashboard__business-location">
                                <MapPin size={10} />
                                {t('heroDashboard.location', 'Lisbon, PT')}
                            </span>
                        </div>
                    </div>
                    <div className="hero-dashboard__header-right">
                        <motion.div
                            className="hero-dashboard__notification-badge"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Bell size={14} />
                            <span className="hero-dashboard__notification-dot" />
                        </motion.div>
                    </div>
                </div>

                <div className="hero-dashboard__stats">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.key}
                            className={`hero-dashboard__stat hero-dashboard__stat--${stat.tint}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                        >
                            <div className="hero-dashboard__stat-icon">
                                <stat.icon size={14} />
                            </div>
                            <div className="hero-dashboard__stat-content">
                                <span className="hero-dashboard__stat-value">{stat.value}</span>
                                <span className="hero-dashboard__stat-label">{stat.label}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="hero-dashboard__content">
                    <div className="hero-dashboard__schedule">
                        <div className="hero-dashboard__schedule-header">
                            <Calendar size={14} />
                            <span>{t('heroDashboard.todaysSchedule', "Today's Schedule")}</span>
                        </div>
                        <div className="hero-dashboard__slots">
                            {timeSlots.map((slot, index) => (
                                <motion.div
                                    key={slot.time}
                                    className={`hero-dashboard__slot hero-dashboard__slot--${slot.status}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1 + index * 0.08 }}
                                >
                                    <div className="hero-dashboard__slot-time">
                                        <Clock size={10} />
                                        {slot.time}
                                    </div>
                                    {slot.status === 'booked' ? (
                                        <div className="hero-dashboard__slot-info">
                                            <User size={10} />
                                            <span>{slot.name}</span>
                                        </div>
                                    ) : (
                                        <div className="hero-dashboard__slot-available">
                                            {t('heroDashboard.available', 'Available')}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="hero-dashboard__sidebar">
                        <div className="hero-dashboard__notifications">
                            <div className="hero-dashboard__notifications-header">
                                <Bell size={12} />
                                <span>{t('heroDashboard.activity', 'Activity')}</span>
                            </div>
                            {notifications.map((notif, index) => (
                                <motion.div
                                    key={index}
                                    className="hero-dashboard__notif"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.4 + index * 0.15 }}
                                >
                                    <CheckCircle size={12} className="hero-dashboard__notif-icon" />
                                    <div className="hero-dashboard__notif-content">
                                        <span className="hero-dashboard__notif-text">{notif.text}</span>
                                        <span className="hero-dashboard__notif-time">{notif.time}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="hero-dashboard__chart">
                            <div className="hero-dashboard__chart-header">
                                <TrendingUp size={12} />
                                <span>{t('heroDashboard.thisWeek', 'This Week')}</span>
                            </div>
                            <div className="hero-dashboard__chart-bars">
                                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                                    <motion.div
                                        key={i}
                                        className="hero-dashboard__chart-bar"
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ delay: 1.6 + i * 0.05, duration: 0.5 }}
                                    />
                                ))}
                            </div>
                            <div className="hero-dashboard__chart-labels">
                                {days.map((day, i) => <span key={i}>{day}</span>)}
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div
                    className="hero-dashboard__floating-notif"
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 2, duration: 0.5 }}
                >
                    <div className="hero-dashboard__floating-notif-icon">
                        <CheckCircle size={16} />
                    </div>
                    <div className="hero-dashboard__floating-notif-content">
                        <span className="hero-dashboard__floating-notif-title">
                            {t('heroDashboard.newBooking', 'New Booking!')}
                        </span>
                        <span className="hero-dashboard__floating-notif-text">
                            {t('heroDashboard.bookedFor', 'Sofia M. booked for 18:00')}
                        </span>
                    </div>
                </motion.div>
            </motion.div>

            <motion.div
                className="hero-dashboard__float hero-dashboard__float--1"
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Calendar size={20} />
            </motion.div>

            <motion.div
                className="hero-dashboard__float hero-dashboard__float--2"
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Star size={16} />
            </motion.div>

            <motion.div
                className="hero-dashboard__float hero-dashboard__float--3"
                animate={{ y: [-3, 7, -3] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
                <TrendingUp size={18} />
            </motion.div>
        </div>
    )
}

export default HeroDashboard

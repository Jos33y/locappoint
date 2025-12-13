// StatCard.jsx - Animated stat card component
// Location: src/pages/admin/components/StatCard.jsx

import { useEffect, useState, useRef } from 'react'

const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    suffix = '', 
    color = 'purple',
    trend = null,
    delay = 0 
}) => {
    const [displayValue, setDisplayValue] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const cardRef = useRef(null)

    // Animate value on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay)
        return () => clearTimeout(timer)
    }, [delay])

    // Count up animation
    useEffect(() => {
        if (!isVisible || typeof value !== 'number') {
            setDisplayValue(value)
            return
        }

        const duration = 1000
        const steps = 30
        const increment = value / steps
        let current = 0
        let step = 0

        const timer = setInterval(() => {
            step++
            current = Math.min(Math.round(increment * step), value)
            setDisplayValue(current)
            if (step >= steps) clearInterval(timer)
        }, duration / steps)

        return () => clearInterval(timer)
    }, [value, isVisible])

    const colorClasses = {
        purple: 'stat-card--purple',
        cyan: 'stat-card--cyan',
        amber: 'stat-card--amber',
        green: 'stat-card--green',
        red: 'stat-card--red',
        pink: 'stat-card--pink'
    }

    return (
        <div 
            ref={cardRef}
            className={`stat-card ${colorClasses[color]} ${isVisible ? 'stat-card--visible' : ''}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="stat-card__glow" />
            <div className="stat-card__content">
                <div className="stat-card__icon">
                    <Icon size={22} />
                </div>
                <div className="stat-card__data">
                    <span className="stat-card__value">
                        {typeof value === 'number' ? displayValue : value}
                        {suffix}
                    </span>
                    <span className="stat-card__label">{label}</span>
                </div>
                {trend !== null && (
                    <div className={`stat-card__trend ${trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
        </div>
    )
}

export default StatCard
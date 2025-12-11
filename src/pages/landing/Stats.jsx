// Stats.jsx - Enhanced Stats section with count-up and visual effects
// Location: src/pages/landing/Stats.jsx

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Building2, LayoutGrid, MapPin, CreditCard, Sparkles } from 'lucide-react'

// Count-up hook
const useCountUp = (end, duration = 2000, startCounting = false) => {
    const [count, setCount] = useState(0)
    
    useEffect(() => {
        if (!startCounting) return
        
        let startTime = null
        const endValue = parseInt(end) || 0
        
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            
            // Easing function for smooth finish
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

// Individual stat card with count-up
const StatCard = ({ stat, index, isInView }) => {
    const count = useCountUp(stat.numericValue, 2000 + index * 200, isInView)
    
    return (
        <motion.div 
            className="stats__card"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { 
                    duration: 0.6, 
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1] 
                }
            }}
            viewport={{ once: true }}
            whileHover={{ 
                y: -12,
                transition: { duration: 0.3 }
            }}
        >
            {/* Animated glow orb behind card */}
            <div 
                className="stats__card-orb"
                style={{ background: stat.gradient }}
            />
            
            {/* Top glow line */}
            <div 
                className="stats__card-glow"
                style={{ background: stat.gradient }}
            />
            
            {/* Pulsing rings around icon */}
            <div className="stats__icon-wrapper">
                <div 
                    className="stats__icon-ring stats__icon-ring--1"
                    style={{ borderColor: stat.color }}
                />
                <div 
                    className="stats__icon-ring stats__icon-ring--2"
                    style={{ borderColor: stat.color }}
                />
                <div 
                    className="stats__icon"
                    style={{ background: stat.gradient }}
                >
                    <stat.icon size={24} strokeWidth={1.5} />
                </div>
            </div>
            
            {/* Animated value */}
            <div 
                className="stats__value"
                style={{ 
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}
            >
                {stat.prefix}{count}{stat.suffix}
            </div>
            
            <div className="stats__label">{stat.label}</div>
            
            {/* Decorative corner accent */}
            <div 
                className="stats__corner-accent"
                style={{ background: stat.gradient }}
            />
        </motion.div>
    )
}

const Stats = () => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })
    
    const stats = [
        {
            icon: Building2,
            numericValue: 100,
            prefix: '',
            suffix: '+',
            label: 'Businesses Waiting',
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
            color: 'rgba(139, 92, 246, 0.5)'
        },
        {
            icon: LayoutGrid,
            numericValue: 10,
            prefix: '',
            suffix: '+',
            label: 'Service Categories',
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
            color: 'rgba(6, 182, 212, 0.5)'
        },
        {
            icon: MapPin,
            numericValue: 4,
            prefix: '',
            suffix: '',
            label: 'Cities Launching',
            gradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
            color: 'rgba(168, 85, 247, 0.5)'
        },
        {
            icon: CreditCard,
            numericValue: 0,
            prefix: '',
            suffix: '€',
            label: 'Setup Cost',
            gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
            color: 'rgba(16, 185, 129, 0.5)'
        }
    ]

    // Floating particles data
    const particles = [
        { size: 4, x: '10%', y: '20%', delay: 0 },
        { size: 3, x: '85%', y: '15%', delay: 1 },
        { size: 5, x: '75%', y: '75%', delay: 2 },
        { size: 3, x: '15%', y: '80%', delay: 0.5 },
        { size: 4, x: '50%', y: '10%', delay: 1.5 },
        { size: 3, x: '90%', y: '50%', delay: 2.5 },
    ]

    return (
        <section className="stats" id="stats" ref={ref}>
            {/* Enhanced background */}
            <div className="stats__bg">
                {/* Gradient orbs */}
                <div className="stats__glow stats__glow--1" />
                <div className="stats__glow stats__glow--2" />
                <div className="stats__glow stats__glow--3" />
                
                {/* Grid pattern */}
                <div className="stats__grid-pattern" />
                
                {/* Floating particles */}
                {particles.map((particle, i) => (
                    <div
                        key={i}
                        className="stats__particle"
                        style={{
                            width: particle.size,
                            height: particle.size,
                            left: particle.x,
                            top: particle.y,
                            animationDelay: `${particle.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Decorative floating icons */}
            <div className="stats__floating-elements">
                <motion.div 
                    className="stats__floating-icon stats__floating-icon--1"
                    animate={{ 
                        y: [0, -15, 0],
                        rotate: [0, 10, 0]
                    }}
                    transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                    }}
                >
                    <Sparkles size={20} />
                </motion.div>
                <motion.div 
                    className="stats__floating-icon stats__floating-icon--2"
                    animate={{ 
                        y: [0, 12, 0],
                        rotate: [0, -8, 0]
                    }}
                    transition={{ 
                        duration: 5, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: 1
                    }}
                >
                    <Sparkles size={16} />
                </motion.div>
            </div>

            <div className="container">
                {/* Optional section intro */}
                <motion.div 
                    className="stats__intro"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="stats__intro-text">The numbers speak</span>
                </motion.div>

                <div className="stats__grid">
                    {stats.map((stat, index) => (
                        <StatCard 
                            key={index} 
                            stat={stat} 
                            index={index}
                            isInView={isInView}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Stats
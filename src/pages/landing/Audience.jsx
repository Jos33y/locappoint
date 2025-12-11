// Audience.jsx - Enhanced For Whom section with animated marquee
// Location: src/pages/landing/Audience.jsx

import { motion } from 'framer-motion'
import { 
    Scissors, 
    Dumbbell, 
    Stethoscope, 
    Sparkles,
    Dog,
    Camera,
    Brush,
    Car,
    GraduationCap,
    Users,
    Heart,
    Music,
    Utensils
} from 'lucide-react'

const Audience = () => {
    // Main categories (displayed in grid)
    const mainCategories = [
        {
            icon: Scissors,
            title: 'Salons & Barbershops',
            description: 'Hair stylists, barbers, and beauty professionals',
            gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
            color: '#EC4899',
            colorRgb: '236, 72, 153'
        },
        {
            icon: Sparkles,
            title: 'Spas & Wellness',
            description: 'Massage therapists, estheticians, wellness centers',
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
            color: '#8B5CF6',
            colorRgb: '139, 92, 246'
        },
        {
            icon: Dumbbell,
            title: 'Fitness & Training',
            description: 'Personal trainers, yoga instructors, studios',
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            color: '#F59E0B',
            colorRgb: '245, 158, 11'
        },
        {
            icon: Stethoscope,
            title: 'Health & Medical',
            description: 'Dentists, physiotherapists, healthcare',
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
            color: '#06B6D4',
            colorRgb: '6, 182, 212'
        },
        {
            icon: Dog,
            title: 'Pet Services',
            description: 'Groomers, veterinarians, pet care',
            gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            color: '#10B981',
            colorRgb: '16, 185, 129'
        },
        {
            icon: Camera,
            title: 'Creative Services',
            description: 'Photographers, makeup artists, events',
            gradient: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
            color: '#F97316',
            colorRgb: '249, 115, 22'
        }
    ]

    // Extra categories for marquee
    const marqueeCategories = [
        { icon: Brush, label: 'Lash & Brow Artists' },
        { icon: Car, label: 'Auto Detailing' },
        { icon: GraduationCap, label: 'Tutors & Coaches' },
        { icon: Heart, label: 'Life Coaches' },
        { icon: Music, label: 'Music Teachers' },
        { icon: Utensils, label: 'Personal Chefs' },
        { icon: Scissors, label: 'Nail Technicians' },
        { icon: Sparkles, label: 'Aestheticians' },
    ]

    return (
        <section className="audience" id="audience">
            {/* Background */}
            <div className="audience__bg">
                <div className="audience__grid-pattern" />
                <div className="audience__glow audience__glow--1" />
                <div className="audience__glow audience__glow--2" />
                
                {/* Floating icons in background */}
                <div className="audience__floating-icons">
                    {[Scissors, Dumbbell, Camera, Dog, Brush].map((Icon, i) => (
                        <motion.div
                            key={i}
                            className="audience__floating-icon"
                            style={{
                                left: `${10 + i * 20}%`,
                                top: `${15 + (i % 3) * 30}%`,
                            }}
                            animate={{
                                y: [0, -20, 0],
                                rotate: [0, i % 2 === 0 ? 10 : -10, 0],
                                opacity: [0.1, 0.2, 0.1]
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
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <Users size={14} />
                        <span>For Whom</span>
                    </div>
                    <h2 className="section-title">
                        Built for 
                        <span className="ai-gradient-text"> service businesses</span>
                    </h2>
                    <p className="section-subtitle">
                        If you book appointments, LocAppoint is built for you.
                    </p>
                </motion.div>

                {/* Main categories grid */}
                <div className="audience__grid">
                    {mainCategories.map((item, index) => (
                        <motion.div 
                            key={index}
                            className="audience__card"
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
                            {/* Top glow */}
                            <div 
                                className="audience__card-glow"
                                style={{ background: item.gradient }}
                            />
                            
                            {/* Ambient orb */}
                            <div 
                                className="audience__card-orb"
                                style={{ background: item.gradient }}
                            />

                            {/* Icon with ring */}
                            <div className="audience__icon-wrapper">
                                <div 
                                    className="audience__icon-ring"
                                    style={{ borderColor: `rgba(${item.colorRgb}, 0.3)` }}
                                />
                                <div 
                                    className="audience__icon"
                                    style={{ background: item.gradient }}
                                >
                                    <item.icon size={24} strokeWidth={1.5} />
                                </div>
                            </div>
                            
                            <div className="audience__content">
                                <h3 className="audience__title">{item.title}</h3>
                                <p className="audience__description">{item.description}</p>
                            </div>

                            {/* Arrow indicator */}
                            <div className="audience__arrow">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path 
                                        d="M4 10H16M16 10L11 5M16 10L11 15" 
                                        stroke={item.color}
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Marquee section */}
                <motion.div 
                    className="audience__marquee-section"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <p className="audience__marquee-label">And many more...</p>
                    
                    <div className="audience__marquee-wrapper">
                        <div className="audience__marquee">
                            {/* First set */}
                            {marqueeCategories.map((item, index) => (
                                <div key={index} className="audience__marquee-item">
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                            {/* Duplicate for seamless loop */}
                            {marqueeCategories.map((item, index) => (
                                <div key={`dup-${index}`} className="audience__marquee-item">
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Bottom CTA */}
                <motion.div 
                    className="audience__cta"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <span>Don't see your industry?</span>
                    <button 
                        className="audience__cta-link"
                        onClick={() => window.openWaitlistModal?.()}
                    >
                        Join waitlist & let us know
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path 
                                d="M3 8H13M13 8L9 4M13 8L9 12" 
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default Audience
// ProblemSolution.jsx - Enhanced Reality section with animated contrast (Translated)
// Location: src/pages/landing/ProblemSolution.jsx

import { motion } from 'framer-motion'
import { 
    X, 
    Check, 
    Phone, 
    Clock, 
    Calendar, 
    Users, 
    TrendingUp, 
    Bell, 
    AlertCircle, 
    Zap,
    Sparkles 
} from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'

const ProblemSolution = () => {
    const { t } = useLandingTranslation()
    
    const problemTexts = t('problem.problems')
    const solutionTexts = t('problem.solutions')
    
    const problems = [
        { icon: Phone, text: problemTexts[0] },
        { icon: Clock, text: problemTexts[1] },
        { icon: Calendar, text: problemTexts[2] },
        { icon: Users, text: problemTexts[3] }
    ]

    const solutions = [
        { icon: Bell, text: solutionTexts[0] },
        { icon: Calendar, text: solutionTexts[1] },
        { icon: TrendingUp, text: solutionTexts[2] },
        { icon: Users, text: solutionTexts[3] }
    ]

    const problemVariants = {
        hidden: { opacity: 0, x: -30 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: { 
                duration: 0.5, 
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1]
            }
        })
    }

    const solutionVariants = {
        hidden: { opacity: 0, x: 30 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: { 
                duration: 0.5, 
                delay: i * 0.1 + 0.2,
                ease: [0.22, 1, 0.36, 1]
            }
        })
    }

    return (
        <section className="problem-solution" id="problem">
            {/* Background */}
            <div className="problem-solution__bg">
                <div className="problem-solution__grid" />
                <div className="problem-solution__glow problem-solution__glow--1" />
                <div className="problem-solution__glow problem-solution__glow--2" />
                <div className="problem-solution__glow problem-solution__glow--center" />
                
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="problem-solution__particle"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 5 + i,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5
                        }}
                    />
                ))}
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
                        <AlertCircle size={14} />
                        <span>{t('problem.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('problem.title')}
                        <span className="ai-gradient-text">{t('problem.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('problem.subtitle')}
                    </p>
                </motion.div>

                <div className="problem-solution__layout">
                    {/* Problems Column */}
                    <motion.div 
                        className="problem-solution__column problem-solution__column--problems"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Column glow effect */}
                        <div className="problem-solution__column-glow" />
                        
                        <div className="problem-solution__column-header">
                            <div className="problem-solution__icon-badge problem-solution__icon-badge--red">
                                <X size={18} strokeWidth={2.5} />
                            </div>
                            <span>{t('problem.without')}</span>
                        </div>
                        
                        <ul className="problem-solution__list">
                            {problems.map((item, index) => (
                                <motion.li 
                                    key={index}
                                    className="problem-solution__item problem-solution__item--problem"
                                    custom={index}
                                    variants={problemVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                >
                                    <div className="problem-solution__item-x">
                                        <X size={14} strokeWidth={3} />
                                    </div>
                                    <div className="problem-solution__item-icon">
                                        <item.icon size={18} />
                                    </div>
                                    <span className="problem-solution__item-text">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Center divider with transformation visual */}
                    <div className="problem-solution__divider">
                        <div className="problem-solution__divider-line" />
                        <motion.div 
                            className="problem-solution__vs"
                            animate={{ 
                                boxShadow: [
                                    '0 0 20px rgba(139, 92, 246, 0.3)',
                                    '0 0 40px rgba(139, 92, 246, 0.6)',
                                    '0 0 20px rgba(139, 92, 246, 0.3)'
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Zap size={22} />
                        </motion.div>
                        <div className="problem-solution__divider-line" />
                    </div>

                    {/* Solutions Column */}
                    <motion.div 
                        className="problem-solution__column problem-solution__column--solutions"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {/* Column glow effect */}
                        <div className="problem-solution__column-glow" />
                        
                        <div className="problem-solution__column-header">
                            <div className="problem-solution__icon-badge problem-solution__icon-badge--green">
                                <Check size={18} strokeWidth={2.5} />
                            </div>
                            <span>{t('problem.with')}</span>
                            <Sparkles size={14} className="problem-solution__sparkle" />
                        </div>
                        
                        <ul className="problem-solution__list">
                            {solutions.map((item, index) => (
                                <motion.li 
                                    key={index}
                                    className="problem-solution__item problem-solution__item--solution"
                                    custom={index}
                                    variants={solutionVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                >
                                    <div className="problem-solution__item-check">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                    <div className="problem-solution__item-icon">
                                        <item.icon size={18} />
                                    </div>
                                    <span className="problem-solution__item-text">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Bottom transformation message */}
                <motion.div 
                    className="problem-solution__transform-msg"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <Zap size={16} />
                    <span>{t('problem.transform')}</span>
                </motion.div>
            </div>
        </section>
    )
}

export default ProblemSolution
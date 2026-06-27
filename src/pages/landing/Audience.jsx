// Audience - "Built For" with 6 main category cards, AND MANY MORE marquee, and bottom CTA.
// Lift-and-swap of old layout with brand-token palette.

import { motion, useReducedMotion } from 'framer-motion'
import {
    Scissors,
    Sparkles,
    Dumbbell,
    Stethoscope,
    PawPrint,
    Camera,
    Car,
    GraduationCap,
    Heart,
    Music,
    Utensils,
    Brush,
    Wand2,
    ArrowRight
} from 'lucide-react'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const audiences = [
    { icon: Scissors,    key: 'salons',   accent: 'azure',
      fallbackTitle: 'Salons & Barbershops',
      fallbackBody: 'Hair stylists, barbers, and beauty professionals' },
    { icon: Sparkles,    key: 'spas',     accent: 'signal',
      fallbackTitle: 'Spas & Wellness',
      fallbackBody: 'Massage therapists, aestheticians, wellness centers' },
    { icon: Dumbbell,    key: 'fitness',  accent: 'success',
      fallbackTitle: 'Fitness & Training',
      fallbackBody: 'Personal trainers, yoga instructors, studios' },
    { icon: Stethoscope, key: 'health',   accent: 'azure',
      fallbackTitle: 'Health & Medical',
      fallbackBody: 'Dentists, physiotherapists, clinics' },
    { icon: PawPrint,    key: 'pets',     accent: 'signal',
      fallbackTitle: 'Pet Services',
      fallbackBody: 'Groomers, veterinarians, pet care' },
    { icon: Camera,      key: 'creative', accent: 'success',
      fallbackTitle: 'Creative Services',
      fallbackBody: 'Photographers, makeup artists, event services' }
]

const marqueeItems = [
    { icon: Car,           label: 'Auto Detailing' },
    { icon: GraduationCap, label: 'Tutors & Coaches' },
    { icon: Heart,         label: 'Life Coaches' },
    { icon: Music,         label: 'Music Teachers' },
    { icon: Utensils,      label: 'Personal Chefs' },
    { icon: Brush,         label: 'Nail Artists' },
    { icon: Wand2,         label: 'Estheticians' }
]

const Audience = () => {
    const t = useT()
    const prefersReducedMotion = useReducedMotion()

    const handleCtaClick = () => {
        if (typeof window !== 'undefined' && typeof window.openWaitlistModal === 'function') {
            window.openWaitlistModal()
        }
    }

    return (
        <section className="audience" id="audience">
            <div className="audience__ambient" aria-hidden="true" />

            <div className="container">
                <motion.header
                    className="audience__header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="audience__editorial">
                        <span className="audience__editorial-rule" aria-hidden="true" />
                        <span className="audience__editorial-text">
                            {t('audience.eyebrow', 'BUILT FOR')}
                        </span>
                    </div>
                    <h2 className="audience__title">
                        {t('audience.title', 'Made for')}{' '}
                        <span className="audience__title-accent">
                            {t('audience.titleHighlight', 'service businesses')}
                        </span>
                    </h2>
                    <p className="audience__subtitle">
                        {t('audience.subtitle', 'If you book appointments, LocAppoint was made for you.')}
                    </p>
                </motion.header>

                <div className="audience__grid">
                    {audiences.map(({ icon: Icon, key, accent, fallbackTitle, fallbackBody }, index) => (
                        <motion.article
                            key={key}
                            className={`audience__card audience__card--${accent}`}
                            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 28 }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                    duration: 0.5,
                                    delay: prefersReducedMotion ? 0 : index * 0.08,
                                    ease: EASE
                                }
                            }}
                            viewport={{ once: true }}
                        >
                            <div className="audience__icon-wrap">
                                <span className="audience__icon-ring" aria-hidden="true" />
                                <span className={`audience__icon audience__icon--${accent}`}>
                                    <Icon size={22} strokeWidth={1.5} />
                                </span>
                            </div>
                            <h3 className="audience__card-title">
                                {t(`audience.${key}.title`, fallbackTitle)}
                            </h3>
                            <p className="audience__card-body">
                                {t(`audience.${key}.body`, fallbackBody)}
                            </p>
                        </motion.article>
                    ))}
                </div>

                <motion.div
                    className="audience__marquee-section"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <p className="audience__marquee-label">
                        {t('audience.marqueeLabel', 'AND MANY MORE...')}
                    </p>

                    <div className="audience__marquee-wrap">
                        <div className="audience__marquee">
                            {marqueeItems.map(({ icon: Icon, label }, i) => (
                                <span key={`m-${i}`} className="audience__chip">
                                    <Icon size={14} strokeWidth={1.75} />
                                    <span>{label}</span>
                                </span>
                            ))}
                            {marqueeItems.map(({ icon: Icon, label }, i) => (
                                <span key={`m-dup-${i}`} className="audience__chip" aria-hidden="true">
                                    <Icon size={14} strokeWidth={1.75} />
                                    <span>{label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="audience__cta"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <span className="audience__cta-text">
                        {t('audience.ctaText', "Don't see your industry?")}
                    </span>
                    <button
                        type="button"
                        className="audience__cta-link"
                        onClick={handleCtaClick}
                    >
                        <span>{t('audience.ctaLink', 'Join waitlist and tell us')}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </motion.div>
            </div>
        </section>
    )
}

export default Audience

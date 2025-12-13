// WhatsAppCTA.jsx - WhatsApp Channel promotion with Analytics
// Location: src/pages/landing/WhatsAppCTA.jsx

import { motion } from 'framer-motion'
import { MessageCircle, Bell, Users, Sparkles, ArrowRight } from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'
import { trackWhatsAppClick } from '../../services/analytics'

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb6ue9NCXC3S1ZqlKS1W'

const WhatsAppCTA = () => {
    const { t } = useLandingTranslation()

    const features = [
        { icon: Bell, text: t('whatsappCta.features.updates') },
        { icon: Users, text: t('whatsappCta.features.community') },
        { icon: Sparkles, text: t('whatsappCta.features.early') }
    ]

    const handleJoinChannel = async () => {
        // Track the click
        await trackWhatsAppClick()
        // Open the channel
        window.open(WHATSAPP_CHANNEL_URL, '_blank', 'noopener,noreferrer')
    }

    return (
        <section className="whatsapp-cta" id="whatsapp-cta">
            <div className="container">
                <motion.div 
                    className="whatsapp-cta__card"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Background effects */}
                    <div className="whatsapp-cta__bg">
                        <div className="whatsapp-cta__grid-pattern" />
                        <div className="whatsapp-cta__orb whatsapp-cta__orb--1" />
                        <div className="whatsapp-cta__orb whatsapp-cta__orb--2" />
                    </div>

                    {/* Border glow */}
                    <div className="whatsapp-cta__border" />

                    {/* Content */}
                    <div className="whatsapp-cta__content">
                        {/* Icon */}
                        <motion.div 
                            className="whatsapp-cta__icon"
                            animate={{ 
                                scale: [1, 1.05, 1],
                                rotate: [0, 3, -3, 0]
                            }}
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                        >
                            <div className="whatsapp-cta__icon-ring whatsapp-cta__icon-ring--1" />
                            <div className="whatsapp-cta__icon-ring whatsapp-cta__icon-ring--2" />
                            <MessageCircle size={32} />
                        </motion.div>

                        {/* Text */}
                        <div className="whatsapp-cta__text">
                            <h3 className="whatsapp-cta__title">
                                {t('whatsappCta.title')}
                            </h3>
                            <p className="whatsapp-cta__subtitle">
                                {t('whatsappCta.subtitle')}
                            </p>
                        </div>

                        {/* Features */}
                        <div className="whatsapp-cta__features">
                            {features.map((feature, index) => (
                                <motion.div 
                                    key={index} 
                                    className="whatsapp-cta__feature"
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                >
                                    <feature.icon size={14} />
                                    <span>{feature.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Button */}
                        <motion.button
                            className="whatsapp-cta__btn"
                            onClick={handleJoinChannel}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <MessageCircle size={18} />
                            <span>{t('whatsappCta.button')}</span>
                            <ArrowRight size={16} className="whatsapp-cta__btn-arrow" />
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default WhatsAppCTA
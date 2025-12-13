// ProductPreview.jsx - Live animated product preview section
// Location: src/pages/landing/ProductPreview.jsx

import { motion } from 'framer-motion'
import { Monitor, Sparkles } from 'lucide-react'
import { useLandingTranslation } from '../../hooks/useLandingTranslation'
import DashboardMockup from './DashboardMockup'

const ProductPreview = () => {
    const { t } = useLandingTranslation()

    return (
        <section className="product-preview" id="preview">
            {/* Background */}
            <div className="product-preview__bg">
                <div className="product-preview__grid-pattern" />
                <div className="product-preview__glow product-preview__glow--1" />
                <div className="product-preview__glow product-preview__glow--2" />
                <div className="product-preview__glow product-preview__glow--3" />
            </div>

            <div className="container">
                {/* Header */}
                <motion.div 
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="section-badge">
                        <Monitor size={14} />
                        <span>{t('productPreview.badge')}</span>
                    </div>
                    <h2 className="section-title">
                        {t('productPreview.title')}
                        <span className="ai-gradient-text">{t('productPreview.titleHighlight')}</span>
                    </h2>
                    <p className="section-subtitle">
                        {t('productPreview.subtitle')}
                    </p>
                </motion.div>

                {/* Dashboard Mockup */}
                <motion.div
                    className="product-preview__mockup-wrapper"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <DashboardMockup />
                </motion.div>

                {/* Bottom caption */}
                <motion.div 
                    className="product-preview__caption"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <Sparkles size={16} className="product-preview__caption-icon" />
                    <span>{t('productPreview.caption')}</span>
                </motion.div>
            </div>
        </section>
    )
}

export default ProductPreview
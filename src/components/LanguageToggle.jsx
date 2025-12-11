// LanguageToggle.jsx - SVG Flags (Cross-platform)
// Location: src/components/LanguageToggle.jsx

import { motion } from 'framer-motion'
import { useLandingTranslation } from '../hooks/useLandingTranslation'

// UK Flag SVG
const UKFlag = () => (
    <svg 
        width="22" 
        height="14" 
        viewBox="0 0 50 30" 
        style={{ borderRadius: '3px' }}
    >
        <rect width="50" height="30" fill="#012169" />
        <path d="M0,0 L50,30 M50,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L50,30 M50,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M25,0 V30 M0,15 H50" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M25,0 V30 M0,15 H50" stroke="#C8102E" strokeWidth="6" />
    </svg>
)

// Portugal Flag SVG
const PortugalFlag = () => (
    <svg 
        width="22" 
        height="15" 
        viewBox="0 0 30 20" 
        style={{ borderRadius: '3px' }}
    >
        <rect width="30" height="20" fill="#FF0000" />
        <rect width="12" height="20" fill="#006600" />
        <circle cx="12" cy="10" r="4.5" fill="#FFCC00" />
        <circle cx="12" cy="10" r="3.5" fill="#FF0000" />
        <circle cx="12" cy="10" r="2" fill="#FFFFFF" />
    </svg>
)

const LanguageToggle = () => {
    const { language, toggleLanguage } = useLandingTranslation()

    return (
        <motion.button
            className="language-toggle"
            onClick={toggleLanguage}
            aria-label={language === 'en' ? 'Switch to Portuguese' : 'Switch to English'}
            title={language === 'en' ? 'Portugues' : 'English'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <span className="language-toggle__flag">
                {language === 'en' ? <UKFlag /> : <PortugalFlag />}
            </span>
            <span className="language-toggle__text">
                {language === 'en' ? 'PT' : 'EN'}
            </span>
        </motion.button>
    )
}

export default LanguageToggle
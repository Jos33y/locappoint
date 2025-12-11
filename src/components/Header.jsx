// Header.jsx - Premium header with logo icon + text
// Location: src/components/Header.jsx

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLandingTranslation } from '../hooks/useLandingTranslation'
import LanguageToggle from './LanguageToggle'

// Simple Logo Icon SVG (padlock + cloud inspired)
const LogoIcon = () => (
    <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Cloud shape */}
        <path 
            d="M8 20C5.79 20 4 18.21 4 16C4 14.14 5.28 12.59 7 12.14C7 12.09 7 12.05 7 12C7 9.24 9.24 7 12 7C13.86 7 15.46 8.12 16.25 9.69C16.65 9.56 17.07 9.5 17.5 9.5C19.71 9.5 21.5 11.29 21.5 13.5C21.5 13.67 21.49 13.84 21.46 14H22C24.21 14 26 15.79 26 18C26 20.21 24.21 22 22 22H8V20Z" 
            fill="url(#cloud-gradient)"
            opacity="0.6"
        />
        {/* Padlock body */}
        <rect 
            x="11" 
            y="14" 
            width="10" 
            height="9" 
            rx="2" 
            stroke="url(#lock-gradient)" 
            strokeWidth="2"
            fill="none"
        />
        {/* Padlock shackle */}
        <path 
            d="M13 14V11C13 9.34 14.34 8 16 8C17.66 8 19 9.34 19 11V14" 
            stroke="url(#lock-gradient)" 
            strokeWidth="2" 
            strokeLinecap="round"
            fill="none"
        />
        {/* Keyhole */}
        <circle cx="16" cy="18" r="1.5" fill="url(#lock-gradient)" />
        {/* Gradients */}
        <defs>
            <linearGradient id="cloud-gradient" x1="4" y1="7" x2="26" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#06B6D4" />
                <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="lock-gradient" x1="11" y1="8" x2="21" y2="23" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
        </defs>
    </svg>
)

const Header = ({ onPartnershipClick, onWaitlistClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const { t } = useLandingTranslation()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMenuOpen && !event.target.closest('.header')) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [isMenuOpen])

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isMenuOpen])

    const scrollToSection = (id) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            setIsMenuOpen(false)
        }
    }

    const handlePartnershipClick = () => {
        setIsMenuOpen(false)
        if (onPartnershipClick) onPartnershipClick()
    }

    const handleWaitlistClick = () => {
        setIsMenuOpen(false)
        if (onWaitlistClick) onWaitlistClick()
    }

    const toggleMenu = (e) => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
    }

    const navItems = [
        { id: 'features', label: t('nav.features') || 'Features' },
        { id: 'audience', label: t('nav.forWhom') || 'For Whom' },
        { id: 'benefits', label: t('nav.whyLocAppoint') || 'Why LocAppoint' },
    ]

    return (
        <motion.header 
            className={`header ${isScrolled ? 'header--scrolled' : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="header__content">
                {/* Logo with icon + text */}
                <motion.a 
                    href="#" 
                    className="header__logo"
                    onClick={(e) => {
                        e.preventDefault()
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogoIcon />
                    <span className="header__logo-text">LocAppoint</span>
                </motion.a>

                {/* Desktop Navigation */}
                <nav className="header__nav">
                    <ul className="header__nav-list">
                        {navItems.map((item, index) => (
                            <motion.li 
                                key={item.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection(item.id)}
                                    type="button"
                                >
                                    {item.label}
                                </button>
                            </motion.li>
                        ))}
                        <motion.li
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <button
                                className="header__nav-link header__nav-link--highlight"
                                onClick={handlePartnershipClick}
                                type="button"
                            >
                                {t('nav.partnership') || 'Partnership'}
                            </button>
                        </motion.li>
                    </ul>
                </nav>

                {/* Desktop Actions */}
                <motion.div 
                    className="header__actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <LanguageToggle />
                    <motion.button
                        className="header__cta"
                        onClick={handleWaitlistClick}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {t('nav.joinWaitlist') || 'Join the Waitlist'}
                    </motion.button>
                </motion.div>

                {/* Mobile Actions */}
                <div className="header__mobile-actions">
                    <LanguageToggle />
                    <button
                        className={`header__menu-toggle ${isMenuOpen ? 'header__menu-toggle--open' : ''}`}
                        onClick={toggleMenu}
                        type="button"
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                    >
                        <span className="header__menu-line"></span>
                        <span className="header__menu-line"></span>
                        <span className="header__menu-line"></span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu - Always rendered, visibility controlled by CSS */}
            <nav className={`header__mobile-nav ${isMenuOpen ? 'header__mobile-nav--open' : ''}`}>
                <ul className="header__mobile-list">
                    {navItems.map((item, index) => (
                        <li key={item.id}>
                            <button
                                className="header__mobile-link"
                                onClick={() => scrollToSection(item.id)}
                                type="button"
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            className="header__mobile-link header__mobile-link--highlight"
                            onClick={handlePartnershipClick}
                            type="button"
                        >
                            {t('nav.partnership') || 'Partnership'}
                        </button>
                    </li>
                    <li className="header__mobile-cta-wrapper">
                        <button
                            className="header__mobile-cta"
                            onClick={handleWaitlistClick}
                            type="button"
                        >
                            {t('nav.joinWaitlist') || 'Join the Waitlist'}
                        </button>
                    </li>
                </ul>
            </nav>
        </motion.header>
    )
}

export default Header
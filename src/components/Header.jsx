// Header.jsx - Premium header with logo icon + text (Translated)
// Location: src/components/Header.jsx

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLandingTranslation } from '../hooks/useLandingTranslation'
import LanguageToggle from './LanguageToggle'
import LogoIcon from './LogoIcon'

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

    const navItems = t('nav.items') // Array from translations

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
                                key={item.href}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection(item.href)}
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
                                {t('nav.partnership')}
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
                        {t('nav.joinWaitlist')}
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
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <button
                                className="header__mobile-link"
                                onClick={() => scrollToSection(item.href)}
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
                            {t('nav.partnership')}
                        </button>
                    </li>
                    <li className="header__mobile-cta-wrapper">
                        <button
                            className="header__mobile-cta"
                            onClick={handleWaitlistClick}
                            type="button"
                        >
                            {t('nav.joinWaitlist')}
                        </button>
                    </li>
                </ul>
            </nav>
        </motion.header>
    )
}

export default Header
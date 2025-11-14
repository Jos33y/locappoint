import { useState, useEffect } from 'react'
import { useLandingTranslation } from '../hooks/useLandingTranslation'
import LanguageToggle from './LanguageToggle'

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { t } = useLandingTranslation()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMenuOpen && !event.target.closest('.header')) {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [isMenuOpen])

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isMenuOpen])

    const scrollToSection = (id) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            setIsMenuOpen(false)
        }
    }

    const toggleMenu = (e) => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
    }

    return (
        <header className="header" role="banner">
            <div className="header__content">
                {/* Logo */}
                <div className="header__logo">
                    <a 
                        href="#" 
                        className="header__logo-link" 
                        onClick={(e) => {
                            e.preventDefault()
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}>
                        LocAppoint
                    </a>
                </div>

                {/* Desktop Navigation - Center */}
                <nav className="header__nav header__nav--desktop" role="navigation" aria-label="Main navigation">
                    <ul className="header__nav-list">
                        <li className="header__nav-item">
                            <button
                                className="header__nav-link"
                                onClick={() => scrollToSection('features')}
                                type="button">
                                {t('nav.features')}
                            </button>
                        </li>
                        <li className="header__nav-item">
                            <button
                                className="header__nav-link"
                                onClick={() => scrollToSection('audience')}
                                type="button">
                                {t('nav.forWhom')}
                            </button>
                        </li>
                        <li className="header__nav-item">
                            <button
                                className="header__nav-link"
                                onClick={() => scrollToSection('benefits')}
                                type="button">
                                {t('nav.whyLocAppoint')}
                            </button>
                        </li>
                        <li className="header__nav-item">
                            <button
                                className="header__nav-link"
                                onClick={() => scrollToSection('waitlist')}
                                type="button">
                                {t('nav.waitlist')}
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* Desktop Actions - Right Side */}
                <div className="header__actions">
                    <LanguageToggle />
                    <button
                        className="btn btn--primary btn--small header__cta-btn"
                        onClick={() => scrollToSection('waitlist')}
                        type="button">
                        {t('nav.joinWaitlist')}
                    </button>
                </div>

                {/* Mobile Actions - Right Side */}
                <div className="header__mobile-actions">
              
                    <LanguageToggle />
                    <button
                        className={`header__menu-toggle ${isMenuOpen ? 'header__menu-toggle--open' : ''}`}
                        onClick={toggleMenu}
                        type="button"
                        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isMenuOpen}>
                        <span className="header__menu-icon"></span>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <nav 
                className={`header__nav-mobile ${isMenuOpen ? 'header__nav-mobile--open' : ''}`}
                role="navigation" 
                aria-label="Mobile navigation">
                <ul className="header__nav-list-mobile">
                    <li className="header__nav-item">
                        <button
                            className="header__nav-link"
                            onClick={() => scrollToSection('features')}
                            type="button">
                            {t('nav.features')}
                        </button>
                    </li>
                    <li className="header__nav-item">
                        <button
                            className="header__nav-link"
                            onClick={() => scrollToSection('audience')}
                            type="button">
                            {t('nav.forWhom')}
                        </button>
                    </li>
                    <li className="header__nav-item">
                        <button
                            className="header__nav-link"
                            onClick={() => scrollToSection('benefits')}
                            type="button">
                            {t('nav.whyLocAppoint')}
                        </button>
                    </li>
                    <li className="header__nav-item">
                        <button
                            className="header__nav-link"
                            onClick={() => scrollToSection('waitlist')}
                            type="button">
                            {t('nav.waitlist')}
                        </button>
                    </li>
                    <li className="header__nav-item header__nav-item--cta">
                        <button
                            className="btn btn--primary btn--medium"
                            onClick={() => scrollToSection('waitlist')}
                            type="button">
                            {t('nav.joinWaitlist')}
                        </button>
                    </li>
                </ul>
            </nav> 
        </header>
    )
}

export default Header
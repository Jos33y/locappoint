import { useState } from 'react'

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const scrollToSection = (id) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            setIsMenuOpen(false)
        }
    }

    return (
        <header className="header" role="banner">
            <div className="container">
                <div className="header__content">
                    <div className="header__logo">
                        <a href="#" className="header__logo-link">
                            LocAppoint
                        </a>
                    </div>

                    <nav className="header__nav" role="navigation" aria-label="Main navigation">
                        <ul className={`header__nav-list ${isMenuOpen ? 'header__nav-list--open' : ''}`}>
                            <li className="header__nav-item">
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection('features')}
                                    type="button">
                                    Features
                                </button>
                            </li>
                            <li className="header__nav-item">
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection('audience')}
                                    type="button">
                                    For Whom
                                </button>
                            </li>
                            <li className="header__nav-item">
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection('benefits')}
                                    type="button">
                                    Why LocAppoint
                                </button>
                            </li>
                            <li className="header__nav-item">
                                <button
                                    className="header__nav-link"
                                    onClick={() => scrollToSection('waitlist')}
                                    type="button">
                                    Waitlist
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <button
                        className="btn btn--primary btn--small"
                        onClick={() => scrollToSection('waitlist')}
                        type="button">
                        Join the Waitlist
                    </button>

                    <button
                        className="header__menu-toggle"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        type="button"
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMenuOpen}>
                        <span className="header__menu-icon"></span>
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Header
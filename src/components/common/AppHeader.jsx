// src/components/common/AppHeader.jsx
// Public-facing header for app.locappoint.com.
// Beta tag flips to live by changing one class.

import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import '../../styles/app/header.css'


const AppHeader = () => {
    const { t } = useTranslation()
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [open, setOpen] = useState(false)

    const closeMenu = () => setOpen(false)

    const handleGetStarted = () => {
        closeMenu()
        if (user && userProfile) {
            const path = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(path)
        } else {
            navigate('/auth', { state: { tab: 'signup', from: location.pathname } })
        }
    }

    const handleSignIn = () => {
        closeMenu()
        navigate('/auth', { state: { tab: 'signin', from: location.pathname } })
    }

    const handleDashboard = () => {
        closeMenu()
        if (userProfile) {
            const path = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(path)
        }
    }

    return (
        <header className="loca-app-header" role="banner">
            <div className="container">
                <div className="loca-app-header__inner">

                    <Link to="/" className="loca-app-header__brand" onClick={closeMenu} aria-label="Locappoint home">
                        <svg className="loca-app-header__mark" viewBox="0 0 100 100" aria-hidden="true">
                            <path d="M 42 6 C 22 6, 6 22, 6 42 C 6 53, 10 62, 16 70 L 42 100 L 68 70 C 74 62, 78 53, 78 42 C 78 22, 62 6, 42 6 Z" fill="var(--azure)" transform="translate(14.3 4.9) scale(0.85)" />
                            <rect x="16" y="22" width="52" height="36" rx="4" fill="var(--ink)" transform="translate(14.3 4.9) scale(0.85)" />
                            <rect x="22" y="30" width="22" height="4" rx="1" fill="var(--azure-soft)" transform="translate(14.3 4.9) scale(0.85)" />
                            <rect x="22" y="40" width="32" height="4" rx="1" fill="var(--azure-soft)" opacity="0.32" transform="translate(14.3 4.9) scale(0.85)" />
                            <rect x="22" y="50" width="18" height="3" rx="1" fill="var(--azure-soft)" opacity="0.2" transform="translate(14.3 4.9) scale(0.85)" />
                            <circle cx="62" cy="29" r="3.5" fill="var(--signal)" transform="translate(14.3 4.9) scale(0.85)" />
                        </svg>
                        <span className="loca-app-header__wm">
                            <span className="loca-app-header__wm-loc">Loc</span>
                            <span className="loca-app-header__wm-app">Appoint</span>
                        </span>
                        <span className="loca-app-header__beta" aria-label="Beta">Beta</span>
                    </Link>

                    <nav className={`loca-app-header__nav ${open ? 'is-open' : ''}`} aria-label="Primary">
                        <Link to="/businesses" className="loca-app-header__navlink" onClick={closeMenu}>
                            {t('nav.browse', 'Browse')}
                        </Link>
                        <Link to="/about" className="loca-app-header__navlink" onClick={closeMenu}>
                            {t('nav.about', 'About')}
                        </Link>
                        <Link to="/contact" className="loca-app-header__navlink" onClick={closeMenu}>
                            {t('nav.contact', 'Contact')}
                        </Link>
                        <Link to="/partnership" className="loca-app-header__navlink" onClick={closeMenu}>
                            {t('nav.partner', 'Partner')}
                        </Link>
                    </nav>

                    <div className="loca-app-header__actions">
                        <LanguageSwitcher />

                        {user ? (
                            <button onClick={handleDashboard} className="loca-app-header__btn loca-app-header__btn--primary">
                                {t('nav.dashboard', 'Dashboard')}
                            </button>
                        ) : (
                            <>
                                <button onClick={handleSignIn} className="loca-app-header__btn loca-app-header__btn--ghost">
                                    {t('nav.signIn', 'Sign in')}
                                </button>
                                <button onClick={handleGetStarted} className="loca-app-header__btn loca-app-header__btn--primary">
                                    {t('nav.signUp', 'Get started')}
                                </button>
                            </>
                        )}

                        <button
                            className="loca-app-header__menu-btn"
                            onClick={() => setOpen((o) => !o)}
                            aria-expanded={open}
                            aria-label={open ? 'Close menu' : 'Open menu'}
                        >
                            {open ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
                        </button>
                    </div>

                </div>
            </div>
        </header>
    )
}

export default AppHeader

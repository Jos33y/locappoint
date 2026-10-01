import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import PinMark from './PinMark'
import '../../styles/app/header.css'


// Dev preserves app mode through wordmark clicks. Prod relies on hostname.
const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'


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
            navigate('/me')
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
        if (userProfile) navigate('/me')
    }

    return (
        <header className="loca-app-header" role="banner">
            <div className="container">
                <div className="loca-app-header__inner">

                    <Link to={HOME_PATH} className="loca-app-header__brand" onClick={closeMenu} aria-label="Locappoint home">
                        <PinMark className="loca-app-header__mark" />
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

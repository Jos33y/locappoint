import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import CitySwitcher from './CitySwitcher'
import PinMark from './PinMark'
import '../../styles/app/header.css'


// Dev preserves app mode through wordmark clicks. Prod relies on hostname.
const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'
// Pricing is the receipt on the home page; AppHome scrolls to it from any page.
const PRICING_PATH = `${HOME_PATH}#pricing`


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
        <header className={`loca-app-header${user ? ' is-signed-in' : ''}`} role="banner">
            <div className="container">
                <div className="loca-app-header__inner">

                    <Link to={HOME_PATH} className="loca-app-header__brand" onClick={closeMenu}>
                        <PinMark className="loca-app-header__mark" />
                        <span className="loca-app-header__wm">
                            <span className="loca-app-header__wm-loc">Loc</span>
                            <span className="loca-app-header__wm-app">Appoint</span>
                        </span>
                        <span className="loca-app-header__beta" aria-label="Beta">Beta</span>
                    </Link>

                    {/* Wide screens: the nav sits in the bar. Under 900px it is the menu, with sign-in and
                        language at the bottom, so the bar keeps only the mark, the city and one button. */}
                    <div className={`loca-app-header__drawer ${open ? 'is-open' : ''}`}>
                        <nav className="loca-app-header__nav" aria-label="Primary">
                            <Link to="/businesses" className="loca-app-header__navlink" onClick={closeMenu}>
                                {t('nav.browse', 'Browse')}
                            </Link>
                            <Link to={PRICING_PATH} className="loca-app-header__navlink" onClick={closeMenu}>
                                {t('nav.pricing', 'Pricing')}
                            </Link>
                            <Link to="/app" className="loca-app-header__navlink" onClick={closeMenu}>
                                {t('nav.app', 'Get the app')}
                            </Link>
                        </nav>
                        <div className="loca-app-header__menu-extra">
                            <LanguageSwitcher />
                            {!user && (
                                <div className="loca-app-header__menu-actions">
                                    <button onClick={handleSignIn} className="loca-app-header__btn loca-app-header__btn--ghost">
                                        {t('nav.signIn', 'Sign in')}
                                    </button>
                                    <button onClick={handleGetStarted} className="loca-app-header__btn loca-app-header__btn--primary">
                                        {t('nav.signUp', 'Get started')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="loca-app-header__actions">
                        <CitySwitcher className="loca-app-header__city" />
                        <div className="loca-app-header__bar-only">
                            <LanguageSwitcher />
                        </div>

                        {user ? (
                            <button onClick={handleDashboard} className="loca-app-header__btn loca-app-header__btn--primary loca-app-header__dash">
                                {t('nav.dashboard', 'Dashboard')}
                            </button>
                        ) : (
                            <div className="loca-app-header__bar-only">
                                <button onClick={handleSignIn} className="loca-app-header__btn loca-app-header__btn--ghost">
                                    {t('nav.signIn', 'Sign in')}
                                </button>
                                <button onClick={handleGetStarted} className="loca-app-header__btn loca-app-header__btn--primary">
                                    {t('nav.signUp', 'Get started')}
                                </button>
                            </div>
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

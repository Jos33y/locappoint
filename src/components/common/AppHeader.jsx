import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import '../../styles/app/header.css'

const AppHeader = () => {
    const { t } = useTranslation()
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleGetStarted = () => {
        if (user && userProfile) {
            const dashboardPath = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(dashboardPath)
        } else {
            navigate('/app/auth', { state: { tab: 'signup', from: location.pathname } })
        }
    }

    const handleSignIn = () => {
        navigate('/app/auth', { state: { tab: 'signin', from: location.pathname } })
    }

    const handleDashboard = () => {
        if (userProfile) {
            const dashboardPath = userProfile.user_type === 'business' ? '/portal' : '/client'
            navigate(dashboardPath)
        }
    }
 
    return (
        <header className="app-header-public">
            <div className="container">
                <div className="header-content">
                    <Link to="/app" className="header-logo">
                        LocAppoint
                    </Link>

                    <nav className="header-nav">
                        <Link to="/app/businesses" className="nav-link">
                            {t('nav.browse')}
                        </Link>
                        <Link to="/app/about" className="nav-link">
                            {t('nav.about')}
                        </Link>
                        <Link to="/app/contact" className="nav-link">
                            {t('nav.contact')}
                        </Link>
                        <Link to="/app/partnership" className="nav-link">
                            {t('nav.partner')}
                        </Link>
                    </nav>

                    <div className="header-actions">
                        <LanguageSwitcher />

                        {user ? (
                            <button onClick={handleDashboard} className="btn btn--primary">
                                {t('nav.dashboard')}
                            </button>
                        ) : (
                            <>
                                <button onClick={handleSignIn} className="btn btn--outline">
                                    {t('nav.signIn')}
                                </button>
                                <button onClick={handleGetStarted} className="btn btn--primary">
                                    {t('nav.signUp')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

export default AppHeader
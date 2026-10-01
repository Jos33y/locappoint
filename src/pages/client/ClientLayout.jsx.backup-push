import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CalendarDays, Home, LogOut, Search, Store, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Mark, Wordmark, initials } from '../../components/business/Brand'
import AccountMenu from '../../components/business/AccountMenu'
import { NextBooking } from '../../components/client/NextBooking'
import { Sheet } from '../../components/ui'
import { InboxProvider } from '../../components/inbox/InboxContext'
import { InboxBell } from '../../components/inbox/InboxBell'
import { loadNextBooking } from '../../services/booking'
import '../../styles/business/shell.css'
import '../../styles/client/client-shell.css'

const NAV = [
    { to: '/client', label: 'Home', icon: Home, end: true },
    { to: '/client/appointments', label: 'Bookings', icon: CalendarDays },
    { to: '/client/search', label: 'Find a place', icon: Search },
]

const TABS = [...NAV, { to: '/client/profile', label: 'Profile', icon: UserRound }]

const TITLES = { '/client': 'Home', '/client/appointments': 'Bookings', '/client/search': 'Find a place', '/client/profile': 'Profile', '/client/notifications': 'Notifications' }

const ClientLayout = () => {
    const { user, userProfile, signOut, setMode, hasBusiness } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [next, setNext] = useState({ status: 'loading', booking: null })
    const [accountOpen, setAccountOpen] = useState(false)
    const email = userProfile?.email || user?.email || ''
    const name = userProfile?.full_name || ''

    useEffect(() => { setMode('client') }, [setMode])
    useEffect(() => { setAccountOpen(false) }, [location.pathname])

    useEffect(() => {
        if (!email) return undefined
        let cancelled = false
        loadNextBooking(email)
            .then((booking) => { if (!cancelled) setNext({ status: 'ready', booking }) })
            .catch((err) => {
                console.error('Next booking failed:', err)
                if (!cancelled) setNext({ status: 'ready', booking: null })
            })
        return () => { cancelled = true }
    }, [email, location.pathname])

    const leave = async () => {
        await signOut()
        navigate('/auth', { state: { tab: 'signin' } })
    }

    const accountItems = [
        { to: '/client/profile', icon: UserRound, label: 'Profile' },
        hasBusiness
            ? { to: '/portal', icon: ArrowLeftRight, label: 'Switch to my business' }
            : { to: '/portal', icon: Store, label: 'Start a business' },
    ]

    const title = TITLES[location.pathname] || 'Home'

    return (
        <InboxProvider audience="client">
            <div className="biz-shell lc-cl-shell">
                <aside className="biz-sidebar" aria-label="Booking navigation">
                    <div className="biz-brand">
                        <Mark size={28} />
                        <Wordmark />
                    </div>

                    <NextBooking state={next} />

                    <nav className="biz-sidebar__nav" aria-label="Main">
                        <div className="biz-navgroup">
                            {NAV.map(({ to, label, icon: Icon, end }) => (
                                <NavLink key={to} to={to} end={end} className="biz-navlink">
                                    <Icon size={18} aria-hidden="true" />
                                    <span className="biz-navlink__label">{label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </nav>

                    <div className="biz-sidebar__foot">
                        <AccountMenu name={name} email={email} onSignOut={leave} links={accountItems} ownPages={['/client/profile']} />
                    </div>
                </aside>

                <div className="biz-main">
                    <header className="biz-topbar">
                        <span className="biz-topbar__brand">
                            <Mark size={26} />
                            <span className="biz-topbar__name">{title}</span>
                        </span>
                        <span className="biz-topbar__title">{title}</span>
                        {location.pathname !== '/client/search' && (
                            <Link to="/client/search" className="biz-search lc-cl-search">
                                <Search size={16} aria-hidden="true" />
                                <span>Find a barber, salon or clinic</span>
                            </Link>
                        )}
                        <div className="biz-topbar__actions lc-cl-topacts">
                            <InboxBell to="/client/notifications" />
                            <button type="button" className="biz-iconbtn lc-cl-me" aria-label="Account" onClick={() => setAccountOpen(true)}>
                                <span className="biz-avatar">{initials(name || email)}</span>
                            </button>
                        </div>
                    </header>

                    <main className="biz-content">
                        <div className="lc-cl-frame">
                            <Outlet />
                        </div>
                    </main>
                </div>

                <nav className="biz-tabbar lc-cl-tabbar" aria-label="Booking">
                    {TABS.map(({ to, label, icon: Icon, end }) => (
                        <NavLink key={to} to={to} end={end} className="biz-tab">
                            <Icon size={22} aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Account">
                    <div className="biz-more">
                        <div className="lc-cl-who">
                            <span className="biz-avatar">{initials(name || email)}</span>
                            <span>
                                <strong>{name || email}</strong>
                                {name && <small>{email}</small>}
                            </span>
                        </div>
                        <NextBooking state={next} />
                        <div className="biz-navgroup">
                            {accountItems.map(({ to, icon: Icon, label }) => (
                                <Link key={label} to={to} className="biz-navlink">
                                    <Icon size={20} aria-hidden="true" />
                                    <span className="biz-navlink__label">{label}</span>
                                </Link>
                            ))}
                            <button type="button" className="biz-navlink" onClick={leave}>
                                <LogOut size={20} aria-hidden="true" />
                                <span className="biz-navlink__label">Sign out</span>
                            </button>
                        </div>
                    </div>
                </Sheet>
            </div>
        </InboxProvider>
    )
}

export default ClientLayout

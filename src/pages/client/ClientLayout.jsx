import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
    Home,
    Search,
    Calendar,
    User,
    LogOut,
    Menu
} from 'lucide-react'
import '../../styles/client/client.css'

const ClientLayout = () => {
    const { user, userProfile, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleSignOut = () => {
        signOut()
        navigate('/app/auth', { state: { tab: 'signin' } })
    }

    const isActive = (path) => {
        if (path === '/client') {
            return location.pathname === '/client'
        }
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    const navLinks = [
        { path: '/client', label: 'Home', icon: Home },
        { path: '/client/search', label: 'Find Businesses', icon: Search },
        { path: '/client/appointments', label: 'My Appointments', icon: Calendar },
        { path: '/client/profile', label: 'Profile', icon: User },
    ]

    return (
        <div className="client-layout">
            {/* Sidebar */}
            <aside className="client-sidebar">
                <div className="client-sidebar-header">
                    <h2 className="client-logo">LocAppoint</h2>
                    <p className="client-subtitle">Client Dashboard</p>
                </div>

                <nav className="client-nav">
                    {navLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`client-nav-link ${isActive(link.path) ? 'active' : ''}`}
                            >
                                <Icon size={20} className="nav-icon" />
                                <span className="nav-label">{link.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="client-sidebar-footer">
                    <div className="client-user-info">
                        <div className="user-avatar">
                            {userProfile?.full_name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="user-details">
                            <p className="user-name">{userProfile?.full_name || 'Client'}</p>
                            <p className="user-email">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="btn-signout">
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="client-main">
                <div className="client-header">
                    <button className="mobile-menu-toggle">
                        <Menu size={24} />
                    </button>
                    <div className="client-breadcrumb">
                        <Link to="/app">Home</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span>Dashboard</span>
                    </div>
                </div>

                <div className="client-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default ClientLayout
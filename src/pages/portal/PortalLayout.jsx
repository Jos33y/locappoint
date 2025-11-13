import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Calendar,
    Clock,
    Briefcase,
    Building2,
    Settings,
    LogOut,
    Menu
} from 'lucide-react'
import '../../styles/portal/portal.css'

const PortalLayout = () => {
    const { user, userProfile, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleSignOut = () => {
        signOut()
        navigate('/app/auth', { state: { tab: 'signin' } }) 
    }

    const isActive = (path) => {
        if (path === '/portal') {
            return location.pathname === '/portal'
        }
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    const navLinks = [
        { path: '/portal', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/portal/appointments', label: 'Appointments', icon: Calendar },
        { path: '/portal/availability', label: 'Availability', icon: Clock },
        { path: '/portal/services', label: 'Services', icon: Briefcase },
        { path: '/portal/profile', label: 'Profile', icon: Building2 },
        { path: '/portal/settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="portal-layout">
            {/* Sidebar */}
            <aside className="portal-sidebar">
                <div className="portal-sidebar-header">
                    <h2 className="portal-logo">LocAppoint</h2>
                    <p className="portal-subtitle">Business Portal</p>
                </div>

                <nav className="portal-nav">
                    {navLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`portal-nav-link ${isActive(link.path) ? 'active' : ''}`}
                            >
                                <Icon size={20} className="nav-icon" />
                                <span className="nav-label">{link.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="portal-sidebar-footer">
                    <div className="portal-user-info">
                        <div className="user-avatar">
                            {userProfile?.full_name?.charAt(0).toUpperCase() || 'B'}
                        </div>
                        <div className="user-details">
                            <p className="user-name">{userProfile?.full_name || 'Business User'}</p>
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
            <main className="portal-main">
                <div className="portal-header">
                    <button className="mobile-menu-toggle">
                        <Menu size={24} />
                    </button>
                    <div className="portal-breadcrumb">
                        <Link to="/app">Home</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span>Portal</span>
                    </div>
                </div>

                <div className="portal-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default PortalLayout
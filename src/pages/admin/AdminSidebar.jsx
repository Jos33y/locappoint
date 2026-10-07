// AdminSidebar - Section nav with counts, reserved items, back/logout footer. Mobile drawer.

import {
    X,
    BarChart3,
    Users,
    Handshake,
    UserCog,
    ShoppingBag,
    Building2,
    Settings,
    Bug,
    Gauge,
    ArrowLeft,
    LogOut,
    LifeBuoy,
    Ban,
    ShieldCheck,
    BadgeCheck
} from 'lucide-react'
import LogoIcon from '../../components/LogoIcon'

const AdminSidebar = ({ activeSection, setActiveSection, counts, onClose, onLogout }) => {
    const goTo = (section) => {
        setActiveSection(section)
        if (onClose) onClose()
    }

    return (
        <aside className="admin-sidebar" aria-label="Admin navigation">
            <div className="admin-sidebar__head">
                <a href="/" className="admin-sidebar__logo">
                    <span className="admin-sidebar__logo-icon">
                        <LogoIcon />
                    </span>
                    <span className="admin-sidebar__logo-text">LocAppoint</span>
                </a>
                <span className="admin-sidebar__tag">Admin</span>
                <button
                    type="button"
                    className="admin-sidebar__close"
                    onClick={onClose}
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="admin-sidebar__body">
                <div>
                    <span className="admin-sidebar__group-label">Main</span>
                    <nav className="admin-sidebar__nav">
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'overview' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('overview')}
                        >
                            <Gauge size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Overview</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'analytics' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('analytics')}
                        >
                            <BarChart3 size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Analytics</span>
                            <span className="admin-sidebar__item-count">{counts.analytics}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'waitlist' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('waitlist')}
                        >
                            <Users size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Waitlist</span>
                            <span className="admin-sidebar__item-count">{counts.waitlist}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'partnership' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('partnership')}
                        >
                            <Handshake size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Partnerships</span>
                            <span className="admin-sidebar__item-count">{counts.partnership}</span>
                        </button>
                    </nav>
                </div>

                <div>
                    <span className="admin-sidebar__group-label">Operations</span>
                    <nav className="admin-sidebar__nav">
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'support' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('support')}
                        >
                            <LifeBuoy size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Support</span>
                            {counts.support > 0 && <span className="admin-sidebar__item-count">{counts.support}</span>}
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'blocks' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('blocks')}
                        >
                            <Ban size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Blocks</span>
                            {counts.blocks > 0 && <span className="admin-sidebar__item-count">{counts.blocks}</span>}
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'reliability' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('reliability')}
                        >
                            <ShieldCheck size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Reliability</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'verification' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('verification')}
                        >
                            <BadgeCheck size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Verification</span>
                            {counts.verification > 0 && <span className="admin-sidebar__item-count">{counts.verification}</span>}
                        </button>
                        {[['businesses', Building2, 'Businesses'], ['bookings', ShoppingBag, 'Bookings'], ['people', UserCog, 'People']].map(([key, Icon, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={`admin-sidebar__item ${activeSection === key ? 'admin-sidebar__item--active' : ''}`}
                                onClick={() => goTo(key)}
                            >
                                <Icon size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                                <span className="admin-sidebar__item-label">{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div>
                    <span className="admin-sidebar__group-label">System</span>
                    <nav className="admin-sidebar__nav">
                        <button
                            type="button"
                            className={`admin-sidebar__item ${activeSection === 'errors' ? 'admin-sidebar__item--active' : ''}`}
                            onClick={() => goTo('errors')}
                        >
                            <Bug size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">App errors</span>
                        </button>
                        <button type="button" className="admin-sidebar__item" disabled>
                            <Settings size={16} className="admin-sidebar__item-icon" aria-hidden="true" />
                            <span className="admin-sidebar__item-label">Settings</span>
                            <span className="admin-sidebar__item-soon">Soon</span>
                        </button>
                    </nav>
                </div>
            </div>

            <div className="admin-sidebar__foot">
                <a href="/" className="admin-sidebar__back">
                    <ArrowLeft size={12} aria-hidden="true" />
                    <span>Back to Website</span>
                </a>
                <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
                    <LogOut size={15} aria-hidden="true" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    )
}

export default AdminSidebar

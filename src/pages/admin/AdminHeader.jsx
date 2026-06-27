// AdminHeader - Fixed top. Logo, admin badge, ghost logout button.

import { LogOut, LayoutDashboard } from 'lucide-react'
import LogoIcon from '../../components/LogoIcon'

const AdminHeader = ({ onLogout }) => {
    return (
        <header className="admin-header">
            <div className="admin-header__container">
                <a href="/" className="admin-header__logo">
                    <span className="admin-header__logo-icon">
                        <LogoIcon />
                    </span>
                    <span className="admin-header__logo-text">LocAppoint</span>
                </a>

                <div className="admin-header__badge">
                    <LayoutDashboard size={12} aria-hidden="true" />
                    <span>Admin</span>
                </div>

                <button type="button" onClick={onLogout} className="admin-header__logout">
                    <LogOut size={15} aria-hidden="true" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    )
}

export default AdminHeader

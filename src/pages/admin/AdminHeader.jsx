// AdminHeader.jsx - Admin header with logout
// Location: src/pages/admin/AdminHeader.jsx

import { LogOut, LayoutDashboard } from 'lucide-react'
import LogoIcon from '../../components/LogoIcon'

const AdminHeader = ({ onLogout }) => {
    return (
        <header className="admin-header">
            <div className="admin-header__container">
                {/* Logo */}
                <a href="/" className="admin-header__logo">
                    <div className="admin-header__logo-icon">
                        <LogoIcon />
                    </div>
                    <span className="admin-header__logo-text">LocAppoint</span>
                </a>

                {/* Center - Admin Badge */}
                <div className="admin-header__badge">
                    <LayoutDashboard size={16} />
                    <span>Admin Dashboard</span>
                </div>

                {/* Right - Logout */}
                <button onClick={onLogout} className="admin-header__logout">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    )
}

export default AdminHeader
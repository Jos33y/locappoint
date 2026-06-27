// AdminTopbar - Hamburger (mobile), section breadcrumb, refresh action.

import { Menu, RefreshCw } from 'lucide-react'

const AdminTopbar = ({ sectionLabel, onMenuToggle, onRefresh, refreshing }) => {
    return (
        <header className="admin-topbar">
            <button
                type="button"
                className="admin-topbar__menu"
                onClick={onMenuToggle}
                aria-label="Open menu"
            >
                <Menu size={18} />
            </button>

            <div className="admin-topbar__crumbs">
                <span className="admin-topbar__crumb">Admin</span>
                <span className="admin-topbar__crumb-sep" aria-hidden="true">/</span>
                <span className="admin-topbar__title">{sectionLabel}</span>
            </div>

            <div className="admin-topbar__actions">
                <button
                    type="button"
                    className="admin-topbar__refresh"
                    onClick={onRefresh}
                    disabled={refreshing}
                    aria-label="Refresh data"
                >
                    <RefreshCw size={14} className={refreshing ? 'loading-spinner' : ''} aria-hidden="true" />
                    <span>Refresh</span>
                </button>
            </div>
        </header>
    )
}

export default AdminTopbar

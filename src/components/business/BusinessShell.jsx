import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeftRight, Bell, ChevronRight, LogOut, Menu, Plus, Search, Settings, Share2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { loadWorkspace, pageStrength } from '../../services/business'
import { WorkspaceContext } from './WorkspaceContext'
import { NAV_GROUPS, NAV_ITEMS, titleFor } from './nav'
import { BrandLoader, Mark, Ring, Wordmark, initials } from './Brand'
import Sheet from './Sheet'
import NewBookingSheet from './NewBookingSheet'
import BookingDetailSheet from './BookingDetailSheet'
import ShareLink from './ShareLink'
import '../../styles/business/shell.css'

const NavItem = ({ item, onClick, compact = false }) => {
    const Icon = item.icon
    return (
        <NavLink to={item.to} end={item.end} className="biz-navlink" onClick={onClick}>
            <Icon size={compact ? 20 : 18} aria-hidden="true" />
            <span className="biz-navlink__label">{item.label}</span>
            {item.planned && <span className="biz-soon">Soon</span>}
        </NavLink>
    )
}

const ShellSkeleton = () => (
    <div className="biz-page" aria-hidden="true">
        <span className="lc-skel" style={{ width: 120, height: 16 }} />
        <span className="lc-skel" style={{ width: '55%', height: 40 }} />
        <span className="lc-skel" style={{ width: '100%', height: 72 }} />
        {[0, 1, 2].map((i) => <span key={i} className="lc-skel" style={{ width: '100%', height: 84 }} />)}
    </div>
)

const BusinessShell = () => {
    const { user, userProfile, business: ownedBusiness, signOut, setMode } = useAuth()
    const location = useLocation()
    const [workspace, setWorkspace] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [bookingsVersion, setBookingsVersion] = useState(0)
    const [newBooking, setNewBooking] = useState(null)
    const [openBookingRow, setOpenBookingRow] = useState(null)
    const [moreOpen, setMoreOpen] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const [toast, setToast] = useState(null)
    const toastTimer = useRef(null)

    useEffect(() => { setMode('business') }, [setMode])

    const reloadWorkspace = useCallback(async () => {
        if (!ownedBusiness?.id) return
        try {
            setLoadError('')
            setWorkspace(await loadWorkspace(ownedBusiness.id))
        } catch (err) {
            console.error('Workspace load failed:', err)
            setLoadError('We could not load your business. Check your connection, then reload the page.')
        }
    }, [ownedBusiness?.id])

    useEffect(() => { reloadWorkspace() }, [reloadWorkspace])
    useEffect(() => () => clearTimeout(toastTimer.current), [])

    const notify = useCallback((message) => {
        clearTimeout(toastTimer.current)
        setToast({ message, key: Date.now() })
        toastTimer.current = setTimeout(() => setToast(null), 3200)
    }, [])

    const refreshBookings = useCallback(() => setBookingsVersion((v) => v + 1), [])
    const openNewBooking = useCallback((prefill = {}) => setNewBooking(prefill), [])
    const closeNewBooking = useCallback(() => setNewBooking(null), [])
    const openBooking = useCallback((booking) => setOpenBookingRow(booking), [])
    const closeBooking = useCallback(() => setOpenBookingRow(null), [])

    const value = useMemo(() => {
        if (!workspace) return null
        const me = workspace.members.find((m) => m.user_id === user?.id) || null
        return {
            ...workspace,
            me,
            isOwner: me?.role === 'owner',
            bookableMembers: workspace.members.filter((m) => m.is_bookable),
            activeServices: workspace.services.filter((s) => s.is_active),
            strength: pageStrength(workspace),
            reloadWorkspace,
            bookingsVersion,
            refreshBookings,
            openNewBooking,
            openBooking,
            notify,
        }
    }, [workspace, user?.id, reloadWorkspace, bookingsVersion, refreshBookings, openNewBooking, openBooking, notify])

    if (!ownedBusiness) {
        if (location.pathname !== '/portal/page') return <Navigate to="/portal/page" replace />
        return (
            <div className="biz-bare">
                <header className="biz-topbar">
                    <span className="biz-topbar__brand"><Mark size={26} /><Wordmark /></span>
                    <Link to="/client" className="biz-textbtn">Back to Booking</Link>
                </header>
                <main className="biz-content"><Outlet /></main>
            </div>
        )
    }

    const business = value?.business || ownedBusiness
    const title = titleFor(location.pathname)
    const tabs = NAV_ITEMS.filter((item) => item.tab)
    const moreActive = !tabs.some((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
    const strength = value?.strength
    const name = userProfile?.full_name || user?.email || ''

    return (
        <div className="biz-shell">
            <aside className="biz-sidebar" aria-label="Business navigation">
                <div className="biz-brand">
                    <Mark size={28} />
                    <Wordmark />
                </div>

                <Link to="/portal/page" className="biz-bizcard">
                    <span className="biz-avatar biz-avatar--business">{initials(business.business_name)}</span>
                    <span className="biz-bizcard__text">
                        <strong>{business.business_name}</strong>
                        <small className={business.is_active === false ? 'is-paused' : ''}>
                            {business.is_active === false ? 'Bookings paused' : 'Taking bookings'}
                        </small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="biz-bizcard__chevron" />
                </Link>

                <nav className="biz-sidebar__nav">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className="biz-navgroup">
                            <p className="biz-navgroup__label">{group.label}</p>
                            {group.items.map((item) => <NavItem key={item.to} item={item} />)}
                        </div>
                    ))}
                </nav>

                <div className="biz-sidebar__foot">
                    {strength && strength.percent < 100 && (
                        <Link to={strength.next?.to || '/portal/page'} className="biz-strength">
                            <Ring value={strength.value} size={34} stroke={3.5} label={`Page strength ${strength.percent}%`} />
                            <span className="biz-strength__text">
                                <strong>Page strength <span className="biz-num">{strength.percent}%</span></strong>
                                <small>{strength.next?.label}</small>
                            </span>
                        </Link>
                    )}
                    <Link to="/client" className="biz-navlink">
                        <ArrowLeftRight size={18} aria-hidden="true" />
                        <span className="biz-navlink__label">Switch to Booking</span>
                    </Link>
                    <div className="biz-account">
                        <span className="biz-avatar">{initials(name)}</span>
                        <span className="biz-account__text">
                            <strong>{userProfile?.full_name}</strong>
                            <small>{user?.email}</small>
                        </span>
                        <NavLink to="/portal/settings" className="biz-iconbtn biz-iconbtn--quiet" aria-label="Settings">
                            <Settings size={16} aria-hidden="true" />
                        </NavLink>
                        <button type="button" className="biz-iconbtn biz-iconbtn--quiet" onClick={signOut} aria-label="Sign out">
                            <LogOut size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="biz-main">
                <header className="biz-topbar">
                    <span className="biz-topbar__brand">
                        <Mark size={26} />
                        <span className="biz-topbar__name">{business.business_name}</span>
                    </span>
                    <span className="biz-topbar__title">{title}</span>
                    <button type="button" className="biz-search" onClick={() => notify('Search arrives with Clients')}>
                        <Search size={16} aria-hidden="true" />
                        <span>Search clients and bookings</span>
                        <kbd>Ctrl K</kbd>
                    </button>
                    <div className="biz-topbar__actions">
                        <NavLink to="/portal/notifications" className="biz-iconbtn" aria-label="Notifications">
                            <Bell size={18} aria-hidden="true" />
                        </NavLink>
                        <button type="button" className="biz-iconbtn biz-topbar__share" onClick={() => setShareOpen(true)} aria-label="Share your booking link">
                            <Share2 size={18} aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn--primary biz-topbar__new" onClick={() => openNewBooking()} disabled={!value}>
                            <Plus size={18} aria-hidden="true" /> New booking
                        </button>
                    </div>
                </header>

                <main className="biz-content">
                    {loadError ? (
                        <div className="biz-state" role="alert">
                            <BrandLoader label="Could not load" />
                            <p>{loadError}</p>
                            <button type="button" className="btn btn--secondary" onClick={reloadWorkspace}>Try again</button>
                        </div>
                    ) : value ? (
                        <WorkspaceContext.Provider value={value}>
                            <Outlet />
                        </WorkspaceContext.Provider>
                    ) : (
                        <ShellSkeleton />
                    )}
                </main>
            </div>

            <nav className="biz-tabbar" aria-label="Business">
                {tabs.map((item) => {
                    const Icon = item.icon
                    return (
                        <NavLink key={item.to} to={item.to} end={item.end} className="biz-tab">
                            <Icon size={22} aria-hidden="true" />
                            <span>{item.label}</span>
                        </NavLink>
                    )
                })}
                <button type="button" className={`biz-tab${moreActive ? ' active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
                    <Menu size={22} aria-hidden="true" />
                    <span>More</span>
                </button>
            </nav>

            {value && (
                <button type="button" className="biz-fab" onClick={() => openNewBooking()} aria-label="New booking">
                    <Plus size={26} aria-hidden="true" />
                </button>
            )}

            <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
                <div className="biz-more">
                    {strength && strength.percent < 100 && (
                        <Link to={strength.next?.to || '/portal/page'} className="biz-strength" onClick={() => setMoreOpen(false)}>
                            <Ring value={strength.value} size={40} stroke={4} label={`Page strength ${strength.percent}%`} />
                            <span className="biz-strength__text">
                                <strong>Page strength <span className="biz-num">{strength.percent}%</span></strong>
                                <small>{strength.next?.label}</small>
                            </span>
                        </Link>
                    )}
                    {NAV_GROUPS.map((group) => {
                        const items = group.items.filter((item) => !item.tab)
                        if (!items.length) return null
                        return (
                            <div key={group.label} className="biz-navgroup">
                                <p className="biz-navgroup__label">{group.label}</p>
                                {items.map((item) => <NavItem key={item.to} item={item} compact onClick={() => setMoreOpen(false)} />)}
                            </div>
                        )
                    })}
                    <div className="biz-navgroup">
                        <p className="biz-navgroup__label">Account</p>
                        <NavLink to="/portal/settings" className="biz-navlink" onClick={() => setMoreOpen(false)}>
                            <Settings size={20} aria-hidden="true" />
                            <span className="biz-navlink__label">Settings</span>
                        </NavLink>
                        <Link to="/client" className="biz-navlink" onClick={() => setMoreOpen(false)}>
                            <ArrowLeftRight size={20} aria-hidden="true" />
                            <span className="biz-navlink__label">Switch to Booking</span>
                        </Link>
                        <button type="button" className="biz-navlink" onClick={signOut}>
                            <LogOut size={20} aria-hidden="true" />
                            <span className="biz-navlink__label">Sign out</span>
                        </button>
                    </div>
                </div>
            </Sheet>

            {value && (
                <WorkspaceContext.Provider value={value}>
                    <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Your booking link">
                        <ShareLink business={value.business} />
                    </Sheet>
                    <NewBookingSheet open={Boolean(newBooking)} prefill={newBooking} onClose={closeNewBooking} />
                    <BookingDetailSheet booking={openBookingRow} onClose={closeBooking} />
                </WorkspaceContext.Provider>
            )}

            <div className="biz-toast" role="status" aria-live="polite">
                {toast && <span key={toast.key} className="biz-toast__msg">{toast.message}</span>}
            </div>
        </div>
    )
}

export default BusinessShell

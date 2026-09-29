import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, ChevronRight, CirclePlay, Clock, LogOut, Menu, Plus, Search, Settings, Share2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { loadBooking, loadWorkspace, pageStrength } from '../../services/business'
import { describeItem } from '../../services/inbox'
import { InboxProvider } from '../inbox/InboxContext'
import { InboxBell } from '../inbox/InboxBell'
import { WorkspaceContext } from './WorkspaceContext'
import { HUBS, NAV_FOOT, NAV_ITEMS, hubFor } from './nav'
import { BrandLoader, Mark, Ring, Wordmark, initials } from './Brand'
import { Sheet } from '../ui'
import NewBookingSheet from './NewBookingSheet'
import BookingDetailSheet from './BookingDetailSheet'
import ShareLink from './ShareLink'
import Tour from './Tour'
import CommandPalette from './CommandPalette'
import HubNav from './HubNav'
import AccountMenu from './AccountMenu'
import '../../styles/business/shell.css'

const NavItem = ({ item, onClick, compact = false }) => {
    const Icon = item.icon
    return (
        <NavLink to={item.to} end={item.end} className="biz-navlink" onClick={onClick} data-tour={item.tour}>
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

const TOUR_KEY = 'locappoint_tour_done'

const tourSeen = () => {
    try { return localStorage.getItem(TOUR_KEY) === '1' } catch { return true }
}

const HubLink = ({ hub, active }) => {
    const Icon = hub.icon
    return (
        <Link
            to={hub.pages[0].to}
            className={`biz-navlink${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            data-tour={hub.tour}
        >
            <Icon size={18} aria-hidden="true" />
            <span className="biz-navlink__label">{hub.label}</span>
        </Link>
    )
}

const StartRow = ({ strength }) => (
    <NavLink to="/portal/start" className="biz-navlink biz-startrow" data-tour="start">
        <Ring value={strength.value} size={18} stroke={2.5} label={`Setup ${strength.percent}% done`} />
        <span className="biz-navlink__label">Getting started</span>
        <span className="biz-startrow__pct biz-num">{strength.percent}%</span>
    </NavLink>
)

const StartCard = ({ strength, onClick }) => (
    <Link to="/portal/start" className="biz-strength" onClick={onClick}>
        <Ring value={strength.value} size={34} stroke={3.5} label={`Setup ${strength.percent}% done`} />
        <span className="biz-strength__text">
            <strong>Getting started <span className="biz-num">{strength.percent}%</span></strong>
            <small>{strength.next ? `Next: ${strength.next.label.toLowerCase()}` : 'Finish your page'}</small>
        </span>
    </Link>
)

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

const TopClock = ({ timeZone = 'Europe/Lisbon' }) => {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000)
        return () => clearInterval(timer)
    }, [])
    const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(now)
    const city = timeZone.split('/').pop().replace(/_/g, ' ')
    return (
        <span className="biz-clock">
            <Clock size={15} aria-hidden="true" />
            <span>{day}</span>
            <span className="biz-clock__time biz-num">{time}</span>
            <span className="biz-clock__zone">{city} time</span>
        </span>
    )
}

const ambientTone = (timeZone = 'Europe/Lisbon') => {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
    if (hour >= 5 && hour < 11) return 'morning'
    if (hour >= 11 && hour < 16) return 'day'
    if (hour >= 16 && hour < 21) return 'evening'
    return 'night'
}

const BusinessShell = () => {
    const { user, userProfile, business: ownedBusiness, signOut, setMode } = useAuth()
    const location = useLocation()
    const [params, setParams] = useSearchParams()
    const [workspace, setWorkspace] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [bookingsVersion, setBookingsVersion] = useState(0)
    const [newBooking, setNewBooking] = useState(null)
    const [openBookingRow, setOpenBookingRow] = useState(null)
    const [moreOpen, setMoreOpen] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)
    const [cmdOpen, setCmdOpen] = useState(false)
    const [toast, setToast] = useState(null)
    const toastTimer = useRef(null)

    useEffect(() => { setMode('business') }, [setMode])

    const reloadWorkspace = useCallback(async () => {
        if (!ownedBusiness?.id || !ownedBusiness.launched_at) return
        try {
            setLoadError('')
            setWorkspace(await loadWorkspace(ownedBusiness.id))
        } catch (err) {
            console.error('Workspace load failed:', err)
            setLoadError('We could not load your business. Check your connection, then reload the page.')
        }
    }, [ownedBusiness?.id, ownedBusiness?.launched_at])

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
    const openTour = useCallback(() => {
        setMoreOpen(false)
        setTourOpen(true)
    }, [])
    const closeTour = useCallback(() => {
        setTourOpen(false)
        try { localStorage.setItem(TOUR_KEY, '1') } catch { /* noop */ }
    }, [])

    useEffect(() => {
        if (!workspace || tourSeen()) return undefined
        const timer = setTimeout(() => setTourOpen(true), 900)
        return () => clearTimeout(timer)
    }, [workspace])
    const closeBooking = useCallback(() => setOpenBookingRow(null), [])

    // A new inbox item: the calendar reloads and a toast says what happened.
    const onArrive = useCallback((row) => {
        refreshBookings()
        const d = describeItem(row)
        notify(`${d.label}: ${d.title}, ${d.day} ${d.time}`)
    }, [refreshBookings, notify])

    // Links from emails and notifications carry ?booking=<id>. Open that booking, then drop the parameter.
    const bookingParam = params.get('booking')
    const businessId = workspace?.business?.id
    useEffect(() => {
        if (!bookingParam || !businessId) return undefined
        let cancelled = false
        loadBooking(businessId, bookingParam)
            .then((row) => {
                if (cancelled) return
                if (row) openBooking(row)
                else notify('That booking is no longer in your calendar')
            })
            .catch((err) => console.error('Booking link failed:', err))
            .finally(() => {
                if (!cancelled) setParams((prev) => { const next = new URLSearchParams(prev); next.delete('booking'); return next }, { replace: true })
            })
        return () => { cancelled = true }
    }, [bookingParam, businessId, openBooking, notify, setParams])

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
            openTour,
            notify,
        }
    }, [workspace, user?.id, reloadWorkspace, bookingsVersion, refreshBookings, openNewBooking, openBooking, openTour, notify])

    const paletteActions = useMemo(() => [
        { label: 'New booking', icon: Plus, run: () => openNewBooking(), keywords: ['add', 'book', 'walk-in', 'phone call'] },
        { label: 'Share your booking link', icon: Share2, run: () => setShareOpen(true), keywords: ['link', 'whatsapp', 'copy'] },
        { label: 'Replay the tour', icon: CirclePlay, run: openTour, keywords: ['help', 'guide', 'how'] },
        { label: 'Switch to Booking', icon: ArrowLeftRight, to: '/client', keywords: ['client', 'book as a client'] },
    ], [openNewBooking, openTour])

    useEffect(() => {
        const onKey = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                setCmdOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

    if (!ownedBusiness?.launched_at) {
        if (location.pathname !== '/portal/setup') return <Navigate to="/portal/setup" replace />
        return <Outlet />
    }

    const business = value?.business || ownedBusiness
    const tabs = NAV_ITEMS.filter((item) => item.tab)
    const moreActive = !tabs.some((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
    const strength = value?.strength
    const setupOpen = Boolean(strength && strength.percent < 100)
    const hub = hubFor(location.pathname)

    return (
        <InboxProvider audience="business" onArrive={onArrive}>
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

                    <nav className="biz-sidebar__nav" aria-label="Main">
                        <div className="biz-navgroup">
                            {NAV_ITEMS.map((item) => <NavItem key={item.to} item={item} />)}
                        </div>
                        <div className="biz-navgroup">
                            {HUBS.map((item) => <HubLink key={item.id} hub={item} active={item === hub} />)}
                        </div>
                    </nav>

                    <div className="biz-sidebar__foot">
                        {setupOpen && <StartRow strength={strength} />}
                        <AccountMenu name={userProfile?.full_name || ''} email={user?.email || ''} onTour={openTour} onSignOut={signOut} />
                    </div>
                </aside>

                <div className={`biz-main biz-main--${ambientTone(value?.business?.timezone)}`}>
                    <div className="biz-ambient" aria-hidden="true" />
                    <header className="biz-topbar">
                        <span className="biz-topbar__brand">
                            <Mark size={26} />
                            <span className="biz-topbar__name">{business.business_name}</span>
                        </span>
                        <span className="biz-topbar__title"><TopClock timeZone={value?.business?.timezone} /></span>
                        <button type="button" className="biz-search" onClick={() => setCmdOpen(true)} aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}>
                            <Search size={16} aria-hidden="true" />
                            <span>Search or jump to</span>
                            <kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
                        </button>
                        <div className="biz-topbar__actions">
                            <InboxBell to="/portal/notifications" />
                            <button type="button" className="biz-iconbtn biz-topbar__share" onClick={() => setShareOpen(true)} aria-label="Share your booking link">
                                <Share2 size={18} aria-hidden="true" />
                            </button>
                            <button type="button" className="btn btn--primary biz-topbar__new" onClick={() => openNewBooking()} disabled={!value} data-tour="new">
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
                                {hub && <HubNav hub={hub} />}
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
                            <NavLink key={item.to} to={item.to} end={item.end} className="biz-tab" data-tour={item.tour}>
                                <Icon size={22} aria-hidden="true" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                    <button type="button" className={`biz-tab${moreActive ? ' active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" data-tour="more">
                        <Menu size={22} aria-hidden="true" />
                        <span>More</span>
                    </button>
                </nav>

                {value && (
                    <button type="button" className="biz-fab" onClick={() => openNewBooking()} aria-label="New booking" data-tour="new">
                        <Plus size={26} aria-hidden="true" />
                    </button>
                )}

                <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
                    <div className="biz-more">
                        {setupOpen && <StartCard strength={strength} onClick={() => setMoreOpen(false)} />}
                        {HUBS.map((group) => (
                            <div key={group.id} className="biz-navgroup">
                                <p className="biz-navgroup__label">{group.label}</p>
                                {group.pages.map((page) => (
                                    <NavItem key={page.to} item={{ ...page, label: page.name }} compact onClick={() => setMoreOpen(false)} />
                                ))}
                            </div>
                        ))}
                        <div className="biz-navgroup">
                            <p className="biz-navgroup__label">Help</p>
                            {NAV_FOOT.map((item) => <NavItem key={item.to} item={item} compact onClick={() => setMoreOpen(false)} />)}
                            <button type="button" className="biz-navlink" onClick={openTour}>
                                <CirclePlay size={20} aria-hidden="true" />
                                <span className="biz-navlink__label">Replay the tour</span>
                            </button>
                        </div>
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
                        <Tour open={tourOpen} onClose={closeTour} />
                        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} actions={paletteActions} />
                    </WorkspaceContext.Provider>
                )}

                <div className="biz-toast" role="status" aria-live="polite">
                    {toast && <span key={toast.key} className="biz-toast__msg">{toast.message}</span>}
                </div>
            </div>
        </InboxProvider>
    )
}

export default BusinessShell

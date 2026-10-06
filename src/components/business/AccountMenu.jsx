import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftRight, ChevronsUpDown, CirclePlay, Inbox, LifeBuoy, LogOut, Settings } from 'lucide-react'
import { initials } from './Brand'
import '../../styles/business/account-menu.css'

const OWN_PAGES = ['/portal/settings', '/portal/help', '/portal/support']

const AccountMenu = ({ name, email, onTour, onSignOut, links = null, ownPages = OWN_PAGES }) => {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const buttonRef = useRef(null)
    const menuRef = useRef(null)
    const menuId = useId()
    const { pathname } = useLocation()
    const title = name || email
    const current = ownPages.some((path) => pathname.startsWith(path))

    useEffect(() => { setOpen(false) }, [pathname])

    const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])]

    const close = useCallback((refocus = false) => {
        setOpen(false)
        if (refocus) buttonRef.current?.focus()
    }, [])

    useEffect(() => {
        if (!open) return undefined
        items()[0]?.focus()
        const onPointer = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false)
        }
        document.addEventListener('pointerdown', onPointer)
        return () => document.removeEventListener('pointerdown', onPointer)
    }, [open])

    const onMenuKey = (event) => {
        const list = items()
        const at = list.indexOf(document.activeElement)
        const focusAt = (i) => list[(i + list.length) % list.length]?.focus()
        if (event.key === 'Escape') { event.preventDefault(); close(true) }
        else if (event.key === 'ArrowDown') { event.preventDefault(); focusAt(at + 1) }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusAt(at - 1) }
        else if (event.key === 'Home') { event.preventDefault(); focusAt(0) }
        else if (event.key === 'End') { event.preventDefault(); focusAt(list.length - 1) }
        else if (event.key === 'Tab') setOpen(false)
    }

    const onButtonKey = (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
        }
    }

    const run = (action) => () => {
        close()
        action()
    }

    return (
        <div className="biz-account" ref={rootRef}>
            {open && (
                <div ref={menuRef} id={menuId} className="biz-acctmenu" role="menu" aria-label="Account" onKeyDown={onMenuKey}>
                    <div className="biz-acctmenu__who" role="presentation">
                        <strong>{title}</strong>
                        {name && email && <small>{email}</small>}
                    </div>
                    {links ? links.map(({ to, icon: Icon, label }) => (
                        <Link key={to} to={to} role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={() => close()}>
                            <Icon size={17} aria-hidden="true" />
                            <span>{label}</span>
                        </Link>
                    )) : (
                        <>
                            <Link to="/portal/settings" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={() => close()}>
                                <Settings size={17} aria-hidden="true" />
                                <span>Settings</span>
                            </Link>
                            <Link to="/portal/help" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={() => close()}>
                                <LifeBuoy size={17} aria-hidden="true" />
                                <span>Help</span>
                            </Link>
                            <Link to="/portal/support" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={() => close()}>
                                <Inbox size={17} aria-hidden="true" />
                                <span>Support</span>
                            </Link>
                            <button type="button" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={run(onTour)}>
                                <CirclePlay size={17} aria-hidden="true" />
                                <span>Replay the tour</span>
                            </button>
                            <Link to="/client" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={() => close()}>
                                <ArrowLeftRight size={17} aria-hidden="true" />
                                <span>Switch to Booking</span>
                            </Link>
                        </>
                    )}
                    <div className="biz-acctmenu__sep" role="separator" />
                    <button type="button" role="menuitem" tabIndex={-1} className="biz-acctmenu__item" onClick={run(onSignOut)}>
                        <LogOut size={17} aria-hidden="true" />
                        <span>Sign out</span>
                    </button>
                </div>
            )}
            <button
                ref={buttonRef}
                type="button"
                className={`biz-account__btn${current ? ' is-current' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={onButtonKey}
                data-tour="account"
            >
                <span className="biz-avatar">{initials(title)}</span>
                <span className="biz-account__text">
                    <strong>{title}</strong>
                    {name && email && <small>{email}</small>}
                </span>
                <ChevronsUpDown size={16} aria-hidden="true" className="biz-account__chevron" />
            </button>
        </div>
    )
}

export default AccountMenu

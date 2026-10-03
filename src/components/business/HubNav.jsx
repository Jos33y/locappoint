import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import '../../styles/business/hubnav.css'

// On a narrow phone the tabs scroll sideways; the open one is always brought into view.
const HubNav = ({ hub }) => {
    const track = useRef(null)
    const { pathname } = useLocation()

    useEffect(() => {
        const box = track.current
        const active = box?.querySelector('.biz-hubnav__tab.active')
        if (!box || !active || box.scrollWidth <= box.clientWidth) return
        box.scrollLeft = active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2
    }, [pathname])

    return (
        <nav className="biz-hubnav" aria-label={hub.label}>
            <div ref={track} className="biz-hubnav__track">
                {hub.pages.map((page) => (
                    <NavLink key={page.to} to={page.to} className="biz-hubnav__tab">
                        <span className="biz-hubnav__label">{page.label}</span>
                        {page.planned && <span className="biz-soon biz-hubnav__soon">Soon</span>}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}

export default HubNav

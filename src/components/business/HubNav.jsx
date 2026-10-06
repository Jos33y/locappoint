import { useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import '../../styles/business/hubnav.css'

// On a narrow phone the tabs scroll sideways; the open one is always brought into view.
const HubNav = ({ hub }) => {
    const track = useRef(null)
    const { pathname } = useLocation()

    // Measured on screen, not by offsetLeft: the track is not the tabs' offset parent. Centred again
    // whenever the tabs change size (the web font arriving, the page settling), not only on navigation.
    useLayoutEffect(() => {
        const box = track.current
        if (!box) return undefined
        const center = () => {
            const active = box.querySelector('.biz-hubnav__tab.active')
            if (!active || box.scrollWidth <= box.clientWidth) return
            const b = box.getBoundingClientRect()
            const a = active.getBoundingClientRect()
            box.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2)
        }
        center()
        let stop = () => {}
        if (typeof ResizeObserver !== 'undefined') {
            const watch = new ResizeObserver(center)
            watch.observe(box)
            box.querySelectorAll('.biz-hubnav__tab').forEach((tab) => watch.observe(tab))
            stop = () => watch.disconnect()
        }
        document.fonts?.ready?.then(center).catch(() => {})
        return stop
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

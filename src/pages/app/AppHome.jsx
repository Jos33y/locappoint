import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import Hero from './home/Hero'
import Problem from './home/Problem'
import HowItWorks from './home/HowItWorks'
import FindYou from './home/FindYou'
import Cities from './home/Cities'
import Pricing from './home/Pricing'
import Cta from './home/Cta'
import './home/home-page.css'

// "Pricing" in the header lands here as /#pricing, from this page or any other, and again on a
// second click. Arriving from another page it jumps straight there; on this page it scrolls.
// ScrollToTop runs first on a page change, so the jump waits a frame.
const useHashScroll = () => {
    const { hash, key } = useLocation()
    const arrived = useRef(false)
    useEffect(() => {
        const behavior = arrived.current ? 'smooth' : 'instant'
        arrived.current = true
        if (!hash) return undefined
        const frame = requestAnimationFrame(() => {
            document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior })
        })
        return () => cancelAnimationFrame(frame)
    }, [hash, key])
}

// The story for an owner: the day you want, the mess you have, how it changes, where clients
// come from, your city, what it costs, and the way in.
const AppHome = () => {
    useHashScroll()
    return (
        <div className="lc-home">
            <AppHeader />
            <main>
                <Hero />
                <Problem />
                <HowItWorks />
                <FindYou />
                <Cities />
                <Pricing />
                <Cta />
            </main>
            <AppFooter />
        </div>
    )
}

export default AppHome

import { useStatusEffects } from './hooks/useStatusEffects'
import StatusTop from './pages/status/StatusTop'
import Hero from './pages/status/Hero'
import Waves from './pages/status/Waves'
import WaveOne from './pages/status/WaveOne'
import LaunchSlip from './pages/status/LaunchSlip'
import Cities from './pages/status/Cities'
import Brand from './pages/status/Brand'
import After from './pages/status/After'
import Links from './pages/status/Links'
import Needs from './pages/status/Needs'
import StatusFoot from './pages/status/StatusFoot'
import './styles/status/status.css'

export default function StatusApp() {
    useStatusEffects()

    return (
        <div className="lc-st">
            <StatusTop />
            <main className="lc-st__main" id="top">
                <Hero />
                <Waves />
                <WaveOne />
                <LaunchSlip />
                <Cities />
                <Brand />
                <After />
                <Links />
                <Needs />
            </main>
            <StatusFoot />
        </div>
    )
}

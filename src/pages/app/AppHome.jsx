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

// The story for an owner: the day you want, the mess you have, how it changes, where clients
// come from, your city, what it costs, and the way in.
const AppHome = () => (
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

export default AppHome

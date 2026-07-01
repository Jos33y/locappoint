// src/pages/app/AppHome.jsx
// Composition root for app.locappoint.com home.

import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import Hero from './home/Hero'
import HowItWorks from './home/HowItWorks'
import BuiltFor from './home/BuiltFor'
import Pricing from './home/Pricing'
import Cta from './home/Cta'
import '../../styles/app/home.css'


const AppHome = () => {
    return (
        <div className="loca-home">
            <AppHeader />
            <main>
                <Hero />
                <HowItWorks />
                <BuiltFor />
                <Pricing />
                <Cta />
            </main>
            <AppFooter />
        </div>
    )
}

export default AppHome

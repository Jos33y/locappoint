import { LandingTranslationProvider, useLandingTranslation } from "../../contexts/LandingTranslationContext";
import Footer from "../../components/Footer"
import Header from "../../components/Header"
import Hero from "./Hero";
import Stats from "./Stats";
import ProblemSolution from "./ProblemSolution";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import Testimonials from "./Testimonials";
import Audience from "./Audience";
import Benefits from "./Benefits";
import Validation from "./Validation";
import FAQ from "./Faq";
import CTASection from "./Ctasection";
import Waitlist from "./Waitlist";

import '../../styles/landing/variables.css'
import '../../styles/landing/globals.css'
import '../../styles/landing/buttons.css'
import '../../styles/landing/header-footer.css'
import '../../styles/landing/hero.css'
import '../../styles/landing/features.css'
import '../../styles/landing/problem-solution.css'
import '../../styles/landing/testimonials.css'
import '../../styles/landing/audience.css'
import '../../styles/landing/benefits.css'
import '../../styles/landing/validation.css'
import '../../styles/landing/waitlist.css'
import '../../styles/landing/spacing-fixes.css'
import '../../styles/landing/section-utilities.css'
import '../../styles/landing/components.css'
import '../../styles/landing/waitlist-msg.css'
import '../../styles/landing/responsive-fixes.css'
import '../../styles/landing/language-toggle.css'

const LandingPageContent = () => {
    const { t } = useLandingTranslation();
    return (
        <>
            <div className="announcement-bar">
                <div className="container">
                    <p className="announcement-bar__text">
                        {t('announcement.launching')}
                    </p>
                </div>
            </div>

            <Header />
            <main>
                <Hero />
                <Stats />
                <ProblemSolution />
                <Features />
                <HowItWorks />
                <Audience />
                <Benefits />
                <Testimonials />
                <Validation />
                <FAQ />
                <CTASection />
                <Waitlist />
            </main>
            <Footer />
        </>
    )
}

const LandingPage = () => {
    return (
        <LandingTranslationProvider>
            <LandingPageContent />
        </LandingTranslationProvider>
    )
}

export default LandingPage;
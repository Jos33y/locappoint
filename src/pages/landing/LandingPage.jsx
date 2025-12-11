// LandingPage.jsx - Main landing page with Partnership Modal
// Location: src/pages/landing/LandingPage.jsx

import { useState, useEffect } from 'react'
// Styles
import '../../styles/landing/index.css'

import { LandingTranslationProvider } from "../../contexts/LandingTranslationContext"
import { useLandingTranslation } from "../../hooks/useLandingTranslation"

// Components
import Header from '../../components/Header'
import Hero from "./Hero"
import Stats from "./Stats"
import ProblemSolution from "./ProblemSolution"
import Features from "./Features"
import AICapabilities from './AICapabilities'
import Audience from "./Audience"
import Benefits from "./Benefits"
import HowItWorks from "./HowItWorks"
import FAQ from "./Faq"
import FinalCTA from './Ctasection'
import Footer from '../../components/Footer'
import WaitlistModal from './WaitlistModal'
import PartnershipModal from './PartnershipModal'
import FloatingButtons from '../../components/FloatingButtons'

// Minimum loader display time (ms)
const MIN_LOADER_TIME = 2500;

const LandingPageContent = () => {
    const { t } = useLandingTranslation()
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
    const [isPartnershipOpen, setIsPartnershipOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Track when component mounted
        const mountTime = Date.now()

        // Function to hide loader
        const hideLoader = () => {
            const loader = document.getElementById('initial-loader')
            if (loader) {
                loader.classList.add('fade-out')
                // Remove from DOM after animation
                setTimeout(() => {
                    loader.remove()
                }, 400)
            }
            setIsLoading(false)
        }

        // Wait for all images and fonts to load
        const handleLoad = () => {
            const elapsed = Date.now() - mountTime
            const remainingTime = Math.max(0, MIN_LOADER_TIME - elapsed)

            // Ensure minimum display time
            setTimeout(hideLoader, remainingTime)
        }

        // Check if document already loaded
        if (document.readyState === 'complete') {
            handleLoad()
        } else {
            window.addEventListener('load', handleLoad)
        }

        // Fallback: hide loader after max time regardless
        const fallbackTimer = setTimeout(hideLoader, MIN_LOADER_TIME + 1000)

        return () => {
            window.removeEventListener('load', handleLoad)
            clearTimeout(fallbackTimer)
        }
    }, [])

    // Expose modal functions globally for other components
    useEffect(() => {
        window.openWaitlistModal = () => setIsWaitlistOpen(true)
        window.openPartnershipModal = () => setIsPartnershipOpen(true)

        return () => {
            delete window.openWaitlistModal
            delete window.openPartnershipModal
        }
    }, [])

    return (
        <>
            {/* Header with Partnership callback */}
            <Header
                onWaitlistClick={() => setIsWaitlistOpen(true)}
                onPartnershipClick={() => setIsPartnershipOpen(true)}
            />

            {/* Main Content */}
            <main>
                <Hero
                    onWaitlistClick={() => setIsWaitlistOpen(true)}
                    onPartnershipClick={() => setIsPartnershipOpen(true)}
                />
                <Stats />
                <ProblemSolution />
                <Features />
                <AICapabilities />
                <Audience />
                <Benefits />
                <HowItWorks />
                <FAQ />
                <FinalCTA
                    onWaitlistClick={() => setIsWaitlistOpen(true)}
                    onPartnershipClick={() => setIsPartnershipOpen(true)}
                />
            </main>
            {/* Footer */}
            <Footer
                onPartnershipClick={() => setIsPartnershipOpen(true)}
            />

            {/* Modals */}
            <WaitlistModal
                isOpen={isWaitlistOpen}
                onClose={() => setIsWaitlistOpen(false)}
            />
            <PartnershipModal
                isOpen={isPartnershipOpen}
                onClose={() => setIsPartnershipOpen(false)}
            />
            {/* Floating Buttons */}
            <FloatingButtons />
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

export default LandingPage
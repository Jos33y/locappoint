// LandingPage.jsx - Main landing page with Partnership Modal
// Location: src/pages/landing/LandingPage.jsx

import { useState, useEffect } from "react"
// Styles
import "../../styles/landing/index.css"

import { LandingTranslationProvider } from "../../contexts/LandingTranslationContext"
import { useLandingTranslation } from "../../hooks/useLandingTranslation"

// Analytics
import {
    initSession,
    startTimeTracking,
    stopTimeTracking,
    observeSections,
    initScrollTracking,
    trackModalOpen,
    trackModalClose
} from '../../services/analytics'

// Components
import Header from "../../components/Header"
import Hero from "./Hero"
import Stats from "./Stats"
import ProblemSolution from "./ProblemSolution"
import Features from "./Features"
import AICapabilities from "./AICapabilities"
import ProductPreview from "./ProductPreview"
import Audience from "./Audience"
import ClientValue from "./ClientValue"
import Benefits from "./Benefits"
import SocialProof from "./SocialProof"
import HowItWorks from "./HowItWorks"
import FAQ from "./Faq"
import WhatsAppCTA from "./WhatsAppCTA"
import FinalCTA from "./Ctasection"
import Footer from "../../components/Footer"
import WaitlistModal from "./WaitlistModal"
import PartnershipModal from "./PartnershipModal"
import FloatingButtons from "../../components/FloatingButtons"

// Minimum loader display time (ms)
const MIN_LOADER_TIME = 2500;

// Section IDs for tracking
const TRACKED_SECTIONS = [
    'hero',
    'stats',
    'problem-solution',
    'features',
    'ai-capabilities',
    'preview',
    'audience',
    'client-value',
    'benefits',
    'testimonials',
    'how-it-works',
    'faq',
    'whatsapp-cta',
    'final-cta'
]

const LandingPageContent = () => {
    const { t } = useLandingTranslation()
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
    const [isPartnershipOpen, setIsPartnershipOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize analytics on mount
    useEffect(() => {
        const initAnalytics = async () => {
            await initSession()
            startTimeTracking()
            initScrollTracking()
        }

        initAnalytics()

        return () => {
            stopTimeTracking()
        }
    }, [])

    // Observe sections after load
    useEffect(() => {
        if (!isLoading) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                observeSections(TRACKED_SECTIONS)
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [isLoading])

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
        window.openWaitlistModal = () => handleWaitlistOpen()
        window.openPartnershipModal = () => handlePartnershipOpen()

        return () => {
            delete window.openWaitlistModal
            delete window.openPartnershipModal
        }
    }, [])

    // Modal handlers with analytics
    const handleWaitlistOpen = () => {
        trackModalOpen('waitlist')
        setIsWaitlistOpen(true)
    }

    const handleWaitlistClose = () => {
        trackModalClose('waitlist')
        setIsWaitlistOpen(false)
    }

    const handlePartnershipOpen = () => {
        trackModalOpen('partnership')
        setIsPartnershipOpen(true)
    }

    const handlePartnershipClose = () => {
        trackModalClose('partnership')
        setIsPartnershipOpen(false)
    }


    return (
        <>
            {/* Header with Partnership callback */}
            <Header
                onWaitlistClick={handleWaitlistOpen}
                onPartnershipClick={handlePartnershipOpen}
            />

            {/* Main Content */}
            <main>
                <Hero
                    onWaitlistClick={handleWaitlistOpen}
                    onPartnershipClick={handlePartnershipOpen}
                />
                <Stats />
                <ProblemSolution />
                <Features />
                <AICapabilities />
                <ProductPreview />
                <Audience />
                <ClientValue />
                <Benefits />
                <SocialProof />
                <HowItWorks />
                <FAQ />
                <WhatsAppCTA />
                <FinalCTA
                    onWaitlistClick={handleWaitlistOpen}
                    onPartnershipClick={handlePartnershipOpen}
                />
            </main>
            {/* Footer */}
            <Footer
                onPartnershipClick={handlePartnershipOpen}
            />

            {/* Modals */}
            <WaitlistModal
                isOpen={isWaitlistOpen}
                onClose={handleWaitlistClose}
            />
            <PartnershipModal
                isOpen={isPartnershipOpen}
                onClose={handlePartnershipClose}
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

export default LandingPage;
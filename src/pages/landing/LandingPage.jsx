// LandingPage - Phase 1 waitlist. HowItWorks (today) precedes AICapabilities (roadmap).

import { useState, useEffect, useCallback } from 'react'
import '../../styles/landing/index.css'

import { LandingTranslationProvider } from '../../contexts/LandingTranslationContext'

import {
    initSession,
    startTimeTracking,
    stopTimeTracking,
    observeSections,
    initScrollTracking,
    trackModalOpen,
    trackModalClose
} from '../../services/analytics'

import Header from '../../components/Header'
import Footer from '../../components/Footer'
import FloatingButtons from '../../components/FloatingButtons'

import Hero from './Hero'
import Stats from './Stats'
import Problem from './Problem'
import Features from './Features'
import HowItWorks from './HowItWorks'
import AICapabilities from './AICapabilities'
import Audience from './Audience'
import ClientValue from './ClientValue'
import SocialProof from './SocialProof'
import FounderNote from './FounderNote'
import Faq from './Faq'
import WaitlistCTASection from './WaitlistCTASection'

import WaitlistModal from './WaitlistModal'
import PartnershipModal from './PartnershipModal'

const TRACKED_SECTIONS = [
    'hero',
    'stats',
    'problem',
    'features',
    'how-it-works',
    'ai',
    'audience',
    'for-clients',
    'testimonials',
    'founder',
    'faq',
    'waitlist-cta'
]

const LandingPageContent = () => {
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
    const [isPartnershipOpen, setIsPartnershipOpen] = useState(false)
    const [prefillEmail, setPrefillEmail] = useState('')

    useEffect(() => {
        const init = async () => {
            await initSession()
            startTimeTracking()
            initScrollTracking()
        }
        init()
        return () => stopTimeTracking()
    }, [])

    useEffect(() => {
        const t = setTimeout(() => observeSections(TRACKED_SECTIONS), 200)
        return () => clearTimeout(t)
    }, [])

    const openWaitlist = useCallback((opts = {}) => {
        trackModalOpen('waitlist')
        if (opts && opts.email) setPrefillEmail(opts.email)
        setIsWaitlistOpen(true)
    }, [])

    const closeWaitlist = useCallback(() => {
        trackModalClose('waitlist')
        setIsWaitlistOpen(false)
        setPrefillEmail('')
    }, [])

    const openPartnership = useCallback(() => {
        trackModalOpen('partnership')
        setIsPartnershipOpen(true)
    }, [])

    const closePartnership = useCallback(() => {
        trackModalClose('partnership')
        setIsPartnershipOpen(false)
    }, [])

    useEffect(() => {
        window.openWaitlistModal = () => openWaitlist()
        window.openWaitlistModalWithEmail = (email) => openWaitlist({ email })
        window.openPartnershipModal = () => openPartnership()
        return () => {
            delete window.openWaitlistModal
            delete window.openWaitlistModalWithEmail
            delete window.openPartnershipModal
        }
    }, [openWaitlist, openPartnership])

    return (
        <>
            <Header
                onWaitlistClick={openWaitlist}
                onPartnershipClick={openPartnership}
            />

            <main>
                <Hero
                    onWaitlistClick={openWaitlist}
                    onPartnershipClick={openPartnership}
                />
                <Stats />
                <Problem />
                <Features />
                <HowItWorks />
                <AICapabilities />
                <Audience />
                <ClientValue />
                <SocialProof />
                <FounderNote />
                <Faq />
                <WaitlistCTASection onWaitlistClick={openWaitlist} />
            </main>

            <Footer onPartnershipClick={openPartnership} />

            <WaitlistModal
                isOpen={isWaitlistOpen}
                onClose={closeWaitlist}
                initialEmail={prefillEmail}
            />
            <PartnershipModal
                isOpen={isPartnershipOpen}
                onClose={closePartnership}
            />

            <FloatingButtons />
        </>
    )
}

const LandingPage = () => (
    <LandingTranslationProvider>
        <LandingPageContent />
    </LandingTranslationProvider>
)

export default LandingPage

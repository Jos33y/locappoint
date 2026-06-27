import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import ScrollToTop from './components/common/ScrollToTop'
import LandingPage from './pages/landing/LandingPage'
import AdminPage from './pages/admin/AdminPage'
import TermsOfService from './pages/app/legal/TermsOfService'
import PrivacyPolicy from './pages/app/legal/PrivacyPolicy'

/* Main domain: locappoint.com
 *   /         -> waitlist landing
 *   /admin    -> internal admin dashboard
 *   /terms    -> legal
 *   /privacy  -> legal
 * Anything else redirects to /. */

const WaitlistApp = () => (
    <AuthProvider>
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
        {import.meta.env.PROD && <Analytics />}
    </AuthProvider>
)

export default WaitlistApp

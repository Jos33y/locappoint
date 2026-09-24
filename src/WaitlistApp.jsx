import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ScrollToTop from './components/common/ScrollToTop'
import LandingPage from './pages/landing/LandingPage'
import AdminPage from './pages/admin/AdminPage'
import TermsOfService from './pages/app/legal/TermsOfService'
import PrivacyPolicy from './pages/app/legal/PrivacyPolicy'

const NoIndex = () => {
    useEffect(() => {
        document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow')
    }, [])
    return null
}

const WaitlistApp = () => (
    <AuthProvider>
        <BrowserRouter>
            <ScrollToTop />
            <NoIndex />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </AuthProvider>
)

export default WaitlistApp

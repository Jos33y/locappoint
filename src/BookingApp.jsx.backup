import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import ScrollToTop from './components/common/ScrollToTop'
import CanonicalSync from './components/common/CanonicalSync'

import AppHome from './pages/app/AppHome'
import Businesses from './pages/app/Businesses'
import BusinessPage from './pages/app/BusinessPage'
import Contact from './pages/app/Contact'
import Partnership from './pages/app/Partnership'
import PrivacyPolicy from './pages/app/legal/PrivacyPolicy'
import TermsOfService from './pages/app/legal/TermsOfService'
import AdminPage from './pages/admin/AdminPage'
import AuthPage from './pages/app/auth/AuthPage'
import ForgotPassword from './pages/app/auth/ForgotPassword'
import ResetPassword from './pages/app/auth/ResetPassword'

import PortalLayout from './pages/portal/PortalLayout'
import PortalDashboard from './pages/portal/Dashboard'
import PortalProfile from './pages/portal/Profile'
import PortalServices from './pages/portal/Services'
import PortalAvailability from './pages/portal/Availability'
import PortalAppointments from './pages/portal/Appointments'
import PortalSettings from './pages/portal/Settings'

import ClientLayout from './pages/client/ClientLayout'
import ClientHome from './pages/client/Home'
import ClientSearch from './pages/client/Search'
import ClientAppointments from './pages/client/MyAppointments'
import ClientProfile from './pages/client/Profile' 

const WAITLIST_URL = import.meta.env.DEV ? '/?waitlist' : 'https://waitlist.locappoint.com'

// Redirect, not render: landing CSS would stay in the page and leak into the app.
const WaitlistRedirect = () => {
    useEffect(() => { window.location.replace(WAITLIST_URL) }, [])
    return null
}

const BookingApp = () => (
    <AuthProvider>
        <BrowserRouter>
            <ScrollToTop />
            <CanonicalSync />
            <Routes>
                <Route path="/" element={<AppHome />} />
                <Route path="/about" element={<Navigate to="/" replace />} />
                <Route path="/businesses" element={<Businesses />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/partnership" element={<Partnership />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/waitlist" element={<WaitlistRedirect />} />

                <Route
                    path="/portal"
                    element={
                        <ProtectedRoute userType="business">
                            <PortalLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<PortalDashboard />} />
                    <Route path="profile" element={<PortalProfile />} />
                    <Route path="services" element={<PortalServices />} />
                    <Route path="availability" element={<PortalAvailability />} />
                    <Route path="appointments" element={<PortalAppointments />} />
                    <Route path="settings" element={<PortalSettings />} />
                </Route>

                <Route
                    path="/client"
                    element={
                        <ProtectedRoute userType="client">
                            <ClientLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<ClientHome />} />
                    <Route path="search" element={<ClientSearch />} />
                    <Route path="appointments" element={<ClientAppointments />} />
                    <Route path="profile" element={<ClientProfile />} />
                </Route>

                {/* Last so explicit routes win over a matching slug. */}
                <Route path="/:businessSlug" element={<BusinessPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </AuthProvider>
)

export default BookingApp

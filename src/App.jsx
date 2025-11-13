import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import LandingPage from './pages/landing/LandingPage'
import AdminPage from './pages/admin/admin_page'
import AuthPage from './pages/app/auth/AuthPage'
import ForgotPassword from './pages/app/auth/ForgotPassword'
import AppHome from './pages/app/AppHome'
import AppBusinesses from './pages/app/Businesses'
import PublicBusinessPage from './pages/app/BusinessPage'
import AppAbout from './pages/app/About'
import AppContact from './pages/app/Contact'
import AppPartnership from './pages/app/Partnership'
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
import TermsOfService from './pages/app/legal/TermsOfService'
import PrivacyPolicy from './pages/app/legal/PrivacyPolicy'
import ScrollToTop from './components/common/ScrollToTop'
import './styles/variables.css'
import './styles/buttons.css'


const App = () => {
  return (
    <>
      <AuthProvider>
        <BrowserRouter>
        <ScrollToTop />
          <Routes>
            {/* landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* app pages */}
            <Route path="/app" element={<AppHome />} />
            <Route path="/app/businesses" element={<AppBusinesses />} />
            <Route path="/app/about" element={<AppAbout />} />
            <Route path="/app/contact" element={<AppContact />} />
            <Route path="/app/partnership" element={<AppPartnership />} />

            <Route path="/app/auth" element={<AuthPage />} />
            <Route path="/app/forgot-password" element={<ForgotPassword />} />

            {/* legal pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* public business page */}
            <Route path="/:businessSlug" element={<PublicBusinessPage />} />

            {/* business portal */}
            <Route path="/portal"
              element={
                <ProtectedRoute userType="business">
                  <PortalLayout />
                </ProtectedRoute>
              }>
              <Route index element={<PortalDashboard />} />
              <Route path="profile" element={<PortalProfile />} />
              <Route path="services" element={<PortalServices />} />
              <Route path="availability" element={<PortalAvailability />} />
              <Route path="appointments" element={<PortalAppointments />} />
              <Route path="settings" element={<PortalSettings />} />
            </Route>

            {/* client portal */}
            <Route path="/client"
              element={
                <ProtectedRoute userType="client">
                  <ClientLayout />
                </ProtectedRoute>
              }>
              <Route index element={<ClientHome />} />
              <Route path="search" element={<ClientSearch />} />
              <Route path="appointments" element={<ClientAppointments />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App 
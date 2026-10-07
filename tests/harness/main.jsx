import { createRoot } from 'react-dom/client'
import { useMemo, useState } from 'react'
import { MemoryRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-ext-600.css'
import '@src/styles/tokens.css'
import '@src/styles/foundation.css'
import '@src/styles/reset.css'
import '@src/styles/base.css'
import '@src/styles/utilities.css'
import '@src/styles/buttons.css'
import '@src/styles/forms.css'
import '@src/styles/ui.css'
import { AuthContext } from '@src/context_definition/AuthContextDefinition'
import BusinessShell from '@src/components/business/BusinessShell'
import PushSetup from '@src/components/common/PushSetup'
import Today from '@src/pages/business/Today'
import Calendar from '@src/pages/business/Calendar'
import Planned from '@src/pages/business/Planned'
import GettingStarted from '@src/pages/business/GettingStarted'
import Help from '@src/pages/business/Help'
import SupportPage from '@src/pages/business/SupportPage'
import Bookings from '@src/pages/business/Bookings'
import Policies from '@src/pages/app/legal/Policies'
import ClientSupport from '@src/pages/client/Support'
import Channels from '@src/pages/business/Channels'

import BusinessPage from '@src/pages/business/BusinessPage'
import Setup from '@src/pages/business/Setup'
import ServicesPage from '@src/pages/business/ServicesPage'
import HoursPage from '@src/pages/business/HoursPage'
import SettingsPage from '@src/pages/business/SettingsPage'
import InboxPage from '@src/components/inbox/InboxPage'
import Insights from '@src/pages/business/Insights'
import Reviews from '@src/pages/business/Reviews'
import Invite from '@src/pages/business/Invite'
import Clients from '@src/pages/business/Clients'
import Team from '@src/pages/business/Team'
import TeamJoin from '@src/pages/app/TeamJoin'
import ClientHome from '@src/pages/client/Home'
import ClientAppointments from '@src/pages/client/MyAppointments'
import ClientSearch from '@src/pages/client/Search'
import ClientProfile from '@src/pages/client/Profile'
import ManageBooking from '@src/pages/app/ManageBooking'
import PayReturn from '@src/pages/app/PayReturn'
import ReceiptPage from '@src/pages/app/ReceiptPage'
import PaymentsPage from '@src/pages/business/PaymentsPage'
import Verified from '@src/pages/business/Verified'
import PublicBusinessPage from '@src/pages/app/PublicBusinessPage'
import { InboxProvider } from '@src/components/inbox/InboxContext'
import '@src/styles/client/client-shell.css'
import { DATA } from './fakeSupabase'
import { RouteBoundary } from '@src/components/common/ErrorBoundary'
import OfflineNotice from '@src/components/common/OfflineNotice'
import UpdateNotice from '@src/components/common/UpdateNotice'
import DeleteAccount from '@src/pages/app/legal/DeleteAccount'
import ErrorsTab from '@src/pages/admin/tabs/ErrorsTab'
import AdminDash from '@src/pages/admin/AdminDash'
import AppDownload from '@src/pages/app/AppDownload'
import AuthPage from '@src/pages/app/auth/AuthPage'
import { installErrorHandlers } from '@src/services/errors'
import QRCode from 'qrcode'
import '@src/styles/admin/admin.css'

const params = new URLSearchParams(window.location.search)
const start = params.get('path') || '/portal'
if (params.get('logo') === '1') DATA.businesses[0].logo_url = '/brand/loca-app-icon.svg'
if (params.get('setup') === '1') DATA.businesses[0].launched_at = null
if (params.get('noservices') === '1') DATA.services.length = 0
if (params.get('nohours') === '1') DATA.availability.length = 0
if (params.get('lunch') === '1') DATA.availability.splice(0, DATA.availability.length, ...[1, 2, 3, 4, 5, 6].flatMap((d) => [['09:00:00', '13:00:00'], ['14:00:00', '19:00:00']].map(([s, e], i) => ({ id: `a${d}${i}`, business_id: 'b1', staff_id: null, day_of_week: d, start_time: s, end_time: e }))))
if (params.get('noinbox') === '1') DATA.inbox.length = 0
if (params.get('empty') === '1') Object.assign(DATA.businesses[0], { banner_url: null, logo_url: null, description: null, address: null, whatsapp: null })
try { if (params.get('tour') !== '1') localStorage.setItem('locappoint_tour_done', '1'); else localStorage.removeItem('locappoint_tour_done') } catch { /* noop */ }

window.__locaReportInDev = true
// ?native=1 behaves like the phone apps; ?release=none or ?release=1 fakes the Android download note.
if (params.get('native')) window.__locaNative = params.get('native') === '1' ? true : params.get('native')
if (params.get('device')) window.__locaDevice = params.get('device')
// ?push=prompt|granted|denied stands in for the phone's notification permission; ?pushanswer= is what the person picks.
if (params.get('push')) {
  const handlers = {}
  let state = params.get('push')
  window.__pushCalls = []
  window.__locaPush = {
    checkPermissions: async () => ({ receive: state }),
    requestPermissions: async () => { window.__pushCalls.push('request'); state = params.get('pushanswer') || 'granted'; return { receive: state } },
    register: async () => { window.__pushCalls.push('register'); handlers.registration?.({ value: 'fake-fcm-token-0123456789abcdef' }) },
    createChannel: async (c) => { window.__pushCalls.push(`channel:${c.id}`) },
    addListener: async (name, fn) => { handlers[name] = fn; return { remove() {} } },
  }
  window.__pushTap = (link) => handlers.pushNotificationActionPerformed?.({ notification: { data: { link } } })
  try { if (params.get('asked') === '1') localStorage.setItem('locappoint_push_asked', '1'); else localStorage.removeItem('locappoint_push_asked') } catch { /* noop */ }
}
if (params.has('installed')) window.__locaAppVersion = params.get('installed')
if (params.has('release')) window.__locaRelease = params.get('release') === 'none' ? null : { version: '1.0.7', file: 'locappoint-1.0.7.apk', size: 6291456 }
window.__QRCode = QRCode
installErrorHandlers('app')

// A screen that fails on purpose: ?chunk=1 fails the way a stale deploy does.
const Crash = () => {
  if (params.get('chunk') === '1') throw new Error('Failed to fetch dynamically imported module: /assets/Calendar-old.js')
  throw new Error('Test crash in a screen')
}
const fmtDate = (v) => new Date(v).toLocaleDateString('en-GB')
const fmtTime = (v) => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// One admin section on its own, for tests: /admin-view/overview, /admin-view/bookings and so on.
const AdminView = () => {
  const { section } = useParams()
  const [active, setActive] = useState(section)
  return <div className="admin"><main className="admin__content"><AdminDash activeSection={active} setActiveSection={setActive} loading={false} formatDate={fmtDate} formatTime={fmtTime} /></main><span id="__admin" hidden>{active}</span></div>
}

const Where = () => { const l = useLocation(); window.__path = l.pathname; return <span id="__path" hidden>{l.pathname}</span> }

const Auth = ({ children }) => {
  const [mode, setMode] = useState('business')
  const value = useMemo(() => ({
    user: params.has('guest') ? null : { id: 'u1', email: params.get('email') || 'milesfarra@gmail.com' },
    userProfile: params.has('guest') ? null : { id: 'u1', email: params.get('email') || 'milesfarra@gmail.com', full_name: params.has('noname') ? '' : 'Miles Farra', created_at: '2026-03-14T10:00:00Z', ...(params.get('pushoff') === '1' ? { push_enabled: false } : {}) },
    business: params.has('nobiz') ? null : params.get('staff') === '1' ? { ...DATA.businesses[0], staff: true } : DATA.businesses[0],
    loading: false,
    mode, setMode,
    signOut: () => { window.__signedOut = true },
    refreshProfile: () => { window.__refreshed = (window.__refreshed || 0) + 1 },
    signInWithGoogle: async () => { window.__oauth = 'google'; return { data: {}, error: null } },
    signInWithApple: async () => { window.__oauth = 'apple'; return { data: {}, error: null } },
    signIn: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    resendConfirmation: async () => ({ error: null }),
  }), [mode])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const App = () => (
  <Auth>
    <MemoryRouter initialEntries={[start]}>
      <Where />
      <Routes>
        <Route path="/portal" element={<BusinessShell />}>
          <Route index element={<Today />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="page" element={<BusinessPage />} />
          
          <Route path="hours" element={<HoursPage />} />
          
          <Route path="settings" element={<SettingsPage />} />
          <Route path="assistant" element={<Planned section="assistant" />} />
          <Route path="clients" element={<Clients />} />
          <Route path="team" element={<Team />} />
          <Route path="insights" element={<Insights />} />
          <Route path="notifications" element={<InboxPage audience="business" />} />
          <Route path="start" element={<GettingStarted />} />
          <Route path="help" element={<Help />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="channels" element={<Channels />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="invite" element={<Invite />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="verified" element={<Verified />} />
          <Route path="setup" element={<Setup />} />
          <Route path="crash" element={<RouteBoundary><Crash /></RouteBoundary>} />
        </Route>
        <Route path="/client" element={<><ClientHome /><PushSetup audience="client" /></>} />
        <Route path="/client/appointments" element={<ClientAppointments />} />
        <Route path="/client/search" element={<ClientSearch />} />
        <Route path="/client/profile" element={<ClientProfile />} />
        <Route path="/client/support" element={<ClientSupport />} />
        <Route path="/client/notifications" element={<InboxProvider audience="client"><InboxPage audience="client" /></InboxProvider>} />
        <Route path="/b/:token" element={<ManageBooking />} />
        <Route path="/pay/return" element={<PayReturn />} />
        <Route path="/r/:token" element={<ReceiptPage />} />
        <Route path="/team/:token" element={<TeamJoin />} />
        <Route path="/app" element={<AppDownload />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/legal/delete-account" element={<DeleteAccount />} />
        <Route path="/admin-view/:section" element={<AdminView />} />
        <Route path="/legal/policies" element={<Policies />} />
        <Route path="/admin-errors" element={<div className="admin"><ErrorsTab formatDate={fmtDate} formatTime={fmtTime} /></div>} />
        <Route path="/:businessSlug" element={<PublicBusinessPage />} />
      </Routes>
      <OfflineNotice />
      <UpdateNotice />
    </MemoryRouter>
  </Auth>
)

createRoot(document.getElementById('root')).render(<App />)

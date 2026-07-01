// AdminPage - Auth gate, data layer, layout assembly. Single source of truth for admin state.
// Section persisted in URL hash. /admin#waitlist, /admin#partnership. Analytics is default (no hash).

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import AdminDash from './AdminDash'
import '../../styles/admin/admin.css'

const SECTION_LABELS = {
    analytics: 'Analytics',
    waitlist: 'Waitlist',
    partnership: 'Partnerships'
} 

const VALID_SECTIONS = ['analytics', 'waitlist', 'partnership']
const DEFAULT_SECTION = 'analytics'

const getSectionFromHash = () => {
    if (typeof window === 'undefined') return DEFAULT_SECTION
    const h = (window.location.hash || '').slice(1).toLowerCase()
    return VALID_SECTIONS.includes(h) ? h : DEFAULT_SECTION
}

const writeSectionToHash = (section) => {
    if (typeof window === 'undefined') return
    const currentHash = window.location.hash.slice(1).toLowerCase()
    const url = `${window.location.pathname}${window.location.search}`
    if (section === DEFAULT_SECTION) {
        // Keep URL clean for default section
        if (currentHash) window.history.replaceState(null, '', url)
        return
    }
    if (currentHash !== section) {
        window.history.replaceState(null, '', `${url}#${section}`)
    }
}

const AdminPage = () => {
    // Auth
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [sessionChecked, setSessionChecked] = useState(false)
    const [adminEmail, setAdminEmail] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [authError, setAuthError] = useState('')
    const [authLoading, setAuthLoading] = useState(false)

    // Layout (section hash-synced)
    const [activeSection, setActiveSectionInternal] = useState(getSectionFromHash)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const setActiveSection = useCallback((next) => {
        const normalized = (next || '').toLowerCase()
        if (!VALID_SECTIONS.includes(normalized)) return
        setActiveSectionInternal(normalized)
        writeSectionToHash(normalized)
    }, [])

    // Listen for browser back/forward and direct hash edits
    useEffect(() => {
        const onHashChange = () => setActiveSectionInternal(getSectionFromHash())
        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    // Data
    const [waitlistData, setWaitlistData] = useState([])
    const [partnershipData, setPartnershipData] = useState([])
    const [analyticsData, setAnalyticsData] = useState({ sessions: [], events: [], stats: {} })
    const [dataLoading, setDataLoading] = useState(true)
    const [dataError, setDataError] = useState(null)
    const [dateRange, setDateRange] = useState('7d')

    // Session restore + initial loader dismissal
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (!session) {
                    setSessionChecked(true)
                    return
                }

                const { data: profile, error } = await supabase
                    .from('users')
                    .select('is_admin, email')
                    .eq('id', session.user.id)
                    .single()

                if (error || !profile || !profile.is_admin) {
                    // Session exists but not an admin. Sign out, stay on login.
                    await supabase.auth.signOut()
                    setSessionChecked(true)
                    return
                }

                setIsAuthenticated(true)
                setAdminEmail(profile.email)
                setSessionChecked(true)
            } catch (err) {
                console.error('Session restore failed:', err)
                setSessionChecked(true)
            }
        }
        restoreSession()

        const hideLoader = () => {
            const loader = document.getElementById('initial-loader')
            if (loader) {
                loader.classList.add('fade-out')
                setTimeout(() => loader.remove(), 400)
            }
        }
        const t = setTimeout(hideLoader, 500)
        return () => clearTimeout(t)
    }, [])

    // Escape closes sidebar drawer
    useEffect(() => {
        if (!sidebarOpen) return
        const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [sidebarOpen])

    // Body scroll lock when drawer open
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen])

    // Data fetching
    const getDateFilter = useCallback(() => {
        const now = new Date()
        switch (dateRange) {
            case '24h': return new Date(now - 24 * 60 * 60 * 1000).toISOString()
            case '7d':  return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
            case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
            default:    return null
        }
    }, [dateRange])

    const calculateStats = (sessions) => {
        const totalVisitors = sessions.length
        const uniqueCountries = [...new Set(sessions.map(s => s.country).filter(Boolean))]

        const devices = sessions.reduce((acc, s) => {
            if (s.device_type) acc[s.device_type] = (acc[s.device_type] || 0) + 1
            return acc
        }, {})

        const countries = sessions.reduce((acc, s) => {
            if (s.country) acc[s.country] = (acc[s.country] || 0) + 1
            return acc
        }, {})
        const topCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10)

        const browsers = sessions.reduce((acc, s) => {
            if (s.browser) acc[s.browser] = (acc[s.browser] || 0) + 1
            return acc
        }, {})

        const waitlistOpened = sessions.filter(s => s.waitlist_opened).length
        const waitlistSubmitted = sessions.filter(s => s.waitlist_submitted).length
        const partnershipOpened = sessions.filter(s => s.partnership_opened).length
        const partnershipSubmitted = sessions.filter(s => s.partnership_submitted).length
        const whatsappClicked = sessions.filter(s => s.whatsapp_clicked).length

        const bounces = sessions.filter(s => s.is_bounce).length
        const bounceRate = totalVisitors > 0 ? Math.round((bounces / totalVisitors) * 100) : 0
        const totalTime = sessions.reduce((acc, s) => acc + (s.total_time_seconds || 0), 0)
        const avgTime = totalVisitors > 0 ? Math.round(totalTime / totalVisitors) : 0

        return {
            totalVisitors,
            uniqueCountries: uniqueCountries.length,
            devices,
            topCountries,
            browsers,
            waitlistOpened,
            waitlistSubmitted,
            waitlistConversion: waitlistOpened > 0 ? Math.round((waitlistSubmitted / waitlistOpened) * 100) : 0,
            partnershipOpened,
            partnershipSubmitted,
            partnershipConversion: partnershipOpened > 0 ? Math.round((partnershipSubmitted / partnershipOpened) * 100) : 0,
            whatsappClicked,
            bounceRate,
            avgTime
        }
    }

    const fetchAllData = useCallback(async () => {
        try {
            setDataLoading(true)
            setDataError(null)

            const dateFilter = getDateFilter()

            let sessionsQuery = supabase.from('analytics_sessions').select('*').order('created_at', { ascending: false })
            let eventsQuery = supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(500)

            if (dateFilter) {
                sessionsQuery = sessionsQuery.gte('created_at', dateFilter)
                eventsQuery = eventsQuery.gte('created_at', dateFilter)
            }

            const [waitlistRes, partnershipRes, sessionsRes, eventsRes] = await Promise.all([
                supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
                supabase.from('partnership_requests').select('*').order('created_at', { ascending: false }),
                sessionsQuery,
                eventsQuery
            ])

            if (waitlistRes.error) throw waitlistRes.error
            if (partnershipRes.error) throw partnershipRes.error
            const sessions = sessionsRes.data || []
            const events = eventsRes.data || []

            setWaitlistData(waitlistRes.data || [])
            setPartnershipData(partnershipRes.data || [])
            setAnalyticsData({ sessions, events, stats: calculateStats(sessions) })
        } catch (err) {
            console.error('Error fetching data:', err)
            setDataError('Failed to load data. Please try again.')
        } finally {
            setDataLoading(false)
        }
    }, [getDateFilter])

    useEffect(() => {
        if (isAuthenticated) fetchAllData()
    }, [isAuthenticated, fetchAllData])

    // Formatters
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatTime = (seconds) => {
        if (!seconds || seconds === 0) return '0s'
        if (seconds < 60) return `${seconds}s`
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }

    // CSV
    const downloadCSV = (headers, rows, filename) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const exportWaitlistCSV = () => {
        if (waitlistData.length === 0) return
        const headers = ['Name', 'Email', 'Phone', 'Country', 'Type', 'Business Type', 'Comments', 'Date']
        const rows = waitlistData.map(item => [
            item.full_name,
            item.email,
            item.phone || '',
            item.country || '',
            item.user_type || '',
            item.business_type || '',
            item.comments || '',
            formatDate(item.created_at)
        ])
        downloadCSV(headers, rows, 'locappoint-waitlist')
    }

    const exportPartnershipCSV = () => {
        if (partnershipData.length === 0) return
        const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Org Type', 'Org Name', 'City', 'Country', 'Interest', 'Status', 'Date']
        const rows = partnershipData.map(item => [
            item.first_name,
            item.last_name,
            item.email,
            item.phone,
            item.organization_type,
            item.organization_name || '',
            item.city || '',
            item.country || '',
            item.partnership_interest || '',
            item.status || 'pending',
            formatDate(item.created_at)
        ])
        downloadCSV(headers, rows, 'locappoint-partnerships')
    }

    const exportSessionsCSV = () => {
        if (analyticsData.sessions.length === 0) return
        const headers = ['Session ID', 'Country', 'City', 'Device', 'Browser', 'Source', 'Pages', 'Time(s)', 'Waitlist', 'Partnership', 'WhatsApp', 'Date']
        const rows = analyticsData.sessions.map(s => [
            s.session_id,
            s.country || '',
            s.city || '',
            s.device_type || '',
            s.browser || '',
            s.utm_source || s.referrer_domain || 'Direct',
            s.page_views || 1,
            s.total_time_seconds || 0,
            s.waitlist_submitted ? 'Yes' : 'No',
            s.partnership_submitted ? 'Yes' : 'No',
            s.whatsapp_clicked ? 'Yes' : 'No',
            formatDate(s.created_at)
        ])
        downloadCSV(headers, rows, 'locappoint-sessions')
    }

    const exportEventsCSV = () => {
        if (analyticsData.events.length === 0) return
        const headers = ['Session ID', 'Event Type', 'Event Name', 'Category', 'Value', 'Page', 'Date']
        const rows = analyticsData.events.map(e => [
            e.session_id,
            e.event_type,
            e.event_name,
            e.event_category || '',
            e.event_value || '',
            e.page_path || '',
            formatDate(e.created_at)
        ])
        downloadCSV(headers, rows, 'locappoint-events')
    }

    const updatePartnershipStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('partnership_requests').update({ status: newStatus }).eq('id', id)
            if (error) throw error
            setPartnershipData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
        } catch (err) {
            console.error('Error updating status:', err)
            alert('Failed to update status')
        }
    }

    const deleteWaitlist = async (id) => {
        try {
            const { error } = await supabase.from('waitlist').delete().eq('id', id)
            if (error) throw error
            setWaitlistData(prev => prev.filter(item => item.id !== id))
        } catch (err) {
            console.error('Error deleting waitlist entry:', err)
            alert('Failed to delete entry')
        }
    }

    const deletePartnership = async (id) => {
        try {
            const { error } = await supabase.from('partnership_requests').delete().eq('id', id)
            if (error) throw error
            setPartnershipData(prev => prev.filter(item => item.id !== id))
        } catch (err) {
            console.error('Error deleting partnership request:', err)
            alert('Failed to delete request')
        }
    }

    // Auth
    const handleLogin = async (e) => {
        e.preventDefault()
        setAuthError('')
        setAuthLoading(true)

        try {
            // Step 1: Supabase email + password
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password
            })

            if (signInError) {
                throw new Error('Invalid email or password')
            }

            const { user, session } = data
            if (!session || !user) {
                throw new Error('Authentication failed')
            }

            // Step 2: Verify is_admin = true on the users row
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('is_admin, email')
                .eq('id', user.id)
                .single()

            if (profileError || !profile) {
                await supabase.auth.signOut()
                throw new Error('Account not found')
            }

            if (!profile.is_admin) {
                await supabase.auth.signOut()
                throw new Error('This account does not have admin access')
            }

            setIsAuthenticated(true)
            setAdminEmail(profile.email)
        } catch (err) {
            setAuthError(err.message || 'Authentication failed')
        } finally {
            setAuthLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
        } catch (err) {
            console.error('Sign out error:', err)
        }
        setIsAuthenticated(false)
        setAdminEmail('')
        setEmail('')
        setPassword('')
        setSidebarOpen(false)
    }

    // Initial session check
    if (!sessionChecked) {
        return (
            <div className="admin-login">
                <div className="admin-login__container">
                    <div className="admin-login__card">
                        <header className="admin-login__header">
                            <span className="admin-login__eyebrow">
                                <span>ADMIN</span>
                            </span>
                            <h1>Checking session</h1>
                            <p>One moment.</p>
                        </header>
                    </div>
                </div>
            </div>
        )
    }

    // Login screen
    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <div className="admin-login__container">
                    <div className="admin-login__card">
                        <header className="admin-login__header">
                            <span className="admin-login__eyebrow">
                                <span>ADMIN</span>
                            </span>
                            <h1>Access Dashboard</h1>
                            <p>Sign in with your admin account.</p>
                        </header>

                        <form onSubmit={handleLogin} className="admin-login__form" noValidate>
                            {authError && (
                                <div className="admin-login__error" role="alert">
                                    {authError}
                                </div>
                            )}

                            <div className="admin-login__field">
                                <label htmlFor="admin-email">
                                    <Mail size={11} aria-hidden="true" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="admin-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    disabled={authLoading}
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="admin-login__field">
                                <label htmlFor="admin-password">
                                    <Lock size={11} aria-hidden="true" />
                                    Password
                                </label>
                                <div className="admin-login__password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="admin-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="password"
                                        disabled={authLoading}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="admin-login__toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="admin-login__submit" disabled={authLoading}>
                                {authLoading ? 'Signing in' : 'Access Dashboard'}
                            </button>
                        </form>

                        <a href="/" className="admin-login__back">
                            Back to website
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Authenticated layout
    return (
        <div className={`admin ${sidebarOpen ? 'admin--sidebar-open' : ''}`}>
            <div
                className="admin__backdrop"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            <AdminSidebar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                counts={{
                    analytics: analyticsData.stats.totalVisitors || 0,
                    waitlist: waitlistData.length,
                    partnership: partnershipData.length
                }}
                onClose={() => setSidebarOpen(false)}
                onLogout={handleLogout}
            />

            <div className="admin__main">
                <AdminTopbar
                    sectionLabel={SECTION_LABELS[activeSection]}
                    onMenuToggle={() => setSidebarOpen(true)}
                    onRefresh={fetchAllData}
                    refreshing={dataLoading}
                />

                <main className="admin__content">
                    <AdminDash
                        activeSection={activeSection}
                        loading={dataLoading}
                        error={dataError}
                        onRetry={fetchAllData}
                        waitlistData={waitlistData}
                        partnershipData={partnershipData}
                        analyticsData={analyticsData}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        onExportWaitlist={exportWaitlistCSV}
                        onExportPartnership={exportPartnershipCSV}
                        onExportSessions={exportSessionsCSV}
                        onExportEvents={exportEventsCSV}
                        onStatusChange={updatePartnershipStatus}
                        onDeleteWaitlist={deleteWaitlist}
                        onDeletePartnership={deletePartnership}
                    />
                </main>
            </div>
        </div>
    )
}

export default AdminPage

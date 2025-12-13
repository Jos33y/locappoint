// AdminDash.jsx - Main admin dashboard with modular tabs
// Location: src/pages/admin/AdminDash.jsx

import { useState, useEffect } from 'react'
import { 
    Users, 
    Handshake, 
    RefreshCw, 
    BarChart3,
    Loader2,
    AlertCircle
} from 'lucide-react'
import { supabase } from '../../config/supabase'

// Tab components
import AnalyticsTab from './tabs/AnalyticsTab'
import WaitlistTab from './tabs/WaitlistTab'
import PartnershipTab from './tabs/PartnershipTab'

const AdminDash = () => {
    const [activeTab, setActiveTab] = useState('analytics')
    const [waitlistData, setWaitlistData] = useState([])
    const [partnershipData, setPartnershipData] = useState([])
    const [analyticsData, setAnalyticsData] = useState({
        sessions: [],
        events: [],
        stats: {}
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [dateRange, setDateRange] = useState('7d')

    useEffect(() => {
        fetchAllData()
    }, [dateRange])

    const getDateFilter = () => {
        const now = new Date()
        switch (dateRange) {
            case '24h':
                return new Date(now - 24 * 60 * 60 * 1000).toISOString()
            case '7d':
                return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
            case '30d':
                return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
            default:
                return null
        }
    }

    const fetchAllData = async () => {
        try {
            setLoading(true)
            setError(null)

            const dateFilter = getDateFilter()

            // Build queries
            let sessionsQuery = supabase
                .from('analytics_sessions')
                .select('*')
                .order('created_at', { ascending: false })
            
            let eventsQuery = supabase
                .from('analytics_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500)

            if (dateFilter) {
                sessionsQuery = sessionsQuery.gte('created_at', dateFilter)
                eventsQuery = eventsQuery.gte('created_at', dateFilter)
            }

            // Fetch all data in parallel
            const [waitlistRes, partnershipRes, sessionsRes, eventsRes] = await Promise.all([
                supabase
                    .from('waitlist')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('partnership_requests')
                    .select('*')
                    .order('created_at', { ascending: false }),
                sessionsQuery,
                eventsQuery
            ])

            if (waitlistRes.error) throw waitlistRes.error
            if (partnershipRes.error) throw partnershipRes.error
            // Analytics tables might not exist yet - handle gracefully
            const sessions = sessionsRes.data || []
            const events = eventsRes.data || []

            // Calculate analytics stats
            const stats = calculateStats(sessions, events)

            setWaitlistData(waitlistRes.data || [])
            setPartnershipData(partnershipRes.data || [])
            setAnalyticsData({ sessions, events, stats })
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('Failed to load data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (sessions, events) => {
        const totalVisitors = sessions.length
        const uniqueCountries = [...new Set(sessions.map(s => s.country).filter(Boolean))]
        
        // Device breakdown
        const devices = sessions.reduce((acc, s) => {
            if (s.device_type) {
                acc[s.device_type] = (acc[s.device_type] || 0) + 1
            }
            return acc
        }, {})

        // Country breakdown (top 10)
        const countries = sessions.reduce((acc, s) => {
            if (s.country) {
                acc[s.country] = (acc[s.country] || 0) + 1
            }
            return acc
        }, {})
        const topCountries = Object.entries(countries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)

        // Browser breakdown
        const browsers = sessions.reduce((acc, s) => {
            if (s.browser) {
                acc[s.browser] = (acc[s.browser] || 0) + 1
            }
            return acc
        }, {})

        // Conversion metrics
        const waitlistOpened = sessions.filter(s => s.waitlist_opened).length
        const waitlistSubmitted = sessions.filter(s => s.waitlist_submitted).length
        const partnershipOpened = sessions.filter(s => s.partnership_opened).length
        const partnershipSubmitted = sessions.filter(s => s.partnership_submitted).length
        const whatsappClicked = sessions.filter(s => s.whatsapp_clicked).length

        // Bounce rate
        const bounces = sessions.filter(s => s.is_bounce).length
        const bounceRate = totalVisitors > 0 ? Math.round((bounces / totalVisitors) * 100) : 0

        // Average time on site
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

    // CSV Export functions
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
        const headers = ['Full Name', 'Email', 'Phone', 'Country', 'User Type', 'Business Type', 'Comments', 'Date']
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
            const { error } = await supabase
                .from('partnership_requests')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            setPartnershipData(prev => 
                prev.map(item => 
                    item.id === id ? { ...item, status: newStatus } : item
                )
            )
        } catch (err) {
            console.error('Error updating status:', err)
            alert('Failed to update status')
        }
    }

    // Loading State
    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard__container">
                    <div className="loading-state">
                        <Loader2 size={32} className="loading-spinner" />
                        <span>Loading dashboard...</span>
                    </div>
                </div>
            </div>
        )
    }

    // Error State
    if (error) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard__container">
                    <div className="error-state">
                        <AlertCircle size={32} />
                        <span>{error}</span>
                        <button onClick={fetchAllData} className="btn btn--primary">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-dashboard">
            {/* Background Effects */}
            <div className="admin-dashboard__bg">
                <div className="admin-dashboard__grid" />
                <div className="admin-dashboard__orb admin-dashboard__orb--1" />
                <div className="admin-dashboard__orb admin-dashboard__orb--2" />
            </div>

            <div className="admin-dashboard__container">
                {/* Header */}
                <header className="admin-dashboard__header">
                    <div className="admin-dashboard__title-group">
                        <h1 className="admin-dashboard__title">Admin Dashboard</h1>
                        <p className="admin-dashboard__subtitle">
                            Manage waitlist, partnerships & view analytics
                        </p>
                    </div>
                    <button
                        onClick={fetchAllData}
                        className="btn btn--glass"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'loading-spinner' : ''} />
                        <span>Refresh</span>
                    </button>
                </header>

                {/* Tabs */}
                <nav className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'analytics' ? 'admin-tab--active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        <BarChart3 size={18} />
                        <span className="admin-tab__label">Analytics</span>
                        <span className="admin-tab__count">{analyticsData.stats.totalVisitors || 0}</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'waitlist' ? 'admin-tab--active' : ''}`}
                        onClick={() => setActiveTab('waitlist')}
                    >
                        <Users size={18} />
                        <span className="admin-tab__label">Waitlist</span>
                        <span className="admin-tab__count">{waitlistData.length}</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'partnership' ? 'admin-tab--active' : ''}`}
                        onClick={() => setActiveTab('partnership')}
                    >
                        <Handshake size={18} />
                        <span className="admin-tab__label">Partnership</span>
                        <span className="admin-tab__count">{partnershipData.length}</span>
                    </button>
                </nav>

                {/* Tab Content */}
                <div className="admin-dashboard__content">
                    {activeTab === 'analytics' && (
                        <AnalyticsTab 
                            data={analyticsData}
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                            onExportSessions={exportSessionsCSV}
                            onExportEvents={exportEventsCSV}
                            formatDate={formatDate}
                            formatTime={formatTime}
                        />
                    )}
                    {activeTab === 'waitlist' && (
                        <WaitlistTab 
                            data={waitlistData}
                            formatDate={formatDate}
                            onExport={exportWaitlistCSV}
                        />
                    )}
                    {activeTab === 'partnership' && (
                        <PartnershipTab 
                            data={partnershipData}
                            formatDate={formatDate}
                            onExport={exportPartnershipCSV}
                            onStatusChange={updatePartnershipStatus}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminDash
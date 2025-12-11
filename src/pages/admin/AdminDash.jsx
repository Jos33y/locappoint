// AdminDash.jsx - Admin dashboard with Waitlist & Partnership tabs
// Location: src/pages/admin/AdminDash.jsx

import { useState, useEffect } from 'react'
import { Users, Handshake, Download, RefreshCw, Mail, Phone, MapPin, Calendar, Building2, MessageSquare } from 'lucide-react'
import { supabase } from '../../config/supabase'

const AdminDash = () => {
    const [activeTab, setActiveTab] = useState('waitlist')
    const [waitlistData, setWaitlistData] = useState([])
    const [partnershipData, setPartnershipData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch both datasets in parallel
            const [waitlistRes, partnershipRes] = await Promise.all([
                supabase
                    .from('waitlist')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('partnership_requests')
                    .select('*')
                    .order('created_at', { ascending: false })
            ])

            if (waitlistRes.error) throw waitlistRes.error
            if (partnershipRes.error) throw partnershipRes.error

            setWaitlistData(waitlistRes.data || [])
            setPartnershipData(partnershipRes.data || [])
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('Failed to load data. Please try again.')
        } finally {
            setLoading(false)
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

    const exportWaitlistCSV = () => {
        if (waitlistData.length === 0) return

        const headers = ['Full Name', 'Email', 'City & Service', 'Comments', 'Date Joined']
        const rows = waitlistData.map(item => [
            item.full_name,
            item.email,
            item.city_service,
            item.comments || '',
            formatDate(item.created_at)
        ])

        downloadCSV(headers, rows, 'locappoint-waitlist')
    }

    const exportPartnershipCSV = () => {
        if (partnershipData.length === 0) return

        const headers = [
            'First Name', 'Last Name', 'Email', 'Phone', 
            'Organization Type', 'Organization Name', 
            'City', 'Country', 'Partnership Interest', 'Status', 'Date Submitted'
        ]
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

    const updatePartnershipStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('partnership_requests')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            // Update local state
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

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'contacted': return 'admin__status--contacted'
            case 'approved': return 'admin__status--approved'
            case 'rejected': return 'admin__status--rejected'
            default: return 'admin__status--pending'
        }
    }

    if (loading) {
        return (
            <div className="admin">
                <div className="admin__container">
                    <div className="admin__loading">
                        <RefreshCw size={24} className="spin" />
                        <span>Loading data...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="admin">
                <div className="admin__container">
                    <div className="admin__error">{error}</div>
                    <button onClick={fetchAllData} className="btn btn--primary">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="admin">
            <div className="admin__container">
                {/* Header */}
                <div className="admin__header">
                    <div>
                        <h1 className="admin__title">Admin Dashboard</h1>
                        <p className="admin__subtitle">
                            Manage waitlist signups and partnership requests
                        </p>
                    </div>
                    <button
                        onClick={fetchAllData}
                        className="btn btn--secondary admin__refresh"
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="admin__stats">
                    <div className="admin__stat-card">
                        <div className="admin__stat-icon admin__stat-icon--purple">
                            <Users size={24} />
                        </div>
                        <div className="admin__stat-info">
                            <span className="admin__stat-value">{waitlistData.length}</span>
                            <span className="admin__stat-label">Waitlist Signups</span>
                        </div>
                    </div>
                    <div className="admin__stat-card">
                        <div className="admin__stat-icon admin__stat-icon--cyan">
                            <Handshake size={24} />
                        </div>
                        <div className="admin__stat-info">
                            <span className="admin__stat-value">{partnershipData.length}</span>
                            <span className="admin__stat-label">Partnership Requests</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="admin__tabs">
                    <button
                        className={`admin__tab ${activeTab === 'waitlist' ? 'admin__tab--active' : ''}`}
                        onClick={() => setActiveTab('waitlist')}
                    >
                        <Users size={18} />
                        <span>Waitlist</span>
                        <span className="admin__tab-count">{waitlistData.length}</span>
                    </button>
                    <button
                        className={`admin__tab ${activeTab === 'partnership' ? 'admin__tab--active' : ''}`}
                        onClick={() => setActiveTab('partnership')}
                    >
                        <Handshake size={18} />
                        <span>Partnerships</span>
                        <span className="admin__tab-count">{partnershipData.length}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="admin__tab-content">
                    {activeTab === 'waitlist' ? (
                        <WaitlistTab 
                            data={waitlistData} 
                            formatDate={formatDate}
                            onExport={exportWaitlistCSV}
                        />
                    ) : (
                        <PartnershipTab 
                            data={partnershipData} 
                            formatDate={formatDate}
                            onExport={exportPartnershipCSV}
                            onStatusChange={updatePartnershipStatus}
                            getStatusBadgeClass={getStatusBadgeClass}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

// Waitlist Tab Component
const WaitlistTab = ({ data, formatDate, onExport }) => {
    if (data.length === 0) {
        return (
            <div className="admin__empty">
                <Users size={48} />
                <p>No waitlist signups yet</p>
            </div>
        )
    }

    return (
        <>
            <div className="admin__toolbar">
                <span className="admin__toolbar-info">
                    Showing {data.length} signup{data.length !== 1 ? 's' : ''}
                </span>
                <button onClick={onExport} className="btn btn--primary btn--sm">
                    <Download size={16} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="admin__cards">
                {data.map((item) => (
                    <div key={item.id} className="admin__card">
                        <div className="admin__card-header">
                            <h3 className="admin__card-name">{item.full_name}</h3>
                            <span className="admin__card-date">{formatDate(item.created_at)}</span>
                        </div>
                        <div className="admin__card-body">
                            <div className="admin__card-row">
                                <Mail size={14} />
                                <span>{item.email}</span>
                            </div>
                            <div className="admin__card-row">
                                <MapPin size={14} />
                                <span>{item.city_service}</span>
                            </div>
                            {item.comments && (
                                <div className="admin__card-row admin__card-row--comments">
                                    <MessageSquare size={14} />
                                    <span>{item.comments}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="admin__table-container">
                <table className="admin__table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>City & Service</th>
                            <th>Comments</th>
                            <th>Date Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td className="admin__td-name">{item.full_name}</td>
                                <td>{item.email}</td>
                                <td>{item.city_service}</td>
                                <td className="admin__td-comments">{item.comments || '-'}</td>
                                <td className="admin__td-date">{formatDate(item.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

// Partnership Tab Component
const PartnershipTab = ({ data, formatDate, onExport, onStatusChange, getStatusBadgeClass }) => {
    if (data.length === 0) {
        return (
            <div className="admin__empty">
                <Handshake size={48} />
                <p>No partnership requests yet</p>
            </div>
        )
    }

    return (
        <>
            <div className="admin__toolbar">
                <span className="admin__toolbar-info">
                    Showing {data.length} request{data.length !== 1 ? 's' : ''}
                </span>
                <button onClick={onExport} className="btn btn--primary btn--sm">
                    <Download size={16} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="admin__cards">
                {data.map((item) => (
                    <div key={item.id} className="admin__card">
                        <div className="admin__card-header">
                            <h3 className="admin__card-name">{item.first_name} {item.last_name}</h3>
                            <span className={`admin__status ${getStatusBadgeClass(item.status)}`}>
                                {item.status || 'pending'}
                            </span>
                        </div>
                        <div className="admin__card-body">
                            <div className="admin__card-row">
                                <Mail size={14} />
                                <span>{item.email}</span>
                            </div>
                            <div className="admin__card-row">
                                <Phone size={14} />
                                <span>{item.phone}</span>
                            </div>
                            <div className="admin__card-row">
                                <Building2 size={14} />
                                <span>{item.organization_type}</span>
                            </div>
                            {item.organization_name && (
                                <div className="admin__card-row">
                                    <span className="admin__card-label">Organization:</span>
                                    <span>{item.organization_name}</span>
                                </div>
                            )}
                            {(item.city || item.country) && (
                                <div className="admin__card-row">
                                    <MapPin size={14} />
                                    <span>{[item.city, item.country].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                            {item.partnership_interest && (
                                <div className="admin__card-row admin__card-row--comments">
                                    <MessageSquare size={14} />
                                    <span>{item.partnership_interest}</span>
                                </div>
                            )}
                            <div className="admin__card-row">
                                <Calendar size={14} />
                                <span>{formatDate(item.created_at)}</span>
                            </div>
                        </div>
                        <div className="admin__card-actions">
                            <select
                                value={item.status || 'pending'}
                                onChange={(e) => onStatusChange(item.id, e.target.value)}
                                className="admin__status-select"
                            >
                                <option value="pending">Pending</option>
                                <option value="contacted">Contacted</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="admin__table-container">
                <table className="admin__table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Organization</th>
                            <th>Location</th>
                            <th>Interest</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td className="admin__td-name">
                                    {item.first_name} {item.last_name}
                                </td>
                                <td>
                                    <div className="admin__td-contact">
                                        <span>{item.email}</span>
                                        <span>{item.phone}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="admin__td-org">
                                        <span className="admin__td-org-type">{item.organization_type}</span>
                                        {item.organization_name && (
                                            <span className="admin__td-org-name">{item.organization_name}</span>
                                        )}
                                    </div>
                                </td>
                                <td>{[item.city, item.country].filter(Boolean).join(', ') || '-'}</td>
                                <td className="admin__td-comments">{item.partnership_interest || '-'}</td>
                                <td>
                                    <select
                                        value={item.status || 'pending'}
                                        onChange={(e) => onStatusChange(item.id, e.target.value)}
                                        className={`admin__status-select ${getStatusBadgeClass(item.status)}`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </td>
                                <td className="admin__td-date">{formatDate(item.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default AdminDash
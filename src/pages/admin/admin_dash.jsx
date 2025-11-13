import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'

const AdminDash = () => {
    const [waitlistData, setWaitlistData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchWaitlistData()
    }, [])

    const fetchWaitlistData = async () => { 
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('waitlist')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setWaitlistData(data)
            setError(null)
        } catch (error) {
            console.error('Error fetching waitlist:', error)
            setError('Failed to load waitlist data')
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

    const exportToCSV = () => {
        if (waitlistData.length === 0) return

        // CSV headers
        const headers = ['Full Name', 'Email', 'City & Service', 'Comments', 'Date Joined']

        // CSV rows
        const rows = waitlistData.map(item => [
            item.full_name,
            item.email,
            item.city_service,
            item.comments || '',
            formatDate(item.created_at)
        ])

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `locappoint-waitlist-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="admin">
                <div className="admin__container">
                    <div className="admin__loading">Loading waitlist data...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="admin">
                <div className="admin__container">
                    <div className="admin__error">{error}</div>
                    <button onClick={fetchWaitlistData} className="btn btn--primary">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="admin">
            <div className="admin__container">
                <div className="admin__header">
                    <div>
                        <h1 className="admin__title">Waitlist Admin</h1>
                        <p className="admin__subtitle">
                            Total signups: <strong>{waitlistData.length}</strong>
                        </p>
                    </div>
                    <div className="admin__actions">
                        <button
                            onClick={fetchWaitlistData}
                            className="btn btn--secondary"
                            disabled={loading}
                        >
                            Refresh
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="btn btn--primary"
                            disabled={waitlistData.length === 0}
                        >
                            Export CSV
                        </button>
                    </div>
                </div>

                {waitlistData.length === 0 ? (
                    <div className="admin__empty">
                        <p>No signups yet. Share the waitlist link to get started!</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="admin__cards">
                            {waitlistData.map((item) => (
                                <div key={item.id} className="admin__card">
                                    <div className="admin__card-header">
                                        <h3 className="admin__card-name">{item.full_name}</h3>
                                        <span className="admin__card-date">
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    
                                    <div className="admin__card-row">
                                        <div className="admin__card-label">Email</div>
                                        <div className="admin__card-value">{item.email}</div>
                                    </div>

                                    <div className="admin__card-row">
                                        <div className="admin__card-label">City & Service</div>
                                        <div className="admin__card-value">{item.city_service}</div>
                                    </div>

                                    {item.comments && (
                                        <div className="admin__card-row">
                                            <div className="admin__card-label">Comments</div>
                                            <div className="admin__card-value">{item.comments}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
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
                                    {waitlistData.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.full_name}</td>
                                            <td>{item.email}</td>
                                            <td>{item.city_service}</td>
                                            <td className="admin__comments">
                                                {item.comments || '-'}
                                            </td>
                                            <td>{formatDate(item.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default AdminDash
// AdminDash - Section dispatcher. Receives data via props, renders active section component.

import { Loader2, AlertCircle } from 'lucide-react'
import AnalyticsTab from './tabs/AnalyticsTab'
import WaitlistTab from './tabs/WaitlistTab'
import PartnershipTab from './tabs/PartnershipTab'
import ErrorsTab from './tabs/ErrorsTab'
import OverviewTab from './tabs/OverviewTab'
import BusinessesTab from './tabs/BusinessesTab'
import BookingsTab from './tabs/BookingsTab'
import PeopleTab from './tabs/PeopleTab'
import SupportTab from './tabs/SupportTab'
import BlocksTab from './tabs/BlocksTab'
import ReliabilityTab from './tabs/ReliabilityTab'
import VerificationTab from './tabs/VerificationTab'
import WhatsAppTab from './tabs/WhatsAppTab'

const AdminDash = ({
    activeSection,
    setActiveSection,
    loading,
    error,
    onRetry,
    waitlistData,
    partnershipData,
    analyticsData,
    dateRange,
    setDateRange,
    formatDate,
    formatTime,
    onExportWaitlist,
    onExportPartnership,
    onExportSessions,
    onExportEvents,
    onStatusChange,
    onDeleteWaitlist,
    onDeletePartnership,
    onSupportCount,
    onBlocksCount,
    onVerifyCount
}) => {
    // These load their own data, so they never wait for the waitlist and analytics.
    if (activeSection === 'overview') return <div className="admin-dashboard"><OverviewTab onGo={setActiveSection} /></div>
    if (activeSection === 'businesses') return <div className="admin-dashboard"><BusinessesTab formatDate={formatDate} /></div>
    if (activeSection === 'bookings') return <div className="admin-dashboard"><BookingsTab /></div>
    if (activeSection === 'people') return <div className="admin-dashboard"><PeopleTab /></div>
    if (activeSection === 'support') return <div className="admin-dashboard"><SupportTab onCount={onSupportCount} /></div>
    if (activeSection === 'blocks') return <div className="admin-dashboard"><BlocksTab onCount={onBlocksCount} /></div>
    if (activeSection === 'reliability') return <div className="admin-dashboard"><ReliabilityTab /></div>
    if (activeSection === 'verification') return <div className="admin-dashboard"><VerificationTab onCount={onVerifyCount} /></div>
    if (activeSection === 'whatsapp') return <div className="admin-dashboard"><WhatsAppTab /></div>

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="loading-state">
                    <Loader2 size={24} className="loading-spinner" aria-hidden="true" />
                    <span>Loading...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="admin-dashboard">
                <div className="error-state">
                    <AlertCircle size={24} aria-hidden="true" />
                    <span>{error}</span>
                    <button type="button" onClick={onRetry} className="btn btn--primary">
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-dashboard">
            {activeSection === 'analytics' && (
                <AnalyticsTab
                    data={analyticsData}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    onExportSessions={onExportSessions}
                    onExportEvents={onExportEvents}
                    formatDate={formatDate}
                    formatTime={formatTime}
                />
            )}
            {activeSection === 'waitlist' && (
                <WaitlistTab
                    data={waitlistData}
                    formatDate={formatDate}
                    onExport={onExportWaitlist}
                    onDelete={onDeleteWaitlist}
                />
            )}
            {activeSection === 'partnership' && (
                <PartnershipTab
                    data={partnershipData}
                    formatDate={formatDate}
                    onExport={onExportPartnership}
                    onStatusChange={onStatusChange}
                    onDelete={onDeletePartnership}
                />
            )}
            {activeSection === 'errors' && <ErrorsTab formatDate={formatDate} formatTime={formatTime} />}
        </div>
    )
}

export default AdminDash

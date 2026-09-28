import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button, Segmented, Toast } from '../../components/ui'
import { UpcomingBooking } from '../../components/client/bookings/UpcomingBooking'
import { PastBooking } from '../../components/client/bookings/PastBooking'
import { CancelSheet } from '../../components/client/bookings/CancelSheet'
import { EmptyTicket } from '../../components/client/bookings/EmptyTicket'
import { cancelMyBooking, loadMyBookings } from '../../services/booking'
import { todayKey } from '../../services/dates'
import '../../styles/client/client-bookings.css'

const ACTIVE = ['pending', 'confirmed']

const ClientAppointments = () => {
    const { user, userProfile } = useAuth()
    const email = userProfile?.email || user?.email || ''
    const [state, setState] = useState({ status: 'loading', rows: [] })
    const [view, setView] = useState('upcoming')
    const [cancelling, setCancelling] = useState(null)
    const [busy, setBusy] = useState(false)
    const [cancelError, setCancelError] = useState('')
    const [toast, setToast] = useState(null)

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            setState({ status: 'ready', rows: await loadMyBookings(email) })
        } catch (err) {
            console.error('Bookings failed:', err)
            setState({ status: 'error', rows: [] })
        }
    }, [email])

    useEffect(() => { if (email) load() }, [email, load])

    useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 3200)
        return () => clearTimeout(timer)
    }, [toast])

    const groups = useMemo(() => {
        const today = todayKey()
        const upcoming = state.rows.filter((r) => r.appointment_date >= today && ACTIVE.includes(r.status))
        const past = state.rows.filter((r) => r.status !== 'cancelled' && !upcoming.includes(r)).reverse()
        const cancelled = state.rows.filter((r) => r.status === 'cancelled').reverse()
        return { upcoming, past, cancelled }
    }, [state.rows])

    const confirmCancel = async () => {
        setBusy(true)
        setCancelError('')
        try {
            await cancelMyBooking(cancelling.id)
            setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === cancelling.id ? { ...r, status: 'cancelled' } : r)) }))
            setCancelling(null)
            setToast('Booking cancelled')
        } catch (err) {
            console.error('Cancel failed:', err)
            setCancelError('We could not cancel it. Try again, or message the business.')
        } finally {
            setBusy(false)
        }
    }

    const options = [
        { value: 'upcoming', label: `Upcoming ${groups.upcoming.length}` },
        { value: 'past', label: `Past ${groups.past.length}` },
        { value: 'cancelled', label: `Cancelled ${groups.cancelled.length}` },
    ]

    return (
        <div className="biz-page lc-cl-bookings">
            <header className="lc-cl-bookings__head">
                <h1 className="biz-page__title">Your bookings</h1>
                {state.status === 'ready' && state.rows.length > 0 && (
                    <Segmented options={options} value={view} onChange={setView} label="Show" />
                )}
            </header>

            {state.status === 'loading' && (
                <div className="lc-cl-bk is-lead" aria-hidden="true">
                    <span className="lc-skel" style={{ width: 140, height: 18 }} />
                    <span className="lc-skel" style={{ width: '100%', height: 190, borderRadius: 16 }} />
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-cl-bookings__error" role="alert">
                    <p>We could not load your bookings. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && view === 'upcoming' && (
                groups.upcoming.length === 0 ? <EmptyTicket /> : (
                    <div className="lc-cl-bookings__list">
                        {groups.upcoming.map((b, i) => (
                            <UpcomingBooking key={b.id} booking={b} lead={i === 0} onCancel={(row) => { setCancelError(''); setCancelling(row) }} />
                        ))}
                    </div>
                )
            )}

            {state.status === 'ready' && view !== 'upcoming' && (
                groups[view].length === 0 ? (
                    <p className="lc-cl-bookings__none">{view === 'past' ? 'No past bookings yet.' : 'Nothing cancelled.'}</p>
                ) : (
                    <ul className="lc-cl-pastlist">
                        {groups[view].map((b) => <PastBooking key={b.id} booking={b} />)}
                    </ul>
                )
            )}

            <CancelSheet booking={cancelling} busy={busy} error={cancelError} onKeep={() => !busy && setCancelling(null)} onConfirm={confirmCancel} />

            {createPortal(<div className="lc-cl-toast">{toast && <Toast message={toast} tone="success" />}</div>, document.body)}
        </div>
    )
}

export default ClientAppointments

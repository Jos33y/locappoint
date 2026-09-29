import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RotateCw, UserRound } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { UpcomingBooking } from '../../components/client/bookings/UpcomingBooking'
import { PastBooking } from '../../components/client/bookings/PastBooking'
import { CancelSheet } from '../../components/client/bookings/CancelSheet'
import { BookingToast } from '../../components/client/bookings/BookingToast'
import { BookingSheet } from '../../components/booking/BookingSheet'
import { USER_ERRORS, bookingPrice, cancelByLink, loadByLink, loadWeek, rescheduleByLink } from '../../services/booking'
import { todayKey } from '../../services/dates'
import '../../styles/public-page.css'
import '../../styles/client/client-bookings.css'
import '../../styles/client/manage-booking.css'

// The page behind "Manage booking" in every booking email. No sign-in: the link is the key.
const ManageBooking = () => {
    const { token = '' } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [state, setState] = useState({ status: 'loading', booking: null })
    const [cancelling, setCancelling] = useState(false)
    const [busy, setBusy] = useState(false)
    const [cancelError, setCancelError] = useState('')
    const [moving, setMoving] = useState(null)
    const [toast, setToast] = useState(null)
    const [moveError, setMoveError] = useState('')

    const load = useCallback(async () => {
        try {
            const booking = await loadByLink(token)
            setState({ status: booking ? 'ready' : 'missing', booking })
        } catch (err) {
            console.error('Booking link failed:', err)
            setState((s) => ({ status: 'error', booking: s.booking }))
        }
    }, [token])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 3200)
        return () => clearTimeout(timer)
    }, [toast])

    const confirmCancel = async () => {
        setBusy(true)
        setCancelError('')
        try {
            await cancelByLink(token)
            setCancelling(false)
            setToast('Booking cancelled')
            await load()
        } catch (err) {
            setCancelError(USER_ERRORS.includes(err?.code) && err.message ? err.message : 'We could not cancel it. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    const askMove = async (booking) => {
        setMoveError('')
        try {
            const week = await loadWeek(booking.businesses.id)
            setMoving({ booking, week })
        } catch (err) {
            console.error('Hours failed:', err)
            setMoveError('We could not load the free times. Check your connection and try again.')
        }
    }

    const b = state.booking
    const upcoming = b && ['pending', 'confirmed'].includes(b.status) && b.appointment_date >= todayKey()
    const guest = b && !b.has_account && !user

    return (
        <div className="lc-pubpage">
            <AppHeader />
            <main className="lc-pubpage__main lc-mb">
                {state.status === 'loading' && (
                    <div className="lc-mb__skel" aria-hidden="true">
                        <Skeleton height={28} width={180} />
                        <Skeleton height={220} radius={16} />
                    </div>
                )}

                {state.status === 'missing' && (
                    <EmptyState
                        title="This link does not open a booking"
                        body="It may be incomplete. Open it again from your booking email, or find the business and book again."
                        actions={<Button to="/businesses">Browse businesses</Button>}
                    />
                )}

                {state.status === 'error' && !b && (
                    <EmptyState
                        title="We could not load your booking"
                        body="Check your connection and try again."
                        actions={<Button icon={RotateCw} onClick={load}>Try again</Button>}
                    />
                )}

                {b && (
                    <>
                        <header className="lc-mb__head">
                            <h1 className="lc-mb__title">Your booking</h1>
                            <p className="lc-mb__sub">For {b.client_name}. No sign-in needed on this page.</p>
                        </header>

                        {moveError && <p className="lc-mb__error" role="alert">{moveError}</p>}
                        {upcoming ? (
                            <UpcomingBooking booking={b} lead onCancel={() => { setCancelError(''); setCancelling(true) }} onMove={askMove} />
                        ) : (
                            <ul className="lc-cl-pastlist">
                                <PastBooking booking={b} />
                            </ul>
                        )}

                        {guest && (
                            <aside className="lc-mb__account">
                                <span className="lc-mb__icon" aria-hidden="true"><UserRound size={20} /></span>
                                <div className="lc-mb__text">
                                    <p className="lc-mb__heading">Keep your bookings together</p>
                                    <p>Create a free account with {b.client_email} and this booking, and every one after it, is in one place.</p>
                                </div>
                                <Button variant="secondary" onClick={() => navigate('/auth', { state: { tab: 'signup', userType: 'client', email: b.client_email } })}>Create account</Button>
                            </aside>
                        )}
                        {user && <p className="lc-mb__all"><Link to="/client/appointments">See all your bookings</Link></p>}
                    </>
                )}
            </main>
            <AppFooter />

            <CancelSheet booking={cancelling ? b : null} busy={busy} error={cancelError} onKeep={() => setCancelling(false)} onConfirm={confirmCancel} />
            {moving && (
                <BookingSheet
                    business={moving.booking.businesses}
                    service={{ ...moving.booking.services, duration_minutes: moving.booking.duration_minutes || moving.booking.services.duration_minutes, price: bookingPrice(moving.booking) }}
                    week={moving.week}
                    move={moving.booking}
                    mover={({ dateKey, minutes }) => rescheduleByLink({ token, dateKey, minutes })}
                    onMoved={() => { setToast('Booking moved'); load() }}
                    onClose={() => setMoving(null)}
                />
            )}
            <BookingToast message={toast} />
        </div>
    )
}

export default ManageBooking

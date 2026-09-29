import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RotateCcw, RotateCw, UserRound } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { UpcomingBooking } from '../../components/client/bookings/UpcomingBooking'
import { PastBooking } from '../../components/client/bookings/PastBooking'
import { CancelSheet } from '../../components/client/bookings/CancelSheet'
import { BookingToast } from '../../components/client/bookings/BookingToast'
import { BookingSheet } from '../../components/booking/BookingSheet'
import { USER_ERRORS, bookingPrice, cancelByLink, gapLabel, isAhead, loadByLink, loadRebookByLink, loadWeek, rebookFrom, rescheduleByLink, shortDate, stopEmailsByLink } from '../../services/booking'
import '../../styles/public-page.css'
import '../../styles/client/client-bookings.css'
import '../../styles/client/manage-booking.css'
import '../../styles/client/rebook.css'
import { LinkReview } from '../../components/reviews/LinkReview'
import { reviewByLink, submitReviewByLink } from '../../services/reviews'

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
    const [params, setParams] = useSearchParams()
    const [info, setInfo] = useState(null)
    const [review, setReview] = useState(null)
    const preset = Number(params.get('rate')) || null
    const [again, setAgain] = useState(null)
    const [stop, setStop] = useState({ status: params.get('stop') === '1' ? 'ask' : 'idle', error: '' })
    const wantsAgain = params.get('again') === '1'

    const load = useCallback(async () => {
        try {
            const [booking, rebook, reviewState] = await Promise.all([
                loadByLink(token),
                loadRebookByLink(token).catch((err) => { console.error('Book again failed:', err); return null }),
                reviewByLink(token).catch((err) => { console.error('Review failed:', err); return null }),
            ])
            setInfo(rebook)
            setReview(reviewState)
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
    const upcoming = b && ['pending', 'confirmed'].includes(b.status) && isAhead(b)
    const guest = b && !b.has_account && !user
    const canAgain = Boolean(b && !upcoming && info?.booking?.service?.active)
    const rhythm = info?.rhythm

    const startAgain = useCallback(async () => {
        setMoveError('')
        try {
            const week = await loadWeek(info.business.id)
            setAgain({
                business: info.business,
                week,
                rebook: rebookFrom({
                    service: info.booking.service,
                    staffId: info.booking.staff_id,
                    staffName: info.booking.staff_name,
                    staffCount: info.booking.staff_count,
                    rhythm: info.rhythm,
                    client: info.client,
                }),
            })
        } catch (err) {
            console.error('Hours failed:', err)
            setMoveError('We could not load the free times. Check your connection and try again.')
        }
    }, [info])

    // "Book again" in the follow-up email lands here with ?again=1.
    useEffect(() => {
        if (!wantsAgain || state.status !== 'ready') return
        if (canAgain) startAgain()
        setParams((prev) => { const next = new URLSearchParams(prev); next.delete('again'); return next }, { replace: true })
    }, [wantsAgain, state.status, canAgain, startAgain, setParams])

    const stopEmails = async () => {
        setStop({ status: 'busy', error: '' })
        try {
            await stopEmailsByLink(token)
            setStop({ status: 'done', error: '' })
        } catch (err) {
            console.error('Stop emails failed:', err)
            setStop({ status: 'ask', error: 'We could not do that. Check your connection and try again.' })
        }
    }
    const stopped = stop.status === 'done' || (stop.status !== 'idle' && info?.emails_stopped)

    let againText = `Same ${info?.booking?.service?.service_name || 'service'} at ${info?.business?.business_name || 'this place'}, straight to the free times.`
    if (rhythm?.gap_days) {
        againText = rhythm.due_date && rhythm.due_date < rhythm.today
            ? `You come about every ${gapLabel(rhythm.gap_days)}, so you are due.`
            : `You come about every ${gapLabel(rhythm.gap_days)}. Next due ${shortDate(rhythm.due_date)}.`
    }

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

                        {stop.status !== 'idle' && (
                            <section className="lc-again-stop" aria-live="polite">
                                {stopped ? (
                                    <p><b>Done.</b> No more follow-up emails to {b.client_email}. Confirmations and changes to your bookings still arrive.</p>
                                ) : (
                                    <>
                                        <p className="lc-again-stop__title">Stop follow-up emails?</p>
                                        <p>You will not get emails after a visit asking you to book again, from any business on Locappoint. Confirmations and changes to your bookings still arrive.</p>
                                        {stop.error && <p className="lc-mb__error" role="alert">{stop.error}</p>}
                                        <div className="lc-again-stop__actions">
                                            <Button variant="secondary" onClick={() => setStop({ status: 'idle', error: '' })}>Keep them</Button>
                                            <Button loading={stop.status === 'busy'} onClick={stopEmails}>Stop them</Button>
                                        </div>
                                    </>
                                )}
                            </section>
                        )}

                        {moveError && <p className="lc-mb__error" role="alert">{moveError}</p>}
                        {upcoming ? (
                            <UpcomingBooking booking={b} lead onCancel={() => { setCancelError(''); setCancelling(true) }} onMove={askMove} />
                        ) : (
                            <ul className="lc-cl-pastlist">
                                <PastBooking booking={b} />
                            </ul>
                        )}

                        {!upcoming && (
                            <LinkReview
                                state={review}
                                businessName={b.businesses?.business_name || 'the business'}
                                preset={preset >= 1 && preset <= 5 ? preset : null}
                                onSubmit={async (values) => setReview(await submitReviewByLink({ token, ...values }))}
                            />
                        )}
                        {canAgain && (
                            <aside className="lc-mb__account lc-again-mb">
                                <span className="lc-mb__icon" aria-hidden="true"><RotateCcw size={20} /></span>
                                <div className="lc-mb__text">
                                    <p className="lc-mb__heading">Book your next visit</p>
                                    <p>{againText}</p>
                                </div>
                                <Button icon={RotateCcw} onClick={startAgain}>Book again</Button>
                            </aside>
                        )}
                        {b && !upcoming && info && !canAgain && info.business?.slug && (
                            <p className="lc-mb__all"><Link to={`/${info.business.slug}`}>See {info.business.business_name}'s services</Link></p>
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
            {again && (
                <BookingSheet
                    business={again.business}
                    service={again.rebook.service}
                    week={again.week}
                    rebook={again.rebook}
                    onClose={() => { setAgain(null); load() }}
                />
            )}
            <BookingToast message={toast} />
        </div>
    )
}

export default ManageBooking

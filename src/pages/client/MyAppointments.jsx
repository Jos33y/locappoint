import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button, Segmented } from '../../components/ui'
import { UpcomingBooking } from '../../components/client/bookings/UpcomingBooking'
import { PastBooking } from '../../components/client/bookings/PastBooking'
import { CancelSheet } from '../../components/client/bookings/CancelSheet'
import { EmptyTicket } from '../../components/client/bookings/EmptyTicket'
import { BookingToast } from '../../components/client/bookings/BookingToast'
import { useMyBookings } from '../../components/client/bookings/useMyBookings'
import { useRebook } from '../../components/client/bookings/useRebook'
import { RateSheet } from '../../components/reviews/RateSheet'
import { submitMyReview } from '../../services/reviews'
import { BookingSheet } from '../../components/booking/BookingSheet'
import { bookingPrice } from '../../services/booking'
import '../../styles/client/client-bookings.css'

const ClientAppointments = () => {
    const { user, userProfile } = useAuth()
    const email = userProfile?.email || user?.email || ''
    const { state, groups, load, cancelling, busy, cancelError, toast, askCancel, keep, confirmCancel, moving, moveError, askMove, closeMove, moved } = useMyBookings(email)
    const [view, setView] = useState('upcoming')
    const [params, setParams] = useSearchParams()
    const [focused, setFocused] = useState(null)
    const linked = params.get('booking')
    const againId = params.get('again')
    const rateId = params.get('rate')
    const [rating, setRating] = useState(null)
    const rebook = useRebook(Boolean(email))
    const { openRow, places: rebookPlaces } = rebook

    // Links from emails and notifications carry ?booking=<id>: show its tab and bring it into view.
    useEffect(() => {
        if (!linked || state.status !== 'ready') return
        const tab = ['upcoming', 'past', 'cancelled'].find((key) => groups[key].some((b) => b.id === linked))
        if (tab) {
            setView(tab)
            setFocused(linked)
        }
        setParams((prev) => { const next = new URLSearchParams(prev); next.delete('booking'); return next }, { replace: true })
    }, [linked, state.status, groups, setParams])

    // The follow-up bell item carries ?again=<id>: open "Book again" for that visit.
    useEffect(() => {
        if (!againId || state.status !== 'ready' || rebookPlaces.status === 'loading') return
        const row = state.rows.find((b) => b.id === againId)
        if (row?.services?.id && row.businesses) openRow(row)
        setParams((prev) => { const next = new URLSearchParams(prev); next.delete('again'); return next }, { replace: true })
    }, [againId, state.status, state.rows, rebookPlaces.status, openRow, setParams])

    // The follow-up bell item carries ?rate=<id>: open the review for that visit.
    useEffect(() => {
        if (!rateId || state.status !== 'ready') return
        const row = state.rows.find((b) => b.id === rateId)
        if (row) {
            setView('past')
            setRating(row)
        }
        setParams((prev) => { const next = new URLSearchParams(prev); next.delete('rate'); return next }, { replace: true })
    }, [rateId, state.status, state.rows, setParams])

    const saveReview = async (row, values) => {
        const result = await submitMyReview({ id: row.id, ...values })
        moved()
        return result
    }

    const againFromReview = (row) => {
        setRating(null)
        openRow(row)
    }

    const closeAgain = () => {
        rebook.close()
        moved()
        rebook.reload()
    }

    useEffect(() => {
        if (!focused) return undefined
        document.getElementById(`booking-${focused}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const timer = setTimeout(() => setFocused(null), 2600)
        return () => clearTimeout(timer)
    }, [focused, view])

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

            {(moveError || rebook.againError) && (
                <div className="lc-cl-bookings__error" role="alert">
                    <p>{moveError || rebook.againError}</p>
                </div>
            )}

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
                            <UpcomingBooking key={b.id} booking={b} lead={i === 0} focused={b.id === focused} onCancel={askCancel} onMove={askMove} />
                        ))}
                    </div>
                )
            )}

            {state.status === 'ready' && view !== 'upcoming' && (
                groups[view].length === 0 ? (
                    <p className="lc-cl-bookings__none">{view === 'past' ? 'No past bookings yet.' : 'Nothing cancelled.'}</p>
                ) : (
                    <ul className="lc-cl-pastlist">
                        {groups[view].map((b) => <PastBooking key={b.id} booking={b} focused={b.id === focused} onAgain={rebook.openRow} onRate={setRating} />)}
                    </ul>
                )
            )}

            <CancelSheet booking={cancelling} busy={busy} error={cancelError} onKeep={keep} onConfirm={confirmCancel} />
            {moving && (
                <BookingSheet
                    business={moving.booking.businesses}
                    service={{ ...moving.booking.services, duration_minutes: moving.booking.duration_minutes || moving.booking.services.duration_minutes, price: bookingPrice(moving.booking) }}
                    week={moving.week}
                    move={moving.booking}
                    onMoved={moved}
                    onClose={closeMove}
                />
            )}
            {rating && <RateSheet booking={rating} onSave={saveReview} onAgain={againFromReview} onClose={() => setRating(null)} />}
            {rebook.again && (
                <BookingSheet
                    business={rebook.again.business}
                    service={rebook.again.rebook.service}
                    week={rebook.again.week}
                    rebook={rebook.again.rebook}
                    onClose={closeAgain}
                />
            )}
            <BookingToast message={toast} />
        </div>
    )
}

export default ClientAppointments

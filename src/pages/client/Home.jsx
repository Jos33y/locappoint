import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui'
import { UpcomingBooking } from '../../components/client/bookings/UpcomingBooking'
import { CancelSheet } from '../../components/client/bookings/CancelSheet'
import { EmptyTicket } from '../../components/client/bookings/EmptyTicket'
import { BookingToast } from '../../components/client/bookings/BookingToast'
import { useMyBookings } from '../../components/client/bookings/useMyBookings'
import { AgainCard } from '../../components/client/home/AgainCard'
import { useRebook } from '../../components/client/bookings/useRebook'
import { BookingSheet } from '../../components/booking/BookingSheet'
import { WaitingOnYou } from '../../components/client/home/WaitingOnYou'
import { PlaceResult } from '../../components/client/find/PlaceResult'
import { EngineBox } from '../../components/client/find/EngineBox'
import { RateSheet } from '../../components/reviews/RateSheet'
import { canReview, submitMyReview } from '../../services/reviews'
import { loadPlaces } from '../../services/booking'
import '../../styles/client/client-bookings.css'
import '../../styles/client/home-page.css'
import '../../styles/client/home-overview.css'

const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return 'Good evening'
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

const ClientHome = () => {
    const { user, userProfile } = useAuth()
    const email = userProfile?.email || user?.email || ''
    const first = (userProfile?.full_name || '').trim().split(/\s+/)[0]
    const { state, groups, load, cancelling, busy, cancelError, toast, askCancel, keep, confirmCancel } = useMyBookings(email)
    const rebook = useRebook(Boolean(email))
    const places = rebook.places.items.slice(0, 6)

    const closeAgain = () => {
        rebook.close()
        load()
        rebook.reload()
    }

    const next = groups.upcoming[0]
    const more = groups.upcoming.length - 1
    const [rating, setRating] = useState(null)
    const [popular, setPopular] = useState([])
    const toRate = groups.past.filter(canReview)
    const unconfirmed = groups.upcoming.filter((b) => b.status === 'pending' && b.id !== next?.id)
    const brandNew = state.status === 'ready' && state.rows.length === 0

    // Someone with no bookings yet sees places worth booking, best rated first, rather than an empty page.
    useEffect(() => {
        if (!brandNew) return undefined
        let cancelled = false
        loadPlaces()
            .then((all) => {
                if (cancelled) return
                const ranked = [...all].sort((a, b) => (b.rating?.count || 0) - (a.rating?.count || 0) || (b.rating?.average || 0) - (a.rating?.average || 0))
                setPopular(ranked.slice(0, 3))
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [brandNew])

    const saveReview = async (row, values) => {
        const result = await submitMyReview({ id: row.id, ...values })
        load()
        return result
    }

    const againFromReview = (row) => {
        setRating(null)
        rebook.openRow(row)
    }

    return (
        <div className="biz-page lc-cl-home">
            <header className="lc-cl-home__head">
                <h1 className="biz-page__title">{first ? `${greeting()}, ${first}` : greeting()}</h1>
                {state.status === 'ready' && !next && <p className="lc-cl-home__hello">Book your next visit in a minute.</p>}
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

            {state.status === 'ready' && (next ? (
                <section className="lc-cl-home__next" aria-label="Next booking">
                    <UpcomingBooking booking={next} lead onCancel={askCancel} />
                    {more > 0 && (
                        <Link to="/client/appointments" className="lc-cl-home__more">
                            <span>{more === 1 ? '1 more booking coming up' : `${more} more bookings coming up`}</span>
                            <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    )}
                </section>
            ) : <EmptyTicket />)}

            {state.status === 'ready' && <WaitingOnYou rate={toRate} waiting={unconfirmed} onRate={setRating} />}

            <EngineBox />
            <Link to="/client/search" className="lc-cl-home__more">
                <span>Or browse every place</span>
                <ArrowRight size={16} aria-hidden="true" />
            </Link>

            {places.length > 0 && (
                <section className="lc-cl-home__places" aria-labelledby="lc-cl-home-places">
                    <h2 id="lc-cl-home-places" className="lc-cl-home__h2">Book again</h2>
                    {rebook.againError && <p className="lc-again-error" role="alert">{rebook.againError}</p>}
                    <ul className="lc-again-list">
                        {places.map((item) => <AgainCard key={item.business.id} item={item} onBook={rebook.openPlace} />)}
                    </ul>
                </section>
            )}

            {brandNew && popular.length > 0 && (
                <section className="lc-cl-popular" aria-labelledby="lc-cl-popular-title">
                    <h2 id="lc-cl-popular-title" className="lc-cl-home__h2">Popular on Locappoint</h2>
                    <ul className="lc-cl-popular__list">
                        {popular.map((place) => <PlaceResult key={place.id} place={place} from="/client" />)}
                    </ul>
                </section>
            )}

            <CancelSheet booking={cancelling} busy={busy} error={cancelError} onKeep={keep} onConfirm={confirmCancel} />
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

export default ClientHome

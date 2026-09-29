import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCw, Search } from 'lucide-react'
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
import '../../styles/client/client-bookings.css'
import '../../styles/client/home-page.css'

const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return 'Good evening'
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

const ClientHome = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const email = userProfile?.email || user?.email || ''
    const first = (userProfile?.full_name || '').trim().split(/\s+/)[0]
    const { state, groups, load, cancelling, busy, cancelError, toast, askCancel, keep, confirmCancel } = useMyBookings(email)
    const [query, setQuery] = useState('')
    const rebook = useRebook(Boolean(email))
    const places = rebook.places.items.slice(0, 6)

    const closeAgain = () => {
        rebook.close()
        load()
        rebook.reload()
    }

    const next = groups.upcoming[0]
    const more = groups.upcoming.length - 1

    const find = (event) => {
        event.preventDefault()
        const q = query.trim()
        navigate(q ? `/client/search?q=${encodeURIComponent(q)}` : '/client/search')
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

            {next && <form className="lc-cl-home__find" role="search" onSubmit={find}>
                <label className="lc-cl-home__findlabel" htmlFor="lc-cl-home-q">Find a place</label>
                <span className="lc-cl-home__field">
                    <Search size={18} aria-hidden="true" />
                    <input
                        id="lc-cl-home-q"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Barber, nails, dentist, or a name"
                        autoComplete="off"
                        enterKeyHint="search"
                    />
                    <Button type="submit" size="sm">Search</Button>
                </span>
            </form>}

            {places.length > 0 && (
                <section className="lc-cl-home__places" aria-labelledby="lc-cl-home-places">
                    <h2 id="lc-cl-home-places" className="lc-cl-home__h2">Book again</h2>
                    {rebook.againError && <p className="lc-again-error" role="alert">{rebook.againError}</p>}
                    <ul className="lc-again-list">
                        {places.map((item) => <AgainCard key={item.business.id} item={item} onBook={rebook.openPlace} />)}
                    </ul>
                </section>
            )}

            <CancelSheet booking={cancelling} busy={busy} error={cancelError} onKeep={keep} onConfirm={confirmCancel} />
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

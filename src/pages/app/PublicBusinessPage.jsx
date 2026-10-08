import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, RotateCw } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { BookingSheet } from '../../components/booking/BookingSheet'
import { PublicPageView } from '../../components/business/PublicPageView'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { weekFromRows } from '../../services/hours'
import { clearPending, readBookParam, readPending } from '../../services/booking'
import { loadPublicReviews } from '../../services/reviews'
import { loadTrust } from '../../services/reliability'
import { bookOnWhatsApp, loadBookNumber } from '../../services/whatsapp'
import { trackPage, visitSource } from '../../services/pageStats'
import '../../styles/public-page.css'

const PUBLIC_FIELDS = 'id, business_name, slug, category, category_detail, city, neighbourhood, country, timezone, phone, whatsapp, email, website, description, address, logo_url, banner_url, auto_confirm, is_demo, service_zones, service_radius_km, lat, lng'

const PageSkeleton = () => (
    <div className="lc-pub lc-pub--skeleton" aria-hidden="true">
        <div className="lc-pub__cover"><Skeleton height="100%" radius={0} /></div>
        <div className="lc-pub__body">
            <div className="lc-pub__head">
                <span className="lc-pub__logo is-skeleton" />
                <div className="lc-pub__id">
                    <Skeleton width="min(320px, 70%)" height={30} />
                    <Skeleton width="min(220px, 50%)" height={14} />
                </div>
            </div>
            <div className="lc-pub__main">
                <div className="lc-pub__card lc-pub__list">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="lc-pub__skelrow">
                            <Skeleton circle height={36} />
                            <Skeleton width="45%" height={16} />
                            <Skeleton width={48} height={22} />
                        </span>
                    ))}
                </div>
            </div>
            <div className="lc-pub__aside">
                <div className="lc-pub__card lc-pub__status">
                    <div className="lc-pub__statusrow">
                        <Skeleton circle height={56} />
                        <div className="lc-pub__statustext">
                            <Skeleton width={96} height={14} />
                            <Skeleton width={150} height={28} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const LostPin = () => (
    <svg className="lc-pub__lost" width="148" height="112" viewBox="0 0 148 112" aria-hidden="true">
        <rect className="lc-pub__lostframe" x="8" y="8" width="132" height="96" rx="14" />
        <path className="lc-pub__loststreet" d="M8 38 L140 30 M8 78 L140 70 M46 8 L40 104 M104 8 L98 104" />
        <path className="lc-pub__lostpin" d="M74 30 C65 30 59 36.5 59 44.5 C59 55 74 68 74 68 C74 68 89 55 89 44.5 C89 36.5 83 30 74 30 Z" />
        <circle className="lc-pub__lostdot" cx="74" cy="84" r="3" />
    </svg>
)

const PublicBusinessPage = () => {
    const { businessSlug } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user, userProfile, business: ownBusiness } = useAuth()
    const [state, setState] = useState({ status: 'loading' })
    const [attempt, setAttempt] = useState(0)
    const [booking, setBooking] = useState(null)
    const [resume, setResume] = useState(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setState({ status: 'loading' })
            try {
                const { data: business, error } = await supabase
                    .from('businesses')
                    .select(PUBLIC_FIELDS)
                    .eq('slug', businessSlug)
                    .eq('is_active', true)
                    .maybeSingle()
                if (error) throw error
                if (!business) {
                    if (!cancelled) setState({ status: 'missing' })
                    return
                }
                const [services, hours] = await Promise.all([
                    supabase.from('services')
                        .select('id, service_name, duration_minutes, price, description, is_active, is_addon, sort_order, modes, travel_fee, max_people, price_per, extra_person_minutes')
                        .eq('business_id', business.id)
                        .eq('is_active', true)
                        .order('sort_order')
                        .order('service_name'),
                    supabase.from('availability')
                        .select('staff_id, day_of_week, start_time, end_time, is_active')
                        .eq('business_id', business.id)
                        .eq('is_active', true),
                ])
                if (services.error) throw services.error
                if (hours.error) throw hours.error
                if (!cancelled) setState({ status: 'ready', business, services: services.data, week: weekFromRows(hours.data) })
                // Reviews never hold the page up: it shows without them if they fail.
                loadPublicReviews(business.id)
                    .then((reviews) => { if (!cancelled && reviews) setState((s) => (s.business?.id === business.id ? { ...s, reviews } : s)) })
                    .catch((err) => console.error('Reviews failed:', err))
                loadTrust().then((all) => {
                    const trust = all.get(business.id)
                    if (!cancelled && trust) setState((s) => (s.business?.id === business.id ? { ...s, trust } : s))
                })
                // Book on WhatsApp shows only once WhatsApp is live; never holds the page up.
                loadBookNumber().then((number) => {
                    if (!cancelled && number) setState((s) => (s.business?.id === business.id ? { ...s, waBook: bookOnWhatsApp(number, business.business_name, business.slug) } : s))
                })
            } catch (err) {
                console.error('Business page load failed:', err)
                if (!cancelled) setState({ status: 'error' })
            }
        }
        load()
        return () => { cancelled = true }
    }, [businessSlug, attempt])

    useEffect(() => {
        if (state.status !== 'ready' || (ownBusiness?.id && ownBusiness.id === state.business.id)) return
        // A time picked in "What do you need?" opens for guests too; a time saved before sign-in needs the account.
        const fromLink = readBookParam(location.search)
        const pending = fromLink || (user ? readPending(state.business.slug) : null)
        const service = pending && state.services.find((s) => s.id === pending.serviceId)
        if (service) {
            setResume(pending)
            setBooking(service)
            clearPending()
        }
        if (fromLink) navigate(location.pathname, { replace: true, state: location.state })
    }, [state, user, ownBusiness, location.search, location.pathname, location.state, navigate])

    useEffect(() => {
        if (state.status !== 'ready') return undefined
        const previous = document.title
        document.title = `${state.business.business_name}, book online | Locappoint`
        return () => { document.title = previous }
    }, [state])

    const owner = state.status === 'ready' && Boolean(ownBusiness?.id) && ownBusiness.id === state.business.id

    const visitedId = state.status === 'ready' && !owner ? state.business.id : null
    const cameFromApp = Boolean(location.state?.from)
    useEffect(() => {
        if (visitedId) trackPage(visitedId, 'view', visitSource({ search: location.search, cameFromApp }))
    }, [visitedId, location.search, cameFromApp])

    const moreReviews = async () => {
        const next = await loadPublicReviews(state.business.id, state.reviews.items.length)
        setState((s) => ({ ...s, reviews: { ...next, items: [...s.reviews.items, ...next.items] } }))
    }

    const back = () => {
        if (location.state?.from) navigate(location.state.from)
        else navigate(userProfile ? '/client/search' : '/businesses')
    }

    return (
        <div className="lc-pubpage">
            <AppHeader />
            <main className="lc-pubpage__main">
                <div className="lc-pubpage__bar">
                    <Button variant="quiet" size="sm" icon={ArrowLeft} onClick={back}>Back</Button>
                    {owner && (
                        <p className="lc-pubpage__owner">
                            <span>Your live page, as clients see it</span>
                            <Button variant="secondary" size="sm" iconRight={ArrowUpRight} to="/portal/page">Edit page</Button>
                        </p>
                    )}
                </div>
                {state.status === 'loading' && <PageSkeleton />}
                {state.status === 'missing' && (
                    <EmptyState
                        illustration={<LostPin />}
                        title="This page is not live"
                        body="The business may have paused bookings or changed its address."
                        actions={<Button to="/businesses">Browse businesses</Button>}
                    />
                )}
                {state.status === 'error' && (
                    <EmptyState
                        illustration={<LostPin />}
                        title="We could not load this page"
                        body="Check your connection and try again."
                        actions={<Button icon={RotateCw} onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
                    />
                )}
                {state.status === 'ready' && (
                    <PublicPageView
                        business={state.business}
                        services={state.services}
                        week={state.week}
                        reviews={state.reviews}
                        trust={state.trust}
                        bookOnWhatsApp={state.waBook || null}
                        onMoreReviews={moreReviews}
                        onBook={(service) => { setResume(null); setBooking(service) }}
                    />
                )}
            </main>
            <AppFooter />
            {booking && state.status === 'ready' && (
                <BookingSheet
                    business={state.business}
                    service={booking}
                    extras={owner ? [] : state.services.filter((s) => s.is_addon && s.id !== booking.id)}
                    week={state.week}
                    resume={resume}
                    owner={owner}
                    onClose={() => { setBooking(null); setResume(null) }}
                />
            )}
        </div>
    )
}

export default PublicBusinessPage

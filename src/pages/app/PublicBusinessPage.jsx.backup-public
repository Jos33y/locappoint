import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import BookingModal from '../../components/booking/BookingModal'
import { PublicPageView } from '../../components/business/PublicPageView'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { weekFromRows } from '../../services/hours'
import '../../styles/public-page.css'

const PUBLIC_FIELDS = 'id, business_name, slug, category, category_detail, city, neighbourhood, country, timezone, phone, whatsapp, email, website, description, address, logo_url, banner_url'

const PageSkeleton = () => (
    <div className="lc-pubpage__skeleton" aria-hidden="true">
        <Skeleton height={220} radius={24} />
        <Skeleton width={88} height={88} radius={24} />
        <Skeleton width="60%" height={32} />
        <Skeleton width="40%" height={16} />
        {[0, 1, 2].map((i) => <Skeleton key={i} height={76} radius={16} />)}
    </div>
)

const PublicBusinessPage = () => {
    const { businessSlug } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { userProfile } = useAuth()
    const [state, setState] = useState({ status: 'loading' })
    const [booking, setBooking] = useState(null)

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
                        .select('id, service_name, duration_minutes, price, description, is_active, sort_order')
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
            } catch (err) {
                console.error('Business page load failed:', err)
                if (!cancelled) setState({ status: 'error' })
            }
        }
        load()
        return () => { cancelled = true }
    }, [businessSlug])

    useEffect(() => {
        if (state.status !== 'ready') return undefined
        const previous = document.title
        document.title = `${state.business.business_name}, book online | Locappoint`
        return () => { document.title = previous }
    }, [state])

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
                </div>
                {state.status === 'loading' && <PageSkeleton />}
                {(state.status === 'missing' || state.status === 'error') && (
                    <EmptyState
                        title={state.status === 'missing' ? 'This page is not live' : 'We could not load this page'}
                        body={state.status === 'missing'
                            ? 'The business may have paused bookings or changed its address.'
                            : 'Check your connection and reload the page.'}
                        actions={<Button to="/businesses">Browse businesses</Button>}
                    />
                )}
                {state.status === 'ready' && (
                    <PublicPageView
                        business={state.business}
                        services={state.services}
                        week={state.week}
                        onBook={(service) => setBooking(service)}
                    />
                )}
            </main>
            <AppFooter />
            {booking && state.status === 'ready' && (
                <BookingModal
                    business={state.business}
                    service={booking}
                    onClose={() => setBooking(null)}
                    onSuccess={() => setBooking(null)}
                />
            )}
        </div>
    )
}

export default PublicBusinessPage

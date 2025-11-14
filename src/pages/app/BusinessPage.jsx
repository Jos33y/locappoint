import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { MapPin, Phone, Mail, Globe, Clock, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import BookingModal from '../../components/booking/BookingModal'
import '../../styles/client/client.css'

const PublicBusinessPage = () => {
    const { businessSlug } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { userProfile } = useAuth()

    const [business, setBusiness] = useState(null)
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Booking modal state
    const [selectedService, setSelectedService] = useState(null)
    const [showBookingModal, setShowBookingModal] = useState(false)

    useEffect(() => {
        fetchBusinessData()
    }, [businessSlug])

    const fetchBusinessData = async () => {
        try {
            // Fetch business details
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('slug', businessSlug)
                .eq('is_active', true)
                .single()

            if (businessError) throw businessError

            if (!businessData) {
                setError('Business not found')
                setLoading(false)
                return
            }

            setBusiness(businessData)

            // Fetch services
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', businessData.id)
                .eq('is_active', true)
                .order('price', { ascending: true })

            if (servicesError) throw servicesError
            setServices(servicesData || [])

        } catch (error) {
            console.error('Error fetching business:', error)
            setError('Failed to load business information')
        } finally {
            setLoading(false)
        }
    }

    const handleBookService = (service) => {
        setSelectedService(service)
        setShowBookingModal(true)
    }

    const handleBookingSuccess = () => {
        setShowBookingModal(false)
        setSelectedService(null)
        // Optionally navigate to appointments page
        // navigate('/app/appointments')
    }

    const handleBackButton = () => {
        // Check where user came from
        if (location.state?.from) {
            navigate(location.state.from)
        } else if (userProfile?.user_type === 'client') {
            // Logged in client - go to client search
            navigate('/client/search')
        } else {
            // Default - go to public businesses page
            navigate('/app/businesses')
        }
    }

    if (loading) {
        return (
            <div className="business-page-wrapper">
                <AppHeader />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading business...</p>
                </div>
                <AppFooter />
            </div>
        )
    }

    if (error || !business) {
        return (
            <div className="business-page-wrapper">
                <AppHeader />
                <div className="empty-state" style={{ minHeight: '50vh' }}>
                    <h2>Business Not Found</h2>
                    <p>{error || 'The business you are looking for does not exist or is no longer active.'}</p>
                    <button onClick={() => navigate('/app/businesses')} className="btn btn--primary">
                        Browse Businesses
                    </button>
                </div>
                <AppFooter />
            </div>
        )
    }

    return (
        <div className="business-page-wrapper">
            <AppHeader />

            <main className="public-business-page">
                <div className="container">
                    {/* Back Button */}
                    <button
                        onClick={handleBackButton}
                        className="btn btn--ghost"
                        style={{ marginBottom: 'var(--space-4)' }}
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>

                    {/* Business Header */}
                    <div className="business-header-card">
                        <div className="business-banner">
                            {business.banner_url ? (
                                <img src={business.banner_url} alt={business.business_name} />
                            ) : (
                                <div className="banner-placeholder"></div>
                            )}
                        </div>

                        <div className="business-header-content">
                            <div className="business-logo-large">
                                {business.logo_url ? (
                                    <img src={business.logo_url} alt={business.business_name} />
                                ) : (
                                    <div className="logo-placeholder-large">
                                        {business.business_name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="business-info">
                                <h1>{business.business_name}</h1>

                                <div className="business-meta-row">
                                    {business.category && (
                                        <span className="business-badge">{business.category}</span>
                                    )}
                                    {business.city && (
                                        <div className="meta-item">
                                            <MapPin size={16} />
                                            <span>
                                                {business.city}
                                                {business.location && `, ${business.location}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {business.description && (
                                    <p className="business-description">{business.description}</p>
                                )}

                                {/* Contact Info */}
                                <div className="business-contact">
                                    {business.phone && (
                                        <a href={`tel:${business.phone}`} className="contact-link">
                                            <Phone size={16} />
                                            {business.phone}
                                        </a>
                                    )}
                                    {business.email && (
                                        <a href={`mailto:${business.email}`} className="contact-link">
                                            <Mail size={16} />
                                            {business.email}
                                        </a>
                                    )}
                                    {business.website && (
                                        <a
                                            href={business.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-link"
                                        >
                                            <Globe size={16} />
                                            Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Services Section */}
                    <div className="services-section">
                        <h2>Our Services</h2>

                        {services.length === 0 ? (
                            <div className="empty-state">
                                <Clock size={48} className="empty-state-icon" />
                                <h3>No Services Available</h3>
                                <p>This business hasn't added any services yet.</p>
                            </div>
                        ) : (
                            <div className="services-grid-public">
                                {services.map((service) => (
                                    <div key={service.id} className="service-card-public">
                                        <div className="service-card-header">
                                            <h3>{service.service_name}</h3>
                                            <span className="service-price">€{service.price}</span>
                                        </div>

                                        <div className="service-card-body">
                                            <div className="service-duration">
                                                <Clock size={14} />
                                                <span>{service.duration_minutes} min</span>
                                            </div>

                                            {service.description && (
                                                <p className="service-description">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleBookService(service)}
                                            className="btn btn--primary"
                                            style={{ width: '100%' }}
                                        >
                                            Book Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <AppFooter />

            {/* Booking Modal */}
            {showBookingModal && selectedService && (
                <BookingModal
                    business={business}
                    service={selectedService}
                    onClose={() => setShowBookingModal(false)}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </div>
    )
}

export default PublicBusinessPage
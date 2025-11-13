import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppFooter from '../../components/common/Appfooter'
import { supabase } from '../../config/supabase'
import { Search as SearchIcon, MapPin, Filter, X } from 'lucide-react'
import '../../styles/app/businesses.css'
import AppHeader from '../../components/common/AppHeader'

const AppBusinesses = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const [businesses, setBusinesses] = useState([])
    const [filteredBusinesses, setFilteredBusinesses] = useState([])
    const [loading, setLoading] = useState(true)

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
    const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '')

    useEffect(() => {
        fetchBusinesses()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [businesses, searchQuery, selectedCategory, selectedCity])

    const fetchBusinesses = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select(`
                    id,
                    business_name,
                    slug,
                    description,
                    category,
                    city,
                    location,
                    is_active
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setBusinesses(data || [])
        } catch (error) {
            console.error('Error fetching businesses:', error)
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = () => {
        let filtered = [...businesses]

        // Search query filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(business =>
                business.business_name.toLowerCase().includes(query) ||
                business.description?.toLowerCase().includes(query) ||
                business.category?.toLowerCase().includes(query)
            )
        }

        // Category filter
        if (selectedCategory) {
            filtered = filtered.filter(business =>
                business.category === selectedCategory
            )
        }

        // City filter
        if (selectedCity) {
            filtered = filtered.filter(business =>
                business.city === selectedCity
            )
        }

        setFilteredBusinesses(filtered)
    }

    const handleSearch = (e) => {
        e.preventDefault()
        updateSearchParams()
    }

    const updateSearchParams = () => {
        const params = new URLSearchParams()
        if (searchQuery) params.set('q', searchQuery)
        if (selectedCategory) params.set('category', selectedCategory)
        if (selectedCity) params.set('city', selectedCity)
        setSearchParams(params)
    }

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedCategory('')
        setSelectedCity('')
        setSearchParams(new URLSearchParams())
    }

    const hasActiveFilters = searchQuery || selectedCategory || selectedCity

    if (loading) {
        return (
            <div className="businesses-page">
                <AppHeader />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading businesses...</p>
                </div>
                <AppFooter />
            </div>
        )
    }

    return (
        <div className="businesses-page-wrapper">
            <AppHeader />

            <main className="businesses-page">
                <div className="container">
                    {/* Header */}
                    <div className="businesses-header">
                        <h1>Find Local Businesses</h1>
                        <p className="page-subtitle">
                            Discover and book appointments with local businesses
                        </p>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="search-bar-large">
                        <SearchIcon size={24} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by business name, service, or category..."
                            className="search-input"
                        />
                        <button type="submit" className="btn btn--primary">
                            Search
                        </button>
                    </form>

                    {/* Filters */}
                    <div className="search-filters">
                        <div className="filter-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Categories</option>
                                <option value="Salon">Salon</option>
                                <option value="Spa">Spa</option>
                                <option value="Barbershop">Barbershop</option>
                                <option value="Dental">Dental</option>
                                <option value="Clinic">Clinic</option>
                                <option value="Gym">Gym</option>
                                <option value="Restaurant">Restaurant</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="city">City</label>
                            <select
                                id="city"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Cities</option>
                                <option value="Lisbon">Lisbon</option>
                                <option value="Porto">Porto</option>
                                <option value="Braga">Braga</option>
                                <option value="Faro">Faro</option>
                                <option value="Coimbra">Coimbra</option>
                                <option value="Cascais">Cascais</option>
                                <option value="Aveiro">Aveiro</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <div className="filter-group" style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
                                <button
                                    onClick={clearFilters}
                                    className="btn btn--ghost"
                                    type="button"
                                >
                                    <X size={16} />
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Results Count */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                            Found {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
                        </p>
                    </div>

                    {/* Businesses Grid */}
                    {filteredBusinesses.length === 0 ? (
                        <div className="empty-state">
                            <Filter size={48} className="empty-state-icon" />
                            <h2>No businesses found</h2>
                            <p>
                                {hasActiveFilters
                                    ? 'Try adjusting your filters or search terms'
                                    : 'No businesses available at the moment'
                                }
                            </p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="btn btn--primary">
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="businesses-grid">
                            {filteredBusinesses.map((business) => (
                                <Link
                                    key={business.id}
                                    to={`/${business.slug}`}
                                    className="business-card"
                                >
                                    <div className="business-card-banner">
                                        <div className="business-card-logo">
                                            {business.business_name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>

                                    <div className="business-card-content">
                                        <h3 className="business-card-name">
                                            {business.business_name}
                                        </h3>

                                        {business.category && (
                                            <span className="business-card-category">
                                                {business.category}
                                            </span>
                                        )}

                                        {business.description && (
                                            <p className="business-card-description">
                                                {business.description}
                                            </p>
                                        )}

                                        <div className="business-card-meta">
                                            {business.city && (
                                                <div className="business-card-meta-item">
                                                    <MapPin size={14} />
                                                    <span>
                                                        {business.city}
                                                        {business.location && `, ${business.location}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <AppFooter />
        </div>
    )
}

export default AppBusinesses
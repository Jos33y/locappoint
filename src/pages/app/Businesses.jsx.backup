// src/pages/app/Businesses.jsx
// Browse - Cohort 1 marketplace.
// Cover = banner image OR StreetGridCover placeholder (per-business variation).
// Logo = avatar beside business name (image OR initials fallback).
// Open slots remain informational; SME recruitment lives in the closing CTA.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar } from 'lucide-react'
import { supabase } from '../../config/supabase'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import StreetGridCover from '../../components/business/StreetGridCover'
import '../../styles/app/home.css'
import '../../styles/app/businesses.css'


const COHORT_SIZE = 10


// Defensive field access - tries common column-name variants.
const fieldOf = (biz, ...keys) => {
    for (const k of keys) {
        if (biz[k] != null && biz[k] !== '') return biz[k]
    }
    return ''
}


// Category -> tint family. Drives StreetGridCover accent + avatar border.
const CATEGORY_TINTS = {
    // Hair / salons -> azure
    salon: 'azure', 'hair salon': 'azure', hair: 'azure',
    cabeleireiro: 'azure', salao: 'azure', 'salão': 'azure',
    // Barbershops -> signal
    barbershop: 'signal', barber: 'signal',
    barbearia: 'signal', barbeiro: 'signal',
    // Spa / wellness -> success
    spa: 'success', wellness: 'success', massage: 'success',
    massagem: 'success', 'bem-estar': 'success',
    // Nail / beauty -> azure
    nail: 'azure', manicure: 'azure', beauty: 'azure',
    estetica: 'azure', 'estética': 'azure',
    // Fitness -> signal
    fitness: 'signal', gym: 'signal', studio: 'signal',
    ginasio: 'signal', 'ginásio': 'signal',
    // Yoga / pilates -> success
    yoga: 'success', pilates: 'success',
    // Tattoo -> ink
    tattoo: 'ink', tatuagem: 'ink',
    // Medical -> success
    clinic: 'success', clinica: 'success', 'clínica': 'success',
    physio: 'success', fisioterapia: 'success',
}


const resolveTint = (category) => {
    const key = (category || '').toString().toLowerCase().trim()
    return CATEGORY_TINTS[key] || 'azure'
}


// Initials from business name. Strips possessives + filler words.
const getInitials = (name) => {
    if (!name) return '?'
    const cleaned = name.replace(/['']s\b/gi, '')
    const filler = new Set(['the', 'a', 'an', 'of', 'and', '&', 'do', 'da', 'de'])
    const parts = cleaned.trim().split(/\s+/).filter((w) => !filler.has(w.toLowerCase()))
    if (parts.length === 0) return name.slice(0, 2).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
}


const cities = [
    { name: 'Lisbon', status: 'live', note: 'Cohort 1 open' },
    { name: 'Porto', status: 'next', note: 'After Lisbon' },
    { name: 'Lagos', status: 'soon', note: 'Q4 2026' },
]


const Businesses = () => {
    const [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const { data, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(COHORT_SIZE)

                if (error) {
                    console.error('Browse fetch error:', error)
                    setBusinesses([])
                } else {
                    setBusinesses(data || [])
                }
            } catch (err) {
                console.error('Browse fetch failed:', err)
                setBusinesses([])
            } finally {
                setLoading(false)
            }
        }
        fetchBusinesses()
    }, [])

    const filledCount = businesses.length
    const openSlotCount = Math.max(0, COHORT_SIZE - filledCount)

    return (
        <div className="browse-page">
            <AppHeader />

            <main>

                {/* Hero */}
                <section className="loca-section loca-section--s0 browse__hero">
                    <div className="browse__hero-radial" aria-hidden="true"></div>
                    <div className="container">
                        <div className="browse__hero-inner">
                            <span className="loca-eyebrow">
                                <span className="loca-eyebrow__dot" aria-hidden="true"></span>
                                Browse · Cohort 1
                            </span>
                            <h1 className="browse__hero-title">
                                The first Lisbon businesses <span className="loca-section__title-accent">on Locappoint.</span>
                            </h1>
                            <p className="browse__hero-lede">
                                Cohort 1 is a curated group of ten Lisbon businesses taking bookings through Locappoint. As each one comes online, you can book them right here.
                            </p>
                            <div className="browse__hero-meta">
                                <span className="browse__meta-stat">
                                    <span className="browse__meta-num">{loading ? '·' : filledCount}</span>
                                    <span className="browse__meta-label">Live</span>
                                </span>
                                <span className="browse__meta-sep"></span>
                                <span className="browse__meta-stat">
                                    <span className="browse__meta-num">{loading ? '·' : openSlotCount}</span>
                                    <span className="browse__meta-label">Coming soon</span>
                                </span>
                                <span className="browse__meta-sep"></span>
                                <span className="browse__meta-stat">
                                    <span className="browse__meta-num">{COHORT_SIZE}</span>
                                    <span className="browse__meta-label">Cohort target</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* City strip */}
                <section className="loca-section loca-section--s1 browse__cities">
                    <div className="container">
                        <div className="browse__cities-row">
                            {cities.map((city) => (
                                <article key={city.name} className={`city-tile city-tile--${city.status}`}>
                                    <div className="city-tile__head">
                                        <span className={`city-tile__pill city-tile__pill--${city.status}`}>
                                            <span className={`city-tile__dot city-tile__dot--${city.status}`}></span>
                                            {city.status === 'live' ? 'Live' : city.status === 'next' ? 'Next' : 'Soon'}
                                        </span>
                                    </div>
                                    <div className="city-tile__name">{city.name}</div>
                                    <div className="city-tile__note">{city.note}</div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Cohort showcase */}
                <section className="loca-section loca-section--s0 browse__showcase">
                    <div className="container">
                        <div className="browse__showcase-head">
                            <span className="loca-eyebrow">Lisbon · Cohort 1</span>
                            <h2 className="browse__showcase-title">
                                {filledCount > 0
                                    ? 'Taking bookings now.'
                                    : 'Slots filling as we onboard.'}
                            </h2>
                        </div>

                        {loading ? (
                            <div className="browse__loading">Loading businesses...</div>
                        ) : (
                            <div className="browse__grid">

                                {businesses.map((biz) => {
                                    const name = fieldOf(biz, 'business_name', 'name') || 'Business'
                                    const category = fieldOf(biz, 'category', 'business_type', 'type')
                                    const slug = fieldOf(biz, 'slug', 'id')
                                    const neighborhood = fieldOf(biz, 'location', 'neighborhood', 'area', 'district', 'city') || 'Lisbon'
                                    const banner = fieldOf(biz, 'banner_url', 'cover_image_url', 'image_url', 'photo_url', 'cover_url')
                                    const logo = fieldOf(biz, 'logo_url', 'logo')
                                    const tint = resolveTint(category)
                                    const initials = getInitials(name)

                                    return (
                                        <Link
                                            key={biz.id || slug}
                                            to={`/${slug}`}
                                            className="biz-card">

                                            <div className="biz-card__cover">
                                                {banner ? (
                                                    <img
                                                        src={banner}
                                                        alt={name}
                                                        className="biz-card__cover-img"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <StreetGridCover
                                                        seed={biz.id || slug || name}
                                                        tint={tint}
                                                        className="biz-card__cover-svg"
                                                    />
                                                )}

                                                <span className="biz-card__live-badge">
                                                    <span className="biz-card__live-dot"></span>
                                                    Live
                                                </span>
                                            </div>

                                            <div className="biz-card__body">
                                                <div className="biz-card__head">
                                                    <div className={`biz-card__avatar biz-card__avatar--${tint}`}>
                                                        {logo ? (
                                                            <img src={logo} alt={name} loading="lazy" />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>
                                                    <div className="biz-card__heading">
                                                        <h3 className="biz-card__name">{name}</h3>
                                                        <div className="biz-card__meta">
                                                            {category && <span className="biz-card__cat">{category}</span>}
                                                            {category && <span className="biz-card__sep">·</span>}
                                                            <span className="biz-card__loc">{neighborhood}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="biz-card__cta">
                                                    <span>View booking page</span>
                                                    <ArrowRight size={14} strokeWidth={2} />
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}

                                {Array.from({ length: openSlotCount }).map((_, i) => {
                                    const slotNumber = filledCount + i + 1
                                    return (
                                        <article key={`slot-${slotNumber}`} className="biz-card biz-card--open">
                                            <div className="biz-card__cover biz-card__cover--open">
                                                <div className="biz-card__cover-fallback biz-card__cover-fallback--open">
                                                    <span className="biz-card__slot-num">{String(slotNumber).padStart(2, '0')}</span>
                                                    <span className="biz-card__slot-of">of {COHORT_SIZE}</span>
                                                </div>
                                                <span className="biz-card__live-badge biz-card__live-badge--soon">
                                                    <span className="biz-card__open-dot"></span>
                                                    Coming soon
                                                </span>
                                            </div>

                                            <div className="biz-card__body">
                                                <div className="biz-card__head">
                                                    <div className="biz-card__avatar biz-card__avatar--signal">
                                                        <Calendar size={16} strokeWidth={1.8} />
                                                    </div>
                                                    <div className="biz-card__heading">
                                                        <h3 className="biz-card__name biz-card__name--open">Onboarding now</h3>
                                                        <div className="biz-card__meta">
                                                            <span>Cohort slot</span>
                                                            <span className="biz-card__sep">·</span>
                                                            <span>Lisbon</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="biz-card__open-note">
                                                    Reserved for a Lisbon business currently completing setup.
                                                </p>
                                            </div>
                                        </article>
                                    )
                                })}

                            </div>
                        )}
                    </div>
                </section>

                {/* CTA - SME recruitment */}
                <section className="loca-section loca-section--s1 browse__cta">
                    <div className="container">
                        <div className="browse__cta-inner">
                            <h2 className="browse__cta-title">
                                Want to be on this page <span className="loca-section__title-accent">in cohort 1?</span>
                            </h2>
                            <p className="browse__cta-lede">
                                {openSlotCount} slot{openSlotCount === 1 ? '' : 's'} remaining. Twelve months free, then nineteen euros a month flat. Set up takes ten minutes.
                            </p>
                            <div className="browse__cta-buttons">
                                <Link to="/auth" className="loca-btn loca-btn--primary loca-btn--lg">
                                    Get your booking page
                                    <ArrowRight size={18} strokeWidth={2} />
                                </Link>
                                <Link to="/partnership" className="loca-btn loca-btn--ghost loca-btn--lg">
                                    Apply as a partner
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <AppFooter />
        </div>
    )
}

export default Businesses

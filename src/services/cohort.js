import { supabase } from '../config/supabase'

export const COHORT_SIZE = 10

// The cities, in the order every page lists them, all three taking bookings. A place belongs to a city by its market (set by the database from its country and city);
// pages without one yet fall back to the city name.
export const CITIES = [
    { name: 'Porto', market: 'porto', match: ['porto', 'oporto'], later: 'Taking bookings' },
    { name: 'Lagos', market: 'lagos', match: ['lagos'], later: 'Taking bookings' },
    { name: 'Lisbon', market: 'lisbon', match: ['lisbon', 'lisboa'], later: 'Taking bookings' },
]

// A place belongs to a country (geo1) by its country, else by the city market it has.
const COUNTRY_OF = { ng: { iso: 'NG', cities: ['lagos'] }, pt: { iso: 'PT', cities: ['porto', 'lisbon'] } }
export const inCountry = (place, code) => {
    const c = COUNTRY_OF[code]
    if (!c) return inMarket(place, code)
    if (place.country) return String(place.country).toUpperCase() === c.iso
    return c.cities.some((m) => inMarket(place, m))
}

export const fold = (text) => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export const inCity = (place, names) => names.includes(fold(place.city))
export const inMarket = (place, market) => {
    if (place.market) return place.market === market
    const city = CITIES.find((c) => c.market === market)
    return Boolean(city) && inCity(place, city.match)
}

// Live pages in that city's first cohort, demo included, the same rows Browse lists.
export const loadCohortCount = async (market = 'porto') => {
    const { data, error } = await supabase.from('businesses').select('city, market').eq('is_active', true)
    if (error) throw error
    return (data || []).filter((place) => inMarket(place, market)).length
}

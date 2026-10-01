import { supabase } from '../config/supabase'

export const COHORT_SIZE = 10

// The first entry is the city whose first cohort is open now.
export const CITIES = [
    { name: 'Porto', match: ['porto', 'oporto'], later: 'First up' },
    { name: 'Lisbon', match: ['lisbon', 'lisboa'], later: 'Next' },
    { name: 'Lagos', match: ['lagos'], later: 'Later' },
]

export const fold = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
export const inCity = (place, names) => names.includes(fold(place.city))

// Live pages in the cohort city, demo included, the same rows Browse lists.
export const loadCohortCount = async () => {
    const { data, error } = await supabase.from('businesses').select('city').eq('is_active', true)
    if (error) throw error
    return (data || []).filter((place) => inCity(place, CITIES[0].match)).length
}

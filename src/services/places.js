import { supabase } from '../config/supabase'

// Address search through the places function (Google, with the key kept on the server). When it is
// off or failing, callers fall back to picking an area and typing the address.

const readError = async (error) => {
    try {
        const body = await error?.context?.json?.()
        if (body?.error) return body.error
    } catch { /* not JSON */ }
    return 'Address search is not answering. Check your connection and try again.'
}

const callPlaces = async (action, body = {}) => {
    const { data, error } = await supabase.functions.invoke('places', { body: { action, ...body } })
    if (error) throw new Error(await readError(error))
    if (data?.error) throw new Error(data.error)
    return data || {}
}

let ping = null
// Whether address search is on. Asked once per page load; a failed ask counts as off.
export const placesOn = () => {
    if (!ping) ping = callPlaces('ping').then((d) => d.on === true).catch(() => false)
    return ping
}

// One search session: the typing and the address picked are billed together by Google.
export const newSession = () => {
    try {
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
    } catch { /* fall through */ }
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export const suggestAddresses = async ({ businessId, input, session }) => {
    const data = await callPlaces('suggest', { business_id: businessId, input, session })
    if (data.on === false) return null
    return data.items || []
}

export const pickAddress = async ({ businessId, placeId, session }) => {
    const data = await callPlaces('place', { business_id: businessId, place_id: placeId, session })
    if (data.on === false) return null
    return data.place || null
}

export const placeShop = async ({ businessId, placeId, session }) => {
    const data = await callPlaces('shop', { business_id: businessId, place_id: placeId, session })
    if (data.on === false) throw new Error('Address search is not working right now. Try again later.')
    return data.shop
}

// A business travels by distance once it has a distance and its shop is placed.
export const travelsByDistance = (business) =>
    Number(business?.service_radius_km) > 0 && business?.lat !== null && business?.lat !== undefined && business?.lng !== null && business?.lng !== undefined

// A business takes visits at the client's place once it lists areas or travels by distance.
export const takesHomeVisits = (business) => (business?.service_zones || []).length > 0 || travelsByDistance(business)

export const kmLabel = (km) => `${Number(km).toLocaleString('en-GB', { maximumFractionDigits: 1 })} km`

// The browser key for the map on Services, restricted in Google Cloud to locappoint.com and the
// app. Without it, Services shows the distance without a map.
export const MAP_KEY = (import.meta.env?.VITE_GOOGLE_MAPS_KEY || '').trim()

let loading = null
export const loadMaps = () => {
    if (!MAP_KEY) return Promise.reject(new Error('No map key'))
    if (globalThis.google?.maps?.importLibrary) return Promise.resolve(globalThis.google.maps)
    if (loading) return loading
    loading = new Promise((resolve, reject) => {
        const name = `__lcMaps${Date.now()}`
        window[name] = () => { delete window[name]; resolve(window.google.maps) }
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAP_KEY)}&v=weekly&loading=async&callback=${name}`
        script.async = true
        script.onerror = () => { loading = null; reject(new Error('Map did not load')) }
        document.head.appendChild(script)
    })
    return loading
}

// Google Maps Platform from the server, with GOOGLE_MAPS_SERVER_KEY (a key restricted to the Places
// API (New), Geocoding and Routes, never sent to a browser). Every call is a plain fetch: no SDK.
// Without the key, or while Google refuses it (billing not on yet), callers get null and carry on
// without suggestions.

export const MAPS_KEY = Deno.env.get('GOOGLE_MAPS_SERVER_KEY') || ''

export class GoogleError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

const call = async (url: string, init: RequestInit & { mask?: string } = {}) => {
    const headers: Record<string, string> = { 'X-Goog-Api-Key': MAPS_KEY, ...(init.headers as Record<string, string> || {}) }
    if (init.mask) headers['X-Goog-FieldMask'] = init.mask
    const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok) throw new GoogleError(data?.error?.message || `Google said ${res.status}`, res.status)
    return data
}

// Addresses read the way the country writes them: Portuguese municipality names match market_zones.
export const languageFor = (country: string) => (country === 'PT' ? 'pt-PT' : 'en')
export const regionFor = (country: string) => (/^[A-Z]{2}$/.test(country) ? country.toLowerCase() : 'pt')

export type Suggestion = { id: string; main: string; rest: string }

// Address types first; if Google rejects the type list, once more without it.
const ADDRESS_TYPES = ['street_address', 'premise', 'subpremise', 'route']

export const autocomplete = async (o: { input: string; session: string; country: string; near?: { lat: number; lng: number } | null }): Promise<Suggestion[]> => {
    const body: Record<string, unknown> = {
        input: o.input,
        sessionToken: o.session,
        includedRegionCodes: [regionFor(o.country)],
        languageCode: languageFor(o.country),
        includedPrimaryTypes: ADDRESS_TYPES,
    }
    if (o.near) body.locationBias = { circle: { center: { latitude: o.near.lat, longitude: o.near.lng }, radius: 50000 } }
    const send = (b: Record<string, unknown>) => call('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
    })
    let data
    try {
        data = await send(body)
    } catch (err) {
        if (!(err instanceof GoogleError) || err.status !== 400) throw err
        const { includedPrimaryTypes: _, ...rest } = body
        data = await send(rest)
    }
    return (data.suggestions || [])
        .map((s: any) => s.placePrediction)
        .filter((p: any) => p?.placeId)
        .slice(0, 5)
        .map((p: any) => ({
            id: String(p.placeId),
            main: String(p.structuredFormat?.mainText?.text || p.text?.text || ''),
            rest: String(p.structuredFormat?.secondaryText?.text || '').replace(/,\s*(Portugal|Nigeria)$/i, ''),
        }))
}

export type Place = { id: string; address: string; lat: number; lng: number; areas: string[] }

// One place: its address, where it is, and the municipality and town it sits in (best first).
export const placeDetails = async (o: { id: string; session?: string; country: string; full?: boolean }): Promise<Place> => {
    const q = new URLSearchParams({ languageCode: languageFor(o.country) })
    if (o.session) q.set('sessionToken', o.session)
    const data = await call(`https://places.googleapis.com/v1/places/${encodeURIComponent(o.id)}?${q}`, {
        mask: o.full === false ? 'id,location' : 'id,formattedAddress,location,addressComponents',
    })
    const lat = Number(data.location?.latitude)
    const lng = Number(data.location?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new GoogleError('No location for this place', 404)
    const parts = (data.addressComponents || []) as { longText?: string; types?: string[] }[]
    const of = (type: string) => parts.filter((c) => c.types?.includes(type)).map((c) => String(c.longText || ''))
    return {
        id: String(data.id || o.id),
        address: String(data.formattedAddress || '').replace(/,\s*(Portugal|Nigeria)$/i, ''),
        lat,
        lng,
        areas: [...of('administrative_area_level_2'), ...of('locality'), ...of('administrative_area_level_3')].filter(Boolean),
    }
}

// Driving time now, with traffic, from a point to a place. Seconds and metres.
export const driveTime = async (o: { from: { lat: number; lng: number }; toPlace?: string | null; toAddress?: string | null }) => {
    const destination = o.toPlace ? { placeId: o.toPlace } : { address: o.toAddress }
    const data = await call('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mask: 'routes.duration,routes.distanceMeters',
        body: JSON.stringify({
            origin: { location: { latLng: { latitude: o.from.lat, longitude: o.from.lng } } },
            destination,
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
        }),
    })
    const route = data.routes?.[0]
    const seconds = Number(String(route?.duration || '').replace(/s$/, ''))
    if (!route || !Number.isFinite(seconds)) throw new GoogleError('No route to this address', 404)
    return { seconds, metres: Number(route.distanceMeters) || 0 }
}

export const kmBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const rad = (d: number) => (d * Math.PI) / 180
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
    return 6371.0088 * 2 * Math.asin(Math.sqrt(h))
}

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

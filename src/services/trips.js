import { supabase } from '../config/supabase'
import { zonedNow } from './business'

// Live trips to the client's place. Staff send where they are to the trip function, which turns it
// into minutes and forgets it; everyone else only ever reads the minutes.

const readError = async (error) => {
    try {
        const body = await error?.context?.json?.()
        if (body?.error) return body.error
    } catch { /* not JSON */ }
    return 'We could not reach the trip. Check your connection and try again.'
}

const callTrip = async (action, body) => {
    const { data, error } = await supabase.functions.invoke('trip', { body: { action, ...body } })
    if (error) throw new Error(await readError(error))
    if (data?.error) throw new Error(data.error)
    return data || {}
}

export const startTrip = ({ appointmentId, spot = null, minutes = null }) =>
    callTrip('start', { appointment_id: appointmentId, ...(spot || {}), ...(minutes ? { minutes } : {}) })
export const updateTrip = ({ appointmentId, spot }) => callTrip('update', { appointment_id: appointmentId, ...spot })
export const arriveTrip = (appointmentId) => callTrip('arrive', { appointment_id: appointmentId })
export const stopTrip = (appointmentId) => callTrip('stop', { appointment_id: appointmentId })

export const loadTrip = async ({ token = null, appointmentId = null }) => {
    if (token) {
        const { data, error } = await supabase.rpc('trip_by_link', { p_token: token })
        if (error) throw error
        return data || null
    }
    const { data, error } = await supabase.rpc('my_trips', { p_ids: [appointmentId] })
    if (error) throw error
    return data?.[0]?.trip || null
}

// Where the phone is, once. Null when location is off, refused or too slow; the caller then asks for minutes.
export const currentSpot = () => new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
})

// While the trip screen is open: the phone's spot as it moves. Returns the stop function.
export const watchSpot = (onSpot) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return () => {}
    const id = navigator.geolocation.watchPosition(
        (p) => onSpot({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
}

// Minutes left from the expected arrival, on this device's clock. At least one while on the way.
export const minutesLeft = (trip, now = Date.now()) => {
    if (!trip?.eta_at) return null
    return Math.max(1, Math.ceil((new Date(trip.eta_at).getTime() - now) / 60000))
}

export const pastEta = (trip, now = Date.now()) => Boolean(trip?.eta_at) && new Date(trip.eta_at).getTime() < now - 60000

// A trip can be followed from a few hours before the visit to a few hours after, on its day.
export const tripWindow = ({ dateKey, minutes, timeZone }) => {
    const now = zonedNow(timeZone || 'Europe/Lisbon')
    if (now.dateKey !== String(dateKey).slice(0, 10)) return false
    return now.minutes >= minutes - 6 * 60 && now.minutes <= minutes + 3 * 60
}

export const clockOf = (iso, timeZone) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: timeZone || 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

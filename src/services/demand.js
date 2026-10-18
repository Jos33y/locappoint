import { supabase } from '../config/supabase'
import { WEB_ORIGIN, isNative } from './native'

// Demand (doc 35): every search is kept, so we can see where people want Locappoint, including
// countries we are not in yet. Kept: the words, the city and area or a pin rounded to about 1 km,
// the searcher's country, and how much we found. Never a name or an exact address.

// The countries where businesses can join today.
export const SERVED = ['NG', 'PT']

// The visitor's country, from our server (Cloudflare knows it). Asked once per page load; null when unknown.
let asked = null
export const visitorCountry = () => {
    if (asked) return asked
    // Kept in memory only, nothing stored on the device.
    asked = (async () => {
        try {
            const res = await fetch(`${isNative() ? WEB_ORIGIN : ''}/geo`, { cache: 'no-store', signal: AbortSignal.timeout(2500) })
            const body = res.ok && /json/.test(res.headers.get('content-type') || '') ? await res.json() : null
            return /^[A-Z]{2}$/.test(body?.country || '') ? body.country : null
        } catch {
            return null
        }
    })()
    return asked
}

export const countryName = (code) => {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code } catch { return code }
}

const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null } }

// One search, after its results show. Never in the way: a failure is ignored.
export const noteSearch = async ({ market, text, mode = '', people = 1, place = null, zone: area = '', data }) => {
    try {
        const origin = await visitorCountry()
        await supabase.rpc('search_note', {
            p_channel: isNative() ? 'app' : 'web',
            p_query: String(text || '').slice(0, 120),
            p_market: market,
            p_zone: place?.zone || area || null,
            p_lat: place?.lat ?? null,
            p_lng: place?.lng ?? null,
            p_mode: mode || null,
            p_people: Number(people) || 1,
            p_origin_country: origin,
            p_origin_tz: zone(),
            p_options: (data?.options || []).length,
            p_later: (data?.later || []).length,
            p_matched: Number(data?.matched) || 0,
        })
    } catch { /* the search already answered */ }
}

// "Tell me when": an email or a WhatsApp number, for a search we could not answer or a country we
// are not in. Throws with a message to show.
export const addWish = async ({ text = '', market = null, zone: area = '', country = null, contact }) => {
    const value = String(contact || '').trim()
    const email = value.includes('@') ? value : null
    const phone = email ? null : value
    const { error } = await supabase.rpc('search_wish_add', {
        p_query: String(text || '').slice(0, 120) || null,
        p_market: market,
        p_zone: area || null,
        p_target_country: country,
        p_origin_country: await visitorCountry(),
        p_email: email,
        p_phone: phone || null,
    })
    if (error) throw error
}

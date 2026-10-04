// Places: Google address suggestions for visits at the client's place, and the shop's spot for the
// distance a business travels. The Google key stays here; the browser only ever sees suggestions,
// one chosen address, and whether it is inside the business's areas or distance.
//
// - ping: is address search on (the key is set)?
// - suggest: up to five addresses for what the client typed, near the business.
// - place: the chosen address, the municipality it is in, and how far from the shop. The booking
//   checks the distance again in the database; this is only so the client sees it before booking.
// - shop: the owner places their shop (signed in, owner of the business). Written by
//   set_shop_location, never by the browser.
// - refresh: the nightly job (x-notify-secret) refreshes shop spots every 25 days, as Google asks.
//
// JWT verification is off: guests booking use it, and the nightly job sends the notify secret.
// Deploy: npx supabase functions deploy places --no-verify-jwt
// Secrets: GOOGLE_MAPS_SERVER_KEY, NOTIFY_SECRET.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { GoogleError, MAPS_KEY, autocomplete, fold, kmBetween, placeDetails } from '../_shared/google.ts'

const NOTIFY = Deno.env.get('NOTIFY_SECRET') || ''
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PLACE = /^[A-Za-z0-9_-]{10,300}$/
const SESSION = /^[A-Za-z0-9-]{8,64}$/

// A loose brake per visitor and instance, on top of the quota set on the key in Google Cloud.
const seen = new Map<string, number[]>()
const tooFast = (req: Request) => {
    const who = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const now = Date.now()
    const recent = (seen.get(who) || []).filter((t) => now - t < 60000)
    recent.push(now)
    seen.set(who, recent)
    if (seen.size > 5000) seen.clear()
    return recent.length > 90
}

const signedIn = async (req: Request) => {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return null
    const { data } = await db.auth.getUser(token).catch(() => ({ data: null as any }))
    return data?.user || null
}

const businessFor = async (id: string) => {
    if (!UUID.test(id)) return null
    const { data } = await db.from('businesses')
        .select('id, user_id, country, market, service_zones, service_radius_km, lat, lng, is_active')
        .eq('id', id)
        .maybeSingle()
    return data
}

const off = (reason = 'off') => reply(200, { on: false, reason })

// Errors from Google (billing not on yet, quota spent) switch search off for this request; the
// client falls back to picking an area and typing the address.
const googleFailed = (err: unknown) => {
    console.error('Google failed:', err instanceof Error ? err.message : err)
    return off(err instanceof GoogleError && err.status === 404 ? 'not_found' : 'unavailable')
}

const refresh = async () => {
    const { data: due, error } = await db.rpc('shop_locations_due', { p_limit: 50 })
    if (error) throw error
    let done = 0
    for (const row of due || []) {
        try {
            const { data: b } = await db.from('businesses').select('country').eq('id', row.id).maybeSingle()
            const place = await placeDetails({ id: row.place_id, country: b?.country || 'PT', full: false })
            const { error: e } = await db.rpc('set_shop_location', { p_business: row.id, p_place_id: place.id, p_lat: place.lat, p_lng: place.lng })
            if (e) throw e
            done += 1
        } catch (err) {
            console.error('Shop refresh failed for', row.id, err instanceof Error ? err.message : err)
        }
    }
    return reply(200, { due: (due || []).length, done })
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

    try {
        const input = await req.json().catch(() => ({}))
        const action = String(input.action || '')

        if (action === 'refresh') {
            const secret = req.headers.get('x-notify-secret')
            if (!NOTIFY || secret !== NOTIFY) return reply(401, { error: 'Not allowed' })
            if (!MAPS_KEY) return reply(200, { due: 0, done: 0, on: false })
            return await refresh()
        }

        if (action === 'ping') return reply(200, { on: Boolean(MAPS_KEY) })
        if (!MAPS_KEY) return off()
        if (tooFast(req)) return reply(429, { error: 'Too many searches. Wait a minute.' })

        const session = String(input.session || '')
        if (!SESSION.test(session)) return reply(400, { error: 'Start the search again' })
        const business = await businessFor(String(input.business_id || ''))
        if (!business) return reply(404, { error: 'We could not find this business' })
        const country = business.country || 'PT'
        const shop = business.lat !== null && business.lng !== null ? { lat: Number(business.lat), lng: Number(business.lng) } : null

        if (action === 'suggest') {
            const text = String(input.input || '').replace(/\s+/g, ' ').trim()
            if (text.length < 3 || text.length > 120) return reply(200, { on: true, items: [] })
            try {
                return reply(200, { on: true, items: await autocomplete({ input: text, session, country, near: shop }) })
            } catch (err) {
                return googleFailed(err)
            }
        }

        const placeId = String(input.place_id || '')
        if (!PLACE.test(placeId)) return reply(400, { error: 'Pick the address again' })

        if (action === 'place') {
            let place
            try {
                place = await placeDetails({ id: placeId, session, country })
            } catch (err) {
                return googleFailed(err)
            }
            // The area: the first municipality or town in the address that is one of the city's areas.
            const { data: zones } = await db.from('market_zones').select('name').eq('market', business.market || '')
            const byFold = new Map((zones || []).map((z: { name: string }) => [fold(z.name), z.name]))
            const zone = place.areas.map((a) => byFold.get(fold(a))).find(Boolean) || null
            const listed = (business.service_zones || []) as string[]
            const radius = business.service_radius_km === null ? null : Number(business.service_radius_km)
            const km = shop && radius !== null ? Math.round(kmBetween(shop, place) * 10) / 10 : null
            return reply(200, {
                on: true,
                place: {
                    id: place.id,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                    zone,
                    km,
                    in_zone: Boolean(zone && listed.includes(zone)),
                    in_reach: km !== null && radius !== null && km <= radius,
                },
            })
        }

        if (action === 'shop') {
            const user = await signedIn(req)
            if (!user) return reply(401, { error: 'Sign in again' })
            const { data: member } = await db.from('business_members')
                .select('id').eq('business_id', business.id).eq('user_id', user.id).eq('status', 'active').eq('role', 'owner')
                .maybeSingle()
            if (!member && business.user_id !== user.id) return reply(403, { error: 'Only the owner can place the shop' })
            let place
            try {
                place = await placeDetails({ id: placeId, session, country })
            } catch (err) {
                return googleFailed(err)
            }
            const { error } = await db.rpc('set_shop_location', { p_business: business.id, p_place_id: place.id, p_lat: place.lat, p_lng: place.lng })
            if (error) throw error
            return reply(200, { on: true, shop: { address: place.address, lat: place.lat, lng: place.lng } })
        }

        return reply(400, { error: 'Unknown action' })
    } catch (err) {
        console.error('places failed:', err)
        return reply(500, { error: 'Something went wrong. Try again.' })
    }
})

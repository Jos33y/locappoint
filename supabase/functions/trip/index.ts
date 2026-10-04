// Trip: "On my way" for a visit at the client's place. The staff phone sends where it is; this turns
// it into minutes with Google (driving, with traffic) and throws the position away. Only the expected
// arrival is kept (visit_trips), so the client sees minutes and never a place.
//
// - start: on my way. With a position, Google gives the minutes; without one (location off, or Google
//   not on yet), the staff member picks the minutes.
// - update: a newer position while on the way; a new estimate at most every 100 seconds.
// - arrive: the trip ends and the client is told. stop: the trip ends quietly.
//
// Deploy: npx supabase functions deploy trip
// Secrets: GOOGLE_MAPS_SERVER_KEY (without it, staff pick the minutes).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { MAPS_KEY, driveTime } from '../_shared/google.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COUNTRY: Record<string, string> = { PT: 'Portugal', NG: 'Nigeria' }

const spot = (input: Record<string, unknown>) => {
    const lat = Number(input.lat)
    const lng = Number(input.lng)
    if (input.lat === undefined || input.lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    return { lat, lng }
}

// Minutes by road from here to the client's door, or null when Google cannot say.
const estimate = async (from: { lat: number; lng: number } | null, a: any) => {
    if (!from || !MAPS_KEY) return null
    try {
        const address = [a.client_address, a.client_zone, a.businesses?.city, COUNTRY[a.businesses?.country] || ''].filter(Boolean).join(', ')
        return await driveTime({ from, toPlace: a.client_place_id || null, toAddress: address })
    } catch (err) {
        console.error('Route failed:', err instanceof Error ? err.message : err)
        return null
    }
}

const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args)
    if (error) {
        if (error.code === '22023' || error.code === 'P0001') return reply(409, { error: error.message })
        throw error
    }
    return reply(200, { trip: data })
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

    try {
        const input = await req.json().catch(() => ({}))
        const action = String(input.action || '')
        const id = String(input.appointment_id || '')
        if (!UUID.test(id)) return reply(400, { error: 'We could not find this booking' })

        const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
        const { data: auth } = token ? await db.auth.getUser(token).catch(() => ({ data: null as any })) : { data: null as any }
        const user = auth?.user
        if (!user) return reply(401, { error: 'Sign in again' })

        const { data: a } = await db.from('appointments')
            .select('id, business_id, mode, status, client_address, client_zone, client_place_id, businesses(city, country)')
            .eq('id', id)
            .maybeSingle()
        if (!a) return reply(404, { error: 'We could not find this booking' })
        const { data: member } = await db.from('business_members')
            .select('id').eq('business_id', a.business_id).eq('user_id', user.id).eq('status', 'active')
            .maybeSingle()
        if (!member) return reply(403, { error: 'Only the team of this business can do this' })
        if (a.mode !== 'at_client') return reply(409, { error: 'This visit is not at the client\'s place' })

        if (action === 'start') {
            const route = await estimate(spot(input), a)
            if (route) return await rpc('trip_start', { p_appointment: id, p_member: member.id, p_seconds: Math.round(route.seconds), p_source: 'route' })
            const minutes = Number(input.minutes)
            if (!Number.isInteger(minutes) || minutes < 5 || minutes > 180) return reply(200, { need_minutes: true })
            return await rpc('trip_start', { p_appointment: id, p_member: member.id, p_seconds: minutes * 60, p_source: 'guess' })
        }

        if (action === 'update') {
            const { data: trip } = await db.from('visit_trips').select('status, eta_checked_at').eq('appointment_id', id).maybeSingle()
            if (!trip || trip.status !== 'on_way') return await rpc('trip_eta', { p_appointment: id, p_seconds: null })
            const fresh = Date.now() - new Date(trip.eta_checked_at).getTime() < 100_000
            const route = fresh ? null : await estimate(spot(input), a)
            const res = await rpc('trip_eta', { p_appointment: id, p_seconds: route ? Math.round(route.seconds) : null })
            if (!route || res.status !== 200) return res
            const body = await res.json()
            return reply(200, { ...body, near: route.metres < 250 })
        }

        if (action === 'arrive') return await rpc('trip_end', { p_appointment: id, p_arrived: true })
        if (action === 'stop') return await rpc('trip_end', { p_appointment: id, p_arrived: false })

        return reply(400, { error: 'Unknown action' })
    } catch (err) {
        console.error('trip failed:', err)
        return reply(500, { error: 'Something went wrong. Try again.' })
    }
})

// Understand (R1b, doc 36): one sentence from the search box into search fields, with a small model.
// Called only when the rules in the browser cannot read it all. The answer is checked against what is
// allowed (_shared/understand-ai.ts) and the engine still finds the real businesses and free times.
// Its own daily cap (search_ai_config, USD 3) and a brake per visitor, both in the database. Same
// answers for the same words in the same city are kept for an hour, so a repeat costs nothing.
//
// Called from the browser with the anon key, so JWT verification stays on.
// Deploy: npx supabase functions deploy understand
// Secrets: the model, as for the WhatsApp agent (see _shared/llm.ts); optionally SEARCH_AI_MODEL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { BusyError, callModel, provider } from '../_shared/llm.ts'
import { buildRequest, checkFields, costOf, fieldsFrom } from '../_shared/understand-ai.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
const off = (reason: string) => reply({ on: false, reason })

const MARKET = /^[a-z]{2,20}$/
const cache = new Map<string, { at: number; fields: unknown }>()
const contexts = new Map<string, { at: number; ctx: any }>()

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return off('method')
    let body: any = {}
    try { body = await req.json() } catch { return off('bad_request') }
    const text = String(body?.text || '').replace(/\s+/g, ' ').trim()
    const market = String(body?.market || '').toLowerCase()
    if (text.length < 2 || text.length > 300 || !MARKET.test(market)) return off('bad_request')
    if (!provider()) return off('off')

    const key = `${market}|${text.toLowerCase()}|${new Date().toISOString().slice(0, 10)}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < 3600_000) return reply({ on: true, fields: hit.fields, cached: true })

    const who = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    const { data: allow, error: allowError } = await db.rpc('search_ai_allow', { p_who: who || null })
    if (allowError) { console.error('search_ai_allow failed:', allowError.message); return off('unavailable') }
    if (!allow?.ok) return off(allow?.reason || 'off')

    let ctx = contexts.get(market)
    if (!ctx || Date.now() - ctx.at > 600_000) {
        const { data, error } = await db.rpc('search_ai_context', { p_market: market })
        if (error || !data?.timezone) return off('unavailable')
        ctx = { at: Date.now(), ctx: data }
        contexts.set(market, ctx)
    }

    try {
        const res = await callModel(buildRequest(text, market, ctx.ctx))
        await db.rpc('search_ai_spent', { p_input: res?.usage?.input_tokens || 0, p_output: res?.usage?.output_tokens || 0, p_cost: costOf(res?.usage) })
        const fields = checkFields(fieldsFrom(res), ctx.ctx.timezone)
        if (!fields) return off('unread')
        cache.set(key, { at: Date.now(), fields })
        if (cache.size > 2000) cache.clear()
        return reply({ on: true, fields })
    } catch (err) {
        console.error('understand failed:', err instanceof Error ? err.message : err)
        return off(err instanceof BusyError ? 'busy' : 'unavailable')
    }
})

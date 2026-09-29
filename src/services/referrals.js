import { supabase } from '../config/supabase'
import { publicOrigin } from './links'

const KEY = 'locappoint_ref'
const KEEP = 30 * 24 * 60 * 60 * 1000

export const inviteUrl = (code) => `${publicOrigin()}/join/${code}`

export const loadMyReferrals = async (businessId) => {
    const { data, error } = await supabase.rpc('my_referrals', { p_business_id: businessId })
    if (error) throw error
    return data
}

// The code from an invite link waits on this device until the new business exists, even across the email confirmation.
export const rememberReferral = (code) => {
    try { localStorage.setItem(KEY, JSON.stringify({ code: String(code).toLowerCase(), at: Date.now() })) } catch { /* storage blocked: no points for this invite */ }
}

export const claimStoredReferral = async () => {
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { saved = null }
    if (!saved?.code || Date.now() - saved.at > KEEP) return false
    const { data, error } = await supabase.rpc('claim_referral', { p_code: saved.code })
    if (!error) { try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ } }
    return Boolean(data)
}

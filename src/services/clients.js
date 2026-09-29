import { supabase } from '../config/supabase'
import { addDays } from './business'

const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const loadClients = (businessId) => rpc('business_clients', { p_business_id: businessId })
export const loadClientHistory = (businessId, key) => rpc('client_history', { p_business_id: businessId, p_key: key })
export const saveClientNote = (businessId, key, body) => rpc('save_client_note', { p_business_id: businessId, p_key: key, p_body: body })

// Same rule as client_key in the database: phone first, then email, then account, then name.
export const clientKey = ({ client_phone: phone, client_email: email, client_id: id, client_name: name }) => {
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits.length >= 6) return `p:${digits.slice(-9)}`
    if (String(email || '').trim()) return `e:${email.trim().toLowerCase()}`
    if (id) return `u:${id}`
    return `n:${String(name || '').trim().toLowerCase()}`
}

// Due back: a regular whose usual gap has run out, up to three days ahead, and not yet lapsed for good.
export const isDueBack = (client, today) =>
    Boolean(client.due_on) && client.due_on <= addDays(today, 3) && client.due_on >= addDays(today, -2 * client.gap_days)

export const gapLabel = (days) => {
    if (days < 14) return 'every week'
    const weeks = Math.round(days / 7)
    if (weeks < 8) return `every ${weeks} weeks`
    const months = Math.round(days / 30)
    return months <= 1 ? 'every month' : `every ${months} months`
}

export const visitsLabel = (n) => (n === 1 ? '1 visit' : `${n} visits`)

export const OUTCOME_LABEL = { came: 'Came', no_show: 'No-show', late_cancel: 'Cancelled late', cancelled: 'Cancelled', upcoming: 'Booked' }

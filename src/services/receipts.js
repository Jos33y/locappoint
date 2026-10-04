import { supabase } from '../config/supabase'
import { publicOrigin } from './links'

// Receipts are issued by the database (payment, refund, visit); this only reads them.

export const receiptByToken = async (token) => {
    const { data, error } = await supabase.rpc('receipt_by_token', { p_token: token })
    if (error) throw error
    return data
}

export const receiptsByLink = async (token) => {
    const { data, error } = await supabase.rpc('receipts_by_link', { p_token: token })
    if (error) throw error
    return data || []
}

// The owner's view of one booking's receipts (row level security: owners and the booking's client).
export const loadReceipts = async (appointmentId) => {
    const { data, error } = await supabase
        .from('receipts')
        .select('kind, number, token, total, currency, issued_at')
        .eq('appointment_id', appointmentId)
        .order('seq', { ascending: true })
    if (error) throw error
    return data || []
}

// Always the website, so a link shared from the app opens for anyone.
export const receiptUrl = (token) => `${publicOrigin()}/r/${token}`

export const RECEIPT_KIND = { payment: 'Receipt', refund: 'Refund receipt', visit: 'Receipt' }

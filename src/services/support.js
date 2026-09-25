import { supabase } from '../config/supabase'

export const listMyTickets = async () => {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('id, category, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
    if (error) throw error
    return data
}

export const openTicket = async ({ userId, businessId, category, subject, message }) => {
    const { data, error } = await supabase
        .from('support_tickets')
        .insert({ user_id: userId, business_id: businessId, category, subject: subject.trim(), message: message.trim() })
        .select('id')
        .single()
    if (error) throw error
    return data
}

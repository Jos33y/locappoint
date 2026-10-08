import { supabase } from '../config/supabase'

// WhatsApp for owners and staff (whatsapp.sql, the whatsapp function). One Locappoint number for
// everyone. A person links their WhatsApp by sending us a code from it; then each business they
// work at can send its bookings there.
const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const CODE_PREFIX = 'LOC-'

export const loadWhatsApp = () => call('my_whatsapp')
export const startLink = () => call('wa_link_start')
export const unlinkWhatsApp = () => call('wa_unlink')
export const setWhatsAppAlerts = (memberId, on) => call('wa_set_alerts', { p_member: memberId, p_on: Boolean(on) })

// "+1 555 646 1337" style, for reading the number out; the link uses the digits.
export const showNumber = (digits) => {
    const d = String(digits || '').replace(/\D/g, '')
    if (d.startsWith('351') && d.length === 12) return `+351 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
    if (d.startsWith('1') && d.length === 11) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
    if (d.startsWith('234') && d.length === 13) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
    return d ? `+${d}` : ''
}

// The number for "Book on WhatsApp" on business pages: null until WhatsApp is live and the agent is on.
export const loadBookNumber = async () => {
    try {
        return (await call('wa_book_number')) || null
    } catch {
        return null
    }
}

export const bookOnWhatsApp = (digits, name, slug) =>
    `https://wa.me/${String(digits || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Book at ${name} (${slug})`)}`

// Admin: every conversation, and one in full.
export const loadAdminWaThreads = ({ search = '', offset = 0, limit = 50 } = {}) => call('admin_wa_threads', { p_search: search || null, p_limit: limit, p_offset: offset })
export const loadAdminWaThread = (phone) => call('admin_wa_thread', { p_phone: phone })

export const chatLink = (digits, code) => `https://wa.me/${String(digits || '').replace(/\D/g, '')}?text=${encodeURIComponent(`${CODE_PREFIX}${code}`)}`

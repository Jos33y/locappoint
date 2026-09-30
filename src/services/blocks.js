import { supabase } from '../config/supabase'
import { addDays, loadBlocks, loadBookings, minutesToLabel } from './business'

// Blocked time is stored in the business's local time, like bookings. Closed dates are whole-day blocks for everyone.
const at = (dateKey, minutes) => `${dateKey}T${minutesToLabel(minutes)}:00`

export const isClosedDay = (block) =>
    !block.staff_id && /T00:00:00/.test(block.starts_at) && /T00:00:00/.test(block.ends_at)

export const closedRange = (block) => [block.starts_at.slice(0, 10), addDays(block.ends_at.slice(0, 10), -1)]

export const addBlock = async ({ businessId, staffId = null, dateKey, from, to, reason }) => {
    const { error } = await supabase.from('time_blocks').insert({
        business_id: businessId,
        staff_id: staffId,
        starts_at: at(dateKey, from),
        ends_at: to >= 24 * 60 ? `${addDays(dateKey, 1)}T00:00:00` : at(dateKey, to),
        reason: reason?.trim() || null,
    })
    if (error) throw error
}

export const addClosedDates = async ({ businessId, fromKey, toKey, reason }) => {
    const { error } = await supabase.from('time_blocks').insert({
        business_id: businessId,
        staff_id: null,
        starts_at: `${fromKey}T00:00:00`,
        ends_at: `${addDays(toKey, 1)}T00:00:00`,
        reason: reason?.trim() || null,
    })
    if (error) throw error
}

export const removeBlock = async (businessId, id) => {
    const { error } = await supabase.from('time_blocks').delete().eq('business_id', businessId).eq('id', id)
    if (error) throw error
}

export const loadClosedDates = async (businessId, todayKey) => {
    const rows = await loadBlocks(businessId, todayKey, addDays(todayKey, 365))
    return rows.filter(isClosedDay).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

// Bookings still standing inside a span: blocking time never cancels them, so the owner is told.
export const bookingsInside = async ({ businessId, fromKey, toKey, staffId = null, from = 0, to = 24 * 60 }) => {
    const rows = await loadBookings(businessId, fromKey, toKey)
    return rows.filter((b) => {
        if (!['pending', 'confirmed'].includes(b.status)) return false
        if (staffId && b.staff_id !== staffId) return false
        if (fromKey !== toKey) return true
        const [h, m] = b.appointment_time.split(':').map(Number)
        const start = h * 60 + m
        return start < to && start + (Number(b.duration_minutes) || 0) > from
    })
}

import { supabase } from '../config/supabase'

// Blocks with reasons (client-blocks.sql). Owners block from a booking; Locappoint reviews every one.
const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const BLOCK_REASONS = [
    { value: 'no_shows', label: 'Repeated no-shows' },
    { value: 'late_cancels', label: 'Cancels late again and again' },
    { value: 'unsafe', label: 'Rude or unsafe behaviour' },
    { value: 'unpaid', label: 'Did not pay' },
    { value: 'other', label: 'Something else' },
]

export const REASON_LABEL = Object.fromEntries(BLOCK_REASONS.map((r) => [r.value, r.label]))

export const REVIEW_LABEL = {
    pending: 'Locappoint is reviewing',
    kept: 'Reviewed, kept',
    lifted: 'Lifted by Locappoint',
}

export const blockClient = ({ appointmentId, reason, note = '' }) =>
    call('block_client', { p_appointment: appointmentId, p_reason: reason, p_note: note.trim() || null })
export const unblockClient = (id) => call('unblock_client', { p_block: id })
export const loadBlocks = (businessId) => call('my_blocks', { p_business: businessId })
export const bookingBlock = (appointmentId) => call('booking_block', { p_appointment: appointmentId })

export const loadAdminBlocks = ({ review = 'pending', offset = 0, limit = 50 } = {}) =>
    call('admin_blocks', { p_review: review, p_limit: limit, p_offset: offset })
export const reviewBlock = ({ id, decision, note }) => call('admin_review_block', { p_block: id, p_decision: decision, p_note: note })
export const businessBlockFlag = (businessId) => call('admin_business_blocks', { p_business: businessId })

import { supabase } from '../config/supabase'
import { SUPPORT } from '../constants/support'

// Support tickets. Everything goes through the database functions in support-desk.sql: signed in,
// the account is the key; a guest, the booking link is.
const call = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const listTickets = ({ side = 'client', businessId = null } = {}) =>
    call('my_tickets', { p_side: side, p_business: businessId })

export const loadTicket = (id) => call('my_ticket', { p_id: id })

export const openTicket = ({ side, category, message, subject = '', businessId = null, appointmentId = null }) =>
    call('open_ticket', {
        p_side: side,
        p_category: category,
        p_message: message.trim(),
        p_subject: subject.trim() || null,
        p_business: businessId,
        p_appointment: appointmentId,
    })

export const replyTicket = (id, body) => call('reply_ticket', { p_id: id, p_body: body.trim() })

export const closeTicket = (id) => call('close_ticket', { p_id: id })

export const linkTickets = (token) => call('tickets_by_link', { p_token: token })

export const reportByLink = ({ token, category, message }) =>
    call('report_by_link', { p_token: token, p_category: category, p_message: message.trim() })

export const replyByLink = ({ token, ticketId, body }) =>
    call('reply_by_link', { p_token: token, p_ticket: ticketId, p_body: body.trim() })

export const loadSuspension = (businessId) => call('my_business_suspension', { p_business: businessId })

// The server's own words are written for people; anything else gets a plain retry line.
const SAYS = ['22023', '42501', 'P0002', '54000']
export const supportError = (err, fallback = 'That did not send. Check your connection and try again.') =>
    (SAYS.includes(err?.code) && err.message) || fallback

// Whether a booking can still be reported: until 48 hours after it ends. The server decides; this
// only hides the button once it is clearly too late.
export const canReport = (booking, now = Date.now()) => {
    const date = String(booking?.appointment_date || '').slice(0, 10)
    const time = String(booking?.appointment_time || '00:00').slice(0, 5)
    if (!date) return false
    const start = new Date(`${date}T${time}:00`).getTime()
    if (!Number.isFinite(start)) return false
    const end = start + (Number(booking.duration_minutes) || 0) * 60000
    return now <= end + SUPPORT.reportHours * 3600000
}

export const ticketRef = (t) => (t?.number ? `#${t.number}` : '')

// "Today 14:05", "Yesterday", "3 Oct".
export const whenSent = (iso, now = new Date()) => {
    if (!iso) return ''
    const d = new Date(iso)
    const day = (x) => x.toLocaleDateString('en-CA')
    const clock = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (day(d) === day(now)) return `Today ${clock}`
    if (day(d) === day(new Date(now.getTime() - 86400000))) return `Yesterday ${clock}`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Whether a person is at the desk now, in Portugal time, and if not when they are back.
export const deskStatus = (at = new Date()) => {
    const { days, open, close, timeZone } = SUPPORT.schedule
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at).map((p) => [p.type, p.value]))
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
    const minutes = Number(parts.hour) * 60 + Number(parts.minute)
    if (days.includes(dow) && minutes >= open && minutes < close) return { open: true, text: '' }
    const clock = `${String(Math.floor(open / 60)).padStart(2, '0')}:${String(open % 60).padStart(2, '0')}`
    for (let ahead = 0; ahead < 8; ahead += 1) {
        const day = (dow + ahead) % 7
        if (!days.includes(day)) continue
        if (ahead === 0 && minutes >= open) continue
        const when = ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : DAY_NAMES[day]
        return { open: false, text: `Back ${when} at ${clock} Portugal time` }
    }
    return { open: false, text: 'Back soon' }
}

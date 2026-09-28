import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelMyBooking, loadMyBookings } from '../../../services/booking'
import { todayKey } from '../../../services/dates'

const ACTIVE = ['pending', 'confirmed']

export const useMyBookings = (email) => {
    const [state, setState] = useState({ status: 'loading', rows: [] })
    const [cancelling, setCancelling] = useState(null)
    const [busy, setBusy] = useState(false)
    const [cancelError, setCancelError] = useState('')
    const [toast, setToast] = useState(null)

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            setState({ status: 'ready', rows: await loadMyBookings(email) })
        } catch (err) {
            console.error('Bookings failed:', err)
            setState({ status: 'error', rows: [] })
        }
    }, [email])

    useEffect(() => { if (email) load() }, [email, load])

    useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 3200)
        return () => clearTimeout(timer)
    }, [toast])

    const groups = useMemo(() => {
        const today = todayKey()
        const upcoming = state.rows.filter((r) => r.appointment_date >= today && ACTIVE.includes(r.status))
        const past = state.rows.filter((r) => r.status !== 'cancelled' && !upcoming.includes(r)).reverse()
        const cancelled = state.rows.filter((r) => r.status === 'cancelled').reverse()
        return { upcoming, past, cancelled }
    }, [state.rows])

    const askCancel = useCallback((row) => {
        setCancelError('')
        setCancelling(row)
    }, [])

    const keep = useCallback(() => { if (!busy) setCancelling(null) }, [busy])

    const confirmCancel = async () => {
        setBusy(true)
        setCancelError('')
        try {
            await cancelMyBooking(cancelling.id)
            setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === cancelling.id ? { ...r, status: 'cancelled' } : r)) }))
            setCancelling(null)
            setToast('Booking cancelled')
        } catch (err) {
            console.error('Cancel failed:', err)
            setCancelError('We could not cancel it. Try again, or message the business.')
        } finally {
            setBusy(false)
        }
    }

    return { state, groups, load, cancelling, busy, cancelError, toast, askCancel, keep, confirmCancel }
}

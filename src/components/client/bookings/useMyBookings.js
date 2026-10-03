import { useCallback, useEffect, useMemo, useState } from 'react'
import { USER_ERRORS, cancelMyBooking, isAhead, loadMyBookings, loadWeek } from '../../../services/booking'
import { paidOnline } from '../../../services/payments'

const ACTIVE = ['pending', 'confirmed']

export const useMyBookings = (email) => {
    const [state, setState] = useState({ status: 'loading', rows: [] })
    const [cancelling, setCancelling] = useState(null)
    const [busy, setBusy] = useState(false)
    const [cancelError, setCancelError] = useState('')
    const [toast, setToast] = useState(null)
    const [moving, setMoving] = useState(null)
    const [moveError, setMoveError] = useState('')

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
        const upcoming = state.rows.filter((r) => ACTIVE.includes(r.status) && isAhead(r))
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
            setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === cancelling.id ? { ...r, status: 'cancelled', cancelled_by: 'client' } : r)) }))
            setCancelling(null)
            setToast(paidOnline(cancelling) ? 'Booking cancelled. Your refund is on its way.' : 'Booking cancelled')
            // A paid booking comes back with its refund, which the database worked out on cancel.
            if (paidOnline(cancelling)) loadMyBookings(email).then((rows) => setState({ status: 'ready', rows })).catch(() => {})
        } catch (err) {
            console.error('Cancel failed:', err)
            setCancelError(USER_ERRORS.includes(err?.code) && err.message ? err.message : 'We could not cancel it. Try again, or message the business.')
        } finally {
            setBusy(false)
        }
    }

    const askMove = useCallback(async (row) => {
        setMoveError('')
        try {
            setMoving({ booking: row, week: await loadWeek(row.businesses.id) })
        } catch (err) {
            console.error('Hours failed:', err)
            setMoveError('We could not load the free times. Try again.')
        }
    }, [])

    const closeMove = useCallback(() => setMoving(null), [])

    const moved = useCallback(async () => {
        try {
            const rows = await loadMyBookings(email)
            setState({ status: 'ready', rows })
        } catch (err) {
            console.error('Bookings failed:', err)
        }
    }, [email])

    return { state, groups, load, cancelling, busy, cancelError, toast, askCancel, keep, confirmCancel, moving, moveError, askMove, closeMove, moved }
}

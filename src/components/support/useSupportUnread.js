import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listTickets } from '../../services/support'

// Replies from us not yet read, for the Support row in the sidebar. Checked again on every page change.
export const useSupportUnread = ({ side, businessId = null, enabled = true }) => {
    const { pathname } = useLocation()
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!enabled) return undefined
        let cancelled = false
        listTickets({ side, businessId })
            .then((data) => { if (!cancelled) setCount(Number(data?.unread) || 0) })
            .catch(() => { if (!cancelled) setCount(0) })
        return () => { cancelled = true }
    }, [side, businessId, enabled, pathname])
    return count
}

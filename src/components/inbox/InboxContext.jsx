import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { countUnread, markInboxRead, subscribeInbox } from '../../services/inbox'

const InboxContext = createContext(null)

// One per shell. Keeps the unread count live and tells the page when something new lands.
export const InboxProvider = ({ audience, onArrive, children }) => {
    const { user } = useAuth()
    const [unread, setUnread] = useState(0)
    const [version, setVersion] = useState(0)
    const arrive = useRef(onArrive)
    const marks = useRef(0)

    useEffect(() => { arrive.current = onArrive }, [onArrive])

    // A count that started before the last mark-read is stale, so it is dropped.
    const refresh = useCallback(async () => {
        const stamp = marks.current
        try {
            const count = await countUnread(audience)
            if (stamp === marks.current) setUnread(count)
        } catch (err) {
            console.error('Unread count failed:', err)
        }
    }, [audience])

    useEffect(() => {
        if (user?.id) refresh()
    }, [user?.id, refresh])

    useEffect(() => {
        if (!user?.id) return undefined
        return subscribeInbox(user.id, (row) => {
            if (!row || row.audience !== audience) return
            setUnread((n) => n + 1)
            setVersion((v) => v + 1)
            arrive.current?.(row)
        })
    }, [user?.id, audience])

    const markAllRead = useCallback(async () => {
        marks.current += 1
        setUnread(0)
        try {
            await markInboxRead(audience)
        } catch (err) {
            console.error('Mark read failed:', err)
            refresh()
        }
    }, [audience, refresh])

    const value = useMemo(() => ({ audience, unread, version, markAllRead }), [audience, unread, version, markAllRead])
    return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export const useInbox = () => {
    const inbox = useContext(InboxContext)
    if (!inbox) throw new Error('useInbox must be used inside an InboxProvider')
    return inbox
}

import { useCallback, useEffect, useRef, useState } from 'react'

export const useAutosave = ({ pending, ready = true, blocked = false, save, delay = 700 }) => {
    const [state, setState] = useState('idle')
    const [round, setRound] = useState(0)
    const inFlight = useRef(false)
    const latest = useRef({ pending, save })
    latest.current = { pending, save }

    useEffect(() => {
        if (!ready || !pending || inFlight.current) return undefined
        const timer = setTimeout(async () => {
            inFlight.current = true
            setState('saving')
            try {
                await latest.current.save(pending)
                setState('saved')
            } catch (err) {
                console.error('Autosave failed:', err)
                setState('error')
            } finally {
                inFlight.current = false
                setRound((n) => n + 1)
            }
        }, delay)
        return () => clearTimeout(timer)
    }, [pending, ready, round, delay])

    useEffect(() => {
        if (pending) return
        if (blocked) setState('blocked')
        else setState((s) => (s === 'blocked' ? 'saved' : s))
    }, [pending, blocked])

    useEffect(() => {
        const onLeave = (event) => {
            if (latest.current.pending || inFlight.current) event.preventDefault()
        }
        window.addEventListener('beforeunload', onLeave)
        return () => {
            window.removeEventListener('beforeunload', onLeave)
            const last = latest.current
            if (last.pending && !inFlight.current) {
                Promise.resolve(last.save(last.pending, { leaving: true })).catch((err) => console.error('Autosave failed:', err))
            }
        }
    }, [])

    const retry = useCallback(() => setRound((n) => n + 1), [])

    return { state, retry }
}

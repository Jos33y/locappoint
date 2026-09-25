import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const useCountUp = (target, duration = 700) => {
    const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
    const from = useRef(value)

    useEffect(() => {
        if (prefersReducedMotion() || typeof target !== 'number') {
            setValue(target)
            return undefined
        }
        const initial = from.current
        let start = null
        let frame
        const tick = (now) => {
            if (start === null) start = now
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)
            const next = initial + (target - initial) * eased
            setValue(next)
            if (t < 1) frame = requestAnimationFrame(tick)
            else from.current = target
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [target, duration])

    return value
}

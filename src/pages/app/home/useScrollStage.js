import { useEffect, useRef, useState } from 'react'

// True once the element's middle has scrolled above the given share of the screen, false again
// when scrolled back. Listens only while the element is near the screen, and re-renders only
// when the answer changes, never per frame.
export const useScrollStage = (at = 0.55) => {
    const ref = useRef(null)
    const [passed, setPassed] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el || typeof IntersectionObserver === 'undefined') return undefined
        let frame = 0
        const measure = () => {
            frame = 0
            const box = el.getBoundingClientRect()
            setPassed(box.top + box.height / 2 < window.innerHeight * at)
        }
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }
        const watch = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                window.addEventListener('scroll', onScroll, { passive: true })
                window.addEventListener('resize', onScroll, { passive: true })
                measure()
            } else {
                window.removeEventListener('scroll', onScroll)
                window.removeEventListener('resize', onScroll)
                measure()
            }
        }, { rootMargin: '25% 0px' })
        watch.observe(el)
        return () => {
            watch.disconnect()
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [at])
    return [ref, passed]
}

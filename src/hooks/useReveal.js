// useReveal - Adds is-in-view to a ref when it enters the viewport. One-shot per element.

import { useEffect, useRef } from 'react'

const STAGGER_MS = 55
const STAGGER_CAP_MS = 600
const CHILD_SELECTORS = '.card, .stat, .step, .pill, .city, .feature, .placeholder'

export function useReveal() {
    const ref = useRef(null)

    useEffect(() => {
        const target = ref.current
        if (!target) return

        if (typeof IntersectionObserver === 'undefined') {
            target.classList.add('is-in-view')
            target.querySelectorAll(CHILD_SELECTORS).forEach((el) => el.classList.add('is-in-view'))
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return
                    entry.target.classList.add('is-in-view')

                    const items = entry.target.querySelectorAll(CHILD_SELECTORS)
                    items.forEach((item, i) => {
                        const delay = Math.min(i * STAGGER_MS, STAGGER_CAP_MS)
                        item.style.transitionDelay = delay + 'ms'
                        requestAnimationFrame(() => item.classList.add('is-in-view'))
                    })

                    observer.unobserve(entry.target)
                })
            },
            { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
        )

        observer.observe(target)
        return () => observer.disconnect()
    }, [])

    return ref
}

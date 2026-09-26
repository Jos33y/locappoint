import { useEffect, useRef, useState } from 'react'
import { slugProblem } from '../constants/reservedSlugs'
import { checkSlug } from '../services/setup'

export const useSlugStatus = (slug, ownSlug) => {
    const [state, setState] = useState('idle')
    const seq = useRef(0)
    useEffect(() => {
        const id = ++seq.current
        if (!slug) { setState('idle'); return undefined }
        if (slugProblem(slug)) { setState('invalid'); return undefined }
        if (slug === ownSlug) { setState('available'); return undefined }
        setState('checking')
        const timer = setTimeout(async () => {
            try {
                const result = await checkSlug(slug)
                if (id === seq.current) setState(result)
            } catch {
                if (id === seq.current) setState('error')
            }
        }, 350)
        return () => clearTimeout(timer)
    }, [slug, ownSlug])
    return state
}

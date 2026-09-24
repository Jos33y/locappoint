import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ORIGIN = 'https://locappoint.com'

const CanonicalSync = () => {
    const { pathname } = useLocation()

    useEffect(() => {
        const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
        let link = document.querySelector('link[rel="canonical"]')
        if (!link) {
            link = document.createElement('link')
            link.rel = 'canonical'
            document.head.appendChild(link)
        }
        link.href = `${ORIGIN}${path}`
    }, [pathname])

    return null
}

export default CanonicalSync

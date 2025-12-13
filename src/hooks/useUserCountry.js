// useUserCountry.js - Hook for detecting user's country via IP
// Location: src/hooks/useUserCountry.js

import { useState, useEffect } from 'react'

// Module-level cache - persists across component instances
let cachedCountry = null
let detectionPromise = null

const detectCountry = async () => {
    // Return cached result if available
    if (cachedCountry !== null) {
        return cachedCountry
    }

    // If detection is already in progress, wait for it
    if (detectionPromise) {
        return detectionPromise
    }

    // Start detection
    detectionPromise = (async () => {
        try {
            const response = await fetch('https://api.country.is/', {
                signal: AbortSignal.timeout(3000)
            })
            const data = await response.json()
            cachedCountry = data.country || null
            return cachedCountry
        } catch (error) {
            console.warn('Could not detect user country:', error)
            cachedCountry = null
            return null
        } finally {
            detectionPromise = null
        }
    })()

    return detectionPromise
}

/**
 * Hook to detect user's country via IP geolocation
 * Results are cached - only one API call is made per session
 * 
 * @returns {{ countryCode: string | null, isDetecting: boolean }}
 * 
 * @example
 * const { countryCode, isDetecting } = useUserCountry()
 * // countryCode: 'US', 'BR', 'NG', 'PT', etc. or null if detection failed
 */
export const useUserCountry = () => {
    const [countryCode, setCountryCode] = useState(cachedCountry)
    const [isDetecting, setIsDetecting] = useState(cachedCountry === null)

    useEffect(() => {
        // Skip if already cached
        if (cachedCountry !== null) {
            setCountryCode(cachedCountry)
            setIsDetecting(false)
            return
        }

        let isMounted = true

        detectCountry().then(code => {
            if (isMounted) {
                setCountryCode(code)
                setIsDetecting(false)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    return { countryCode, isDetecting }
}

// Optional: manually clear cache (useful for testing)
export const clearCountryCache = () => {
    cachedCountry = null
    detectionPromise = null
}

export default useUserCountry
// useT - Wraps useLandingTranslation to support (key, fallback) signature.

import { useLandingTranslation } from './useLandingTranslation'

export function useT() {
    const ctx = useLandingTranslation()
    const baseT = ctx && ctx.t

    return (key, fallback) => {
        if (typeof baseT !== 'function') {
            return fallback !== undefined ? fallback : key
        }
        const value = baseT(key)
        if (value === undefined || value === null || value === '' || value === key) {
            return fallback !== undefined ? fallback : key
        }
        return value
    }
}

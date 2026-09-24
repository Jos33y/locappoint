const STORAGE_KEY = 'locappoint_consent'
const VERSION = 1
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export const CONSENT_OPEN_EVENT = 'locappoint:consent-open'

const listeners = new Set()

export const getConsent = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (!stored || stored.version !== VERSION) return null
        if (Date.now() - new Date(stored.decidedAt).getTime() > MAX_AGE_MS) return null
        return stored
    } catch {
        return null
    }
}

export const hasAnalyticsConsent = () => getConsent()?.analytics === true

export const setConsent = (analytics) => {
    const record = { version: VERSION, analytics, decidedAt: new Date().toISOString() }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)) } catch { /* noop */ }
    listeners.forEach((listener) => listener(analytics))
}

export const onConsentChange = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export const openConsentPreferences = () => {
    window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}

import { Suspense, lazy, useEffect } from 'react'

const WaitlistApp = lazy(() => import('./WaitlistApp'))
const BookingApp  = lazy(() => import('./BookingApp'))
const StatusApp   = lazy(() => import('./StatusApp'))

const APEX = 'locappoint.com'
const DEV_MODE_KEY = 'locappoint_dev_mode'
const DEV_MODES = ['waitlist', 'status', 'app']

// app. is reserved for the future download page, so it forwards to the apex for now.
function redirectToApex() {
    const host = window.location.hostname
    if (host !== `www.${APEX}` && host !== `app.${APEX}`) return false
    const { pathname, search, hash } = window.location
    window.location.replace(`https://${APEX}${pathname}${search}${hash}`)
    return true
}

function detectMode() {
    if (typeof window === 'undefined') return 'app'

    const host = window.location.hostname
    if (host.startsWith('waitlist.')) return 'waitlist'
    if (host.startsWith('status.')) return 'status'

    if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search)
        const requested = DEV_MODES.find((mode) => params.has(mode))
        if (requested) {
            try { sessionStorage.setItem(DEV_MODE_KEY, requested) } catch { /* noop */ }
            return requested
        }
        try {
            const stored = sessionStorage.getItem(DEV_MODE_KEY)
            if (DEV_MODES.includes(stored)) return stored
        } catch { /* noop */ }
    }

    return 'app'
}

const BootDismisser = () => {
    useEffect(() => {
        if (typeof window !== 'undefined' && typeof window.__locaBootReady === 'function') {
            window.__locaBootReady()
        }
    }, [])
    return null
}

const App = () => {
    if (typeof window !== 'undefined' && redirectToApex()) return null
    const mode = detectMode()

    let chunk
    if (mode === 'app') chunk = <BookingApp />
    else if (mode === 'status') chunk = <StatusApp />
    else chunk = <WaitlistApp />

    return (
        <Suspense fallback={null}>
            <BootDismisser />
            {chunk}
        </Suspense>
    )
}

export default App
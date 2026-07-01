import { Suspense, lazy, useEffect } from 'react'

/* Hostname-based router selection + per-host code splitting.
 *
 * Each router tree lives in its own *App.jsx and is lazy-loaded so
 * Vite/Rollup emits separate chunks. A visitor only downloads the
 * chunk that matches their hostname:
 *
 *   dist/assets/WaitlistApp-{hash}.js  | locappoint.com
 *   dist/assets/BookingApp-{hash}.js   | app.locappoint.com
 *   dist/assets/StatusApp-{hash}.js    | status.locappoint.com
 *
 * Dev escapes (?app, ?status, ?waitlist) work via querystring. The
 * mode is cached in sessionStorage so navigation within a chunk
 * doesn't fall back to waitlist when the querystring drops off.
 * Production hostname always wins over dev gates.
 *
 * Order: app -> status -> waitlist fallback. No /etc/hosts needed. */

const WaitlistApp = lazy(() => import('./WaitlistApp'))
const BookingApp  = lazy(() => import('./BookingApp'))
const StatusApp   = lazy(() => import('./StatusApp'))

const DEV_MODE_KEY = 'locappoint_dev_mode'

function detectMode() {
    if (typeof window === 'undefined') return 'waitlist'

    const host = window.location.hostname
    if (host.startsWith('app.')) return 'app'
    if (host.startsWith('status.')) return 'status'

    if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search)

        if (params.has('app')) {
            try { sessionStorage.setItem(DEV_MODE_KEY, 'app') } catch { /* noop */ }
            return 'app'
        }
        if (params.has('status')) {
            try { sessionStorage.setItem(DEV_MODE_KEY, 'status') } catch { /* noop */ }
            return 'status'
        }
        if (params.has('waitlist')) {
            try { sessionStorage.removeItem(DEV_MODE_KEY) } catch { /* noop */ }
            return 'waitlist'
        }

        // Bare / is the waitlist entry point. Always serves waitlist and
        // clears the cache. To stay in app/status mode through a refresh,
        // be on a sub-path (/portal/..., /businesses, /auth, etc.) - the
        // cache holds there. To re-enter app mode from /, use ?app.
        if (window.location.pathname === '/') {
            try { sessionStorage.removeItem(DEV_MODE_KEY) } catch { /* noop */ }
            return 'waitlist'
        }

        try {
            const stored = sessionStorage.getItem(DEV_MODE_KEY)
            if (stored === 'app') return 'app'
            if (stored === 'status') return 'status'
        } catch { /* noop */ }
    }

    return 'waitlist'
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
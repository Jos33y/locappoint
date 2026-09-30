// Crash reports and the one reload after a deploy. Reports go to report_client_error, which dedupes and caps them.

// The built file name carries the build hash, so it tells which release an error came from.
const RELEASE = (() => {
    try { return new URL(import.meta.url).pathname.split('/').pop().replace(/\.js$/, '').slice(0, 40) } catch { return 'unknown' }
})()

const RELOAD_KEY = 'locappoint_reloaded_at'
const PER_SESSION = 10
const sent = new Set()
let app = 'app'

// Noise that says nothing about our code: flaky networks, browser quirks, extensions.
const NOISE = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|The user aborted|Load failed|Failed to fetch$|NetworkError when attempting|cancell?ed$/i

const CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk \d+ failed/i

export const isChunkError = (error) => CHUNK.test(String(error?.message || error || ''))

// After a deploy, an open tab still points at the old files. One reload fetches the new ones; a second
// failure within a minute is a real fault, so it is shown instead of looping.
export const reloadOnce = () => {
    try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
        if (Date.now() - last < 60000) return false
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
        return false
    }
    window.location.reload()
    return true
}

const enabled = () => !import.meta.env.DEV || (typeof window !== 'undefined' && window.__locaReportInDev)

export const reportError = (error, extra = {}) => {
    if (!enabled() || !error) return
    const message = String(error.message || error).slice(0, 500)
    const stack = String(error.stack || '').concat(extra.componentStack ? `\nComponent:${extra.componentStack}` : '').slice(0, 4000)
    if (NOISE.test(message) || /chrome-extension:|moz-extension:|safari-extension:/.test(stack)) return
    const key = `${message}|${stack.split('\n')[1] || ''}`
    if (sent.has(key) || sent.size >= PER_SESSION) return
    sent.add(key)
    import('../config/supabase')
        .then(({ supabase }) => supabase.rpc('report_client_error', {
            p_message: message,
            p_stack: stack,
            p_app: extra.app || app,
            p_path: window.location.pathname.slice(0, 300),
            p_release: RELEASE,
            p_user_agent: navigator.userAgent.slice(0, 300),
        }))
        .catch(() => { /* reporting must never break the page */ })
}

let installed = false

export const installErrorHandlers = (name) => {
    app = name
    if (installed || typeof window === 'undefined') return
    installed = true
    window.addEventListener('vite:preloadError', (event) => {
        if (reloadOnce()) event.preventDefault()
    })
    window.addEventListener('error', (event) => {
        if (isChunkError(event.error || event.message) && reloadOnce()) return
        reportError(event.error || new Error(event.message))
    })
    window.addEventListener('unhandledrejection', (event) => {
        if (isChunkError(event.reason) && reloadOnce()) return
        reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
    })
}

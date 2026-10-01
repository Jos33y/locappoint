// Where someone was heading before signing in with Google or Apple. The trip through the provider
// reloads the page, so the destination waits here and is used once on return.
const KEY = 'locappoint_next'

export const rememberNext = (path) => {
    try {
        if (path) sessionStorage.setItem(KEY, path)
        else sessionStorage.removeItem(KEY)
    } catch { /* private mode: they land on their home instead */ }
}

export const takeNext = () => {
    try {
        const path = sessionStorage.getItem(KEY)
        sessionStorage.removeItem(KEY)
        return path && path.startsWith('/') && !path.startsWith('//') ? path : null
    } catch {
        return null
    }
}

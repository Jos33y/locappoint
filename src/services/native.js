import { Capacitor } from '@capacitor/core'

// Inside the iPhone and Android apps the page runs from a local origin (capacitor://localhost, https://localhost),
// so anything that leaves the app (emails, sign-in, shared links) must point at the website instead.
export const WEB_ORIGIN = 'https://locappoint.com'
export const AUTH_CALLBACK = 'locappoint://auth/callback'

export const isNative = () => (typeof window !== 'undefined' && Boolean(window.__locaNative)) || Capacitor.isNativePlatform()

export const platform = () => {
    const forced = typeof window !== 'undefined' ? window.__locaNative : null
    if (forced) return typeof forced === 'string' ? forced : 'android'
    return Capacitor.getPlatform()
}

export const appOrigin = () => (isNative() ? WEB_ORIGIN : window.location.origin)

// Google and Apple refuse sign-in inside an embedded web view, so the app opens the system browser
// and comes back through locappoint://auth/callback.
export const nativeOAuth = async (supabase, provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true },
    })
    if (error) throw error
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: data.url, presentationStyle: 'popover' })
    return data
}

const finishSignIn = async (url) => {
    const { supabase } = await import('../config/supabase')
    const parsed = new URL(url.replace('locappoint://', 'https://app.local/'))
    const hash = new URLSearchParams(parsed.hash.slice(1))
    const code = parsed.searchParams.get('code')
    if (code) await supabase.auth.exchangeCodeForSession(code)
    else if (hash.get('access_token') && hash.get('refresh_token')) {
        await supabase.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') })
    }
    const { Browser } = await import('@capacitor/browser')
    await Browser.close().catch(() => { /* already closed on Android */ })
    window.location.replace('/me')
}

// Files cannot be downloaded inside the app, so they are handed to the share sheet (save, print, WhatsApp).
export const saveFile = async (blob, filename) => {
    if (!isNative()) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.download = filename
        a.href = url
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
        return
    }
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache })
    await Share.share({ title: filename, files: [uri] })
}

// Native share sheet in the app; the browser's own where it has one. Returns false when neither exists.
export const shareLink = async ({ title, text, url }) => {
    if (isNative()) {
        const { Share } = await import('@capacitor/share')
        await Share.share({ title, text, url })
        return true
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url })
        return true
    }
    return false
}

let started = false

// App-only wiring: splash, back button, and the return from sign-in.
export const startNative = async () => {
    if (started || !Capacitor.isNativePlatform()) return
    started = true
    document.documentElement.classList.add('lc-native')
    const [{ App }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/splash-screen')])
    SplashScreen.hide().catch(() => { /* already hidden */ })
    App.addListener('appUrlOpen', ({ url }) => {
        if (url?.startsWith('locappoint://auth')) finishSignIn(url).catch((err) => console.error('Sign-in return failed:', err))
    })
    // Android back: close an open sheet first, then go back, then leave the app.
    App.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('.ui-sheet')) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
            return
        }
        if (canGoBack && window.history.length > 1) window.history.back()
        else App.exitApp()
    })
}

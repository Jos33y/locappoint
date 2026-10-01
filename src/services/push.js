import { supabase } from '../config/supabase'
import { isNative, platform } from './native'

// Push notifications in the phone apps. Android only until the Apple account and its push key exist;
// add 'ios' here once the APNs key is in Firebase.
const PLATFORMS = ['android']
const ASKED = 'locappoint_push_asked'

let listening = false
let token = null
let opener = null
let pendingLink = null

// window.__locaPush lets tests stand in for the phone. Wrapped in an object because awaiting a Capacitor
// plugin directly calls its "then", which the plugin does not have on the web.
const load = async () => ({ P: (typeof window !== 'undefined' && window.__locaPush)
    || (await import('@capacitor/push-notifications')).PushNotifications })

const appVersion = async () => {
    if (typeof window !== 'undefined' && window.__locaAppVersion) return window.__locaAppVersion
    try {
        const { App } = await import('@capacitor/app')
        return (await App.getInfo()).version
    } catch {
        return null
    }
}

export const pushAvailable = () => isNative() && PLATFORMS.includes(platform())

export const wasAsked = () => {
    try { return localStorage.getItem(ASKED) === '1' } catch { return false }
}

export const markAsked = () => {
    try { localStorage.setItem(ASKED, '1') } catch { /* private mode: asks again next time */ }
}

// 'granted', 'denied', 'prompt' (or 'prompt-with-rationale'), or 'unavailable' on the website.
export const pushPermission = async () => {
    if (!pushAvailable()) return 'unavailable'
    try {
        const { P } = await load()
        return (await P.checkPermissions()).receive
    } catch {
        return 'unavailable'
    }
}

const listen = async (P) => {
    if (listening) return
    listening = true
    await P.addListener('registration', async ({ value }) => {
        token = value
        const { error } = await supabase.rpc('register_push_token', { p_token: value, p_platform: platform(), p_app_version: await appVersion() })
        if (error) console.warn('Could not save this phone for notifications:', error.message)
    })
    await P.addListener('registrationError', (err) => console.warn('Notifications could not start:', err?.error || err))
    // A tapped notification opens the booking it is about. Taps that come before the screens are ready wait.
    await P.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const link = notification?.data?.link
        if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return
        if (opener) opener(link)
        else pendingLink = link
    })
}

// Permission already given: (re)connect this phone. Safe to call on every start; the token is refreshed.
export const startPush = async () => {
    if (!pushAvailable()) return
    const { P } = await load()
    await listen(P)
    await P.createChannel?.({ id: 'bookings', name: 'Bookings', description: 'New bookings, changes and reminders', importance: 4, visibility: 1 }).catch(() => {})
    await P.register()
}

// The phone's own permission prompt. Returns what the person chose.
export const askPush = async () => {
    if (!pushAvailable()) return 'unavailable'
    markAsked()
    const { P } = await load()
    await listen(P)
    const { receive } = await P.requestPermissions()
    if (receive === 'granted') await startPush()
    return receive
}

export const setPushEnabled = async (on) => {
    const { error } = await supabase.rpc('set_push_enabled', { p_on: on })
    if (error) throw error
}

// Signing out: this phone stops getting the account's news. Everywhere: every phone does.
export const forgetPush = async ({ everywhere = false } = {}) => {
    if (!everywhere && !token) return
    try {
        await supabase.rpc('forget_push_token', { p_token: everywhere ? null : token })
    } catch {
        /* signing out still goes ahead */
    }
    if (!everywhere) token = null
}

export const onPushOpen = (fn) => {
    opener = fn
    if (pendingLink) {
        const link = pendingLink
        pendingLink = null
        fn(link)
    }
    return () => { if (opener === fn) opener = null }
}

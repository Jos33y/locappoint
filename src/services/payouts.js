import { supabase } from '../config/supabase'
import { isNative } from './native'

const readError = async (error) => {
    try {
        const body = await error?.context?.json?.()
        if (body?.error) return body.error
    } catch { /* not JSON */ }
    return 'We could not reach payouts. Check your connection and try again.'
}

export const callPayouts = async (action, body = {}) => {
    const { data, error } = await supabase.functions.invoke('payouts', { body: { action, ...body } })
    if (error) throw new Error(await readError(error))
    if (data?.error) throw new Error(data.error)
    return data
}

// Stripe's page is a one-time visit. In the app it opens in the browser and the app checks again when the owner comes back.
export const openPayoutLink = async (url) => {
    if (isNative()) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url })
        return
    }
    window.location.assign(url)
}

export const onAppReturn = async (handler) => {
    if (!isNative()) return () => {}
    const { App } = await import('@capacitor/app')
    const sub = await App.addListener('resume', handler)
    return () => sub.remove()
}

export const payoutTarget = () => (isNative() ? 'app' : 'web')

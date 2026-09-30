import { isNative, WEB_ORIGIN } from './native'

const configured = (import.meta.env.VITE_PUBLIC_URL || '').trim().replace(/\/+$/, '')

// Inside the apps the page origin is local, so links people share always use the website.
export const publicOrigin = () => configured || (isNative() ? WEB_ORIGIN : window.location.origin)

export const publicHost = () => publicOrigin().replace(/^https?:\/\//, '')

// src tells Insights where a visit came from, for apps that hide the referrer (WhatsApp, QR codes).
export const pageUrl = (slug, src) => `${publicOrigin()}/${slug}${src ? `?src=${src}` : ''}`

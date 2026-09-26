const configured = (import.meta.env.VITE_PUBLIC_URL || '').trim().replace(/\/+$/, '')

export const publicOrigin = () => configured || window.location.origin

export const publicHost = () => publicOrigin().replace(/^https?:\/\//, '')

export const pageUrl = (slug) => `${publicOrigin()}/${slug}`

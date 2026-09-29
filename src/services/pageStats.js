import { supabase } from '../config/supabase'

// Counts for the business's Insights: page opened, booking started, time picked.
// Nothing is stored on the visitor's device and nothing identifies them: the database
// only adds one to a daily count per source and device type.

const TAGS = { wa: 'whatsapp', ig: 'instagram', fb: 'facebook', g: 'google', qr: 'qr', email: 'email' }

const REFERRERS = [
    [/(^|\.)(wa\.me|whatsapp\.com)$/, 'whatsapp'],
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)(facebook\.com|fb\.me|messenger\.com)$/, 'facebook'],
    [/(^|\.)google\.[a-z.]+$/, 'google'],
]

export const visitSource = ({ search = '', cameFromApp = false } = {}) => {
    const tag = new URLSearchParams(search).get('src')
    if (tag && TAGS[tag]) return TAGS[tag]
    if (cameFromApp) return 'locappoint'
    let host = ''
    try { host = document.referrer ? new URL(document.referrer).hostname : '' } catch { host = '' }
    if (!host) return 'direct'
    if (host === window.location.hostname) return 'locappoint'
    const match = REFERRERS.find(([pattern]) => pattern.test(host))
    return match ? match[1] : 'other'
}

const deviceType = () => (window.matchMedia?.('(pointer: coarse)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop')

// One count per event per business per page load.
const counted = new Set()
const visits = new Map()

export const trackPage = (businessId, event, source) => {
    if (!businessId || navigator.webdriver) return
    const key = `${businessId}:${event}`
    if (counted.has(key)) return
    counted.add(key)
    if (source) visits.set(businessId, source)
    const from = visits.get(businessId) || 'direct'
    supabase
        .rpc('track_page_event', { p_business_id: businessId, p_event: event, p_source: from, p_device: deviceType() })
        .then(({ error }) => { if (error) console.error('Page count failed:', error.message) })
}

// analytics.js - Comprehensive analytics tracking service
// Location: src/services/analytics.js

import { supabase } from '../config/supabase'

// ============ ENVIRONMENT CHECK ============
// In Vite, use import.meta.env.PROD (true in production builds)
const isProduction = import.meta.env.PROD

// Debug logging in development
const debugLog = (...args) => {
    if (!isProduction) {
        console.log('[Analytics Dev]', ...args)
    }
}

// ============ SESSION MANAGEMENT ============

const SESSION_KEY = 'locappoint_session_id'
const SESSION_DATA_KEY = 'locappoint_session_data'

// Generate unique session ID
const generateSessionId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get or create session ID
export const getSessionId = () => {
    let sessionId = sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
        sessionId = generateSessionId()
        sessionStorage.setItem(SESSION_KEY, sessionId)
    }
    return sessionId
}

// ============ DEVICE DETECTION ============

const getDeviceType = () => {
    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet'
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile'
    }
    return 'desktop'
}

const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    let version = ''

    if (ua.includes('Firefox/')) {
        browser = 'Firefox'
        version = ua.match(/Firefox\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Edg/')) {
        browser = 'Edge'
        version = ua.match(/Edg\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Chrome/')) {
        browser = 'Chrome'
        version = ua.match(/Chrome\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        browser = 'Safari'
        version = ua.match(/Version\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Opera') || ua.includes('OPR/')) {
        browser = 'Opera'
        version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || ''
    }

    return { browser, version }
}

const getOSInfo = () => {
    const ua = navigator.userAgent
    let os = 'Unknown'
    let version = ''

    if (ua.includes('Windows NT 10')) {
        os = 'Windows'
        version = '10/11'
    } else if (ua.includes('Windows NT')) {
        os = 'Windows'
        version = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || ''
    } else if (ua.includes('Mac OS X')) {
        os = 'macOS'
        version = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || ''
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
        os = 'iOS'
        version = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || ''
    } else if (ua.includes('Android')) {
        os = 'Android'
        version = ua.match(/Android (\d+\.?\d*)/)?.[1] || ''
    } else if (ua.includes('Linux')) {
        os = 'Linux'
    }

    return { os, version }
}

// ============ UTM & REFERRER ============

const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search)
    return {
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_term: params.get('utm_term') || null,
        utm_content: params.get('utm_content') || null
    }
}

const getReferrerInfo = () => {
    const referrer = document.referrer
    if (!referrer) return { referrer: null, referrer_domain: null }
    
    try {
        const url = new URL(referrer)
        // Don't track internal referrers
        if (url.hostname === window.location.hostname) {
            return { referrer: null, referrer_domain: null }
        }
        return {
            referrer: referrer,
            referrer_domain: url.hostname
        }
    } catch {
        return { referrer: referrer, referrer_domain: null }
    }
}

// ============ GEO DETECTION ============

let geoData = null
let geoFetching = false
let geoCallbacks = []

const fetchGeoData = async () => {
    if (geoData) return geoData
    if (geoFetching) {
        return new Promise(resolve => geoCallbacks.push(resolve))
    }
    
    geoFetching = true
    
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal
        })
        clearTimeout(timeout)
        
        if (response.ok) {
            const data = await response.json()
            geoData = {
                country: data.country_code || null,
                country_name: data.country_name || null,
                region: data.region || null,
                city: data.city || null,
                timezone: data.timezone || null
            }
        }
    } catch (error) {
        // Fallback - try api.country.is
        try {
            const response = await fetch('https://api.country.is', {
                signal: AbortSignal.timeout(3000)
            })
            if (response.ok) {
                const data = await response.json()
                geoData = {
                    country: data.country || null,
                    country_name: null,
                    region: null,
                    city: null,
                    timezone: null
                }
            }
        } catch {
            geoData = {
                country: null,
                country_name: null,
                region: null,
                city: null,
                timezone: null
            }
        }
    }
    
    geoFetching = false
    geoCallbacks.forEach(cb => cb(geoData))
    geoCallbacks = []
    
    return geoData
}

// ============ SESSION INITIALIZATION ============

export const initSession = async () => {
    const sessionId = getSessionId()
    
    // Skip database operations in development
    if (!isProduction) {
        debugLog('Session init skipped (dev mode)', { sessionId })
        return sessionId
    }
    
    // Check if session already exists in DB
    const existingData = sessionStorage.getItem(SESSION_DATA_KEY)
    if (existingData) {
        // Session already initialized, just update last_seen
        await updateSession({ last_seen_at: new Date().toISOString() })
        return sessionId
    }
    
    // Gather all data
    const browserInfo = getBrowserInfo()
    const osInfo = getOSInfo()
    const utmParams = getUTMParams()
    const referrerInfo = getReferrerInfo()
    const geo = await fetchGeoData()
    
    const sessionData = {
        session_id: sessionId,
        
        // Geo
        country: geo.country,
        country_name: geo.country_name,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        
        // Device
        device_type: getDeviceType(),
        browser: browserInfo.browser,
        browser_version: browserInfo.version,
        os: osInfo.os,
        os_version: osInfo.version,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        
        // Traffic source
        ...referrerInfo,
        ...utmParams,
        
        // Language
        language: navigator.language?.split('-')[0] || null,
        
        // Initial values
        page_views: 1,
        total_time_seconds: 0,
        is_bounce: true
    }
    
    try {
        const { error } = await supabase
            .from('analytics_sessions')
            .insert([sessionData])
        
        if (error) {
            // If session already exists (race condition), that's fine
            if (!error.message?.includes('duplicate')) {
                console.error('Analytics session error:', error)
            }
        } else {
            sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify({ initialized: true }))
        }
    } catch (error) {
        console.error('Analytics init error:', error)
    }
    
    return sessionId
}

// ============ SESSION UPDATES ============

export const updateSession = async (updates) => {
    // Skip in development
    if (!isProduction) {
        debugLog('Session update skipped (dev mode)', updates)
        return
    }
    
    const sessionId = getSessionId()
    
    try {
        await supabase
            .from('analytics_sessions')
            .update({
                ...updates,
                last_seen_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
    } catch (error) {
        console.error('Session update error:', error)
    }
}

// Increment page views and set bounce to false if > 1
export const trackPageView = async () => {
    // Skip in development
    if (!isProduction) {
        debugLog('Page view skipped (dev mode)')
        return
    }
    
    const sessionId = getSessionId()
    
    try {
        // Get current page views
        const { data } = await supabase
            .from('analytics_sessions')
            .select('page_views')
            .eq('session_id', sessionId)
            .single()
        
        const newPageViews = (data?.page_views || 0) + 1
        
        await updateSession({
            page_views: newPageViews,
            is_bounce: newPageViews <= 1
        })
    } catch (error) {
        console.error('Page view tracking error:', error)
    }
}

// ============ EVENT TRACKING ============

export const trackEvent = async (eventType, eventName, eventCategory = null, eventValue = null, metadata = null) => {
    // Skip in development
    if (!isProduction) {
        debugLog('Event skipped (dev mode)', { eventType, eventName, eventCategory, eventValue })
        return
    }
    
    const sessionId = getSessionId()
    
    const eventData = {
        session_id: sessionId,
        event_type: eventType,
        event_category: eventCategory,
        event_name: eventName,
        event_value: eventValue,
        page_path: window.location.pathname,
        page_title: document.title,
        metadata: metadata
    }
    
    try {
        await supabase
            .from('analytics_events')
            .insert([eventData])
    } catch (error) {
        console.error('Event tracking error:', error)
    }
}

// ============ SPECIFIC TRACKERS ============

// Track section visibility (for scroll depth)
export const trackSectionView = (sectionId) => {
    trackEvent('section_view', sectionId, 'engagement', sectionId)
}

// Track button clicks
export const trackButtonClick = (buttonName, location = null) => {
    trackEvent('click', buttonName, 'interaction', location, { button: buttonName, location })
}

// Track modal opens
export const trackModalOpen = async (modalName) => {
    await trackEvent('modal_open', modalName, 'engagement', modalName)
    
    // Update session conversion flags
    if (modalName === 'waitlist') {
        await updateSession({ waitlist_opened: true })
    } else if (modalName === 'partnership') {
        await updateSession({ partnership_opened: true })
    }
}

// Track modal closes
export const trackModalClose = (modalName) => {
    trackEvent('modal_close', modalName, 'engagement', modalName)
}

// Track form submissions
export const trackFormSubmit = async (formName, formData = {}) => {
    await trackEvent('form_submit', formName, 'conversion', formName, { 
        form: formName,
        // Don't store sensitive data, just metadata
        user_type: formData.userType || null,
        business_type: formData.businessType || null,
        country: formData.country || null
    })
    
    // Update session conversion flags
    if (formName === 'waitlist') {
        await updateSession({ waitlist_submitted: true, is_bounce: false })
    } else if (formName === 'partnership') {
        await updateSession({ partnership_submitted: true, is_bounce: false })
    }
}

// Track WhatsApp click
export const trackWhatsAppClick = async () => {
    await trackEvent('click', 'whatsapp_channel', 'conversion', 'whatsapp')
    await updateSession({ whatsapp_clicked: true })
}

// Track external link clicks
export const trackExternalLink = (url, linkName) => {
    trackEvent('external_link', linkName, 'navigation', url, { url, link_name: linkName })
}

// Track FAQ interactions
export const trackFAQInteraction = (questionIndex, action) => {
    trackEvent('faq_interaction', `faq_${action}`, 'engagement', `question_${questionIndex}`, { 
        question_index: questionIndex, 
        action 
    })
}

// Track language change
export const trackLanguageChange = (fromLang, toLang) => {
    trackEvent('language_change', 'language_toggle', 'interaction', toLang, { from: fromLang, to: toLang })
}

// Track scroll depth
export const trackScrollDepth = (percentage) => {
    trackEvent('scroll', `scroll_${percentage}`, 'engagement', `${percentage}%`, { depth: percentage })
}

// ============ TIME TRACKING ============

let startTime = Date.now()
let totalTimeInterval = null

export const startTimeTracking = () => {
    // Skip in development
    if (!isProduction) {
        debugLog('Time tracking skipped (dev mode)')
        return
    }
    
    startTime = Date.now()
    
    // Update total time every 30 seconds
    totalTimeInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        await updateSession({ total_time_seconds: elapsed })
    }, 30000)
    
    // Also update on page unload
    window.addEventListener('beforeunload', () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        // Use sendBeacon for reliable tracking on unload
        navigator.sendBeacon && navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_sessions?session_id=eq.${getSessionId()}`,
            JSON.stringify({ total_time_seconds: elapsed })
        )
    })
}

export const stopTimeTracking = () => {
    if (totalTimeInterval) {
        clearInterval(totalTimeInterval)
        totalTimeInterval = null
    }
}

// ============ INTERSECTION OBSERVER FOR SECTIONS ============

const observedSections = new Set()

export const observeSections = (sectionIds) => {
    if (typeof IntersectionObserver === 'undefined') return
    
    // Skip tracking in development but still observe for UX
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !observedSections.has(entry.target.id)) {
                    observedSections.add(entry.target.id)
                    trackSectionView(entry.target.id)
                }
            })
        },
        { threshold: 0.3 }
    )
    
    sectionIds.forEach(id => {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
    })
    
    return () => observer.disconnect()
}

// ============ SCROLL DEPTH TRACKING ============

let maxScrollDepth = 0
const scrollMilestones = [25, 50, 75, 100]
const trackedMilestones = new Set()

export const initScrollTracking = () => {
    const handleScroll = () => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollPercent = Math.round((scrollTop / docHeight) * 100)
        
        if (scrollPercent > maxScrollDepth) {
            maxScrollDepth = scrollPercent
            
            scrollMilestones.forEach(milestone => {
                if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
                    trackedMilestones.add(milestone)
                    trackScrollDepth(milestone)
                }
            })
        }
    }
    
    // Debounce scroll handler
    let scrollTimeout
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout)
        scrollTimeout = setTimeout(handleScroll, 100)
    })
}

// ============ UTILITY: Check if analytics is enabled ============

export const isAnalyticsEnabled = () => isProduction

// ============ EXPORT ALL ============

export default {
    getSessionId,
    initSession,
    updateSession,
    trackPageView,
    trackEvent,
    trackSectionView,
    trackButtonClick,
    trackModalOpen,
    trackModalClose,
    trackFormSubmit,
    trackWhatsAppClick,
    trackExternalLink,
    trackFAQInteraction,
    trackLanguageChange,
    trackScrollDepth,
    startTimeTracking,
    stopTimeTracking,
    observeSections,
    initScrollTracking,
    isAnalyticsEnabled
}
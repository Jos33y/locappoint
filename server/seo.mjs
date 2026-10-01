// What each page tells search engines and link previews (WhatsApp, Instagram, Google).
// Pure functions: the server fetches the data, this decides the words. Tests call it directly.

import { categoryKey, categoryLabel } from '../src/constants/categories.js'

export const ORIGIN = 'https://locappoint.com'
const DEFAULT_IMAGE = `${ORIGIN}/og-image.png`
const SITE = 'Locappoint'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const clip = (text, n) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim()
    if (t.length <= n) return t
    const cut = t.slice(0, n - 1)
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20)).replace(/[,.;:]$/, '')}…`
}
// JSON inside a script tag: "<" escaped so a business description can never close the tag.
const ldJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

const HOME = {
    title: 'Locappoint: book local businesses in Porto, Lisbon and Lagos',
    description: 'Find barbers, salons, clinics and studios near you and book in seconds. Businesses get a free booking page, reminders that cut no-shows, and their day in one app.',
}

// Public pages that are not a business.
export const PAGES = {
    '/': HOME,
    '/businesses': { title: 'Book local businesses in Porto, Lisbon and Lagos | Locappoint', description: 'Barbers, hair and nail salons, clinics, studios and more. See prices, open times and reviews, and book online in seconds.' },
    '/app': { title: 'Get the Locappoint app for Android and iPhone', description: 'Your bookings, your calendar and your reminders, one tap away. Free to download, on the same account as the website.' },
    '/contact': { title: 'Contact Locappoint', description: 'Questions, help with a booking, or a business that wants to join. Write to us and a person replies.' },
    '/partnership': { title: 'Partner with Locappoint', description: 'Bring Locappoint to the businesses you work with in Porto, Lisbon and Lagos.' },
    '/privacy': { title: 'Privacy Policy | Locappoint', description: 'What Locappoint collects, why, how long we keep it, and how to get it deleted.' },
    '/terms': { title: 'Terms of Service | Locappoint', description: 'The terms for booking with, and taking bookings on, Locappoint.' },
    '/legal/notice': { title: 'Legal notice | Locappoint', description: 'The company behind Locappoint and how to reach it.' },
    '/legal/cookies': { title: 'Cookies | Locappoint', description: 'The few cookies and storage items Locappoint uses, and why.' },
    '/legal/dpa': { title: 'Data Processing Agreement | Locappoint', description: 'How Locappoint processes client data on behalf of the businesses that use it.' },
    '/legal/subprocessors': { title: 'Subprocessors | Locappoint', description: 'The services Locappoint relies on to run, and what each one handles.' },
    '/legal/ranking': { title: 'How businesses are ranked | Locappoint', description: 'How Locappoint orders businesses in search and lists.' },
    '/legal/delete-account': { title: 'Delete your Locappoint account', description: 'How to delete your account and data, from the app, the website or by email.' },
}

// Signed-in screens and one-off links: never in search results.
const PRIVATE = ['/portal', '/client', '/admin', '/auth', '/b/', '/me', '/join/', '/team/', '/forgot-password', '/reset-password', '/waitlist']
// Single-segment paths the app owns, so they are never looked up as a business.
export const RESERVED = new Set(['', 'about', 'businesses', 'app', 'contact', 'partnership', 'privacy', 'terms', 'legal', 'admin', 'auth', 'me', 'forgot-password', 'reset-password', 'waitlist', 'portal', 'client', 'join', 'team', 'b', 'robots.txt', 'sitemap.xml', 'favicon.ico'])

export const isPrivate = (path) => PRIVATE.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p.endsWith('/') ? p : `${p}/`))

// "femtos-barbearia" from "/femtos-barbearia", or null when the path cannot be a business page.
export const slugOf = (path) => {
    const m = /^\/([a-z0-9][a-z0-9-]{1,62})\/?$/i.exec(path)
    return m && !RESERVED.has(m[1].toLowerCase()) ? m[1].toLowerCase() : null
}

const SCHEMA_TYPE = {
    barbershop: 'HairSalon', hair_salon: 'HairSalon', braids: 'HairSalon', nails: 'NailSalon', beauty_salon: 'BeautySalon',
    lashes_brows: 'BeautySalon', skincare: 'BeautySalon', hair_removal: 'BeautySalon', makeup: 'BeautySalon', tanning: 'TanningSalon',
    tattoo: 'TattooParlor', massage: 'DaySpa', spa: 'DaySpa', dentist: 'Dentist', medical_clinic: 'MedicalClinic', physio: 'MedicalClinic',
    gym: 'ExerciseGym', yoga: 'ExerciseGym', pilates: 'ExerciseGym', personal_trainer: 'ExerciseGym', martial_arts: 'SportsActivityLocation',
    dance: 'SportsActivityLocation', vet: 'VeterinaryCare', driving_school: 'DrivingSchool', car_wash: 'AutoWash', mechanic: 'AutoRepair',
    tyres: 'AutoRepair', electrician: 'Electrician', plumber: 'Plumber', accountant: 'AccountingService', lawyer: 'LegalService', notary: 'Notary',
    real_estate: 'RealEstateAgent', photographer: 'ProfessionalService', cleaning: 'HomeAndConstructionBusiness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CURRENCY = { NG: 'NGN' }

// The business's own hours, or every team member's when the business has none of its own.
const openingHours = (hours = []) => {
    const own = hours.filter((h) => !h.staff_id)
    const rows = (own.length ? own : hours).filter((h) => h.is_active !== false)
    const seen = new Set()
    return rows
        .map((h) => ({ day: DAYS[h.day_of_week], opens: String(h.start_time).slice(0, 5), closes: String(h.end_time).slice(0, 5) }))
        .filter((h) => h.day && !seen.has(`${h.day}${h.opens}${h.closes}`) && seen.add(`${h.day}${h.opens}${h.closes}`))
        .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${h.day}`, opens: h.opens, closes: h.closes }))
}

export const businessMeta = (b, { services = [], hours = [], rating = null } = {}) => {
    const url = `${ORIGIN}/${b.slug}`
    const kind = categoryLabel(b.category, b.category_detail)
    const place = [b.neighbourhood, b.city].filter(Boolean).join(', ')
    const title = clip(`${b.business_name}${b.city ? `, ${b.city}` : ''}: book online | ${SITE}`, 70)
    const lead = [kind, place && `in ${place}`].filter(Boolean).join(' ')
    const pitch = `See prices, open times and reviews, and book ${b.business_name} online in seconds.`
    const description = clip(b.description || (lead ? `${lead}. ${pitch}` : pitch), 158)
    const image = b.banner_url || b.logo_url || DEFAULT_IMAGE
    const currency = CURRENCY[b.country] || 'EUR'
    const ld = {
        '@context': 'https://schema.org',
        '@type': SCHEMA_TYPE[categoryKey(b.category)] || 'LocalBusiness',
        '@id': `${url}#business`,
        name: b.business_name,
        url,
        description: clip(b.description || description, 300),
        image: [b.banner_url, b.logo_url].filter(Boolean),
        ...(b.phone || b.whatsapp ? { telephone: b.phone || b.whatsapp } : {}),
        ...(b.address || b.city ? { address: { '@type': 'PostalAddress', ...(b.address ? { streetAddress: b.address } : {}), ...(b.city ? { addressLocality: b.city } : {}), ...(b.country ? { addressCountry: b.country } : {}) } } : {}),
        ...(openingHours(hours).length ? { openingHoursSpecification: openingHours(hours) } : {}),
        ...(rating && Number(rating.count) > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(rating.average), reviewCount: Number(rating.count), bestRating: 5, worstRating: 1 } } : {}),
        ...(services.length ? {
            makesOffer: services.filter((s) => !s.is_addon).slice(0, 20).map((s) => ({
                '@type': 'Offer',
                itemOffered: { '@type': 'Service', name: s.service_name },
                ...(s.price !== null && s.price !== undefined && s.price !== '' ? { price: Number(s.price), priceCurrency: currency } : {}),
            })),
        } : {}),
        potentialAction: { '@type': 'ReserveAction', target: { '@type': 'EntryPoint', urlTemplate: url, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] } },
    }
    if (!ld.image.length) delete ld.image
    return { title, description, image, url, type: 'business.business', noindex: Boolean(b.is_demo), ld }
}

const ORG_LD = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE,
    url: ORIGIN,
    logo: `${ORIGIN}/brand/loca-app-icon.svg`,
    sameAs: [
        'https://www.facebook.com/profile.php?id=61583886238494',
        'https://instagram.com/locappoint',
        'https://twitter.com/locappoint',
        'https://linkedin.com/company/locappoint',
        'https://youtube.com/@locappoint',
        'https://tiktok.com/@locappoint_',
    ],
}

// Meta for a non-business path; null means "not one of ours" (the app redirects it home).
export const pageMeta = (path) => {
    const clean = path.length > 1 ? path.replace(/\/+$/, '') : '/'
    if (isPrivate(clean)) return { title: SITE, description: HOME.description, image: DEFAULT_IMAGE, url: `${ORIGIN}${clean}`, noindex: true }
    const page = PAGES[clean]
    if (!page) return null
    return {
        ...page,
        image: DEFAULT_IMAGE,
        url: `${ORIGIN}${clean}`,
        ld: clean === '/' ? [ORG_LD, { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: ORIGIN }] : null,
    }
}

export const notFoundMeta = (path) => ({ title: `Page not found | ${SITE}`, description: HOME.description, image: DEFAULT_IMAGE, url: `${ORIGIN}${path}`, noindex: true })

export const headTags = (m) => [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<meta name="robots" content="${m.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">`,
    `<link rel="canonical" href="${esc(m.url)}">`,
    `<meta property="og:type" content="${esc(m.type || 'website')}">`,
    `<meta property="og:site_name" content="${SITE}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(m.url)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    ...(m.image === DEFAULT_IMAGE ? ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'] : []),
    '<meta property="og:locale" content="en_GB">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:site" content="@locappoint">',
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    ...[].concat(m.ld || []).map((d) => `<script type="application/ld+json">${ldJson(d)}</script>`),
].map((t) => `  ${t}`).join('\n')

export const injectHead = (html, m) => html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, `<!-- seo -->\n${headTags(m)}\n  <!-- /seo -->`)

export const robotsTxt = (host) => {
    if (/^status\./.test(host)) return 'User-agent: *\nDisallow: /\n'
    if (/^waitlist\./.test(host)) return 'User-agent: *\nAllow: /\n'
    return [
        'User-agent: *',
        'Allow: /',
        ...PRIVATE.map((p) => `Disallow: ${p}`),
        '',
        `Sitemap: ${ORIGIN}/sitemap.xml`,
        '',
    ].join('\n')
}

export const sitemapXml = (businesses = []) => {
    const urls = [
        ['/', '1.0', 'weekly'],
        ['/businesses', '0.9', 'daily'],
        ['/app', '0.7', 'monthly'],
        ...businesses.filter((b) => b.slug && !b.is_demo).map((b) => [`/${b.slug}`, '0.8', 'weekly']),
        ['/contact', '0.4', 'yearly'],
        ['/partnership', '0.4', 'yearly'],
        ...Object.keys(PAGES).filter((p) => p === '/privacy' || p === '/terms' || p.startsWith('/legal/')).map((p) => [p, '0.2', 'yearly']),
    ]
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(([p, priority, freq]) => `  <url><loc>${esc(`${ORIGIN}${p}`)}</loc><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`),
        '</urlset>',
        '',
    ].join('\n')
}

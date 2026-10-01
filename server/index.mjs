// Serves the built site (dist/) on Coolify. Same files as before, plus what a static host cannot do:
// each page arrives with its own title, description, link preview and structured data,
// /sitemap.xml lists every live business, and old hosts get a real 301.
// No dependencies: Node's own http, fs and zlib. Start with `npm start`.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { businessMeta, injectHead, notFoundMeta, pageMeta, robotsTxt, sitemapXml, slugOf } from './seo.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(process.env.DIST_DIR || path.join(here, '..', 'dist'))
const PORT = Number(process.env.PORT) || 80
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const APEX = 'locappoint.com'

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
    '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
    '.apk': 'application/vnd.android.package-archive',
}
const COMPRESS = /^(text\/|application\/(json|javascript|manifest\+json|xml)|image\/svg)/

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

// ---------- Business data, cached so a busy page costs Supabase one call every few minutes ----------

const cache = new Map()
const cached = async (key, ttl, load) => {
    const hit = cache.get(key)
    if (hit && hit.until > Date.now()) return hit.value
    const value = await load()
    cache.set(key, { value, until: Date.now() + ttl })
    if (cache.size > 2000) cache.delete(cache.keys().next().value)
    return value
}

const rest = async (query) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase is not configured for the server')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) throw new Error(`Supabase ${res.status}`)
    return res.json()
}

const FIELDS = 'id,business_name,slug,category,category_detail,city,neighbourhood,country,phone,whatsapp,description,address,logo_url,banner_url,is_demo'

const loadBusiness = (slug) => cached(`b:${slug}`, 5 * 60_000, async () => {
    const [b] = await rest(`businesses?select=${FIELDS}&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`)
    if (!b) return { missing: true }
    const [services, hours, ratings] = await Promise.all([
        rest(`services?select=service_name,price,is_addon&business_id=eq.${b.id}&is_active=eq.true&order=sort_order,service_name`).catch(() => []),
        rest(`availability?select=staff_id,day_of_week,start_time,end_time,is_active&business_id=eq.${b.id}&is_active=eq.true`).catch(() => []),
        rest('rpc/business_ratings').catch(() => []),
    ])
    return { business: b, services, hours, rating: ratings.find((r) => r.business_id === b.id) || null }
})

const loadAll = () => cached('all', 60 * 60_000, () => rest('businesses?select=slug,is_demo&is_active=eq.true&order=created_at'))

// ---------- Responses ----------

const send = (req, res, status, type, body, headers = {}) => {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body)
    const accept = String(req.headers['accept-encoding'] || '')
    let out = buf
    const h = {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        Vary: 'Accept-Encoding',
        ...headers,
    }
    if (buf.length > 1024 && COMPRESS.test(type)) {
        if (/\bbr\b/.test(accept)) { out = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); h['Content-Encoding'] = 'br' }
        else if (/\bgzip\b/.test(accept)) { out = zlib.gzipSync(buf, { level: 6 }); h['Content-Encoding'] = 'gzip' }
    }
    h['Content-Length'] = out.length
    res.writeHead(status, h)
    res.end(req.method === 'HEAD' ? undefined : out)
}

// Built files never change under the same name, so they are compressed once and kept.
const fileCache = new Map()
const staticFile = (rel) => {
    const file = path.join(DIST, rel)
    if (!file.startsWith(DIST + path.sep)) return null
    if (fileCache.has(file)) return fileCache.get(file)
    let found = null
    try {
        const stat = fs.statSync(file)
        if (stat.isFile()) found = { body: fs.readFileSync(file), type: TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }
    } catch { /* not a file */ }
    if (found && found.body.length < 5_000_000) fileCache.set(file, found)
    return found
}

const page = async (pathname) => {
    const meta = pageMeta(pathname)
    if (meta) return { status: 200, meta, cache: 'no-cache' }
    const slug = slugOf(pathname)
    if (!slug) return { status: 200, meta: { ...pageMeta('/'), url: `https://${APEX}${pathname}`, noindex: true }, cache: 'no-cache' }
    try {
        const found = await loadBusiness(slug)
        if (found.missing) return { status: 404, meta: notFoundMeta(pathname), cache: 'no-cache' }
        return { status: 200, meta: businessMeta(found.business, found), cache: 'no-cache' }
    } catch (err) {
        console.error('Business lookup failed:', slug, err.message)
        return { status: 200, meta: { ...pageMeta('/'), url: `https://${APEX}/${slug}` }, cache: 'no-store' }
    }
}

const handle = async (req, res) => {
    const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '')
    const url = new URL(req.url, 'http://local')
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { pathname = url.pathname }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'text/plain; charset=utf-8', 'Method not allowed', { Allow: 'GET, HEAD' })

    // One address for search engines: www and app. move here for good.
    if (host === `www.${APEX}`) return send(req, res, 301, 'text/plain; charset=utf-8', '', { Location: `https://${APEX}${url.pathname}${url.search}` })
    if (host === `app.${APEX}`) return send(req, res, 301, 'text/plain; charset=utf-8', '', { Location: `https://${APEX}${url.pathname === '/' ? '/app' : url.pathname}${url.search}` })
    if (pathname === '/about') return send(req, res, 301, 'text/plain; charset=utf-8', '', { Location: '/' })

    if (pathname === '/robots.txt') return send(req, res, 200, 'text/plain; charset=utf-8', robotsTxt(host), { 'Cache-Control': 'public, max-age=3600' })
    if (pathname === '/sitemap.xml') {
        const all = await loadAll().catch((err) => { console.error('Sitemap lookup failed:', err.message); return [] })
        return send(req, res, 200, 'application/xml; charset=utf-8', sitemapXml(all), { 'Cache-Control': 'public, max-age=3600' })
    }

    const file = pathname !== '/' && !pathname.endsWith('/') && staticFile(pathname.replace(/^\/+/, ''))
    if (file) {
        const immutable = pathname.startsWith('/assets/')
        return send(req, res, 200, file.type, file.body, { 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' })
    }
    // A missing file (an old chunk, a typo'd image) is a real 404, not the app.
    if (path.extname(pathname)) return send(req, res, 404, 'text/plain; charset=utf-8', 'Not found', { 'Cache-Control': 'no-store' })

    // The waitlist and status sites keep the page as it is; the status site stays out of search.
    if (host.startsWith('waitlist.') || host.startsWith('status.')) {
        return send(req, res, 200, 'text/html; charset=utf-8', template, { 'Cache-Control': 'no-cache', ...(host.startsWith('status.') ? { 'X-Robots-Tag': 'noindex' } : {}) })
    }

    const { status, meta, cache: cacheControl } = await page(pathname)
    return send(req, res, status, 'text/html; charset=utf-8', injectHead(template, meta), {
        'Cache-Control': cacheControl,
        ...(meta.noindex ? { 'X-Robots-Tag': 'noindex' } : {}),
    })
}

http.createServer((req, res) => {
    handle(req, res).catch((err) => {
        console.error('Request failed:', req.url, err)
        if (!res.headersSent) send(req, res, 200, 'text/html; charset=utf-8', template, { 'Cache-Control': 'no-store' })
    })
}).listen(PORT, () => console.log(`Locappoint web on :${PORT}, serving ${DIST}${SUPABASE_URL ? '' : ' (no Supabase: generic page details only)'}`))

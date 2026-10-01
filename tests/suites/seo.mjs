// SEO: the web server gives every page its own title, description, preview card and structured data,
// keeps private screens out of search, lists live businesses in the sitemap, and still serves the app.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))

export default async ({ check, root }) => {
    // A pretend Supabase with one real business, one demo and nothing else.
    const BIZ = {
        id: 'b1', business_name: 'Femtos <Barbearia>', slug: 'femtos-barbearia', category: 'barbershop', category_detail: null,
        city: 'Lisbon', neighbourhood: 'Bairro Alto', country: 'PT', phone: '+351 912 345 678', whatsapp: null,
        description: null, address: 'Rua da Rosa 112', logo_url: null, banner_url: 'https://cdn.example/banner.jpg', is_demo: false,
    }
    const DEMO = { ...BIZ, id: 'b2', business_name: 'Demo Studio', slug: 'demo-studio', is_demo: true }
    let calls = 0
    const fake = http.createServer((req, res) => {
        calls++
        const u = new URL(req.url, 'http://x')
        const json = (v) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)) }
        if (req.headers.apikey !== 'anon-key') { res.writeHead(401); return res.end('{}') }
        if (u.pathname === '/rest/v1/businesses' && u.searchParams.get('slug')) {
            const slug = u.searchParams.get('slug').replace('eq.', '')
            return json([BIZ, DEMO].filter((b) => b.slug === slug))
        }
        if (u.pathname === '/rest/v1/businesses') return json([{ slug: BIZ.slug, is_demo: false }, { slug: DEMO.slug, is_demo: true }])
        if (u.pathname === '/rest/v1/services') return json([{ service_name: 'Haircut', price: 15, is_addon: false }, { service_name: 'Hot towel', price: 5, is_addon: true }])
        if (u.pathname === '/rest/v1/availability') return json([{ staff_id: null, day_of_week: 1, start_time: '09:00:00', end_time: '19:00:00', is_active: true }])
        if (u.pathname === '/rest/v1/rpc/business_ratings') return json([{ business_id: 'b1', average: 4.8, count: 12 }])
        json([])
    })
    const supa = await listen(fake)

    // The built page: the real index.html head, plus one asset.
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'loca-dist-'))
    fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'))
    fs.mkdirSync(path.join(dist, 'assets'))
    fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log("app");'.repeat(200))

    const port = 40000 + Math.floor(Math.random() * 20000)
    const proc = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], {
        env: { ...process.env, PORT: String(port), DIST_DIR: dist, VITE_SUPABASE_URL: `http://127.0.0.1:${supa}`, VITE_SUPABASE_ANON_KEY: 'anon-key' },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    let log = ''
    proc.stdout.on('data', (d) => { log += d })
    proc.stderr.on('data', (d) => { log += d })
    for (let i = 0; i < 50 && !log.includes('Locappoint web on'); i++) await new Promise((r) => setTimeout(r, 100))

    // node:http, not fetch, because fetch will not send a different Host header.
    const get = (p, headers = {}) => new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: p, headers: { host: 'locappoint.com', ...headers } }, (res) => {
            const chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => resolve({ status: res.statusCode, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null }, body: Buffer.concat(chunks).toString() }))
        })
        req.on('error', reject)
        req.end()
    })
    const meta = (html, attr, name) => (new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html) || [])[1]
    const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))

    try {
        check(log.includes('Locappoint web on'), `the server starts: ${log.slice(0, 200)}`)

        // Home
        let r = await get('/')
        check(r.status === 200 && /<div id="root">/.test(r.body) && /<title>Locappoint: book local businesses in Porto, Lisbon and Lagos<\/title>/.test(r.body), 'the home page is the app, with its own title')
        check(!/seo:start/.test(r.body) && (r.body.match(/<title>/g) || []).length === 1 && (r.body.match(/name="description"/g) || []).length === 1, 'the default block is replaced, never duplicated')
        check(/<link rel="canonical" href="https:\/\/locappoint.com\/">/.test(r.body) && /index, follow/.test(meta(r.body, 'name', 'robots')), 'home is canonical and indexable')
        check(ld(r.body).some((d) => d['@type'] === 'Organization') && ld(r.body).some((d) => d['@type'] === 'WebSite'), 'home tells Google who we are')
        check(/rel="manifest"/.test(r.body) && /rel="apple-touch-icon"/.test(r.body), 'icons and the manifest stay in place')

        // A business page
        r = await get('/femtos-barbearia')
        const b = ld(r.body).find((d) => d['@type'] === 'HairSalon')
        check(r.status === 200 && meta(r.body, 'property', 'og:title') === 'Femtos &lt;Barbearia&gt;, Lisbon: book online | Locappoint', `a shared business link previews the business: ${meta(r.body, 'property', 'og:title')}`)
        check(meta(r.body, 'property', 'og:image') === 'https://cdn.example/banner.jpg' && meta(r.body, 'property', 'og:url') === 'https://locappoint.com/femtos-barbearia', 'with its own photo and address')
        check(/^Barbershop in Bairro Alto, Lisbon\. See prices/.test(meta(r.body, 'name', 'description')), `without a description of its own it still reads well: ${meta(r.body, 'name', 'description')}`)
        check(b && b.name === 'Femtos <Barbearia>' && b.address.addressLocality === 'Lisbon' && b.telephone === '+351 912 345 678', 'Google gets the business name, address and phone')
        check(b?.aggregateRating?.ratingValue === 4.8 && b.aggregateRating.reviewCount === 12, 'and its star rating')
        check(b?.openingHoursSpecification?.[0]?.dayOfWeek === 'https://schema.org/Monday' && b.openingHoursSpecification[0].opens === '09:00', 'and its opening hours')
        check(b?.makesOffer?.length === 1 && b.makesOffer[0].price === 15 && b.makesOffer[0].priceCurrency === 'EUR', 'and its services with prices, extras left out')
        check(!/<\/script><script/.test(r.body.replace(/<\/script>\s*<script/g, '')) && !/Femtos <Barbearia>/.test(r.body.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), 'names are escaped everywhere outside the data block')
        const before = calls
        await get('/femtos-barbearia')
        check(calls === before, 'a busy page is served from memory, not Supabase every time')

        r = await get('/demo-studio')
        check(/noindex/.test(meta(r.body, 'name', 'robots')) && r.headers.get('x-robots-tag') === 'noindex', 'the demo business stays out of search')
        r = await get('/no-such-place')
        check(r.status === 404 && /noindex/.test(meta(r.body, 'name', 'robots')) && /<div id="root">/.test(r.body), 'a missing business is a real 404, still showing the app')

        // Other pages
        r = await get('/app')
        check(/<title>Get the Locappoint app for Android and iPhone<\/title>/.test(r.body), 'the download page has its own title')
        r = await get('/privacy/')
        check(/<link rel="canonical" href="https:\/\/locappoint.com\/privacy">/.test(r.body), 'a trailing slash points to the one canonical address')
        for (const p of ['/portal', '/portal/calendar', '/client/profile', '/admin', '/auth', '/b/abc123', '/me', '/join/XYZ']) {
            r = await get(p)
            check(r.status === 200 && /noindex/.test(meta(r.body, 'name', 'robots')) && /<div id="root">/.test(r.body), `${p} works and stays out of search`)
        }

        // Robots and sitemap
        r = await get('/robots.txt')
        check(/Disallow: \/portal/.test(r.body) && /Sitemap: https:\/\/locappoint.com\/sitemap.xml/.test(r.body) && !/Disallow: \/\n/.test(r.body), 'robots.txt opens the site, closes private screens, points to the sitemap')
        r = await get('/robots.txt', { host: 'status.locappoint.com' })
        check(/Disallow: \/\n/.test(r.body), 'the status site stays out of search')
        r = await get('/sitemap.xml')
        check(r.status === 200 && /<loc>https:\/\/locappoint.com\/femtos-barbearia<\/loc>/.test(r.body) && !/demo-studio/.test(r.body) && /<loc>https:\/\/locappoint.com\/businesses<\/loc>/.test(r.body), 'the sitemap lists live businesses and public pages, not the demo')

        // Files and hosts
        r = await get('/assets/app-abc123.js', { 'accept-encoding': 'gzip, br' })
        check(r.status === 200 && /immutable/.test(r.headers.get('cache-control')) && r.headers.get('content-encoding') === 'br', 'built files are compressed and cached for a year')
        r = await get('/assets/old-chunk.js')
        check(r.status === 404, 'a missing file is a 404, not the app')
        r = await get('/../../etc/passwd')
        check(!/root:/.test(r.body), 'paths cannot leave the build folder')
        r = await get('/portal?x=1', { host: 'www.locappoint.com' })
        check(r.status === 301 && r.headers.get('location') === 'https://locappoint.com/portal?x=1', 'www moves to the main address for good')
        r = await get('/', { host: 'app.locappoint.com' })
        check(r.status === 301 && r.headers.get('location') === 'https://locappoint.com/app', 'app.locappoint.com goes to the download page')
        r = await get('/', { host: 'waitlist.locappoint.com' })
        check(r.status === 200 && /seo:start/.test(r.body), 'the waitlist site is served as before')

        // Supabase down: pages still load
        fake.close()
        fake.closeAllConnections()
        r = await get('/another-place')
        check(r.status === 200 && /<div id="root">/.test(r.body), 'if Supabase is unreachable, business pages still load')
    } finally {
        proc.kill()
        fake.close()
        fs.rmSync(dist, { recursive: true, force: true })
    }
}

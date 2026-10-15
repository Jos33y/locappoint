// Tells the browser, inside the first HTML, which files the page will need, so it fetches them
// while the app is still starting instead of one after another. The names come from the build
// manifest (vite build writes dist/.vite/manifest.json); without one, pages are served as before.

import fs from 'node:fs'
import path from 'node:path'

// The screens people land on from outside: the home page, the list, and a business link from WhatsApp.
export const ROUTE_CHUNKS = {
    home: 'src/pages/app/AppHome.jsx',
    businesses: 'src/pages/app/Businesses.jsx',
    business: 'src/pages/app/PublicBusinessPage.jsx',
}

// Headings are set in Switzer Bold; the rest of the type arrives with the stylesheet as usual.
const FONTS = ['src/assets/fonts/Switzer-Bold.woff2']

export const loadManifest = (dist) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(dist, '.vite', 'manifest.json'), 'utf8'))
    } catch {
        return null
    }
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Every chunk a key pulls in with a static import, the key itself first.
const closure = (manifest, key, seen = new Set()) => {
    if (!manifest[key] || seen.has(key)) return seen
    seen.add(key)
    for (const dep of manifest[key].imports || []) closure(manifest, dep, seen)
    return seen
}

// The link tags for one kind of page, or '' when there is nothing to add.
export const preloadTags = (manifest, kind, origin = '') => {
    const tags = []
    if (origin) tags.push(`<link rel="preconnect" href="${esc(origin)}" crossorigin>`)
    if (!manifest) return tags.join('\n  ')

    // index.html already loads the entry and its imports; only what the route adds is new.
    const entry = Object.keys(manifest).find((k) => manifest[k].isEntry)
    const loaded = entry ? closure(manifest, entry) : new Set()
    const route = ROUTE_CHUNKS[kind]
    if (route && manifest[route]) {
        for (const key of closure(manifest, route)) {
            if (loaded.has(key)) continue
            tags.push(`<link rel="modulepreload" href="/${esc(manifest[key].file)}">`)
            for (const css of manifest[key].css || []) tags.push(`<link rel="preload" href="/${esc(css)}" as="style">`)
        }
    }
    for (const font of FONTS) {
        if (manifest[font]) tags.push(`<link rel="preload" href="/${esc(manifest[font].file)}" as="font" type="font/woff2" crossorigin>`)
    }
    return tags.join('\n  ')
}

// Put the tags at the end of <head>, after the page's own details.
export const withPreload = (html, tags) => (tags ? html.replace('</head>', `  ${tags}\n</head>`) : html)

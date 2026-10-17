// Writes dist/legal.json: the full text of every legal page as plain HTML. The site server puts it
// inside the page, so checkers that read a page without running the app (Meta's app review, Google
// Play's account-deletion check, search engines) see the policy itself, not an empty shell.
// The app replaces it the moment it starts, so people see the normal page.
// Runs after `vite build`. A failure here is reported and does not stop the deploy.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist', 'legal.json')

export const LEGAL_ROUTES = {
    '/privacy': 'Privacy',
    '/terms': 'Terms',
    '/legal/notice': 'LegalNotice',
    '/legal/cookies': 'Cookies',
    '/legal/dpa': 'Dpa',
    '/legal/subprocessors': 'Subprocessors',
    '/legal/ranking': 'Ranking',
    '/legal/policies': 'Policies',
    '/legal/delete-account': 'DeleteAccount',
}

// The page's own layout brings the header, footer and city drawings; here only the words are wanted.
const PLAIN = '\0legal-plain-layout'
const plainLayout = {
    name: 'legal-plain-layout',
    enforce: 'pre',
    resolveId(source, importer) {
        if (/[\\/]LegalLayout(\.jsx)?$/.test(source) && importer && /[\\/]legal[\\/]/.test(importer)) return PLAIN
        return null
    },
    load(id) {
        if (id !== PLAIN) return null
        return `
import { createElement as h } from 'react'
export const LEGAL_PAGES = []
const LegalLayout = ({ title, lede, sections }) => h('article', { className: 'legal-static' },
    h('h1', null, title),
    lede ? h('p', null, lede) : null,
    ...(sections || []).map((s) => h('section', { key: s.id, id: s.id }, h('h2', null, s.label), s.body)))
export default LegalLayout
`
    },
}

// Every legal page as plain HTML, keyed by its path.
export const renderLegal = async () => {
    const server = await createServer({
        root,
        configFile: path.join(root, 'vite.config.js'),
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false },
        plugins: [plainLayout],
        optimizeDeps: { noDiscovery: true, include: [] },
    })
    try {
        // The libraries load as Node loads them, the same copies the pages get (Vite keeps them outside).
        const React = (await import('react')).default
        const { renderToStaticMarkup } = await import('react-dom/server')
        const { MemoryRouter } = await import('react-router-dom')
        const pages = {}
        for (const [route, file] of Object.entries(LEGAL_ROUTES)) {
            // A path from the project root, the same on Windows and Linux.
            const mod = await server.ssrLoadModule(`/src/pages/app/legal/${file}.jsx`)
            const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(mod.default)))
            if (html.length < 400) throw new Error(`${route} rendered almost nothing`)
            pages[route] = html
        }
        return pages
    } finally {
        await server.close()
    }
}

// Run as the build step: write dist/legal.json.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    renderLegal()
        .then((pages) => {
            fs.writeFileSync(out, JSON.stringify(pages))
            console.log(`Legal pages written for checkers: ${Object.keys(pages).length} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
        })
        .catch((err) => {
            console.error(`Legal pages for checkers were not written: ${err.message}`)
            console.error('The site still works; Meta and Google would see the page without its text until the next build.')
        })
}

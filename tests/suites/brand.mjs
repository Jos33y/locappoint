// Brand: one mark everywhere. The old pin is gone from the code, every icon and launch image the
// pages point at exists, and the site, the manifest and the app agree on the canvas colour.

import fs from 'node:fs'
import path from 'node:path'

const CANVAS = '#10141D'
const OLD_PIN = '42 6 C 22 6'

const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full, out) }
        else if (/\.(jsx?|css|html|xml)$/.test(entry.name)) out.push(full)
    }
    return out
}

export default async ({ check, root }) => {
    const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
    const exists = (rel) => fs.existsSync(path.join(root, ...rel.split('/')))

    const stale = [...walk(path.join(root, 'src')), path.join(root, 'index.html')]
        .filter((file) => fs.readFileSync(file, 'utf8').includes(OLD_PIN))
        .map((file) => path.relative(root, file))
    check(stale.length === 0, `the old pin is drawn nowhere in the code (${stale.join(', ')})`)
    check(!read('android/app/src/main/res/drawable/ic_stat_locappoint.xml').includes('M50,4'), 'the notification icon is the new pin')

    const mark = read('public/brand/loca-mark.svg')
    check(!/<text/.test(mark) && /aria-label="LocAppoint"/.test(mark), 'the mark file is pure shapes, labelled LocAppoint')
    for (const file of ['public/brand/loca-lockup.svg', 'public/brand/loca-lockup-dark.svg']) {
        check(!/<text/.test(read(file)), `${file} has its wordmark outlined, so it needs no font`)
    }

    const html = read('index.html')
    check(html.includes(`<meta name="theme-color" content="${CANVAS}">`), 'the browser bar matches the app canvas')
    check(/rel="icon" type="image\/svg\+xml" href="\/favicon.svg"/.test(html) && /href="\/favicon.ico"/.test(html), 'the SVG and ICO favicons are linked')
    check(/apple-mobile-web-app-status-bar-style" content="black"/.test(html), 'the iPhone status bar is dark when opened from the home screen')
    const splash = [...html.matchAll(/rel="apple-touch-startup-image"[^>]*href="([^"]+)"/g)].map((m) => m[1])
    check(splash.length === 18, `a launch image is linked for every current iPhone and iPad size (${splash.length})`)
    const missing = splash.filter((href) => !exists(`public${href}`))
    check(missing.length === 0, `every linked launch image exists in public (${missing.join(', ')})`)
    const media = new Set([...html.matchAll(/rel="apple-touch-startup-image" media="([^"]+)"/g)].map((m) => m[1]))
    check(media.size === splash.length, 'no two launch images claim the same screen')

    const manifest = JSON.parse(read('public/site.webmanifest'))
    check(manifest.theme_color === CANVAS && manifest.background_color === CANVAS, 'the manifest colours match the boot screen, so Android does not flash')
    check(!manifest.icons.some((i) => /any maskable/.test(i.purpose || '')), 'no icon is used both as is and masked')
    check(manifest.icons.some((i) => i.purpose === 'maskable'), 'a maskable icon is listed')
    const icons = manifest.icons.filter((i) => !exists(`public${i.src}`)).map((i) => i.src)
    check(icons.length === 0, `every manifest icon exists (${icons.join(', ')})`)

    const cap = JSON.parse(read('capacitor.config.json'))
    check(cap.backgroundColor === CANVAS && cap.plugins.SplashScreen.backgroundColor === CANVAS, 'the app splash sits on the same canvas as the app')

    const poster = read('src/components/business/PosterSheet.jsx')
    const posterImage = read('src/components/business/posterImage.js')
    check(/Loc<span className="lc-poster__accent">Appoint<\/span>/.test(poster), 'the poster preview carries the two-tone wordmark')
    check(/fillText\('Loc'/.test(posterImage) && /fillText\('Appoint'/.test(posterImage), 'the saved poster image carries the two-tone wordmark')
}

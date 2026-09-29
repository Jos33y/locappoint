import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const SPEC = {
  "name": "insights",
  "backup": ".backup-insights",
  "prefixes": [
    "lc-ins-",
    "lc-ins__"
  ],
  "newFiles": [
    "src/services/insights.js",
    "src/components/insights/useTip.jsx",
    "src/components/insights/Columns.jsx",
    "src/components/insights/BarList.jsx",
    "src/components/insights/Funnel.jsx",
    "src/components/insights/Heatmap.jsx",
    "src/pages/business/Insights.jsx",
    "src/styles/business/insights.css",
    "tests/suites/insights.mjs",
    "supabase/migrations/business-insights.sql",
    "supabase/queries/business-insights-verify.sql"
  ],
  "replaceFiles": [],
  "patches": [
    {
      "file": "src/BookingApp.jsx",
      "find": "const InboxPage = lazy(() => import('./components/inbox/InboxPage'))\n",
      "replace": "const InboxPage = lazy(() => import('./components/inbox/InboxPage'))\nconst Insights = lazy(() => import('./pages/business/Insights'))\n"
    },
    {
      "file": "src/BookingApp.jsx",
      "find": "<Route path=\"insights\" element={inShell(<Planned section=\"insights\" />)} />",
      "replace": "<Route path=\"insights\" element={inShell(<Insights />)} />"
    },
    {
      "file": "src/components/business/nav.js",
      "find": "{ to: '/portal/insights', label: 'Insights', name: 'Insights', icon: ChartColumn, planned: 'insights', keywords: ['money', 'stats', 'reports'] },",
      "replace": "{ to: '/portal/insights', label: 'Insights', name: 'Insights', icon: ChartColumn, keywords: ['money', 'stats', 'reports', 'visits', 'busiest'] },"
    },
    {
      "file": "tests/harness/fakeSupabase.js",
      "find": "export const calls = []\n",
      "replace": "// A believable Insights answer for any period, or a brand-new business with ?noinsights=1.\nconst insights = (days) => {\n  const quiet = new URLSearchParams(window.location.search).get('noinsights') === '1'\n  const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return new Intl.DateTimeFormat('en-CA').format(d) }\n  const daily = Array.from({ length: days }, (_, i) => {\n    const n = days - 1 - i\n    const bookings = quiet ? 0 : [3, 5, 0, 4, 6, 8, 2][n % 7]\n    return { day: back(n), bookings, earned: bookings * 16 }\n  })\n  const sum = (k) => daily.reduce((s, d) => s + d[k], 0)\n  const period = (scale) => quiet\n    ? { earned: 0, earned_count: 0, bookings: 0, no_shows: 0, no_show_value: 0, cancelled_by_client: 0, cancelled_by_business: 0, clients: 0, new_clients: 0, views: 0, starts: 0, times: 0, booked_online: 0, booked_counted: 0 }\n    : { earned: Math.round(sum('earned') * scale), earned_count: Math.round(sum('bookings') * scale), bookings: Math.round(sum('bookings') * scale), no_shows: 1, no_show_value: 18, cancelled_by_client: 2, cancelled_by_business: 1, clients: Math.round(sum('bookings') * 0.7), new_clients: Math.round(sum('bookings') * 0.3), views: 60 * days, starts: 14 * days, times: 9 * days, booked_online: 4 * days, booked_counted: 4 * days }\n  return {\n    days, from: back(days - 1), today: key, country: 'PT', counting_since: quiet ? null : back(days - 1),\n    current: period(1), previous: period(0.8),\n    ahead: quiet ? { count: 0, value: 0 } : { count: 11, value: 196 },\n    daily,\n    sources: quiet ? [] : [['instagram', 34], ['whatsapp', 12], ['direct', 8], ['google', 4], ['locappoint', 2]].map(([source, v]) => ({ source, views: v * days })),\n    mobile_views: quiet ? 0 : 48 * days,\n    hours: { open: 9, close: 19 },\n    busiest: quiet ? [] : [[1, 10, 2], [2, 11, 3], [3, 17, 4], [4, 18, 6], [5, 17, 8], [5, 18, 9], [6, 10, 12], [6, 11, 10], [6, 12, 7], [2, 15, 1]].map(([dow, hour, bookings]) => ({ dow, hour, bookings })),\n    services: quiet ? [] : [{ name: 'Haircut', bookings: 21, value: 378 }, { name: 'Beard trim', bookings: 9, value: 108 }, { name: 'Haircut and beard trim with hot towel finish', bookings: 4, value: 120 }],\n    lead_hours: quiet ? null : 41,\n  }\n}\n\nexport const calls = []\n"
    },
    {
      "file": "tests/harness/fakeSupabase.js",
      "find": "if (name === 'slug_status') return { data: args.p_slug === 'taken-one' ? 'taken' : 'available', error: null }; return",
      "replace": "if (name === 'slug_status') return { data: args.p_slug === 'taken-one' ? 'taken' : 'available', error: null }; if (name === 'business_insights') return { data: insights(args.p_days), error: null }; return"
    },
    {
      "file": "tests/harness/main.jsx",
      "find": "import InboxPage from '@src/components/inbox/InboxPage'\n",
      "replace": "import InboxPage from '@src/components/inbox/InboxPage'\nimport Insights from '@src/pages/business/Insights'\n"
    },
    {
      "file": "tests/harness/main.jsx",
      "find": "          <Route path=\"insights\" element={<Planned section=\"insights\" />} />",
      "replace": "          <Route path=\"insights\" element={<Insights />} />"
    },
    {
      "file": "tests/run.mjs",
      "find": "import notifications from './suites/notifications.mjs'\n",
      "replace": "import notifications from './suites/notifications.mjs'\nimport insights from './suites/insights.mjs'\n"
    },
    {
      "file": "tests/run.mjs",
      "find": "['notifications', notifications]] }",
      "replace": "['notifications', notifications], ['insights', insights]] }"
    },
    {
      "file": "tests/suites/shell.mjs",
      "find": "    check(await p.evaluate(() => document.querySelector('.lc-planned__status')?.textContent) === 'In build', 'insights shows in build')",
      "replace": "    await new Promise((r) => setTimeout(r, 600))\n    check(await p.evaluate(() => document.querySelector('.lc-ins h1')?.textContent) === 'Insights', 'insights tab opens Insights')"
    }
  ],
  "retires": []
}

const here = path.dirname(fileURLToPath(import.meta.url))
const root = process.cwd()
const check = process.argv.includes('--check')
const problems = []
const plan = []

const abs = (rel) => path.join(root, ...rel.split('/'))
const source = (rel) => path.join(here, 'files', ...rel.split('/'))
const read = (p) => fs.readFileSync(p, 'utf8')
const eolOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n')
const toEol = (text, eol) => text.replace(/\r\n/g, '\n').replace(/\n/g, eol)
const sha = (text) => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')
const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0)

const pkg = JSON.parse(read(abs('package.json')))
if (pkg.name !== 'locappoint') {
    console.error('  [ABORT] This is not the locappoint repo.')
    process.exit(1)
}

for (const rel of SPEC.newFiles) {
    if (fs.existsSync(abs(rel))) problems.push(`${rel} already exists (patch already applied?)`)
    else if (!fs.existsSync(source(rel))) problems.push(`payload is missing ${rel}`)
    else plan.push(['NEW', rel])
}

for (const { file, sha: expected } of SPEC.replaceFiles) {
    if (!fs.existsSync(abs(file))) { problems.push(`${file} is missing`); continue }
    if (sha(read(abs(file))) !== expected) { problems.push(`${file} changed since this patch was built (or it is already applied)`); continue }
    plan.push(['REPLACE', file])
}

const srcFiles = () => {
    const out = []
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full) }
            else if (/\.(jsx?|css)$/.test(entry.name)) out.push(full)
        }
    }
    walk(abs('src'))
    return out
}

for (const prefix of SPEC.prefixes || []) {
    const owners = srcFiles().filter((full) => read(full).includes(prefix)).map((full) => path.relative(root, full))
    if (owners.length) problems.push(`class prefix ${prefix} is already used in ${owners.join(', ')}`)
}

const edits = new Map()
for (const p of SPEC.patches) {
    if (!fs.existsSync(abs(p.file))) { problems.push(`${p.file} is missing`); continue }
    if (!edits.has(p.file)) edits.set(p.file, read(abs(p.file)))
    const current = edits.get(p.file)
    const eol = eolOf(current)
    const find = toEol(p.find, eol)
    const hits = count(current, find)
    if (hits !== 1) { problems.push(`${p.file}: anchor matched ${hits} times, expected 1: ${JSON.stringify(p.find.slice(0, 60))}`); continue }
    edits.set(p.file, current.replace(find, () => toEol(p.replace, eol)))
}
for (const file of edits.keys()) plan.push(['EDIT', file])

for (const rel of SPEC.retires) {
    if (!fs.existsSync(abs(rel))) { problems.push(`${rel} is missing`); continue }
    const base = path.basename(rel)
    const stem = /\.(jsx?)$/.test(base) ? base.replace(/\.(jsx?)$/, '') : base
    const pattern = new RegExp(`[\\/'"]${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.jsx?)?['"]`)
    const planned = (full) => {
        const key = path.relative(root, full).split(path.sep).join('/')
        if (SPEC.replaceFiles.some((f) => f.file === key)) return read(source(key))
        return edits.has(key) ? edits.get(key) : read(full)
    }
    const users = srcFiles().filter((full) => full !== abs(rel) && pattern.test(planned(full))).map((full) => path.relative(root, full))
    if (users.length) problems.push(`${rel} is still imported by ${users.join(', ')}`)
    else plan.push(['RETIRE', rel])
}

if (problems.length) {
    console.error('  [ABORT] Nothing was written:')
    for (const p of problems) console.error(`    ${p}`)
    process.exit(1)
}

if (check) {
    for (const [kind, rel] of plan) console.log(`  [${kind}] ${rel}`)
    console.log('  Checks passed.')
    process.exit(0)
}

for (const [kind, rel] of plan) {
    const target = abs(rel)
    if (kind === 'NEW') {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, read(source(rel)))
    } else if (kind === 'REPLACE') {
        const eol = eolOf(read(target))
        fs.copyFileSync(target, target + SPEC.backup)
        fs.writeFileSync(target, toEol(read(source(rel)), eol))
    } else if (kind === 'EDIT') {
        fs.copyFileSync(target, target + SPEC.backup)
        fs.writeFileSync(target, edits.get(rel))
    } else if (kind === 'RETIRE') {
        fs.renameSync(target, target + '.mistake')
    }
    console.log(`  [${kind}] ${rel}`)
}
console.log('  Patch applied.')

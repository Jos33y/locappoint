import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const SPEC = {
  "name": "payname",
  "backup": ".backup-payname",
  "prefixes": [],
  "newFiles": [],
  "replaceFiles": [
    {
      "file": "src/components/business/BusinessShell.jsx",
      "sha": "723c1bc38fdf126591f2502db00c352a3e8c7801264a40fe172aa75142b107ce"
    },
    {
      "file": "src/components/common/Appfooter.jsx",
      "sha": "d2fa0fa18385f71d13f17aa988b9693fbc94a0e6c992ee87cddda67bd1f467fd"
    },
    {
      "file": "src/pages/business/PaymentsPage.jsx",
      "sha": "b8c78a16d9ac163457ce5c6ed3348b87e42fbadb75e9af719f0a91ca5a08d828"
    },
    {
      "file": "src/styles/business/shell.css",
      "sha": "ec567a387e0cd2cc5ba0d54a1d62ff46dd1cad3db375fae3cd17a2d4739c95ab"
    },
    {
      "file": "supabase/functions/payouts/index.ts",
      "sha": "fd661c49d637caa5f419e06a5b1e648ff8463c2678c19ce685a7eb63965c96a7"
    },
    {
      "file": "supabase/functions/payouts/providers.ts",
      "sha": "fef36f0fbaeaf147cfd7866e76e37220b3a262ce6f221955aae91551bdbad63a"
    },
    {
      "file": "tests/harness/fakeSupabase.js",
      "sha": "2ed75bc04edcec018c93a44b0cb73ccff858bba16dd0e0219454a8b0b01dd7c7"
    },
    {
      "file": "tests/suites/brand.mjs",
      "sha": "bde2d184f144d3b45a3988c7fd73499de96c32a265fdef0f6abf8ba345d623ba"
    },
    {
      "file": "tests/suites/payouts.mjs",
      "sha": "8a7a7852a4be7ab4bed9ea3407c8f6d45ce2ac7bc7966f1e2f1aa3abef490164"
    }
  ],
  "patches": [],
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
    if (sha(read(abs(file))) !== expected) { problems.push(`${file} is not as expected: this patch is already applied, or travelfee is not installed`); continue }
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
        fs.copyFileSync(source(rel), target)
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

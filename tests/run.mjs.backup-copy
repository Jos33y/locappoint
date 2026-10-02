import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
import layout from './suites/layout.mjs'
import shell from './suites/shell.mjs'
import businessPage from './suites/business-page.mjs'
import servicesHours from './suites/services-hours.mjs'
import settings from './suites/settings.mjs'
import emails from './suites/emails.mjs'
import notifications from './suites/notifications.mjs'
import insights from './suites/insights.mjs'
import rebook from './suites/rebook.mjs'
import reviews from './suites/reviews.mjs'
import audit from './suites/audit.mjs'
import overview from './suites/overview.mjs'
import clientHome from './suites/client-home.mjs'
import referrals from './suites/referrals.mjs'
import clients from './suites/clients.mjs'
import team from './suites/team.mjs'
import time from './suites/time.mjs'
import addons from './suites/addons.mjs'
import money from './suites/money.mjs'
import hardening from './suites/hardening.mjs'
import apps from './suites/apps.mjs'
import account from './suites/account.mjs'
import push from './suites/push.mjs'
import seo from './suites/seo.mjs'
import admin from './suites/admin.mjs'
import brand from './suites/brand.mjs'
import cities from './suites/cities.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const [target = 'quick', filter] = process.argv.slice(2)
const SUITES = { layout: [['layout', layout]], flows: [['shell', shell], ['business page', businessPage], ['services and hours', servicesHours], ['settings', settings], ['notifications', notifications], ['insights', insights], ['rebooking', rebook], ['reviews', reviews], ['business audit', audit], ['overview', overview], ['client home', clientHome], ['referrals', referrals], ['clients', clients], ['team', team], ['time', time], ['addons', addons], ['money', money], ['hardening', hardening], ['apps', apps], ['account', account], ['push', push], ['seo', seo], ['admin', admin], ['brand', brand], ['cities', cities]] }
SUITES.emails = [['emails', emails]]
SUITES.all = [...SUITES.flows, ...SUITES.emails, ...SUITES.layout]
SUITES.quick = [...SUITES.flows, ...SUITES.emails, ['layout, 4 key screens', layout]]
const only = target === 'quick' ? 'quick' : filter

if (!SUITES[target]) {
    console.log(`Unknown suite "${target}". Use quick, flows, emails, layout or all.`)
    process.exit(1)
}

const findBrowser = () => {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const candidates = [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ]
    return candidates.find((file) => file && fs.existsSync(file))
}

const executablePath = findBrowser()
if (!executablePath) {
    console.log('No Chrome or Edge found. Set CHROME_PATH to your chrome.exe and run again.')
    process.exit(1)
}

const server = await createServer({ configFile: path.join(here, 'harness', 'vite.config.mjs') })
await server.listen()
const url = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })

const warm = await browser.newPage()
await warm.goto(`${url}/?path=/portal`, { waitUntil: 'networkidle0', timeout: 120000 })
await warm.close()

let failed = 0
const started = Date.now()
try {
    for (const [name, suite] of SUITES[target]) {
        let pass = 0
        let fail = 0
        const check = (ok, message) => {
            if (ok) pass += 1
            else { fail += 1; console.log(`  FAIL ${message}`) }
        }
        await suite({ browser, url, check, only, server, root: path.resolve(here, '..'), cover: path.join(here, 'fixtures', 'cover.jpg') })
        failed += fail
        console.log(`${name}: ${pass} passed, ${fail} failed`)
    }
} finally {
    await browser.close()
    await server.close()
}

console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`)
process.exit(failed ? 1 : 0)

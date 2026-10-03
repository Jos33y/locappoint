// Sends a push through Firebase Cloud Messaging (HTTP v1).
// Secret FCM_SERVICE_ACCOUNT holds the whole service account JSON from Firebase, Project settings, Service accounts.

import type { Push } from './push.ts'

type Account = { project_id: string; client_email: string; private_key: string }

// Google access tokens last an hour; one is reused across the batch and the next few runs.
let cached: { token: string; until: number } | null = null

const b64url = (data: ArrayBuffer | string) => {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
    let text = ''
    for (const b of bytes) text += String.fromCharCode(b)
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const fcmAccount = (): Account | null => {
    const raw = Deno.env.get('FCM_SERVICE_ACCOUNT')
    if (!raw) return null
    try {
        const a = JSON.parse(raw)
        return a?.project_id && a?.client_email && a?.private_key ? a : null
    } catch {
        return null
    }
}

const accessToken = async (a: Account) => {
    if (cached && cached.until > Date.now() + 60_000) return cached.token
    const now = Math.floor(Date.now() / 1000)
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claim = b64url(JSON.stringify({
        iss: a.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }))
    const pem = a.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`))
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(signature)}` }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.access_token) throw new Error(`Google token ${res.status}: ${JSON.stringify(body).slice(0, 200)}`)
    cached = { token: body.access_token, until: Date.now() + (Number(body.expires_in) || 3600) * 1000 }
    return cached.token
}

export type Sent = { ok: true; id: string } | { ok: false; gone: boolean; error: string }

export const sendPush = async (a: Account, token: string, push: Push, extra: { kind: string; tag: string }): Promise<Sent> => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken(a)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: {
                token,
                notification: { title: push.title, body: push.body },
                data: { link: push.link, kind: extra.kind },
                android: {
                    priority: 'HIGH',
                    // One booking keeps one notification: a move replaces the earlier news about it.
                    notification: { channel_id: 'bookings', icon: 'ic_stat_locappoint', color: '#2D7FF0', tag: extra.tag },
                },
                apns: { payload: { aps: { sound: 'default', 'thread-id': extra.tag } } },
            },
        }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, id: String(body.name || '') }
    const code = JSON.stringify(body)
    // The app was removed or the token replaced: forget this phone.
    const gone = res.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(code)
        || (res.status === 400 && /INVALID_ARGUMENT/.test(code) && /token/i.test(code))
    return { ok: false, gone, error: `FCM ${res.status}: ${code.slice(0, 200)}` }
}

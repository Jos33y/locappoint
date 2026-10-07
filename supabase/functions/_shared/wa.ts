// WhatsApp Cloud API: sending, the webhook signature and reading what arrived.
// No Deno APIs beyond reading secrets, so tests can run it under Node.
//
// Secrets (Edge Functions, Secrets): WHATSAPP_TOKEN (system user, permanent), WHATSAPP_APP_SECRET
// (signs every webhook), WHATSAPP_VERIFY_TOKEN (our word for the webhook check), and optionally
// WHATSAPP_PHONE_ID (the number's id; the test number until the real one is registered).

declare const Deno: { env: { get(key: string): string | undefined } } | undefined

const env = (key: string) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : (globalThis as any).process?.env?.[key]) || ''

export const WA = {
    token: () => env('WHATSAPP_TOKEN'),
    appSecret: () => env('WHATSAPP_APP_SECRET'),
    verifyToken: () => env('WHATSAPP_VERIFY_TOKEN'),
    phoneId: () => env('WHATSAPP_PHONE_ID') || '1328225167046234',
    graph: () => env('WHATSAPP_GRAPH_VERSION') || 'v23.0',
}

// Which secrets are missing, by name, so a log line says exactly what to set.
export const missing = (keys: Array<'token' | 'appSecret' | 'verifyToken'>) => {
    const names = { token: 'WHATSAPP_TOKEN', appSecret: 'WHATSAPP_APP_SECRET', verifyToken: 'WHATSAPP_VERIFY_TOKEN' }
    return keys.filter((k) => !WA[k]()).map((k) => names[k])
}

// Limits Meta enforces; longer text is refused, so it is cut here.
const cut = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text)

export type Button = { id: string; title: string }
export type Row = { id: string; title: string; description?: string }
export type Outgoing = { kind: string; text: string; message: Record<string, unknown> }

export const text = (body: string): Outgoing => ({
    kind: 'text',
    text: body,
    message: { type: 'text', text: { body: cut(body, 4096), preview_url: false } },
})

export const buttons = (body: string, list: Button[]): Outgoing => ({
    kind: 'buttons',
    text: body,
    message: {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: cut(body, 1024) },
            action: { buttons: list.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id.slice(0, 256), title: cut(b.title, 20) } })) },
        },
    },
})

export const choices = (body: string, label: string, rows: Row[]): Outgoing => ({
    kind: 'list',
    text: body,
    message: {
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: cut(body, 1024) },
            action: {
                button: cut(label, 20),
                sections: [{ title: cut(label, 24), rows: rows.slice(0, 10).map((r) => ({ id: r.id.slice(0, 200), title: cut(r.title, 24), ...(r.description ? { description: cut(r.description, 72) } : {}) })) }],
            },
        },
    },
})

// An approved template, for when the person has not written to us in the last 24 hours. Body values
// in order; each quick reply button gets the payload that comes back when it is tapped.
export const template = (name: string, lang: string, values: string[], replies: string[] = [], shown = ''): Outgoing => ({
    kind: `template:${name}`,
    text: shown || `[${name}] ${values.join(' | ')}`,
    message: {
        type: 'template',
        template: {
            name,
            language: { code: lang },
            components: [
                { type: 'body', parameters: values.map((v) => ({ type: 'text', text: cut(v.replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ') || '-', 900) })) },
                ...replies.map((payload, i) => ({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload }] })),
            ],
        },
    },
})

export class WaError extends Error {
    code: number
    constructor(message: string, code: number) {
        super(message)
        this.code = code
    }
}

// Error codes that change what we do next.
export const OUTSIDE_WINDOW = 131047
export const NO_TEMPLATE = [132000, 132001, 132005, 132007, 132012]
export const UNREACHABLE = [131026, 131050, 131021]

export const send = async (to: string, out: Outgoing): Promise<string> => {
    if (!WA.token()) throw new WaError('WHATSAPP_TOKEN is not set', 0)
    const res = await fetch(`https://graph.facebook.com/${WA.graph()}/${WA.phoneId()}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA.token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...out.message }),
    })
    const body: any = await res.json().catch(() => ({}))
    if (!res.ok || !body?.messages?.[0]?.id) {
        const e = body?.error || {}
        throw new WaError(`WhatsApp ${res.status} ${e.code || ''}: ${String(e.error_data?.details || e.message || 'no message id').slice(0, 300)}`, Number(e.code) || res.status)
    }
    return String(body.messages[0].id)
}

// X-Hub-Signature-256 is the HMAC of the raw body with the app secret.
export const signed = async (raw: string, header: string | null, secret: string) => {
    if (!header || !secret || !header.startsWith('sha256=')) return false
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
    const want = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
    const got = header.slice(7).toLowerCase()
    if (got.length !== want.length) return false
    let diff = 0
    for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i)
    return diff === 0
}

export type Inbound = { from: string; id: string; name: string; type: string; text: string; reply: string }

// Messages from people, flattened. Delivery receipts and anything else are left out.
export const inbound = (payload: any): Inbound[] => {
    const out: Inbound[] = []
    for (const entry of payload?.entry || []) {
        for (const change of entry?.changes || []) {
            if (change?.field !== 'messages') continue
            const value = change.value || {}
            const names: Record<string, string> = {}
            for (const c of value.contacts || []) if (c?.wa_id) names[c.wa_id] = String(c.profile?.name || '')
            for (const m of value.messages || []) {
                const from = String(m?.from || '').replace(/\D/g, '')
                if (!from || !m?.id) continue
                const type = String(m.type || 'unknown')
                const reply = type === 'interactive'
                    ? String(m.interactive?.button_reply?.id || m.interactive?.list_reply?.id || '')
                    : type === 'button' ? String(m.button?.payload || '') : ''
                const said = type === 'text' ? String(m.text?.body || '')
                    : type === 'interactive' ? String(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '')
                    : type === 'button' ? String(m.button?.text || '') : ''
                out.push({ from, id: String(m.id), name: names[m.from] || '', type, text: said.trim(), reply })
            }
        }
    }
    return out
}

// Delivery failures Meta reports later (for example a template sent to a number not on WhatsApp).
export const failures = (payload: any) => {
    const out: Array<{ to: string; id: string; error: string }> = []
    for (const entry of payload?.entry || []) {
        for (const change of entry?.changes || []) {
            for (const s of change?.value?.statuses || []) {
                if (s?.status !== 'failed') continue
                const e = s.errors?.[0] || {}
                out.push({ to: String(s.recipient_id || ''), id: String(s.id || ''), error: `${e.code || ''} ${e.title || e.message || ''}`.trim() })
            }
        }
    }
    return out
}

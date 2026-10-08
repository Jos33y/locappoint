// What Locappoint says on WhatsApp to clients, in English or European Portuguese. The agent's model
// never writes these: summaries, payment links and results are built here from database values,
// so a price, time or address is never paraphrased. No Deno APIs, so tests can run it under Node.

import { oneLine } from '../notify/format.ts'
import { buttons, template, text, type Outgoing } from './wa.ts'

export type Lang = 'en' | 'pt'
export const langOf = (value: unknown): Lang => (value === 'pt' ? 'pt' : 'en')

declare const Deno: { env: { get(key: string): string | undefined } } | undefined
const SITE = ((typeof Deno !== 'undefined' && Deno.env.get('SITE_URL')) || 'https://locappoint.com').replace(/\/$/, '')

export type Booking = {
    id?: string
    status?: string
    payment_status?: string
    business_name?: string
    slug?: string
    service_name?: string
    date?: string
    time?: string
    timezone?: string
    staff_name?: string | null
    address?: string | null
    city?: string | null
    mode?: string
    meeting_url?: string | null
    total?: number | string | null
    price?: number | string | null
    currency?: string | null
    manage_token?: string | null
    cancel_cutoff_minutes?: number
    people?: number
}

const localDate = (tz: string, offsetDays = 0) => {
    const d = new Date(Date.now() + offsetDays * 86_400_000)
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
    } catch {
        return d.toISOString().slice(0, 10)
    }
}

// "tomorrow at 10:30" / "amanhã às 10:30" / "Friday 10 October at 11:00" / "sexta-feira, 10 de outubro, às 11:00"
export const whenText = (b: Booking, lang: Lang) => {
    const date = String(b.date || '').slice(0, 10)
    const time = String(b.time || '').slice(0, 5)
    const tz = b.timezone || 'Europe/Lisbon'
    let day = ''
    if (date === localDate(tz)) day = lang === 'pt' ? 'hoje' : 'today'
    else if (date === localDate(tz, 1)) day = lang === 'pt' ? 'amanhã' : 'tomorrow'
    else if (date) {
        day = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
            .format(new Date(`${date}T12:00:00Z`))
    }
    if (!time) return day
    return lang === 'pt' ? `${day}${/\d/.test(day) ? ',' : ''} às ${time}` : `${day} at ${time}`
}

export const money = (amount: unknown, currency: unknown, lang: Lang) => {
    const n = Number(amount)
    if (!Number.isFinite(n)) return ''
    const cur = String(currency || 'EUR').toUpperCase()
    try {
        return new Intl.NumberFormat(lang === 'pt' ? 'pt-PT' : 'en-IE', { style: 'currency', currency: cur, minimumFractionDigits: cur === 'NGN' ? 0 : 2 }).format(n)
    } catch {
        return `${n.toFixed(2)} ${cur}`
    }
}

const manage = (b: Booking) => (b.manage_token ? `${SITE}/b/${b.manage_token}` : '')
const biz = (b: Booking) => oneLine(b.business_name) || 'Locappoint'
const svc = (b: Booking) => oneLine(b.service_name) || 'Booking'
const where = (b: Booking, lang: Lang) => {
    if (b.mode === 'online') return b.meeting_url ? (lang === 'pt' ? `Online: ${b.meeting_url}` : `Online: ${b.meeting_url}`) : (lang === 'pt' ? 'Online. O link chega antes da hora.' : 'Online. The link comes before the time.')
    return [oneLine(b.address), oneLine(b.city)].filter(Boolean).join(', ')
}
const lines = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join('\n')

// ---------- Booking news for clients (notify) ----------

// Templates Meta must approve, for messages more than 24 hours after the client last wrote to us.
// Values: {{1}} business, {{2}} service, {{3}} when. English first.
export const CLIENT_TEMPLATES = {
    lc_client_confirmed: {
        body: 'You are booked at {{1}}: {{2}}, {{3}}. Reply here to change or cancel.',
        sample: ['Barbearia Rio', 'Haircut', 'Friday 10 October at 11:00'],
    },
    lc_client_declined: {
        body: 'Your request at {{1}} for {{2}}, {{3}}, was not accepted. If you paid online, the refund is on its way. Reply here to pick another time.',
        sample: ['Barbearia Rio', 'Haircut', 'Friday 10 October at 11:00'],
    },
    lc_client_cancelled: {
        body: 'Your booking at {{1}} for {{2}}, {{3}}, was cancelled by the business. If you paid online, the refund is on its way. Reply here to book again.',
        sample: ['Barbearia Rio', 'Haircut', 'Friday 10 October at 11:00'],
    },
    lc_client_moved: {
        body: 'Your booking at {{1}} for {{2}} has moved to {{3}}. Reply here if that time does not work.',
        sample: ['Barbearia Rio', 'Haircut', 'Friday 10 October at 11:00'],
    },
    lc_client_reminder: {
        body: 'Reminder from {{1}}: {{2}}, {{3}}. Reply here if you need to change it.',
        sample: ['Barbearia Rio', 'Haircut', 'tomorrow at 10:30'],
    },
} as const

const CLIENT_EVENT: Record<string, keyof typeof CLIENT_TEMPLATES | null> = {
    booking_requested: null,
    booking_confirmed: 'lc_client_confirmed',
    booking_declined: 'lc_client_declined',
    booking_cancelled: 'lc_client_cancelled',
    booking_moved: 'lc_client_moved',
    booking_reminder: 'lc_client_reminder',
}

export const clientNews = (event: string, b: Booking & { lang?: string }, inWindow: boolean): Outgoing | null => {
    if (!(event in CLIENT_EVENT)) return null
    if (!inWindow) {
        const name = CLIENT_EVENT[event]
        if (!name) return null
        const values = [biz(b), svc(b), whenText(b, 'en')]
        const shown = CLIENT_TEMPLATES[name].body.replace(/\{\{(\d)\}\}/g, (_, i) => values[Number(i) - 1])
        return template(name, 'en', values, [], shown)
    }
    const lang = langOf(b.lang)
    const pt = lang === 'pt'
    const at = whenText(b, lang)
    const paid = b.payment_status === 'paid' ? (pt ? `Pago: ${money(b.total, b.currency, lang)}.` : `Paid: ${money(b.total, b.currency, lang)}.`) : ''
    const link = manage(b) ? (pt ? `Alterar ou cancelar: ${manage(b)}` : `Change or cancel: ${manage(b)}`) : ''
    const refund = b.payment_status === 'paid' || b.payment_status === 'refunded' || b.payment_status === 'partly_refunded'
        ? (pt ? 'O reembolso segue para o seu cartão.' : 'Your refund is on its way to your card.') : ''
    switch (event) {
        case 'booking_requested':
            return text(lines(pt ? `*Pedido enviado a ${biz(b)}*` : `*Request sent to ${biz(b)}*`, `${svc(b)}, ${at}.`, paid,
                pt ? 'O negócio confirma em breve. Avisamos aqui.' : 'The business confirms soon. We will tell you here.', link))
        case 'booking_confirmed':
            return text(lines(pt ? `*Está marcado em ${biz(b)}*` : `*You are booked at ${biz(b)}*`,
                `${svc(b)}, ${at}${b.staff_name ? (pt ? `, com ${oneLine(b.staff_name)}` : `, with ${oneLine(b.staff_name)}`) : ''}.`,
                where(b, lang), paid, link))
        case 'booking_declined':
            return text(lines(pt ? `${biz(b)} não pode aceitar o pedido` : `${biz(b)} cannot take your request`, `${svc(b)}, ${at}.`, refund,
                pt ? 'Escreva aqui para escolher outra hora.' : 'Write here to pick another time.'))
        case 'booking_cancelled':
            return text(lines(pt ? `${biz(b)} cancelou a sua marcação` : `${biz(b)} cancelled your booking`, `${svc(b)}, ${at}.`, refund,
                pt ? 'Escreva aqui para marcar de novo.' : 'Write here to book again.'))
        case 'booking_moved':
            return text(lines(pt ? `${biz(b)} mudou a sua marcação` : `${biz(b)} moved your booking`, `${svc(b)}, ${pt ? 'agora' : 'now'} ${at}.`,
                pt ? 'Se não der, escreva aqui.' : 'If that does not work, write here.', link))
        case 'booking_reminder':
            return text(lines(pt ? `*Lembrete: ${svc(b)}*` : `*Reminder: ${svc(b)}*`, `${biz(b)}, ${at}.`, where(b, lang), link))
    }
    return null
}

// ---------- The agent's summaries and results (whatsapp) ----------

export type Proposal =
    | { kind: 'book'; business_name: string; service_name: string; date: string; time: string; timezone: string; minutes: number; people: number;
        total: number | null; currency: string; online: boolean; confirms: boolean; cutoff: number; name: string; email: string | null; mode: string }
    | { kind: 'move'; business_name: string; service_name: string; date: string; time: string; timezone: string; from_date: string; from_time: string }
    | { kind: 'cancel'; business_name: string; service_name: string; date: string; time: string; timezone: string; paid: boolean; cutoff: number }

const hours = (minutes: number, lang: Lang) => {
    if (!minutes) return lang === 'pt' ? 'até à hora' : 'until the time'
    if (minutes % 1440 === 0) return lang === 'pt' ? `até ${minutes / 1440} dia(s) antes` : `up to ${minutes / 1440} day${minutes === 1440 ? '' : 's'} before`
    if (minutes % 60 === 0) return lang === 'pt' ? `até ${minutes / 60} h antes` : `up to ${minutes / 60} h before`
    return lang === 'pt' ? `até ${minutes} min antes` : `up to ${minutes} min before`
}

export const summary = (p: Proposal, nonce: string, lang: Lang): Outgoing => {
    const pt = lang === 'pt'
    const at = whenText(p, lang)
    if (p.kind === 'book') {
        const price = p.total !== null ? money(p.total, p.currency, lang) : ''
        const body = lines(
            pt ? '*Confirma esta marcação?*' : '*Book this?*',
            `${p.business_name}`,
            `${p.service_name}${p.people > 1 ? (pt ? ` para ${p.people}` : ` for ${p.people}`) : ''}, ${at}${p.minutes ? ` (${p.minutes} min)` : ''}`,
            price && (p.online ? (pt ? `${price}, pago agora online` : `${price}, paid now online`) : (pt ? `${price}, pago no local` : `${price}, paid at the visit`)),
            p.mode === 'online' && (pt ? 'Online' : 'Online'),
            `${pt ? 'Nome' : 'Name'}: ${p.name}${p.email ? `, ${p.email}` : ''}`,
            p.confirms ? '' : (pt ? 'O negócio confirma o pedido.' : 'The business confirms the request.'),
            pt ? `Pode alterar ou cancelar ${hours(p.cutoff, lang)}.` : `You can change or cancel ${hours(p.cutoff, lang)}.`,
        )
        return buttons(body, [{ id: `yes:${nonce}`, title: pt ? 'Sim, marcar' : 'Yes, book it' }, { id: `no:${nonce}`, title: pt ? 'Não' : 'No' }])
    }
    if (p.kind === 'move') {
        const was = whenText({ date: p.from_date, time: p.from_time, timezone: p.timezone }, lang)
        return buttons(lines(pt ? '*Mudar esta marcação?*' : '*Move this booking?*', `${p.business_name}, ${p.service_name}`,
            pt ? `De ${was}` : `From ${was}`, pt ? `Para ${at}` : `To ${at}`),
        [{ id: `yes:${nonce}`, title: pt ? 'Sim, mudar' : 'Yes, move it' }, { id: `no:${nonce}`, title: pt ? 'Não' : 'No' }])
    }
    return buttons(lines(pt ? '*Cancelar esta marcação?*' : '*Cancel this booking?*', `${p.business_name}, ${p.service_name}, ${at}`,
        p.paid ? (pt ? 'O reembolso segue a regra de cancelamento.' : 'Any refund follows the cancellation rule.') : ''),
    [{ id: `yes:${nonce}`, title: pt ? 'Sim, cancelar' : 'Yes, cancel' }, { id: `no:${nonce}`, title: pt ? 'Não' : 'No' }])
}

export const payLink = (b: Booking, url: string, holdMinutes: number, lang: Lang): Outgoing => text(lines(
    lang === 'pt' ? `*Falta pagar para marcar*` : '*One step left: pay to book*',
    `${biz(b)}, ${svc(b)}, ${whenText(b, lang)}`,
    lang === 'pt' ? `Total ${money(b.total, b.currency, lang)}. Guardamos a hora durante ${holdMinutes} min.` : `Total ${money(b.total, b.currency, lang)}. The time is held for ${holdMinutes} min.`,
    url,
    lang === 'pt' ? 'Depois de pagar volta para aqui e a confirmação chega sozinha.' : 'After paying you come back here and the confirmation arrives by itself.',
))

export const payFailed = (id: string, lang: Lang): Outgoing => buttons(
    lang === 'pt' ? 'A página de pagamento não abriu. Tente de novo.' : 'The payment page did not open. Try again.',
    [{ id: `pay:${id}`, title: lang === 'pt' ? 'Tentar de novo' : 'Try again' }],
)

export const moved = (b: Booking, lang: Lang): Outgoing => text(lines(
    lang === 'pt' ? `*Mudado*` : '*Moved*',
    `${biz(b)}, ${svc(b)}, ${whenText(b, lang)}.`,
    b.status === 'pending' ? (lang === 'pt' ? 'O negócio confirma a nova hora. Avisamos aqui.' : 'The business confirms the new time. We will tell you here.') : '',
))

export const cancelled = (b: Booking, lang: Lang): Outgoing => text(lines(
    lang === 'pt' ? '*Cancelado*' : '*Cancelled*',
    `${biz(b)}, ${svc(b)}, ${whenText(b, lang)}.`,
    b.payment_status && b.payment_status !== 'at_visit' ? (lang === 'pt' ? 'Se pagou online, o reembolso segue a regra de cancelamento.' : 'If you paid online, any refund follows the cancellation rule.') : '',
))

export const dropped = (lang: Lang): Outgoing => text(lang === 'pt' ? 'Está bem, nada foi alterado.' : 'OK, nothing was changed.')
export const expired = (lang: Lang): Outgoing => text(lang === 'pt' ? 'Essa pergunta já expirou. Diga o que precisa e vemos de novo.' : 'That question has expired. Tell me what you need and we will check again.')
export const pausedAgent = (slug: string | null, lang: Lang): Outgoing => text(lang === 'pt'
    ? `Neste momento não consigo responder aqui. Marque em ${SITE}${slug ? `/${slug}` : ''}`
    : `I cannot chat right now. Book on ${SITE}${slug ? `/${slug}` : ''}`)
export const slowDown = (lang: Lang): Outgoing => text(lang === 'pt' ? 'Muitas mensagens seguidas. Tente daqui a pouco, ou marque em locappoint.com.' : 'Lots of messages in a row. Try again in a little while, or book on locappoint.com.')

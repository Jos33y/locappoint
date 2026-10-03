// Shared helpers. No Deno APIs here beyond reading SITE_URL, so tests can run it under Node.

declare const Deno: { env: { get(key: string): string | undefined } } | undefined

export const SITE = ((typeof Deno !== 'undefined' && Deno.env.get('SITE_URL')) || 'https://locappoint.com').replace(/\/$/, '')

export const esc = (value: unknown) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim()

export const plainText = (value: string) =>
    value
        .replace(/<[^>]+>/g, '')
        .replace(/&middot;/g, '|')
        .replace(/&rsquo;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')

export const FOOTER_TEXT = ['LocAppoint, Porto, Lisbon and Lagos', 'hello@locappoint.com']

// Dates arrive as the business's local date and time, so they are shown as they are.

const dateOf = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`)

export const longDay = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateOf(iso))

export const shortDay = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dateOf(iso)).replace('Sept', 'Sep')

const localDate = (tz: string, offsetDays = 0) => {
    const d = new Date(Date.now() + offsetDays * 86_400_000)
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
    } catch {
        return d.toISOString().slice(0, 10)
    }
}

export const relativeDay = (iso: string, tz: string) => {
    if (iso === localDate(tz)) return 'today'
    if (iso === localDate(tz, 1)) return 'tomorrow'
    return `on ${longDay(iso)}`
}

export const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

export const priceText = (price: unknown, country: unknown) => {
    if (price === null || price === undefined || price === '') return ''
    const n = Number(price)
    if (!Number.isFinite(n)) return ''
    if (n === 0) return 'Free'
    const nigeria = country === 'NG'
    return new Intl.NumberFormat(nigeria ? 'en-NG' : 'en-IE', {
        style: 'currency',
        currency: nigeria ? 'NGN' : 'EUR',
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n)
}

export const cutoffText = (minutes: number) => {
    if (!minutes) return 'any time before it starts'
    if (minutes % 60) return `up to ${minutes} minutes before`
    const h = minutes / 60
    return `up to ${h} hour${h === 1 ? '' : 's'} before`
}

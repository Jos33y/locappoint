// The Monday statement: last week's visits booked on LocAppoint, the fee they would have carried, and
// what is owed, which is nothing during the beta. A statement, never a bill.

import { layout } from '../layout.ts'
import { added, done, fee, said, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, oneLine } from '../format.ts'
import type { Render } from '../types.ts'

const FROM = 'LocAppoint <accounts@relay.locappoint.com>'

const money = (value: unknown, country: unknown) => {
    const n = Number(value) || 0
    const nigeria = country === 'NG'
    return new Intl.NumberFormat(nigeria ? 'en-NG' : 'en-IE', {
        style: 'currency',
        currency: nigeria ? 'NGN' : 'EUR',
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n)
}

const dateOf = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`)
const dayMonth = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dateOf(iso)).replace('Sept', 'Sep')
const range = (from: string, to: string) =>
    from.slice(5, 7) === to.slice(5, 7) ? `${Number(from.slice(8, 10))} to ${dayMonth(to)}` : `${dayMonth(from)} to ${dayMonth(to)}`

const visits = (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}`

export const STATEMENT: Record<string, Render> = {
    weekly_statement: (row) => {
        const p = row.payload as Record<string, any>
        const country = p.country
        const bizRaw = oneLine(p.business_name) || 'Your business'
        const biz = esc(bizRaw)
        const name = esc(oneLine(p.name))
        const from = String(p.from || '')
        const to = String(p.to || '')
        const week = range(from, to)
        const online = Number(p.online?.count) || 0
        const added_ = Number(p.added?.count) || 0
        const priced = p.fee !== null && p.fee !== undefined
        const zero = money(0, country)
        const link = `${SITE}/portal/insights?statement=${from}`

        const onlineLine = `${visits(online)} booked on LocAppoint, ${money(p.online?.value, country)}`
        const feeLine = `LocAppoint fee ${money(p.fee, country)}`
        const addedLine = `${added_ === 1 ? '1 walk-in or booking' : `${added_} walk-ins and bookings`} you added, ${money(p.added?.value, country)}. Never a fee.`
        // The reliability line, once the score shows (10 bookings in 90 days).
        const rel = p.reliability as Record<string, any> | undefined
        const relLine = rel?.shown && rel.score !== null && rel.score !== undefined
            ? `Reliability ${Number(rel.score)} of 100.${rel.badge ? ' You hold the Reliable badge.' : Number(rel.score) < 90 ? ' See what cost points in Insights.' : ''}`
            : ''
        const small = `This is a statement, not a bill. LocAppoint is free during the beta. When online payments arrive, fees apply only to bookings clients make on LocAppoint, and you will hear from us before anything changes. Walk-ins and bookings you add yourself are always free.${priced && online ? ' Fees are shown before VAT.' : ''}`

        return {
            from: FROM,
            to: row.recipient_email!,
            subject: `Your week at ${bizRaw}: ${visits(online + added_)}, ${zero} to pay`,
            html: layout({
                title: 'Your week',
                preheader: `${visits(online + added_)} at ${biz}, ${week}. Fees: ${zero}, free during the beta.`,
                h1: 'Your week.',
                sub: `${name ? `${name}, here` : 'Here'} is last week at ${biz}, ${week}. There is nothing to pay.`,
                day: week,
                place: biz,
                rows: [
                    online ? done(esc(onlineLine)) : '',
                    added_ ? added(esc(addedLine)) : '',
                    online && priced ? fee(esc(feeLine)) : '',
                    relLine ? said('trust', esc(relLine), true) : '',
                    slot({ state: 'booked', flag: 'You pay', title: zero, sub: 'Free during the beta.', button: { label: 'See your week', href: link, width: 160 } }),
                ],
                small,
                fallback: link,
            }),
            text: [
                'Your week.',
                '',
                `${bizRaw}, ${week}`,
                ...(online ? [onlineLine] : []),
                ...(online && priced ? [`${feeLine}, waived`] : []),
                ...(added_ ? [addedLine] : []),
                ...(relLine ? [relLine] : []),
                `You pay: ${zero}. Free during the beta.`,
                '',
                `See your week: ${link}`,
                '',
                small,
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },
}

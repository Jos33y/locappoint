// The Reliable badge: earned, at risk, lost, or removed by Locappoint with the reason.

import { layout } from '../layout.ts'
import { said, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render, Row } from '../types.ts'

const FROM = '"LocAppoint" <accounts@relay.locappoint.com>'

const plain = (html: string) => html.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

// What cost points, in words, from the counts. At most three lines.
const costs = (c: Record<string, any> = {}) => {
    const n = (k: string) => Number(c[k]) || 0
    const lines: string[] = []
    if (n('late_cancels')) lines.push(`${n('late_cancels')} ${n('late_cancels') === 1 ? 'cancellation' : 'cancellations'} by you under 24 hours before`)
    if (n('cancels') - n('late_cancels')) lines.push(`${n('cancels') - n('late_cancels')} other ${n('cancels') - n('late_cancels') === 1 ? 'cancellation' : 'cancellations'} by you`)
    if (n('no_shows')) lines.push(`${n('no_shows')} missed ${n('no_shows') === 1 ? 'visit' : 'visits'} reported and upheld`)
    if (n('late_requests')) lines.push(`${n('late_requests')} ${n('late_requests') === 1 ? 'request' : 'requests'} answered after 12 hours`)
    if (n('reports') + n('safety')) lines.push(`${n('reports') + n('safety')} ${n('reports') + n('safety') === 1 ? 'report' : 'reports'} about you upheld`)
    return lines.slice(0, 3)
}

const COPY: Record<string, { subject: (biz: string, score: number) => string; head: string; pre: string }> = {
    won: { subject: (biz) => `${biz} is Reliable on LocAppoint`, head: 'You earned the Reliable badge.', pre: 'The blue badge is on your page and in search.' },
    warning: { subject: (_, score) => `Your reliability score is ${score}`, head: 'Your score slipped.', pre: 'What cost points, and how to keep the badge.' },
    lost: { subject: (biz) => `The Reliable badge is off ${biz}`, head: 'The Reliable badge is off your page.', pre: 'It comes back once your score is 90 again.' },
    removed: { subject: (biz) => `We removed the Reliable badge from ${biz}`, head: 'We removed your Reliable badge.', pre: 'Our reason is inside. Reply in Support if you disagree.' },
}

export const RELIABILITY: Record<string, Render> = {
    reliability: (row: Row) => {
        const p = row.payload as Record<string, any>
        const event = String(p.event || 'warning')
        const copy = COPY[event] || COPY.warning
        const bizRaw = oneLine(p.business_name) || 'your business'
        const score = Number(p.score) || 0
        const kept = p.kept_pct === null || p.kept_pct === undefined ? '' : `Keeps ${Number(p.kept_pct)}% of bookings`
        const note = String(p.note || '').trim()
        const link = `${SITE}/portal/insights?reliability=1`
        const lines = costs(p.counts)

        const sub = event === 'won'
            ? `Clients now see the blue Reliable badge on ${esc(bizRaw)}'s page and in search${kept ? `, with "${esc(kept)}"` : ''}. It stays while your score is 85 or more.`
            : event === 'lost'
                ? `Your score has been under 85 for a week, or a safety report was upheld. It comes back by itself once your score is 90 or more with every check done.`
                : event === 'removed'
                    ? `Locappoint staff removed the Reliable badge from ${esc(bizRaw)}. It stays off until we restore it.`
                    : score < 85
                        ? `Your score is ${score}. Stay under 85 for 7 days and the Reliable badge goes. A week of kept bookings brings it back up.`
                        : `Your score is ${score}. The badge is safe above 85. Here is what cost points.`

        const small = 'Your score covers the last 90 days and is worked out every night. Only what you do counts, never what clients do. Cancelled for a reason you can prove? Tell us in Support and we can excuse it.'
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: copy.subject(bizRaw, score),
            html: layout({
                title: copy.head,
                preheader: esc(copy.pre),
                h1: copy.head,
                sub,
                day: esc(longDay(new Date().toISOString().slice(0, 10))),
                place: esc(bizRaw),
                rows: [
                    ...(note ? [said('note', esc(note).replace(/\r?\n/g, '<br>'))] : []),
                    ...(event !== 'won' && event !== 'removed' ? lines.map((l) => said('cost', esc(l), true)) : []),
                    slot({ state: event === 'won' ? 'booked' : 'waiting', flag: event === 'won' ? 'Reliable' : 'Your score', title: `${score} of 100`, sub: kept || 'See every part in Insights.', button: { label: 'See your score', href: link, width: 150 } }),
                ],
                small,
                fallback: link,
            }),
            text: [
                copy.head,
                '',
                plain(sub),
                ...(note ? ['', `Our reason: ${note}`] : []),
                ...(event !== 'won' && event !== 'removed' && lines.length ? ['', 'What cost points:', ...lines.map((l) => `- ${l}`)] : []),
                '',
                `Score: ${score} of 100${kept ? `. ${kept}` : ''}`,
                `See your score: ${link}`,
                '',
                small,
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },
}

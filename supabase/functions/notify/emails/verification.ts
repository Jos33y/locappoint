// The gold Verified badge: approved, not yet (with what to fix), needs a new video, or removed.

import { layout } from '../layout.ts'
import { said, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render, Row } from '../types.ts'

const FROM = '"LocAppoint" <accounts@relay.locappoint.com>'

const plain = (html: string) => html.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const until = (iso: unknown) => (iso ? longDay(String(iso).slice(0, 10)) : '')

export const VERIFICATION: Record<string, Render> = {
    verification: (row: Row) => {
        const p = row.payload as Record<string, any>
        const event = String(p.event || 'approved')
        const bizRaw = oneLine(p.business_name) || 'your business'
        const biz = esc(bizRaw)
        const note = String(p.note || '').trim()
        const link = `${SITE}/portal/verified`
        const address = p.reason === 'address'

        const copy = event === 'approved'
            ? { subject: `${bizRaw} is Verified on LocAppoint`, head: 'You are Verified.', pre: 'The gold badge is on your page and in search.', sub: `Clients now see the gold Verified badge on ${biz}'s page and in search${p.verified_until ? `, until ${esc(until(p.verified_until))}` : ''}. A new address needs a new video.`, flag: 'Verified', state: 'booked' as const, button: 'See your badge' }
            : event === 'rejected'
                ? { subject: 'Your Verified badge: one more step', head: 'Not yet.', pre: 'What to fix, then we look again.', sub: 'We looked at what you sent and need one more thing before the badge goes on. Your ID check still counts.', flag: 'What to fix', state: 'waiting' as const, button: 'Send it again' }
                : event === 'expired'
                    ? { subject: `${bizRaw} needs a new video for the Verified badge`, head: 'Your badge needs a new video.', pre: address ? 'Your address changed.' : 'A year has passed.', sub: address ? 'Your address changed, so the gold badge waits until we see the new place. Your ID check still counts.' : 'It has been a year since we saw your place. Send a new 30 to 60 second video and the badge comes back. Your ID check still counts.', flag: 'New video', state: 'waiting' as const, button: 'Send a video' }
                    : { subject: `We removed the Verified badge from ${bizRaw}`, head: 'We removed your Verified badge.', pre: 'Our reason is inside. Reply in Support if you disagree.', sub: `Locappoint staff removed the gold badge from ${biz}. It stays off until we restore it.`, flag: 'Removed', state: 'waiting' as const, button: 'Open Support' }

        const href = event === 'removed' ? `${SITE}/portal/support` : link
        const small = 'The gold badge means a person at Locappoint checked your ID through Stripe and saw your place. Stripe keeps the ID photos; we delete the video once we decide.'
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: copy.subject,
            html: layout({
                title: copy.head,
                preheader: esc(copy.pre),
                h1: copy.head,
                sub: copy.sub,
                day: esc(longDay(new Date().toISOString().slice(0, 10))),
                place: biz,
                rows: [
                    ...(note ? [said('note', esc(note).replace(/\r?\n/g, '<br>'))] : []),
                    slot({ state: copy.state, flag: copy.flag, title: biz, sub: event === 'approved' && p.verified_until ? `Until ${esc(until(p.verified_until))}` : 'Takes two minutes.', button: { label: copy.button, href, width: 150 } }),
                ],
                small,
                fallback: href,
            }),
            text: [copy.head, '', plain(copy.sub), ...(note ? ['', `Our note: ${note}`] : []), '', `${copy.button}: ${href}`, '', small, '', ...FOOTER_TEXT].join('\n'),
        }
    },
}

// A block the business made was reviewed by Locappoint: kept, or lifted with the reason.

import { layout } from '../layout.ts'
import { said, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render, Row } from '../types.ts'

const FROM = '"LocAppoint" <accounts@relay.locappoint.com>'

const REASON: Record<string, string> = {
    no_shows: 'repeated no-shows',
    late_cancels: 'late cancellations',
    unsafe: 'rude or unsafe behaviour',
    unpaid: 'not paying',
    other: 'another reason',
}

export const BLOCKS: Record<string, Render> = {
    block_review: (row: Row) => {
        const p = row.payload as Record<string, any>
        const kept = p.decision === 'kept'
        const clientRaw = oneLine(p.client_name) || 'the client'
        const bizRaw = oneLine(p.business_name) || 'your business'
        const reason = REASON[String(p.reason)] || 'your reason'
        const note = String(p.note || '').trim()
        const link = `${SITE}/portal/clients`
        const head = kept ? 'Block kept.' : 'Block lifted.'
        const sub = kept
            ? `We reviewed your block on ${esc(clientRaw)} for ${esc(reason)}. It stays: they cannot book ${esc(bizRaw)} online.`
            : `We reviewed your block on ${esc(clientRaw)} for ${esc(reason)} and lifted it. They can book ${esc(bizRaw)} online again.`
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: kept ? `Your block on ${clientRaw} stays` : `We lifted your block on ${clientRaw}`,
            html: layout({
                title: head,
                preheader: kept ? 'Reviewed and kept.' : 'Reviewed and lifted, with our reason.',
                h1: head,
                sub,
                day: esc(longDay(new Date().toISOString().slice(0, 10))),
                place: esc(bizRaw),
                rows: [
                    ...(note ? [said('note', esc(note).replace(/\r?\n/g, '<br>'))] : []),
                    slot({ state: kept ? 'booked' : 'waiting', flag: kept ? 'Kept' : 'Lifted', title: esc(clientRaw), sub: 'Blocked clients are in Clients.', button: { label: 'Open Clients', href: link, width: 140 } }),
                ],
                small: 'Locappoint reviews every block so clients are treated fairly. Disagree? Reply in Support and a person looks again.',
                fallback: link,
            }),
            text: [head, '', sub.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), ...(note ? ['', `Our note: ${note}`] : []), '', `Open Clients: ${link}`, '', 'Disagree? Reply in Support and a person looks again.', '', ...FOOTER_TEXT].join('\n'),
        }
    },
}

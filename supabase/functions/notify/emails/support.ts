// Support: our reply on a ticket, a written warning, and the team's copy of every new ticket or reply.
// The conversation lives in Locappoint (Support, or the booking link for guests), so every email
// points back there rather than asking for a reply by email.

import { layout } from '../layout.ts'
import { said, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render, Row } from '../types.ts'

const FROM = '"LocAppoint support" <accounts@relay.locappoint.com>'

const today = () => new Date().toISOString().slice(0, 10)

// Their words or ours, safe for HTML, with line breaks kept.
const words = (value: unknown) => esc(String(value ?? '').trim()).replace(/\r?\n/g, '<br>')
const plain = (value: unknown) => String(value ?? '').trim()

const ticketId = (p: Record<string, any>) => String(p.ticket_id || '').replace(/[^a-f0-9-]/gi, '')
const token = (p: Record<string, any>) => String(p.manage_token || '').replace(/[^a-f0-9]/gi, '')

// Where the conversation lives for this person.
const threadLink = (p: Record<string, any>) => {
    const id = ticketId(p)
    if (p.audience === 'business') return `${SITE}/portal/support?t=${id}`
    if (p.guest && token(p)) return `${SITE}/b/${token(p)}#support`
    return `${SITE}/client/support?t=${id}`
}

const STATUS_LINE: Record<string, string> = {
    waiting: 'Waiting on you',
    resolved: 'Resolved',
    open: 'With us',
}

const ref = (p: Record<string, any>) => (Number(p.number) > 0 ? `#${Number(p.number)}` : '')

export const SUPPORT: Record<string, Render> = {
    support_reply: (row: Row) => {
        const p = row.payload as Record<string, any>
        const subjectRaw = oneLine(p.subject) || 'Your ticket'
        const name = oneLine(p.name)
        const link = threadLink(p)
        const resolved = p.status === 'resolved'
        const head = resolved ? 'Sorted, we think.' : 'We replied.'
        const subject = `${ref(p) ? `${ref(p)} ` : ''}${subjectRaw}: ${resolved ? 'resolved' : 'we replied'}`
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: subject.slice(0, 140),
            html: layout({
                title: head,
                preheader: esc(oneLine(p.body).slice(0, 110)),
                h1: head,
                sub: `${name ? `${esc(name)}, ` : ''}Locappoint support answered ${esc(ref(p) || 'your ticket')}, ${esc(subjectRaw)}.`,
                day: esc(longDay(today())),
                place: 'Support',
                rows: [
                    said('support', words(p.body)),
                    slot({
                        state: resolved ? 'booked' : 'waiting',
                        flag: STATUS_LINE[p.status] || 'Waiting on you',
                        title: resolved ? 'Anything else, reply and it opens again' : 'Reply in Locappoint',
                        sub: esc(subjectRaw),
                        button: { label: resolved ? 'Open ticket' : 'Reply', href: link, width: 130 },
                    }),
                ],
                small: 'Reply from the button, not to this email, so your answer stays with the ticket. A ticket waiting on you closes after 7 days; a reply opens it again.',
                fallback: link,
            }),
            text: [
                head,
                '',
                `Locappoint support answered ${ref(p) || 'your ticket'}, ${subjectRaw}.`,
                '',
                plain(p.body),
                '',
                `${resolved ? 'Open ticket' : 'Reply'}: ${link}`,
                '',
                'Reply from the link, not to this email, so your answer stays with the ticket.',
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },

    support_warning: (row: Row) => {
        const p = row.payload as Record<string, any>
        const name = oneLine(p.name)
        const forBusiness = p.audience === 'business'
        const bizRaw = oneLine(p.business_name)
        const date = String(p.date || '').slice(0, 10)
        const about = [oneLine(p.service_name), bizRaw && !forBusiness ? `at ${bizRaw}` : '', date ? `on ${longDay(date)}` : ''].filter(Boolean).join(' ')
        const link = forBusiness ? `${SITE}/portal/support` : row.recipient_user ? `${SITE}/client/support` : ''
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: forBusiness ? `A warning from Locappoint about ${bizRaw || 'your business'}` : 'A warning from Locappoint about a booking',
            html: layout({
                title: 'A warning from Locappoint',
                preheader: esc(oneLine(p.body).slice(0, 110)),
                h1: 'A warning from us.',
                sub: `${name ? `${esc(name)}, ` : ''}after looking into a report${about ? ` about ${esc(about)}` : ''}, we are writing to you directly.`,
                day: esc(longDay(today())),
                place: forBusiness && bizRaw ? esc(bizRaw) : 'Support',
                rows: [
                    said('note', words(p.body)),
                    ...(link
                        ? [slot({ state: 'waiting', flag: 'Your side', title: 'Tell us your side', sub: 'Open Support and reply on the ticket.', button: { label: 'Open Support', href: link, width: 150 } })]
                        : []),
                ],
                small: 'Warnings are kept on record. Repeated problems can lead to a pause on bookings. If you think this is a mistake, tell us and a person reviews it.',
                fallback: link || undefined,
            }),
            text: [
                'A warning from us.',
                '',
                `After looking into a report${about ? ` about ${about}` : ''}, we are writing to you directly.`,
                '',
                plain(p.body),
                '',
                ...(link ? [`Tell us your side: ${link}`, ''] : ['Tell us your side: write to hello@locappoint.com', '']),
                'Warnings are kept on record. Repeated problems can lead to a pause on bookings.',
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },

    support_team: (row: Row) => {
        const p = row.payload as Record<string, any>
        const link = `${SITE}/admin?ticket=${ticketId(p)}#support`
        const urgent = Number(p.priority) === 1
        const isNew = p.event === 'new'
        const subjectRaw = oneLine(p.subject) || 'Ticket'
        const who = oneLine(p.who) || 'Someone'
        const side = p.side === 'business' ? 'business' : 'client'
        const head = isNew ? 'New ticket.' : 'They replied.'
        return {
            from: FROM,
            to: row.recipient_email!,
            subject: `${urgent ? '[Priority] ' : ''}${ref(p)} ${isNew ? 'New' : 'Reply'}: ${subjectRaw}`.trim().slice(0, 140),
            html: layout({
                title: head,
                preheader: esc(oneLine(p.body).slice(0, 110)),
                h1: head,
                sub: `${esc(who)} (${side})${p.business_name ? `, ${esc(oneLine(p.business_name))}` : ''}. ${esc(String(p.category || 'other').replace('_', ' '))}${urgent ? ', priority' : ''}.`,
                day: esc(longDay(today())),
                place: esc(ref(p) || 'Support'),
                rows: [
                    said(side, words(p.body)),
                    slot({ state: urgent ? 'waiting' : 'booked', flag: urgent ? 'Priority' : 'Queue', title: subjectRaw.length > 60 ? `${esc(subjectRaw.slice(0, 59))}...` : esc(subjectRaw), sub: 'Answer in the admin queue.', button: { label: 'Open', href: link, width: 110 } }),
                ],
                small: 'Sent to the support team for every new ticket and every reply.',
                fallback: link,
            }),
            text: [head, '', `${who} (${side})${p.business_name ? `, ${oneLine(p.business_name)}` : ''}`, subjectRaw, '', plain(p.body), '', `Open: ${link}`, '', ...FOOTER_TEXT].join('\n'),
        }
    },
}

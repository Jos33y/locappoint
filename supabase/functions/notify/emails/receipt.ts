// Receipts: proof of payment, a refund, or a visit paid at the place. The panel is the receipt
// itself: one line per item with its amount, then the total in the slot with a link to the receipt
// page, which prints or saves as a PDF. Never called an invoice.

import { layout } from '../layout.ts'
import { MONO, SANS, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render } from '../types.ts'

const ADDRESS = 'bookings@relay.locappoint.com'
const senderName = (value: string) => `"${value.replace(/["<>\\]/g, '').slice(0, 60)} via LocAppoint" <${ADDRESS}>`

export const receiptMoney = (value: unknown, currency: unknown) => {
    const n = Number(value) || 0
    const ngn = currency === 'NGN'
    return new Intl.NumberFormat(ngn ? 'en-NG' : 'en-IE', {
        style: 'currency',
        currency: ngn ? 'NGN' : 'EUR',
        minimumFractionDigits: ngn && Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(n)
}

const METHOD: Record<string, string> = {
    card: 'Paid by card on LocAppoint',
    transfer: 'Paid by bank transfer on LocAppoint',
    at_visit: 'Paid at the visit',
}

// One receipt line in the ink panel: what, then how much, right-aligned.
const line = (label: string, amount: string) => `
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td class="gutter" width="58" style="width:58px; font-size:0; line-height:0;">&nbsp;</td>
                                            <td valign="top" style="padding-bottom:8px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#16213F" style="background-color:#16213F; border-left:3px solid #3A4B75; border-radius:8px; border-collapse:separate;">
                                                    <tr>
                                                        <td style="padding:12px 14px; font-family:${SANS}; font-size:14px; line-height:1.35; color:#B4C1DD;">${label}</td>
                                                        <td align="right" style="padding:12px 14px; font-family:${MONO}; font-size:14px; line-height:1.35; color:#FFFFFF; white-space:nowrap;">${amount}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>`

export const RECEIPT: Record<string, Render> = {
    receipt: (row) => {
        const p = row.payload as Record<string, any>
        const kind = String(p.kind || 'payment')
        const refund = kind === 'refund'
        const number = oneLine(p.number)
        const bizRaw = oneLine(p.business?.name) || 'the business'
        const biz = esc(bizRaw)
        const serviceRaw = oneLine(p.booking?.service) || 'Booking'
        const date = String(p.booking?.date || '')
        const time = String(p.booking?.time || '')
        const when = date ? `${longDay(date)}${time ? ` at ${time}` : ''}` : ''
        const total = receiptMoney(p.total, p.currency)
        const token = String(p.token || '').replace(/[^a-f0-9]/gi, '')
        const link = `${SITE}/r/${token}`
        const lines = (Array.isArray(p.lines) ? p.lines : []) as { label: string; amount: number }[]
        const method = refund
            ? `Back to the ${p.method === 'transfer' ? 'account' : 'card'} you paid with`
            : METHOD[String(p.method)] || METHOD.card
        const name = oneLine(p.client_name).split(' ')[0]

        const subject = refund
            ? `Refund receipt ${number}: ${total} from ${bizRaw}`
            : `Receipt ${number}: ${total} ${p.method === 'at_visit' ? 'at' : 'paid to'} ${bizRaw}`
        const h1 = refund ? 'Your refund.' : 'Your receipt.'
        const sub = refund
            ? `${name ? `${esc(name)}, ${biz}` : biz} sent back ${total} for ${esc(serviceRaw)}.${p.refund_of ? ` It refunds receipt ${esc(p.refund_of)}.` : ''} Banks can take 5 to 10 working days to show it.`
            : `${name ? `${esc(name)}, here` : 'Here'} is your receipt for ${esc(serviceRaw)} at ${biz}${when ? `, ${esc(when)}` : ''}. Keep it for your records.`
        const small = `Receipt ${esc(number)} from ${biz}, issued through LocAppoint. This is proof of payment, not a tax invoice. For an invoice with your tax number, ask ${biz}.`
        const smallText = `Receipt ${number} from ${bizRaw}, issued through LocAppoint. This is proof of payment, not a tax invoice. For an invoice with your tax number, ask ${bizRaw}.`

        return {
            from: senderName(bizRaw),
            to: row.recipient_email!,
            subject,
            html: layout({
                title: refund ? 'Refund receipt' : 'Receipt',
                preheader: refund ? `${total} back from ${biz}. Receipt ${esc(number)}.` : `${total}, ${esc(serviceRaw)} at ${biz}. Receipt ${esc(number)}.`,
                h1,
                sub,
                day: esc(`Receipt ${number}`),
                place: biz,
                rows: [
                    ...lines.map((l) => line(esc(oneLine(l.label)), receiptMoney(refund ? -Math.abs(Number(l.amount)) : l.amount, p.currency))),
                    slot({
                        state: 'booked',
                        flag: refund ? 'Refunded' : 'Total',
                        title: refund ? `&minus;${total}` : total,
                        sub: esc(method),
                        button: { label: 'View receipt', href: link, width: 150 },
                    }),
                ],
                small,
                fallback: link,
            }),
            text: [
                h1,
                '',
                `Receipt ${number}, ${bizRaw}`,
                ...(when ? [`${serviceRaw}, ${when}`] : [serviceRaw]),
                '',
                ...lines.map((l) => `${oneLine(l.label)}: ${receiptMoney(refund ? -Math.abs(Number(l.amount)) : l.amount, p.currency)}`),
                `${refund ? 'Refunded' : 'Total'}: ${total}`,
                method,
                '',
                `View or print it: ${link}`,
                '',
                smallText,
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },
}

// "On the way": staff left for a visit at the client's place. One email per trip, sent the moment
// they tap On my way; the minutes after that live on the booking page and in push.

import { layout } from '../layout.ts'
import { slot, where } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc, longDay, oneLine } from '../format.ts'
import type { Render } from '../types.ts'

const ADDRESS = 'bookings@relay.locappoint.com'
const senderName = (value: string) => `"${value.replace(/["<>\\]/g, '').slice(0, 60)} via LocAppoint" <${ADDRESS}>`

export const TRIP: Record<string, Render> = {
    trip_on_way: (row) => {
        const p = row.payload as Record<string, any>
        const bizRaw = oneLine(p.business_name) || 'The business'
        const biz = esc(bizRaw)
        const byRaw = oneLine(p.by)
        const whoRaw = byRaw ? `${byRaw} from ${bizRaw}` : bizRaw
        const serviceRaw = oneLine(p.service_name) || 'your visit'
        const minutes = Math.max(1, Math.round(Number(p.minutes) || 0))
        const eta = /^\d{2}:\d{2}$/.test(String(p.eta || '')) ? String(p.eta) : ''
        const token = String(p.manage_token || '').replace(/[^a-f0-9]/gi, '')
        const link = token ? `${SITE}/b/${token}` : `${SITE}/client/appointments?booking=${row.appointment_id}`
        const name = oneLine(p.client_name).split(' ')[0]
        const place = [oneLine(p.client_address), oneLine(p.client_zone)].filter(Boolean).join(', ')
        const date = String(p.date || '').slice(0, 10)

        const subject = `${bizRaw} is on the way, about ${minutes} min`
        const sub = `${name ? `${esc(name)}, ` : ''}${esc(whoRaw)} left for your place${eta ? ` and should be there around ${eta}` : ''}. Follow the minutes live on your booking.`
        return {
            from: senderName(bizRaw),
            to: row.recipient_email!,
            subject,
            html: layout({
                title: 'On the way',
                preheader: `About ${minutes} min. ${esc(serviceRaw)} at your place.`,
                h1: 'On the way.',
                sub,
                day: date ? esc(longDay(date)) : 'Today',
                place: biz,
                rows: [
                    slot({
                        state: 'booked',
                        time: eta || undefined,
                        flag: 'On the way',
                        title: `About ${minutes} min`,
                        sub: esc(serviceRaw),
                        button: { label: 'Follow live', href: link, width: 130 },
                    }),
                    ...(place ? [where(`At your place: ${esc(place)}`)] : []),
                ],
                small: `${biz} shares the minutes until they arrive, never where they are. The minutes stop when they arrive.`,
                fallback: link,
            }),
            text: [
                'On the way.',
                '',
                `${whoRaw} left for your place${eta ? ` and should be there around ${eta}` : ''}. About ${minutes} min.`,
                serviceRaw,
                ...(place ? [`At your place: ${place}`] : []),
                '',
                `Follow live: ${link}`,
                '',
                `${bizRaw} shares the minutes until they arrive, never where they are.`,
                '',
                ...FOOTER_TEXT,
            ].join('\n'),
        }
    },
}

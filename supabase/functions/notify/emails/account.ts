// Account emails: welcome after the email is confirmed, and "you're live" when a business first takes bookings.
// The panel is the person's day so far: what is done, the now-line, the one thing to do next.

import { layout } from '../layout.ts'
import { done, next, now, slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, esc } from '../format.ts'
import type { Message, Render, Row } from '../types.ts'

const FROM = 'LocAppoint <accounts@relay.locappoint.com>'

type Day = {
    title: string
    preheader: string
    h1: string
    sub: string
    place: string
    done: string
    task: { title: string; sub: string; button: string; width: number; href: string }
    next: string
    small: string
    subject: string
    lines: string[]
}

const send = (row: Row, d: Day): Message => ({
    from: FROM,
    to: row.recipient_email!,
    subject: d.subject,
    html: layout({
        title: d.title,
        preheader: d.preheader,
        h1: d.h1,
        sub: d.sub,
        day: 'Today',
        place: d.place,
        rows: [
            done(d.done),
            now(),
            slot({ state: 'booked', title: d.task.title, sub: d.task.sub, button: { label: d.task.button, href: d.task.href, width: d.task.width } }),
            next(d.next),
        ],
        small: d.small,
        fallback: d.task.href,
    }),
    text: [d.h1.replace(/&rsquo;/g, "'"), '', ...d.lines, '', `${d.task.button}: ${d.task.href.replace(/&amp;/g, '&')}`, '', ...FOOTER_TEXT].join('\n'),
})

const hello = (row: Row) => {
    const name = esc(row.payload.name)
    return `${name ? `${name}, your` : 'Your'} LocAppoint account is confirmed. Here is your day so far.`
}

export const ACCOUNT: Record<string, Render> = {
    welcome_client: (row) =>
        send(row, {
            title: 'Welcome in',
            preheader: 'Your LocAppoint account is confirmed. Find a place and book in under a minute.',
            h1: 'Welcome in.',
            sub: hello(row),
            place: esc(row.recipient_email),
            done: 'Email confirmed',
            task: { title: 'Find a place', sub: 'Barbers, salons and clinics taking bookings near you.', button: 'Find a place', width: 150, href: `${SITE}/client/search` },
            next: 'Your first booking',
            small: 'You are getting this because you created a LocAppoint account. Questions? Reply to this email and a person reads it.',
            subject: 'Welcome to LocAppoint',
            lines: ['Your LocAppoint account is confirmed.', 'Barbers, salons and clinics are taking bookings near you.'],
        }),

    welcome_business: (row) =>
        send(row, {
            title: 'Welcome in',
            preheader: 'Your LocAppoint account is confirmed. Your booking page is next, about ten minutes.',
            h1: 'Welcome in.',
            sub: hello(row),
            place: esc(row.recipient_email),
            done: 'Email confirmed',
            task: { title: 'Set up your booking page', sub: 'Services, opening hours and a photo. About ten minutes.', button: 'Set up my page', width: 170, href: `${SITE}/portal` },
            next: 'Your first booking',
            small: 'You are getting this because you created a LocAppoint business account. Stuck on anything? Reply to this email and a person reads it.',
            subject: 'Welcome to LocAppoint. Your page is next.',
            lines: ['Your LocAppoint account is confirmed.', 'Next: services, opening hours and a photo. About ten minutes.'],
        }),

    business_live: (row) => {
        const name = esc(row.payload.name)
        const business = esc(row.payload.business_name) || 'Your business'
        const businessRaw = String(row.payload.business_name || 'Your business')
        const slug = String(row.payload.slug || '').replace(/[^a-z0-9-]/gi, '')
        const page = `${SITE}/${slug}`
        const shown = `${SITE.replace(/^https?:\/\//, '')}/${slug}`
        const auto = row.payload.auto_confirm !== false
        return send(row, {
            title: 'You are live',
            preheader: `${business} is taking bookings on LocAppoint. Share your link and the first one can land today.`,
            h1: 'You&rsquo;re live.',
            sub: `${name ? `${name}, ` : ''}${business} is now taking bookings on LocAppoint. Here is your day so far.`,
            place: esc(shown),
            done: 'Booking page set up',
            task: { title: 'Share your page', sub: `${esc(shown)} is ready for WhatsApp, Instagram and Google.`, button: 'View my page', width: 160, href: page },
            next: 'Your first booking',
            small: `${auto ? 'New bookings are confirmed straight away and land in your calendar.' : 'New bookings wait in your calendar for you to confirm.'} Put the link in your Instagram bio and WhatsApp status, and print the QR code from <span style="color:#0B1530; font-weight:600;">Channels</span> for your counter. Questions? Reply to this email and a person reads it.`,
            subject: `${businessRaw} is live on LocAppoint`,
            lines: [`${businessRaw} is now taking bookings on LocAppoint.`, `Your page: ${page}`, 'Put the link in your Instagram bio and WhatsApp status, and print the QR code from Channels for your counter.'],
        })
    },
}

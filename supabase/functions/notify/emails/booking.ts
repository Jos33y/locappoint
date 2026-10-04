// Booking emails. The panel is the day of the booking: its time in the gutter, the booking in the slot,
// a struck-through "was" row when it moved, and the address. Business emails lead with the client,
// client emails with the service.

import { layout } from '../layout.ts'
import { done, pay, said, slot, stars, was, where, type Slot } from '../blocks.ts'
import { SITE, FOOTER_TEXT, cutoffText, duration, esc, longDay, oneLine, plainText, priceText, relativeDay, shortDay } from '../format.ts'
import { base64, googleLink, icsFile, zonedToUtc, type CalendarEvent } from '../calendar.ts'
import type { Message, Render, Row } from '../types.ts'

const ADDRESS = 'bookings@relay.locappoint.com'

type Booking = {
    title: string
    preheader: string
    h1: string
    sub: string
    day: string
    place: string
    was?: string
    done?: string
    extra?: string[]
    slot?: Slot
    where?: string
    pay?: string
    small: string
    smallText?: string
}

const senderName = (value: string) => `"${value.replace(/["<>\\]/g, '').slice(0, 60)} via LocAppoint" <${ADDRESS}>`

const bookingFacts = (row: Row) => {
    const p = row.payload as Record<string, any>
    const date = String(p.date || '')
    const time = String(p.time || '')
    const bizRaw = oneLine(p.business_name) || 'the business'
    const clientRaw = oneLine(p.client_name) || 'A client'
    const serviceRaw = oneLine(p.service_name) || 'Booking'
    const price = priceText(p.price, p.country)
    const staff = oneLine(p.staff_name)
    const place = [oneLine(p.address), oneLine(p.city)].filter(Boolean)
    // Online sessions have a meeting link instead of an address, shown once the booking is confirmed.
    const online = p.mode === 'online'
    const meet = online && /^https:\/\/\S+$/.test(String(p.meeting_url || '')) ? String(p.meeting_url) : ''
    const joinable = online && meet && p.status === 'confirmed'
    // A visit at the client's place: the area always, the address once the business has confirmed.
    const home = p.mode === 'at_client'
    const homePlace = home ? [oneLine(p.client_address), oneLine(p.client_zone)].filter(Boolean) : []
    const homeNote = home ? oneLine(p.client_landmark) : ''
    const toBusiness = p.audience === 'business'
    const contact = oneLine(p.business_whatsapp) || oneLine(p.business_phone)
    const movedFrom = p.moved_from ? String(p.moved_from) : ''
    const token = String(p.manage_token || '').replace(/[^a-f0-9]/gi, '')
    const manage = token ? `${SITE}/b/${token}` : ''
    let event: CalendarEvent | null = null
    if (date && time) {
        try {
            event = {
                uid: `${row.appointment_id}@locappoint.com`,
                sequence: movedFrom ? Math.floor(Date.now() / 1000) : 0,
                title: `${serviceRaw} at ${bizRaw}`,
                start: zonedToUtc(date, time, String(p.timezone || 'Europe/Lisbon')),
                minutes: Number(p.duration_minutes) || 30,
                location: online ? (joinable ? meet : 'Online') : home ? homePlace.join(', ') : place.join(', '),
                details: [joinable ? `Join online: ${meet}` : '', manage ? `Change or cancel: ${manage}` : '', contact ? `${bizRaw}: ${contact}` : ''].filter(Boolean).join('\n'),
                url: manage || `${SITE}/${String(p.slug || '').replace(/[^a-z0-9-]/gi, '')}`,
            }
        } catch {
            event = null
        }
    }
    return {
        p,
        date,
        time,
        tz: String(p.timezone || 'Europe/Lisbon'),
        bizRaw,
        clientRaw,
        serviceRaw,
        biz: esc(bizRaw),
        client: esc(clientRaw),
        service: esc(serviceRaw),
        short: `${shortDay(date)}, ${time}`,
        long: `${longDay(date)} at ${time}`,
        dayLabel: longDay(date),
        clientDetails: [duration(Number(p.duration_minutes) || 0), staff ? `with ${esc(staff)}` : '', price].filter(Boolean).join(' &middot; '),
        businessDetails: [esc(serviceRaw), duration(Number(p.duration_minutes) || 0), price, staff ? `with ${esc(staff)}` : ''].filter(Boolean).join(' &middot; '),
        where: home
            ? p.client_address
                ? `${toBusiness ? 'At the client&rsquo;s place' : 'At your place'}: ${esc(homePlace.join(', '))}${homeNote ? `. ${esc(homeNote)}` : ''}`
                : `${toBusiness ? `At the client&rsquo;s place${oneLine(p.client_zone) ? `, ${esc(oneLine(p.client_zone))}` : ''}. The address shows once you confirm.` : `At your place${oneLine(p.client_zone) ? `, ${esc(oneLine(p.client_zone))}` : ''}.`}`
            : online
            ? joinable
                ? `Online. Join: <a href="${esc(meet)}" style="color:#B4C1DD; text-decoration:underline;">${esc(meet)}</a>`
                : 'Online. The join link comes with the confirmation.'
            : place.length ? esc(place.join(', ')) : '',
        was: movedFrom ? `${shortDay(movedFrom)}, ${movedFrom.slice(11, 16)}` : '',
        contact: contact ? esc(contact) : '',
        cutoff: cutoffText(Number(p.cancel_cutoff_minutes) || 0),
        mine: `${SITE}/client/appointments?booking=${row.appointment_id}`,
        calendar: `${SITE}/portal/calendar?booking=${row.appointment_id}`,
        page: `${SITE}/${String(p.slug || '').replace(/[^a-z0-9-]/gi, '')}`,
        manage,
        guest: p.has_account === false,
        signup: `${SITE}/auth?tab=signup&email=${encodeURIComponent(String(row.recipient_email || ''))}`,
        event,
    }
}

const LINK = 'color:#1A50AD; text-decoration:underline;'

// Booking is free and nothing is charged online. A free service gets no pay row.
const PAY = 'At your visit. Nothing is charged online.'
const PAY_TEXT = 'Pay at your visit. Nothing is charged online.'
const paidOnline = (f: Facts) => ['paid', 'partly_refunded', 'refunded'].includes(String(f.p.payment_status || ''))
const payRow = (f: Facts) => {
    if (paidOnline(f)) return `Paid online, ${priceText(f.p.total, f.p.country)}.`
    return priceText(f.p.price, f.p.country) === 'Free' ? undefined : PAY
}

// A paid booking that is cancelled says what comes back, and where.
const refundNote = (f: Facts) => {
    const amount = Number(f.p.refund) || 0
    return amount > 0
        ? `Your ${priceText(amount, f.p.country)} refund is on its way to the card or account you paid with. Banks usually show it within 5 to 10 working days.`
        : ''
}

// The calendar invite rides along as an attachment; Google users get a one-tap link too.
const calendarNote = (f: Facts) =>
    f.event ? ` Add it to your calendar: <a href="${esc(googleLink(f.event))}" style="${LINK}">Google Calendar</a>, or open the attached invite for Apple and Outlook.` : ''

const guestNote = (f: Facts) =>
    f.guest ? ` No account needed. Want all your bookings in one place? <a href="${esc(f.signup)}" style="${LINK}">Create a free account</a> with this email.` : ''

const invite = (f: Facts) =>
    f.event ? [{ filename: 'booking.ics', content: base64(icsFile(f.event)), content_type: 'text/calendar; charset=utf-8; method=PUBLISH' }] : undefined

type Facts = ReturnType<typeof bookingFacts>

const bookingMessage = (row: Row, f: Facts, forClient: boolean, subject: string, o: Booking, lines: string[], withInvite = false): Message => ({
    from: forClient ? senderName(f.bizRaw) : `LocAppoint <${ADDRESS}>`,
    to: row.recipient_email!,
    subject,
    html: layout({
        title: o.title,
        preheader: o.preheader,
        h1: o.h1,
        sub: o.sub,
        day: o.day,
        place: o.place,
        rows: [o.done ? done(o.done) : '', o.was ? was(o.was) : '', ...(o.extra || []), o.slot ? slot(o.slot) : '', o.where ? where(o.where) : '', o.pay ? pay(o.pay) : ''],
        small: o.small,
    }),
    text: [
        plainText(o.h1),
        '',
        ...lines,
        ...(o.pay ? [o.pay === PAY ? PAY_TEXT : plainText(o.pay)] : []),
        '',
        ...(o.slot?.button ? [`${o.slot.button.label}: ${o.slot.button.href}`, ''] : []),
        ...(withInvite && f.event ? [`Add to Google Calendar: ${googleLink(f.event)}`, 'Apple and Outlook: open the attached booking.ics', ''] : []),
        o.smallText ?? plainText(o.small),
        '',
        ...FOOTER_TEXT,
    ].join('\n'),
    ...(withInvite && invite(f) ? { attachments: invite(f) } : {}),
})

const clientSmall = (f: Facts, lead: string, extra = '') =>
    `${lead}${f.contact ? ` Need to reach ${f.biz}? Message them on ${f.contact}.` : ''}${extra}`

const changeVia = (f: Facts) => (f.manage ? 'with Manage booking' : 'from your bookings')

const VIEW = (f: Facts) => (f.manage ? { label: 'Manage booking', href: f.manage, width: 170 } : { label: 'View booking', href: f.mine, width: 150 })
const CALENDAR = (f: Facts) => ({ label: 'Open calendar', href: f.calendar, width: 160 })
const BOOK_AGAIN = (f: Facts) => ({ label: 'Pick a new time', href: f.page, width: 170 })

// Business emails only say where when it is not their own place: the client's home, or online.
const awayFromShop = (f: Facts) => (f.p.mode === 'at_client' || f.p.mode === 'online' ? f.where || undefined : undefined)

const forClient = (row: Row) => row.payload.audience !== 'business'

const every = (days: number) => {
    if (days < 10) return days === 1 ? 'day' : `${days} days`
    if (days < 60) {
        const weeks = Math.round(days / 7)
        return weeks === 1 ? 'week' : `${weeks} weeks`
    }
    const months = Math.round(days / 30)
    return months === 1 ? 'month' : `${months} months`
}

export const BOOKING: Record<string, Render> = {
    booking_confirmed: (row) => {
        const f = bookingFacts(row)
        const o: Booking = {
            title: 'You are booked',
            preheader: `${f.service} at ${f.biz}, ${f.long}.`,
            h1: 'You&rsquo;re booked.',
            sub: `${f.biz} has you down for ${f.long}. Here is your day.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'booked', time: f.time, title: f.service, sub: f.clientDetails, button: VIEW(f) },
            where: f.where,
            pay: payRow(f),
            small: clientSmall(f, `Plans change. You can move or cancel it ${changeVia(f)} ${f.cutoff}.`, calendarNote(f) + guestNote(f)),
        }
        return bookingMessage(row, f, true, `Booked: ${f.serviceRaw} at ${f.bizRaw}, ${f.short}`, o,
            [`${f.serviceRaw} at ${f.bizRaw}`, `${f.long}`, plainText(f.clientDetails), f.where ? plainText(f.where) : ''].filter(Boolean), true)
    },

    booking_requested: (row) => {
        const f = bookingFacts(row)
        const o: Booking = {
            title: 'Request sent',
            preheader: `${f.biz} confirms bookings themselves. We will email you the moment they do.`,
            h1: 'Request sent.',
            sub: `${f.biz} confirms each booking themselves. We will email you the moment they do.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'waiting', time: f.time, flag: `Waiting for ${f.biz}`, title: f.service, sub: f.clientDetails, button: VIEW(f) },
            where: f.where,
            pay: payRow(f),
            small: clientSmall(f, 'The time is held for you while they decide.', guestNote(f)),
        }
        return bookingMessage(row, f, true, `Request sent to ${f.bizRaw} for ${f.short}`, o,
            [`${f.serviceRaw} at ${f.bizRaw}`, f.long, `Waiting for ${f.bizRaw} to confirm.`])
    },

    booking_declined: (row) => {
        const f = bookingFacts(row)
        const o: Booking = {
            title: 'Not this time',
            preheader: `${f.biz} could not take your booking for ${f.short}. Other times are open.`,
            h1: 'Not this time.',
            sub: `${f.biz} could not take your booking for ${f.long}. Other times are open on their page.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'cancelled', time: f.time, flag: 'Not accepted', title: f.service, sub: f.clientDetails, button: BOOK_AGAIN(f) },
            small: clientSmall(f, refundNote(f) || 'There is nothing else you need to do.'),
        }
        return bookingMessage(row, f, true, `${f.bizRaw} could not take your booking for ${f.short}`, o,
            [`${f.bizRaw} could not take your booking for ${f.long}.`, `Other times: ${f.page}`])
    },

    booking_cancelled: (row) => {
        const f = bookingFacts(row)
        if (forClient(row)) {
            const o: Booking = {
                title: 'Booking cancelled',
                preheader: `${f.biz} cancelled your booking for ${f.short}.`,
                h1: 'Booking cancelled.',
                sub: `${f.biz} cancelled your booking for ${f.long}. Sorry about that.`,
                day: f.dayLabel,
                place: f.biz,
                slot: { state: 'cancelled', time: f.time, flag: `Cancelled by ${f.biz}`, title: f.service, sub: f.clientDetails, button: BOOK_AGAIN(f) },
                small: clientSmall(f, refundNote(f) || 'There is nothing else you need to do.'),
            }
            return bookingMessage(row, f, true, `${f.bizRaw} cancelled your booking for ${f.short}`, o,
                [`${f.bizRaw} cancelled your booking for ${f.long}.`, `Pick a new time: ${f.page}`])
        }
        const o: Booking = {
            title: 'Booking cancelled',
            preheader: `${f.client} cancelled ${f.short}. The time is open again.`,
            h1: 'A slot opened up.',
            sub: `${f.client} cancelled ${f.service} for ${f.long}. The time is open for other clients again.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'cancelled', time: f.time, flag: 'Cancelled by the client', title: f.client, sub: f.businessDetails, button: CALENDAR(f) },
            small: 'You do not need to do anything.',
        }
        return bookingMessage(row, f, false, `Cancelled: ${f.clientRaw}, ${f.short}`, o,
            [`${f.clientRaw} cancelled ${f.serviceRaw} for ${f.long}.`, 'The time is open again.'])
    },

    booking_moved: (row) => {
        const f = bookingFacts(row)
        if (forClient(row)) {
            const o: Booking = {
                title: 'New time',
                preheader: `${f.biz} moved your booking to ${f.long}.`,
                h1: 'New time.',
                sub: `${f.biz} moved your booking to ${f.long}.`,
                day: f.dayLabel,
                place: f.biz,
                was: f.was,
                slot: { state: 'booked', time: f.time, title: f.service, sub: f.clientDetails, button: VIEW(f) },
                where: f.where,
                pay: payRow(f),
                small: clientSmall(f, `Does the new time not work? You can change or cancel it ${changeVia(f)} ${f.cutoff}.`, calendarNote(f)),
            }
            return bookingMessage(row, f, true, `New time: ${f.short} at ${f.bizRaw}`, o,
                [`${f.bizRaw} moved your booking.`, f.was ? `Was: ${f.was}` : '', `Now: ${f.long}`].filter(Boolean), true)
        }
        const o: Booking = {
            title: 'Booking moved',
            preheader: `${f.client} moved their booking to ${f.short}.`,
            h1: 'Booking moved.',
            sub: `${f.client} moved ${f.service} to ${f.long}.`,
            day: f.dayLabel,
            place: f.biz,
            was: f.was,
            slot: { state: 'booked', time: f.time, title: f.client, sub: f.businessDetails, button: CALENDAR(f) },
            small: 'It is already in your calendar. You do not need to do anything.',
        }
        return bookingMessage(row, f, false, `Moved: ${f.clientRaw} to ${f.short}`, o,
            [`${f.clientRaw} moved ${f.serviceRaw}.`, f.was ? `Was: ${f.was}` : '', `Now: ${f.long}`].filter(Boolean))
    },

    booking_reminder: (row) => {
        const f = bookingFacts(row)
        const when = relativeDay(f.date, f.tz)
        const o: Booking = {
            title: 'See you soon',
            preheader: `${f.service} at ${f.biz}, ${when} at ${f.time}.`,
            h1: when === 'tomorrow' ? 'See you tomorrow.' : when === 'today' ? 'See you today.' : 'See you soon.',
            sub: `${f.service} at ${f.biz}, ${when} at ${f.time}.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'booked', time: f.time, title: f.service, sub: f.clientDetails, button: VIEW(f) },
            where: f.where,
            pay: payRow(f),
            small: clientSmall(f, `Cannot make it? Cancel ${changeVia(f)} ${f.cutoff}, so someone else can take the time.`),
        }
        const lead = when === 'tomorrow' ? 'Tomorrow' : when === 'today' ? 'Today' : shortDay(f.date)
        return bookingMessage(row, f, true, `${lead} at ${f.time}: ${f.serviceRaw} at ${f.bizRaw}`, o,
            [`${f.serviceRaw} at ${f.bizRaw}`, f.long, f.where ? plainText(f.where) : ''].filter(Boolean))
    },

    // The morning after a visit: stars first while it is fresh, then the next visit. One email, never two.
    visit_followup: (row) => {
        const f = bookingFacts(row)
        const next = /^\d{4}-\d{2}-\d{2}/.test(String(f.p.suggested_date || '')) ? String(f.p.suggested_date).slice(0, 10) : ''
        const gap = Number(f.p.gap_days) || 0
        const ask = f.p.ask_review !== false
        const offer = f.p.booked_again !== true
        const again = f.manage ? `${f.manage}?again=1` : f.page
        const stop = f.manage ? `${f.manage}?stop=1` : `${SITE}/client/profile`
        const rateLink = (n: number) => (f.manage ? `${f.manage}?rate=${n}` : `${SITE}/client/appointments?rate=${row.appointment_id}`)
        const staff = oneLine(f.p.staff_name)
        const rhythm = gap && next ? `You come about every ${every(gap)}. Your usual next visit is ${longDay(next)}.` : 'Same service, straight to the free times.'
        const o: Booking = {
            title: ask ? 'How was it?' : 'Book again',
            preheader: ask ? `Rate ${f.service} at ${f.biz} in one tap.` : `Thanks for coming to ${f.biz}. Your next ${f.service} is one tap away.`,
            h1: ask ? 'How was it?' : 'Thanks for coming in.',
            sub: ask
                ? `Thanks for coming to ${f.biz}. Tap a star to rate ${f.service}. It helps them, and the people choosing where to book.`
                : `We hope ${f.service} at ${f.biz} went well. When you are ready for the next one, it takes one tap.`,
            day: next && offer ? longDay(next) : f.dayLabel,
            place: f.biz,
            done: `${f.service}, ${esc(shortDay(f.date))}`,
            extra: ask ? [stars({ links: [1, 2, 3, 4, 5].map((n) => esc(rateLink(n))), caption: 'One is poor, five is excellent. You can add a few words after.' })] : [],
            slot: offer ? {
                state: 'waiting',
                flag: next ? 'Your usual time' : 'Next visit',
                title: `${f.service}${staff ? ` with ${esc(staff)}` : ''}`,
                sub: esc(rhythm),
                button: { label: 'Book again', href: again, width: 150 },
            } : undefined,
            small: `Do not want these emails? <a href="${esc(stop)}" style="${LINK}">Stop follow-up emails</a>. Booking confirmations and changes still arrive.`,
            smallText: `Do not want these emails? Stop follow-up emails: ${stop}\nBooking confirmations and changes still arrive.`,
        }
        return bookingMessage(row, f, true, ask ? `How was ${f.serviceRaw} at ${f.bizRaw}?` : `Book your next ${f.serviceRaw} at ${f.bizRaw}`, o,
            [ask ? `Thanks for coming to ${f.bizRaw}. Rate your visit: ${f.manage || `${SITE}/client/appointments?rate=${row.appointment_id}`}` : `Thanks for coming to ${f.bizRaw}.`, offer ? rhythm : ''].filter(Boolean))
    },

    // To the owner when a review arrives. Full client name here; the public page shows first name and initial.
    review_new: (row) => {
        const f = bookingFacts(row)
        const rating = Math.max(1, Math.min(5, Number(f.p.rating) || 0))
        const body = oneLine(f.p.body)
        const id = String(f.p.review_id || '').replace(/[^a-f0-9-]/gi, '')
        const link = `${SITE}/portal/reviews${id ? `?review=${id}` : ''}`
        const o: Booking = {
            title: 'New review',
            preheader: `${f.client} gave ${f.service} ${rating} out of 5.`,
            h1: 'New review.',
            sub: `${f.client} rated ${f.service} on ${f.dayLabel}: ${rating} out of 5.`,
            day: f.dayLabel,
            place: f.biz,
            extra: [stars({ value: rating })],
            slot: { state: 'booked', title: f.client, sub: body ? `&ldquo;${esc(body.slice(0, 280))}${body.length > 280 ? '&hellip;' : ''}&rdquo;` : 'Stars only, no text.', button: { label: 'Reply', href: link, width: 120 } },
            small: 'Replies show under the review on your page. You cannot remove reviews, so clients trust them; if one is false or abusive, report it from Reviews.',
        }
        return bookingMessage(row, f, false, `New review: ${rating} out of 5 from ${f.clientRaw}`, o,
            [`${f.clientRaw} rated ${f.serviceRaw}: ${rating} out of 5.`, body ? `"${body}"` : 'Stars only, no text.'])
    },

    // To the client when the owner first replies to their review.
    review_reply: (row) => {
        const f = bookingFacts(row)
        const rating = Math.max(1, Math.min(5, Number(f.p.rating) || 0))
        const body = oneLine(f.p.body)
        const reply = oneLine(f.p.reply)
        const stop = f.manage ? `${f.manage}?stop=1` : `${SITE}/client/profile`
        const see = f.manage || `${f.page}#reviews`
        const o: Booking = {
            title: `${f.biz} replied`,
            preheader: `${f.biz} answered your review of ${f.service}.`,
            h1: `${f.biz} replied.`,
            sub: `To your review of ${f.service} on ${f.dayLabel}. Their reply shows under your review on their page.`,
            day: f.dayLabel,
            place: f.biz,
            extra: [stars({ value: rating }), body ? said('you', esc(body)) : '', said('reply', esc(reply), true)],
            slot: { state: 'booked', title: f.service, sub: `Your review, ${rating} out of 5`, button: { label: 'See it', href: see, width: 120 } },
            small: `Do not want these emails? <a href="${esc(stop)}" style="${LINK}">Stop follow-up emails</a>.`,
            smallText: `Do not want these emails? Stop follow-up emails: ${stop}`,
        }
        return bookingMessage(row, f, true, `${f.bizRaw} replied to your review`, o,
            [`${f.bizRaw} replied to your review of ${f.serviceRaw}.`, body ? `You wrote: "${body}"` : '', `Their reply: "${reply}"`].filter(Boolean))
    },

    booking_new: (row) => {
        const f = bookingFacts(row)
        const o: Booking = {
            title: 'New booking',
            preheader: `${f.client} booked ${f.service} for ${f.long}.`,
            h1: 'New booking.',
            sub: `${f.client} booked ${f.service} for ${f.long}. It is confirmed and in your calendar.`,
            day: f.dayLabel,
            place: f.biz,
            slot: { state: 'booked', time: f.time, title: f.client, sub: f.businessDetails, button: CALENDAR(f) },
            where: awayFromShop(f),
            small: f.p.client_phone ? `Their number is ${esc(f.p.client_phone)}, if you need to reach them.` : 'You do not need to do anything.',
        }
        return bookingMessage(row, f, false, `New booking: ${f.clientRaw}, ${f.short}`, o,
            [`${f.clientRaw} booked ${f.serviceRaw}.`, f.long, plainText(f.businessDetails), awayFromShop(f) ? plainText(awayFromShop(f)!) : ''].filter(Boolean))
    },

    booking_request: (row) => {
        const f = bookingFacts(row)
        const moved = Boolean(f.was)
        const o: Booking = {
            title: 'Request to confirm',
            preheader: `${f.client} wants ${f.short}. Confirm or decline.`,
            h1: moved ? 'New time to confirm.' : 'New request.',
            sub: moved
                ? `${f.client} moved ${f.service} to ${f.long}. It needs your OK.`
                : `${f.client} wants ${f.service} on ${f.long}. The time is held until you answer.`,
            day: f.dayLabel,
            place: f.biz,
            was: f.was,
            slot: { state: 'waiting', time: f.time, flag: 'Waiting for you', title: f.client, sub: f.businessDetails, button: { label: 'Confirm or decline', href: f.calendar, width: 200 } },
            where: awayFromShop(f),
            small: 'Answer soon. Clients book elsewhere when they wait too long. You can switch to automatic confirmation in Business page, Bookings.',
        }
        return bookingMessage(row, f, false, `${moved ? 'New time to confirm' : 'Request to confirm'}: ${f.clientRaw}, ${f.short}`, o,
            [moved ? `${f.clientRaw} moved ${f.serviceRaw} and it needs your OK.` : `${f.clientRaw} wants ${f.serviceRaw}.`, f.was ? `Was: ${f.was}` : '', f.long, awayFromShop(f) ? plainText(awayFromShop(f)!) : '', `Confirm or decline: ${f.calendar}`].filter(Boolean))
    },
}

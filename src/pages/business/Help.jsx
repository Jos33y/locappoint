import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CirclePause, Clock, Euro, Flag, Inbox, Mail, MessageCircle, PhoneCall, Share2 } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button } from '../../components/ui'
import { ShopClock, useNow } from '../../components/business/ShopClock'
import { openStatus } from '../../components/business/PublicPageView'
import { SUPPORT } from '../../constants/support'
import { listTickets } from '../../services/support'
import '../../styles/business/support.css'
import '../../styles/support.css'

const ANSWERS = [
    { id: 'phone-booking', icon: PhoneCall, q: 'How do I add a booking from a phone call?', a: 'Tap New booking (the + button on your phone). Pick the service, the day and a free time, type the client’s name, and add it. Phone and email are optional. If they want a time outside your hours, choose “A time outside opening hours”.' },
    { id: 'confirm', icon: CalendarCheck, q: 'How do I confirm, move or cancel a booking?', a: 'Open Today or Calendar and tap the booking. Confirm, Completed, No-show and Cancel are right there. Move lets you pick a new free time. Bookings waiting for you also have a Confirm button on the row itself.' },
    { id: 'share', icon: Share2, q: 'How do clients find and book me?', a: 'Share your link from the share button at the top, or from Channels. Clients open it, choose a service and a time, and the booking lands on your Today screen.' },
    { id: 'hours', icon: Clock, q: 'How do I change my hours or take a day off?', a: 'Open Hours to change your weekly opening times. Closed dates for holidays and sick days arrive with the next Hours update; until then, write to us and we will block the day for you.' },
    { id: 'pause', icon: CirclePause, q: 'Can I stop taking bookings for a while?', a: 'Yes. Open Business page and turn off taking bookings. Your page stays, but clients cannot book until you turn it back on.' },
    { id: 'price', icon: Euro, q: 'What does Locappoint cost?', a: 'Nothing during the beta. When online payments arrive, a small fee applies only to bookings clients pay for on Locappoint, and your first month of it is free. Walk-ins and bookings you add yourself are always free. We tell you at least 30 days before any fee applies, and your weekly statement in Insights shows what it would be.' },
]

const OPEN_COUNT = (data) => (data?.rows || []).filter((t) => t.status !== 'resolved').length

const supportWeek = () => {
    const { days, open, close } = SUPPORT.schedule
    return Array.from({ length: 7 }, (_, dow) => (days.includes(dow) ? [{ start: open, end: close }] : []))
}

const Help = () => {
    const { business } = useWorkspace()
    const location = useLocation()
    const [openId, setOpenId] = useState(location.hash.replace('#', '') || null)
    const [tickets, setTickets] = useState(null)

    useEffect(() => {
        let cancelled = false
        listTickets({ side: 'business', businessId: business.id })
            .then((data) => { if (!cancelled) setTickets(data) })
            .catch(() => { if (!cancelled) setTickets(null) })
        return () => { cancelled = true }
    }, [business.id])

    useEffect(() => {
        const id = location.hash.replace('#', '')
        if (!id) return
        setOpenId(id)
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }))
    }, [location.hash])

    const now = useNow(SUPPORT.schedule.timeZone)
    const status = useMemo(() => openStatus(supportWeek(), SUPPORT.schedule.timeZone), [now?.minutes])

    const whatsapp = SUPPORT.whatsapp
        ? `https://wa.me/${SUPPORT.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi Locappoint, this is ${business.business_name}. `)}`
        : null

    const mailto = `mailto:${SUPPORT.email}?subject=${encodeURIComponent(`Help for ${business.business_name}`)}`

    return (
        <div className="biz-page lc-help">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Help</h1>
                    <p className="biz-page__sub">Quick answers first, and real people in Support when you need them.</p>
                </div>
            </header>

            <section className={`lc-help__desk${status?.open ? ' is-open' : ''}`} aria-labelledby="desk-title">
                <div className="lc-help__deskstate">
                    {now && <ShopClock minutes={now.minutes} open={Boolean(status?.open)} size={56} />}
                    <div>
                        <h2 id="desk-title" className="lc-help__deskname">{status?.open ? 'We are online' : 'We are away'}</h2>
                        <p className="lc-help__deskline">
                            {status?.open ? `${status.text} Portugal time. Tickets are answered within one working day.` : `${status?.text.replace(/^Opens/, 'Back')} Portugal time. Leave a ticket and it is first in line.`}
                        </p>
                        <p className="lc-help__deskhours">{SUPPORT.hours}</p>
                    </div>
                </div>
                <div className="lc-help__deskactions">
                    {whatsapp && <Button href={whatsapp} target="_blank" rel="noopener noreferrer" icon={MessageCircle}>WhatsApp us</Button>}
                    <Button href={mailto} variant={whatsapp ? 'secondary' : 'primary'} icon={Mail}>Email {SUPPORT.email}</Button>
                </div>
            </section>

            <section aria-labelledby="answers-title" className="lc-help__section">
                <h2 id="answers-title" className="ui-heading">Quick answers</h2>
                <div className="lc-faq">
                    {ANSWERS.map(({ id, icon: Icon, q, a }) => (
                        <details
                            key={id}
                            id={id}
                            className="lc-faq__item"
                            open={openId === id}
                            onToggle={(event) => { if (event.currentTarget.open) setOpenId(id) }}
                        >
                            <summary className="lc-faq__q">
                                <span className="lc-faq__icon" aria-hidden="true"><Icon size={17} /></span>
                                <span className="lc-faq__text">{q}</span>
                            </summary>
                            <p className="lc-faq__a">{a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="lc-help__inbox" aria-labelledby="inbox-title">
                <span className="lc-help__inboxicon" aria-hidden="true"><Inbox size={20} /></span>
                <div className="lc-help__inboxtext">
                    <h2 id="inbox-title" className="lc-help__inboxname">Support inbox</h2>
                    <p>
                        {tickets?.unread > 0
                            ? `${tickets.unread} ${tickets.unread === 1 ? 'reply' : 'replies'} from us waiting for you.`
                            : OPEN_COUNT(tickets) > 0
                                ? `${OPEN_COUNT(tickets)} open ${OPEN_COUNT(tickets) === 1 ? 'ticket' : 'tickets'}. Every reply lands there, by email and in the bell.`
                                : 'Write to us and follow every reply in one place, by email and in the bell too.'}
                    </p>
                    <p className="lc-help__inboxhint"><Flag size={13} aria-hidden="true" /> A problem with one booking? Open it in Today or Calendar and tap Report a problem.</p>
                </div>
                <Button to="/portal/support" iconRight={ArrowRight}>Open Support</Button>
            </section>
        </div>
    )
}

export default Help

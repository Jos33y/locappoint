import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarCheck, CirclePause, Clock, Euro, Mail, MessageCircle, PhoneCall, Send, Share2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Card, Field, Input, ListRow, Picker, Skeleton, Status, Textarea } from '../../components/ui'
import { ShopClock, useNow } from '../../components/business/ShopClock'
import { openStatus } from '../../components/business/PublicPageView'
import { SUPPORT, TICKET_CATEGORIES, TICKET_STATUS } from '../../constants/support'
import { listMyTickets, openTicket } from '../../services/support'
import '../../styles/business/support.css'

const ANSWERS = [
    { id: 'phone-booking', icon: PhoneCall, q: 'How do I add a booking from a phone call?', a: 'Tap New booking (the + button on your phone). Pick the service, the day and a free time, type the client’s name, and add it. Phone and email are optional. If they want a time outside your hours, choose “A time outside opening hours”.' },
    { id: 'confirm', icon: CalendarCheck, q: 'How do I confirm, move or cancel a booking?', a: 'Open Today or Calendar and tap the booking. Confirm, Completed, No-show and Cancel are right there. Move lets you pick a new free time. Bookings waiting for you also have a Confirm button on the row itself.' },
    { id: 'share', icon: Share2, q: 'How do clients find and book me?', a: 'Share your link from the share button at the top, or from Channels. Clients open it, choose a service and a time, and the booking lands on your Today screen.' },
    { id: 'hours', icon: Clock, q: 'How do I change my hours or take a day off?', a: 'Open Hours to change your weekly opening times. Closed dates for holidays and sick days arrive with the next Hours update; until then, write to us and we will block the day for you.' },
    { id: 'pause', icon: CirclePause, q: 'Can I stop taking bookings for a while?', a: 'Yes. Open Business page and turn off taking bookings. Your page stays, but clients cannot book until you turn it back on.' },
    { id: 'price', icon: Euro, q: 'What does Locappoint cost?', a: 'Your first twelve months are free. After that it is nineteen euros a month, flat, with no commission on your bookings.' },
]

const supportWeek = () => {
    const { days, open, close } = SUPPORT.schedule
    return Array.from({ length: 7 }, (_, dow) => (days.includes(dow) ? [{ start: open, end: close }] : []))
}

const TicketStub = () => (
    <svg className="lc-stub" width="120" height="84" viewBox="0 0 120 84" aria-hidden="true">
        <path className="lc-stub__paper" d="M14 10 H106 A6 6 0 0 1 112 16 V32 A10 10 0 0 0 112 52 V68 A6 6 0 0 1 106 74 H14 A6 6 0 0 1 8 68 V52 A10 10 0 0 0 8 32 V16 A6 6 0 0 1 14 10 Z" />
        <line className="lc-stub__cut" x1="84" y1="16" x2="84" y2="68" />
        <rect className="lc-stub__line is-strong" x="20" y="26" width="42" height="6" rx="3" />
        <rect className="lc-stub__line" x="20" y="40" width="54" height="4" rx="2" />
        <rect className="lc-stub__line" x="20" y="50" width="34" height="4" rx="2" />
        <circle className="lc-stub__dot" cx="98" cy="42" r="5" />
    </svg>
)

const Help = () => {
    const { user } = useAuth()
    const { business, notify } = useWorkspace()
    const location = useLocation()
    const [tickets, setTickets] = useState(null)
    const [ticketsError, setTicketsError] = useState('')
    const [form, setForm] = useState({ category: 'bookings', subject: '', message: '' })
    const [errors, setErrors] = useState({})
    const [sending, setSending] = useState(false)
    const [openId, setOpenId] = useState(location.hash.replace('#', '') || null)

    const loadTickets = () => {
        listMyTickets()
            .then((rows) => { setTickets(rows); setTicketsError('') })
            .catch(() => { setTickets([]); setTicketsError('Tickets are not available yet. Email or WhatsApp us instead.') })
    }

    useEffect(() => { loadTickets() }, [])

    useEffect(() => {
        const id = location.hash.replace('#', '')
        if (!id) return
        setOpenId(id)
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }))
    }, [location.hash])

    const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }))

    const submit = async (event) => {
        event.preventDefault()
        const next = {}
        if (!form.subject.trim()) next.subject = 'Give your question a short title.'
        if (form.message.trim().length < 10) next.message = 'Tell us a little more, so we can help first time.'
        setErrors(next)
        if (Object.keys(next).length) return
        setSending(true)
        try {
            await openTicket({ userId: user.id, businessId: business.id, ...form })
            setForm({ category: form.category, subject: '', message: '' })
            notify('Ticket sent. We reply within one working day.')
            loadTickets()
        } catch {
            notify('Could not send your ticket. Email us instead.')
        } finally {
            setSending(false)
        }
    }

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
                    <h1 className="biz-page__title">Help and support</h1>
                    <p className="biz-page__sub">Quick answers first, and real people when you need them.</p>
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

            <div className="lc-help__grid">
                <Card title="Open a ticket" padding="lg">
                    <form className="lc-help__form" onSubmit={submit} noValidate>
                        <Field label="About">
                            <Picker
                                value={form.category}
                                onChange={(category) => setForm((f) => ({ ...f, category }))}
                                options={TICKET_CATEGORIES}
                                title="What is it about?"
                            />
                        </Field>
                        <Field label="Title" error={errors.subject}>
                            <Input value={form.subject} onChange={update('subject')} maxLength={140} placeholder="For example: a client cannot see Saturday" />
                        </Field>
                        <Field label="What happened" error={errors.message} hint="Include the day and time if it is about a booking.">
                            <Textarea value={form.message} onChange={update('message')} maxLength={4000} rows={5} />
                        </Field>
                        <Button type="submit" icon={Send} loading={sending}>Send ticket</Button>
                    </form>
                </Card>

                <Card title="Your tickets" padding="sm">
                    {tickets === null ? (
                        <div className="lc-help__loading"><Skeleton height={48} /><Skeleton height={48} /></div>
                    ) : ticketsError ? (
                        <p className="lc-help__text lc-help__pad">{ticketsError}</p>
                    ) : tickets.length === 0 ? (
                        <div className="lc-help__empty">
                            <TicketStub />
                            <h3>No tickets yet</h3>
                            <p>When you open one, it shows here with its status, and you get our reply by email.</p>
                        </div>
                    ) : (
                        tickets.map((t) => (
                            <ListRow
                                key={t.id}
                                title={t.subject}
                                subtitle={`${TICKET_CATEGORIES.find((c) => c.value === t.category)?.label || 'Other'}, ${new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                                trailing={<Status tone={TICKET_STATUS[t.status]?.tone} size="sm">{TICKET_STATUS[t.status]?.label}</Status>}
                                chevron={false}
                            />
                        ))
                    )}
                </Card>
            </div>
        </div>
    )
}

export default Help

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Card, EmptyState, Field, Input, ListRow, Select, Skeleton, Status, Textarea } from '../../components/ui'
import { SUPPORT, TICKET_CATEGORIES, TICKET_STATUS } from '../../constants/support'
import { listMyTickets, openTicket } from '../../services/support'
import '../../styles/business/support.css'

const ANSWERS = [
    { id: 'phone-booking', q: 'How do I add a booking from a phone call?', a: 'Tap New booking (the + button on your phone). Pick the service, the day and a free time, type the client’s name, and add it. Phone and email are optional. If they want a time outside your hours, choose “A time outside opening hours”.' },
    { id: 'confirm', q: 'How do I confirm, move or cancel a booking?', a: 'Open Today or Calendar and tap the booking. Confirm, Completed, No-show and Cancel are right there. Move lets you pick a new free time. Bookings waiting for you also have a Confirm button on the row itself.' },
    { id: 'share', q: 'How do clients find and book me?', a: 'Share your link from the share button at the top, or from Channels. Clients open it, choose a service and a time, and the booking lands on your Today screen.' },
    { id: 'hours', q: 'How do I change my hours or take a day off?', a: 'Open Hours to change your weekly opening times. Closed dates for holidays and sick days arrive with the next Hours update; until then, ask Loca support and we will block the day for you.' },
    { id: 'pause', q: 'Can I stop taking bookings for a while?', a: 'Yes. Open Business page and turn off taking bookings. Your page stays, but clients cannot book until you turn it back on.' },
    { id: 'price', q: 'What does Locappoint cost?', a: 'Your first twelve months are free. After that it is nineteen euros a month, flat, with no commission on your bookings.' },
]

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

    const whatsapp = SUPPORT.whatsapp
        ? `https://wa.me/${SUPPORT.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi Locappoint, this is ${business.business_name}. `)}`
        : null

    return (
        <div className="biz-page lc-help">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Help and support</h1>
                    <p className="biz-page__sub">Real people, {SUPPORT.hours}.</p>
                </div>
            </header>

            <div className="lc-help__contact">
                {whatsapp && (
                    <Card variant="raised" padding="md">
                        <MessageCircle size={22} className="lc-help__icon" aria-hidden="true" />
                        <div>
                            <h2 className="ui-heading">WhatsApp</h2>
                            <p className="lc-help__text">The fastest way to reach us.</p>
                        </div>
                        <Button href={whatsapp} target="_blank" rel="noopener noreferrer" variant="secondary">Message us</Button>
                    </Card>
                )}
                <Card variant="raised" padding="md">
                    <Mail size={22} className="lc-help__icon" aria-hidden="true" />
                    <div>
                        <h2 className="ui-heading">Email</h2>
                        <p className="lc-help__text">{SUPPORT.email}</p>
                    </div>
                    <Button href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent(`Help for ${business.business_name}`)}`} variant="secondary">Write to us</Button>
                </Card>
            </div>

            <section aria-labelledby="answers-title" className="lc-help__section">
                <h2 id="answers-title" className="ui-heading">Quick answers</h2>
                <div className="lc-faq">
                    {ANSWERS.map((item) => (
                        <details
                            key={item.id}
                            id={item.id}
                            className="lc-faq__item"
                            open={openId === item.id}
                            onToggle={(event) => { if (event.currentTarget.open) setOpenId(item.id) }}
                        >
                            <summary className="lc-faq__q">{item.q}</summary>
                            <p className="lc-faq__a">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <div className="lc-help__grid">
                <Card title="Open a ticket" padding="lg">
                    <form className="lc-help__form" onSubmit={submit} noValidate>
                        <Field label="About">
                            <Select value={form.category} onChange={update('category')}>
                                {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </Select>
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
                        <EmptyState title="No tickets yet" body="When you open one, it appears here with its status." />
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

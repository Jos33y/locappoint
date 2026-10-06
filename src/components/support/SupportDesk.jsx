import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft, ArrowRight, CalendarDays, CalendarX, CreditCard, KeyRound, MessageCircle, Plus, Receipt, RotateCw, Scissors, Send,
    ShieldAlert, Store, UserRound,
} from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Input, Sheet, Skeleton, Status, Textarea } from '../ui'
import { CATEGORIES, SUPPORT, TICKET_STATUS } from '../../constants/support'
import { closeTicket, deskStatus, listTickets, loadTicket, openTicket, replyTicket, supportError, ticketRef, whenSent } from '../../services/support'
import { TicketThread } from './TicketThread'
import '../../styles/support.css'

export const CATEGORY_ICON = {
    payment: CreditCard, safety: ShieldAlert, no_show: CalendarX, service: Scissors, client: UserRound,
    bookings: CalendarDays, business_page: Store, billing: Receipt, account: KeyRound, other: MessageCircle,
}

const NewQuestion = ({ side, businessId, preset = '', onSent, onClose }) => {
    const [form, setForm] = useState({ category: preset, subject: '', message: '' })
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    const send = async (event) => {
        event.preventDefault()
        const next = {}
        if (!form.category) next.category = 'Pick what it is about.'
        if (!form.subject.trim()) next.subject = 'Give it a short title.'
        if (form.message.trim().length < 10) next.message = 'Tell us a little more, so we can help first time.'
        setErrors(next)
        if (Object.keys(next).length) return
        setBusy(true)
        try {
            const result = await openTicket({ side, businessId, ...form })
            onSent(result)
        } catch (err) {
            setErrors({ form: supportError(err) })
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            open
            onClose={onClose}
            title="Write to Locappoint"
            footer={(
                <div className="lc-sup-sheet__actions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="lc-sup-new" icon={Send} loading={busy}>Send</Button>
                </div>
            )}
        >
            <form id="lc-sup-new" className="lc-sup-form" onSubmit={send} noValidate>
                <p className="lc-sup-form__about">About one booking? Use Report a problem on that booking, so we see it straight away.</p>
                <div className={`ui-field${errors.category ? ' has-error' : ''}`}>
                    <p className="ui-field__label lc-sup-form__label">What is it about?</p>
                    <ChipGroup label="What is it about?">
                        {CATEGORIES[side].question.map((o) => (
                            <Chip key={o.value} selected={form.category === o.value} onClick={() => setForm((f) => ({ ...f, category: o.value }))}>{o.label}</Chip>
                        ))}
                    </ChipGroup>
                    {errors.category && <span className="ui-field__error" role="alert">{errors.category}</span>}
                </div>
                <Field label="Title" error={errors.subject}>
                    <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} maxLength={140} placeholder={side === 'business' ? 'For example: clients cannot see Saturday' : 'For example: I cannot change my email'} />
                </Field>
                <Field label="What happened" error={errors.message}>
                    <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={4000} rows={5} />
                </Field>
                {errors.form && <p className="lc-sup-form__error" role="alert">{errors.form}</p>}
            </form>
        </Sheet>
    )
}

const Row = ({ t, active, onOpen }) => {
    const status = TICKET_STATUS[t.status] || TICKET_STATUS.open
    const Icon = CATEGORY_ICON[t.category] || MessageCircle
    const preview = t.preview?.body ? `${t.preview.from === 'support' ? 'Locappoint: ' : 'You: '}${t.preview.body}` : ''
    return (
        <li>
            <button type="button" className={`lc-sup-row${active ? ' is-active' : ''}${t.unread ? ' is-unread' : ''} is-${t.status}`} aria-current={active || undefined} onClick={() => onOpen(t.id)}>
                <span className="lc-sup-row__icon" aria-hidden="true"><Icon size={18} /></span>
                <span className="lc-sup-row__main">
                    <span className="lc-sup-row__top">
                        <span className="lc-sup-row__subject">{t.subject}</span>
                        <time dateTime={t.last_message_at}>{whenSent(t.last_message_at)}</time>
                    </span>
                    {preview && <span className="lc-sup-row__preview">{preview}</span>}
                    <span className="lc-sup-row__bottom">
                        <Status tone={status.tone} size="sm">{status.label}</Status>
                        <span className="lc-sup-row__ref">{ticketRef(t)}</span>
                        {t.from_us && <span className="lc-sup-row__note">Question from us</span>}
                        {t.unread && <span className="lc-sup-row__new">New reply</span>}
                    </span>
                </span>
            </button>
        </li>
    )
}

// "We are online" or "Back Monday at 09:00", and how fast we answer.
const Desk = ({ side, onWrite }) => {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(timer)
    }, [])
    const desk = useMemo(() => deskStatus(new Date(now)), [now])
    const bookingsTo = side === 'business' ? '/portal/bookings' : '/client/appointments'
    return (
        <section className={`lc-sup-desk${desk.open ? ' is-open' : ''}`} aria-labelledby="lc-sup-desk-title">
            <div className="lc-sup-desk__state">
                <span className="lc-sup-desk__dot" aria-hidden="true" />
                <div>
                    <h2 id="lc-sup-desk-title" className="lc-sup-desk__title">{desk.open ? 'We are online' : 'We are away'}</h2>
                    <p>{desk.open ? 'A person replies within one working day. Payment and safety come first.' : `${desk.text}. Write now and it is first in line.`}</p>
                    <p className="lc-sup-desk__hours">{SUPPORT.hours}. <Link to="/legal/policies">Booking policies</Link></p>
                </div>
            </div>
            <ul className="lc-sup-starts">
                <li>
                    <Link to={bookingsTo} className="lc-sup-start">
                        <span className="lc-sup-start__icon" aria-hidden="true"><CalendarDays size={18} /></span>
                        <span className="lc-sup-start__text">
                            <b>A problem with a booking</b>
                            <span>Open the booking and tap Report a problem.</span>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" className="lc-sup-start__go" />
                    </Link>
                </li>
                <li>
                    <button type="button" className="lc-sup-start" onClick={() => onWrite('payment')}>
                        <span className="lc-sup-start__icon" aria-hidden="true"><CreditCard size={18} /></span>
                        <span className="lc-sup-start__text">
                            <b>{side === 'business' ? 'Payments and payouts' : 'Payment or refund'}</b>
                            <span>{side === 'business' ? 'Money that did not arrive, fees, refunds.' : 'A charge you do not recognise, a refund.'}</span>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" className="lc-sup-start__go" />
                    </button>
                </li>
                <li>
                    <button type="button" className="lc-sup-start" onClick={() => onWrite('')}>
                        <span className="lc-sup-start__icon" aria-hidden="true"><MessageCircle size={18} /></span>
                        <span className="lc-sup-start__text">
                            <b>Something else</b>
                            <span>{side === 'business' ? 'Your page, your account, an idea.' : 'Your account, a question, an idea.'}</span>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" className="lc-sup-start__go" />
                    </button>
                </li>
            </ul>
        </section>
    )
}

const EmptyInbox = () => (
    <div className="lc-sup-empty">
        <svg className="lc-sup-empty__art" width="132" height="92" viewBox="0 0 132 92" aria-hidden="true">
            <rect className="lc-sup-empty__card" x="10" y="14" width="88" height="56" rx="10" />
            <rect className="lc-sup-empty__line is-strong" x="22" y="28" width="44" height="6" rx="3" />
            <rect className="lc-sup-empty__line" x="22" y="42" width="60" height="4" rx="2" />
            <rect className="lc-sup-empty__line" x="22" y="52" width="38" height="4" rx="2" />
            <rect className="lc-sup-empty__card is-reply" x="44" y="36" width="78" height="44" rx="10" />
            <rect className="lc-sup-empty__line is-azure" x="56" y="50" width="40" height="5" rx="2.5" />
            <rect className="lc-sup-empty__line" x="56" y="62" width="52" height="4" rx="2" />
            <circle className="lc-sup-empty__dot" cx="114" cy="22" r="6" />
        </svg>
        <p className="lc-sup-empty__title">No tickets yet</p>
        <p>When you write to us, the conversation lives here. Every reply also reaches you by email and in the bell.</p>
    </div>
)

// The Support inbox, the same for clients and businesses: how to reach us, every ticket with its last
// message, and the conversation beside it (on a phone, one then the other). ?t=<id> opens one.
export const SupportDesk = ({ side, businessId = null, intro }) => {
    const [params, setParams] = useSearchParams()
    const openId = params.get('t')
    const [list, setList] = useState({ status: 'loading', rows: [], unread: 0 })
    const [ticket, setTicket] = useState({ status: 'idle', data: null })
    const [asking, setAsking] = useState(null)

    const loadList = useCallback(async () => {
        try {
            const data = await listTickets({ side, businessId })
            setList({ status: 'ready', rows: data?.rows || [], unread: Number(data?.unread) || 0 })
        } catch (err) {
            console.error('Tickets failed:', err)
            setList((l) => ({ ...l, status: 'error' }))
        }
    }, [side, businessId])

    useEffect(() => { loadList() }, [loadList])

    // On a wide screen the newest conversation opens by itself, so the page is never half empty.
    useEffect(() => {
        if (openId || list.status !== 'ready' || list.rows.length === 0) return
        if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches) {
            setParams((prev) => { const next = new URLSearchParams(prev); next.set('t', list.rows[0].id); return next }, { replace: true })
        }
    }, [openId, list.status, list.rows, setParams])

    useEffect(() => {
        if (!openId) { setTicket({ status: 'idle', data: null }); return undefined }
        let cancelled = false
        setTicket((t) => ({ status: 'loading', data: t.data?.id === openId ? t.data : null }))
        loadTicket(openId)
            .then((data) => {
                if (cancelled) return
                setTicket({ status: 'ready', data })
                setList((l) => ({ ...l, rows: l.rows.map((r) => (r.id === openId ? { ...r, unread: false } : r)), unread: Math.max(0, l.unread - (l.rows.find((r) => r.id === openId)?.unread ? 1 : 0)) }))
            })
            .catch((err) => {
                console.error('Ticket failed:', err)
                if (!cancelled) setTicket({ status: 'error', data: null })
            })
        return () => { cancelled = true }
    }, [openId])

    const open = (id) => setParams((prev) => { const next = new URLSearchParams(prev); next.set('t', id); return next })
    const back = () => setParams((prev) => { const next = new URLSearchParams(prev); next.delete('t'); return next })

    const updated = (data) => {
        setTicket({ status: 'ready', data })
        loadList()
    }

    const rows = list.rows
    const empty = list.status === 'ready' && rows.length === 0

    return (
        <div className="lc-sup-wrap">
            <Desk side={side} onWrite={(category) => setAsking({ category })} />

            <div className={`lc-sup${openId ? ' has-open' : ''}${empty ? ' is-empty' : ''}`}>
                <section className="lc-sup__list" aria-labelledby="lc-sup-list-title">
                    <header className="lc-sup__listhead">
                        <div>
                            <h2 id="lc-sup-list-title" className="lc-sup__listtitle">
                                Your tickets
                                {list.unread > 0 && <span className="lc-sup__count">{list.unread} new</span>}
                            </h2>
                            {intro && <p className="lc-sup__intro">{intro}</p>}
                        </div>
                        <Button size="sm" icon={Plus} onClick={() => setAsking({ category: '' })}>New ticket</Button>
                    </header>
                    {list.status === 'loading' && (
                        <div className="lc-sup__loading" aria-hidden="true"><Skeleton height={76} /><Skeleton height={76} /></div>
                    )}
                    {list.status === 'error' && (
                        <div className="lc-sup-empty" role="alert">
                            <p>We could not load your tickets.</p>
                            <Button size="sm" variant="secondary" icon={RotateCw} onClick={loadList}>Try again</Button>
                        </div>
                    )}
                    {empty && <EmptyInbox />}
                    {rows.length > 0 && (
                        <ul className="lc-sup__rows">
                            {rows.map((t) => <Row key={t.id} t={t} active={t.id === openId} onOpen={open} />)}
                        </ul>
                    )}
                </section>

                {!empty && (
                    <section className="lc-sup__pane" aria-live="polite">
                        {openId && (
                            <button type="button" className="lc-sup__back" onClick={back}>
                                <ArrowLeft size={16} aria-hidden="true" />
                                <span>All tickets</span>
                            </button>
                        )}
                        {(list.status === 'loading' || (openId && ticket.status === 'loading' && !ticket.data)) && (
                            <div className="lc-sup__loading" aria-hidden="true"><Skeleton height={28} width={220} /><Skeleton height={120} /><Skeleton height={90} /></div>
                        )}
                        {openId && ticket.status === 'error' && <p className="lc-sup__pick" role="alert">This ticket could not be opened.</p>}
                        {openId && ticket.data && (
                            <TicketThread
                                key={ticket.data.id}
                                ticket={ticket.data}
                                onReply={async (body) => updated(await replyTicket(ticket.data.id, body))}
                                onClose={async () => updated(await closeTicket(ticket.data.id))}
                            />
                        )}
                    </section>
                )}
            </div>

            {asking && (
                <NewQuestion
                    side={side}
                    businessId={businessId}
                    preset={asking.category}
                    onClose={() => setAsking(null)}
                    onSent={(result) => { setAsking(null); loadList(); open(result.id) }}
                />
            )}
        </div>
    )
}


import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, RotateCcw } from 'lucide-react'
import PinMark from '../../components/common/PinMark'
import { Button } from '../../components/ui'
import { BookingTicket } from '../../components/booking/sheet/BookingTicket'
import { AddToCalendar } from '../../components/booking/AddToCalendar'
import { abandonPayment, payMoney, paymentState, providerName } from '../../services/payments'
import { toMinutes } from '../../services/dates'
import '../../styles/client/pay.css'

// Where Stripe and Paystack send a client back. It never takes the provider's redirect as proof:
// it asks the database, which only the verified payment event can mark paid. Paid, it is a
// confirmation worth keeping: what was paid, to whom, the ticket, and the next thing to do.

const POLL_MS = 2500
const POLL_FOR_MS = 120_000

const readRef = () => {
    const q = new URLSearchParams(window.location.search)
    return {
        ref: q.get('ref') || q.get('reference') || q.get('trxref') || '',
        cancelled: q.has('cancelled'),
        app: q.has('app'),
    }
}

const PayReturn = () => {
    const { ref, cancelled, app } = useMemo(readRef, [])
    const [state, setState] = useState(null)
    const [phase, setPhase] = useState(ref ? 'checking' : 'missing')

    useEffect(() => {
        if (!ref) return undefined
        let stopped = false
        const started = Date.now()
        let timer = null

        const look = async () => {
            try {
                const s = await paymentState(ref)
                if (stopped) return
                if (!s) { setPhase('missing'); return }
                setState(s)
                if (cancelled && s.state === 'waiting') {
                    await abandonPayment(ref).catch(() => {})
                    if (!stopped) setPhase('cancelled')
                    return
                }
                if (s.state === 'waiting' && Date.now() - started < POLL_FOR_MS) {
                    setPhase('checking')
                    timer = setTimeout(look, POLL_MS)
                    return
                }
                setPhase(s.state === 'waiting' ? 'slow' : s.state)
            } catch (err) {
                console.error('Payment check failed:', err)
                if (!stopped) setPhase('error')
            }
        }
        look()
        return () => { stopped = true; clearTimeout(timer) }
    }, [ref, cancelled])

    const back = state?.slug ? `/${state.slug}` : '/'
    const business = state?.business_name || 'the business'
    const provider = providerName(state?.provider)
    const paid = phase === 'paid'
    const amount = state ? payMoney(state.amount, state.currency, true) : ''

    let tone = 'waiting'
    let icon = <Clock size={26} />
    let title = 'Confirming your payment'
    let text = <>Checking with {provider}. This takes a few seconds.</>
    let actions = null

    if (paid) {
        tone = 'paid'
        icon = <Check size={30} strokeWidth={2.5} />
        const pending = state.status === 'pending'
        title = pending ? 'Request sent' : 'You are booked'
        text = (
            <>
                <b>{amount}</b> paid to {business}.
                {pending && ' They confirm each booking themselves; if they cannot take it, you get it all back.'}
                {state.email && <> Details are on their way to <b>{state.email}</b>.</>}
            </>
        )
        actions = app ? null : (
            <>
                {state.manage_token && <Button to={`/b/${state.manage_token}`}>Manage booking</Button>}
                <Button variant="secondary" to={back}>Back to {business}</Button>
            </>
        )
    } else if (phase === 'cancelled' || phase === 'released') {
        tone = 'off'
        icon = <RotateCcw size={24} />
        title = phase === 'cancelled' ? 'Payment cancelled' : 'Payment not completed'
        text = <>Nothing was charged, and the time is free again.</>
        actions = app ? null : <Button to={back}>Pick a time again</Button>
    } else if (phase === 'refunding') {
        tone = 'off'
        icon = <RotateCcw size={24} />
        title = 'Refund on its way'
        text = <>Your payment arrived after the time was let go, so it is being refunded in full, to the card or account you paid with.</>
        actions = app ? null : <Button to={back}>Pick a time again</Button>
    } else if (phase === 'slow') {
        title = 'Still confirming'
        text = <>{provider} has not confirmed the payment yet. If it went through, we email you the moment it does. Nothing is charged twice.</>
        actions = app ? null : <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
    } else if (phase === 'missing' || phase === 'error') {
        tone = 'off'
        icon = <RotateCcw size={24} />
        title = 'We could not find this payment'
        text = <>If you paid, the confirmation email is on its way. Nothing is charged twice.</>
        actions = app ? null : <Button variant="secondary" to="/">Go to Locappoint</Button>
    }

    const showTicket = paid && state?.date && state?.time
    const dateKey = showTicket ? String(state.date).slice(0, 10) : null
    const minutes = showTicket ? toMinutes(state.time) : 0
    const quote = showTicket ? { online: true, price: state.price, client_fee: state.client_fee, total: state.amount, currency: state.currency } : null
    const event = showTicket && state.status !== 'pending' ? {
        title: `${state.service_name || 'Booking'} at ${business}`,
        dateKey,
        minutes,
        duration: Number(state.duration_minutes) || 30,
        timeZone: state.timezone || 'Europe/Lisbon',
        location: [state.address, state.city].filter(Boolean).join(', '),
        details: state.manage_token ? `Change or cancel: ${window.location.origin}/b/${state.manage_token}` : '',
    } : null

    return (
        <main className={`lc-paid is-${tone}`}>
            <header className="lc-paid__top">
                <Link to="/" className="lc-paid__brand" aria-label="Locappoint home">
                    <PinMark className="lc-paid__mark" />
                    <span>Loc<b>Appoint</b></span>
                </Link>
            </header>

            <section className="lc-paid__column" aria-live="polite">
                <div className="lc-paid__hero">
                    <span className={`lc-paid__badge is-${tone}`} aria-hidden="true">{icon}</span>
                    <h1 className="lc-paid__title">{title}</h1>
                    <p className="lc-paid__text">{text}</p>
                </div>

                {showTicket && (
                    <div className="lc-paid__ticket">
                        <BookingTicket
                            business={{ business_name: business, address: state.address, city: state.city }}
                            service={{ service_name: state.service_name || 'Booking', duration_minutes: state.duration_minutes, price: state.price }}
                            dateKey={dateKey}
                            minutes={minutes}
                            stamp="Paid"
                            stampTone="success"
                            quote={quote}
                            paid
                        />
                    </div>
                )}

                {event && !app && <AddToCalendar booking={event} />}

                {app && phase !== 'checking' && <p className="lc-paid__app">Close this window to go back to the Locappoint app.</p>}
                {actions && <div className={`lc-paid__actions${paid ? ' is-pair' : ''}`}>{actions}</div>}
            </section>
        </main>
    )
}

export default PayReturn

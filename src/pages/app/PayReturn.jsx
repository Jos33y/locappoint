import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, RotateCcw } from 'lucide-react'
import PinMark from '../../components/common/PinMark'
import { Button } from '../../components/ui'
import { BookingTicket } from '../../components/booking/sheet/BookingTicket'
import { abandonPayment, paymentState, providerName } from '../../services/payments'
import { toMinutes } from '../../services/dates'
import '../../styles/client/pay.css'

// Where Stripe and Paystack send a client back. It never takes the provider's redirect as proof:
// it asks the database, which only the verified payment event can mark paid.

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

    let badge = 'is-waiting'
    let icon = <Clock size={24} />
    let title = 'Confirming your payment'
    let text = <>Checking with {provider}. This usually takes a few seconds.</>
    let actions = null

    if (phase === 'paid') {
        badge = 'is-paid'
        icon = <Check size={24} />
        const pending = state.status === 'pending'
        title = pending ? 'Paid. Request sent.' : 'Paid. You are booked.'
        text = pending
            ? <>{business} confirms each booking themselves. If they cannot take it, you get it all back.{state.email && <> We sent the details to <b>{state.email}</b>.</>}</>
            : <>{business} has you down.{state.email && <> We sent the details to <b>{state.email}</b>, with a link to change or cancel it.</>}</>
        actions = app ? null : (
            <>
                {state.manage_token && <Button to={`/b/${state.manage_token}`}>Manage booking</Button>}
                <Button variant="secondary" to={back}>Back to {business}</Button>
            </>
        )
    } else if (phase === 'cancelled' || phase === 'released') {
        badge = 'is-off'
        icon = <RotateCcw size={22} />
        title = phase === 'cancelled' ? 'Payment cancelled' : 'Payment not completed'
        text = <>Nothing was charged, and the time is free again.</>
        actions = app ? null : <Button to={back}>Pick a time again</Button>
    } else if (phase === 'refunding') {
        badge = 'is-off'
        icon = <RotateCcw size={22} />
        title = 'Refund on its way'
        text = <>Your payment arrived after the time was let go, so it is being refunded in full, to the card or account you paid with.</>
        actions = app ? null : <Button to={back}>Pick a time again</Button>
    } else if (phase === 'slow') {
        title = 'Still confirming'
        text = <>{provider} has not confirmed the payment yet. If it went through, we email you the moment it does. Nothing is charged twice.</>
        actions = app ? null : <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
    } else if (phase === 'missing' || phase === 'error') {
        badge = 'is-off'
        icon = <RotateCcw size={22} />
        title = 'We could not find this payment'
        text = <>If you paid, the confirmation email is on its way. Nothing is charged twice.</>
        actions = app ? null : <Button variant="secondary" to="/">Go to Locappoint</Button>
    }

    const showTicket = phase === 'paid' && state?.date && state?.time
    const quote = showTicket ? { online: true, price: state.price, client_fee: state.client_fee, total: state.amount, currency: state.currency } : null

    return (
        <main className="lc-paid">
            <div className="lc-paid__column">
                <PinMark className="lc-paid__mark" />
                <span className={`lc-paid__badge ${badge}`} aria-hidden="true">{icon}</span>
                <h1 className="lc-paid__title">{title}</h1>
                <p className="lc-paid__text" role="status">{text}</p>
                {showTicket && (
                    <BookingTicket
                        business={{ business_name: business, address: state.address, city: state.city }}
                        service={{ service_name: state.service_name || 'Booking', duration_minutes: state.duration_minutes, price: state.price }}
                        dateKey={String(state.date).slice(0, 10)}
                        minutes={toMinutes(state.time)}
                        stamp="Paid"
                        stampTone="success"
                        quote={quote}
                        paid
                    />
                )}
                {app && phase !== 'checking' && <p className="lc-paid__text">Close this window to go back to the Locappoint app.</p>}
                {actions && <div className="lc-paid__actions">{actions}</div>}
            </div>
        </main>
    )
}

export default PayReturn

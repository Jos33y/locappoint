import { Link } from 'react-router-dom'
import { CalendarClock, CircleCheck, ReceiptText, Undo2 } from 'lucide-react'
import { cancelRefund, cutoffLabel, paidOnline, payMoney, refundOf, shareLabel } from '../../../services/payments'
import { zonedNow } from '../../../services/business'
import '../../../styles/client/refund.css'

// How a booking paid online stands, in the client's words: the rule while it is ahead, what comes
// back when it is cancelled, and a split of the money so "half" is never left to arithmetic.

const nowFor = (booking) => {
    const { dateKey, minutes } = zonedNow(booking.businesses?.timezone || 'Europe/Lisbon')
    return { nowKey: dateKey, nowMinutes: minutes }
}

// Under the ticket of an upcoming paid booking.
export const PaidRule = ({ booking }) => {
    if (!paidOnline(booking)) return null
    const business = booking.businesses?.business_name || 'The business'
    const total = payMoney(booking.total, booking.currency, true)
    if (booking.status === 'pending') {
        return (
            <p className="lc-bk-policy">
                <CircleCheck size={16} aria-hidden="true" />
                <span><b>{total} paid.</b> If {business} cannot take it, all of it comes back to you.</span>
            </p>
        )
    }
    const preview = cancelRefund(booking, nowFor(booking))
    if (!preview) return null
    return (
        <p className="lc-bk-policy">
            <CalendarClock size={16} aria-hidden="true" />
            {preview.free ? (
                <span>Free cancellation until <b>{cutoffLabel(preview.cutoff)}</b>. After that, {business} keeps {shareLabel(preview.keepPct)}.</span>
            ) : (
                <span>It starts within {preview.hours} hours: cancelling now gives back <b>{payMoney(preview.amount, preview.currency, true)}</b>, and {business} keeps {shareLabel(preview.keepPct)}.</span>
            )}
        </p>
    )
}

// The money as one bar: what goes back, what the business keeps, and the service fee.
export const RefundSplit = ({ booking, amount, pending = false, sent = false }) => {
    const currency = booking.currency || 'EUR'
    const total = Number(booking.total) || 0
    const price = Number(booking.price ?? booking.services?.price) || 0
    const back = Math.min(Number(amount) || 0, total)
    const businessKeeps = Math.max(Math.min(price, total) - back, 0)
    const feeKept = Math.max(total - back - businessKeeps, 0)
    const business = booking.businesses?.business_name || 'The business'
    const rows = [
        { key: 'back', label: pending ? 'Comes back to you' : sent ? 'Refunded to you' : 'Coming back to you', value: back },
        { key: 'kept', label: `Kept by ${business}`, value: businessKeeps },
        { key: 'fee', label: 'Service fee', value: feeKept },
    ].filter((r) => r.key === 'back' || r.value > 0)
    const note = pending
        ? 'It goes back to the card or account you paid with. Banks can take 5 to 10 working days to show it.'
        : sent
            ? 'Sent to the card or account you paid with. Banks can take 5 to 10 working days to show it.'
            : 'On its way to the card or account you paid with. Banks can take 5 to 10 working days to show it.'
    return (
        <div className="lc-refund">
            <div className="lc-refund__bar" aria-hidden="true">
                {rows.map((r) => r.value > 0 && <span key={r.key} className={`lc-refund__seg is-${r.key}`} style={{ flexGrow: r.value }} />)}
            </div>
            <dl className="lc-refund__rows">
                {rows.map((r) => (
                    <div key={r.key} className={`is-${r.key}`}>
                        <dt><i aria-hidden="true" />{r.label}</dt>
                        <dd>{payMoney(r.value, currency, true)}</dd>
                    </div>
                ))}
            </dl>
            <p className="lc-refund__note">{note}</p>
        </div>
    )
}

// What cancelling would give back, for the cancel sheet.
export const CancelMoney = ({ booking }) => {
    if (!paidOnline(booking)) return null
    const preview = cancelRefund(booking, nowFor(booking))
    const total = payMoney(booking.total, booking.currency, true)
    const business = booking.businesses?.business_name || 'the business'
    if (!preview) {
        return <p className="lc-refund__lead">You paid <b>{total}</b> online. Anything that comes back goes to the card or account you paid with.</p>
    }
    return (
        <>
            <p className="lc-refund__lead">
                {preview.free
                    ? <>You paid <b>{total}</b>. Cancelled now, before {cutoffLabel(preview.cutoff)}, all of it comes back.</>
                    : <>You paid <b>{total}</b>. It starts within {preview.hours} hours, so {business} keeps {shareLabel(preview.keepPct)}.</>}
            </p>
            <RefundSplit booking={booking} amount={preview.amount} pending />
        </>
    )
}

// The refund on a cancelled or missed booking, for the manage page.
export const RefundCard = ({ booking }) => {
    const refund = refundOf(booking)
    if (!refund) return null
    return (
        <section className="lc-refund-card" aria-label="Your refund">
            <p className="lc-refund-card__head">
                <span className={`lc-refund-card__icon${refund.sent ? ' is-sent' : ''}`} aria-hidden="true"><Undo2 size={18} /></span>
                <span>
                    <b>{refund.sent ? 'Refunded' : 'Refund on its way'}</b>
                    <small>{refund.full ? `All ${payMoney(refund.total, booking.currency, true)} you paid` : `${payMoney(refund.amount, booking.currency, true)} of the ${payMoney(refund.total, booking.currency, true)} you paid`}</small>
                </span>
            </p>
            <RefundSplit booking={booking} amount={refund.amount} sent={refund.sent} />
        </section>
    )
}

// The booking's receipts, as small links: "Receipt FEM-00012", "Refund receipt FEM-00013".
export const ReceiptLinks = ({ booking }) => {
    const list = Array.isArray(booking?.receipts) ? booking.receipts.filter((r) => r?.token) : []
    if (!list.length) return null
    return (
        <span className="lc-rcptlinks">
            {list.map((r) => (
                <Link key={r.token} to={`/r/${r.token}`} className="lc-rcptlinks__a">
                    <ReceiptText size={13} aria-hidden="true" />
                    {r.kind === 'refund' ? 'Refund receipt' : 'Receipt'} {r.number}
                </Link>
            ))}
        </span>
    )
}

// The lines in the list of past and cancelled bookings: how it was paid, any refund, the receipts.
export const PaidLine = ({ booking }) => {
    if (!paidOnline(booking)) return <ReceiptLinks booking={booking} />
    const refund = refundOf(booking)
    const total = payMoney(booking.total, booking.currency, true)
    if (!refund) {
        return (
            <>
                <span className="lc-paidline"><CircleCheck size={13} aria-hidden="true" />Paid {total} online</span>
                <ReceiptLinks booking={booking} />
            </>
        )
    }
    const amount = payMoney(refund.amount, booking.currency, true)
    return (
        <>
            <span className={`lc-paidline is-refund${refund.sent ? ' is-sent' : ''}`}>
                <Undo2 size={13} aria-hidden="true" />
                {refund.sent ? `${amount} refunded` : `${amount} refund on its way`}
                {!refund.full && <span className="lc-paidline__kept">{payMoney(refund.kept, booking.currency, true)} kept</span>}
            </span>
            <ReceiptLinks booking={booking} />
        </>
    )
}

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Lock, RotateCw } from 'lucide-react'
import { Button, Card, Segmented, Skeleton } from '../ui'
import { loadMoney } from '../../services/payouts'
import { payMoney } from '../../services/payments'
import '../../styles/business/payout-money.css'

// Money on the Payments page, once payouts are on: what is on its way to the bank and the day it
// lands, what this month brought in, then the bookings and payouts behind it. Every figure comes
// from Stripe or Paystack through the payouts function; this only lays it out.

const DAY = 86_400_000
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12) }
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
const longDay = (key) => fromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = (key) => { const d = fromKey(key); return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)}` }

// The strip only has room for whole amounts; the exact figure is in the list and the headline.
const wholeFormats = new Map()
const whole = (value, currency) => {
    if (!wholeFormats.has(currency)) {
        wholeFormats.set(currency, new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }))
    }
    return wholeFormats.get(currency).format(value)
}

const LandingStrip = ({ money }) => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const byDay = new Map(money.on_way.days.map((d) => [d.date, d]))
    const last = money.on_way.days.reduce((n, d) => Math.max(n, Math.round((fromKey(d.date) - today) / DAY)), 0)
    const length = Math.min(Math.max(7, last + 1), 14)
    const days = Array.from({ length }, (_, i) => new Date(today.getTime() + i * DAY))
    const said = money.on_way.days.map((d) => `${payMoney(d.amount, money.currency, true)} ${d.exact ? 'on' : 'about'} ${longDay(d.date)}`).join(', ')
    return (
        <ol className="biz-pay__days biz-money__strip" aria-label={`Landing in your bank: ${said}.`}>
            {days.map((d, i) => {
                const hit = byDay.get(keyOf(d))
                const kind = hit ? (hit.exact ? ' is-lands' : ' is-due') : ''
                return (
                    <li key={keyOf(d)} className={`biz-pay__day biz-money__day${kind}${i === 0 ? ' is-today' : ''}${isWeekend(d) ? ' is-weekend' : ''}`} aria-hidden="true">
                        <span className="biz-pay__dayname">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                        <span className="biz-pay__daynum">{hit ? <Landmark size={14} /> : d.getDate()}</span>
                        <span className="biz-money__amt">{hit ? whole(hit.amount, money.currency) : ''}</span>
                    </li>
                )
            })}
        </ol>
    )
}

const OnItsWay = ({ money, partner, paystack }) => {
    const next = money.on_way.days[0]
    const guessed = money.on_way.days.some((d) => !d.exact)
    return (
        <Card padding="lg" className="biz-pay__card biz-money__way" aria-labelledby="payout-soon-title">
            <h2 id="payout-soon-title" className="biz-pay__label">On its way to your bank</h2>
            <div className="biz-money__head">
                <p className="biz-money__total">{payMoney(money.on_way.total, money.currency, true)}</p>
                <p className="biz-money__next">
                    {next
                        ? <>Next <b>{payMoney(next.amount, money.currency, true)}</b> {next.exact ? 'on' : 'about'} <b>{shortDay(next.date)}</b></>
                        : 'Nothing on its way right now. Every payout so far is in your bank.'}
                </p>
            </div>
            {next && <LandingStrip money={money} />}
            {guessed && (
                <p className="biz-money__key">
                    <span><i className="is-lands" aria-hidden="true" />Sent to your bank</span>
                    <span><i className="is-due" aria-hidden="true" />Expected; {partner.name} sets the exact day when it sends it</span>
                </p>
            )}
            <p className="biz-pay__private">
                <Lock size={14} aria-hidden="true" />
                {paystack ? partner.privacy : `${partner.privacy} Every payout, with its bookings, is in your Stripe dashboard.`}
            </p>
        </Card>
    )
}

const ThisMonth = ({ money }) => {
    const month = new Date().toLocaleDateString('en-GB', { month: 'long' })
    const stats = [
        { label: 'Into your bank', value: payMoney(money.month.paid_out, money.currency, true) },
        { label: money.net_exact ? 'From bookings, after fees' : "From bookings, before Paystack's fee", value: payMoney(money.month.earned, money.currency, true) },
        { label: 'Paid bookings', value: String(money.month.bookings) },
        { label: 'Refunded to clients', value: payMoney(money.month.refunded, money.currency, true), quiet: !money.month.refunded },
    ]
    return (
        <Card padding="lg" className="biz-pay__card" aria-labelledby="money-month-title">
            <h2 id="money-month-title" className="biz-pay__label">{month} so far</h2>
            <dl className="biz-money__stats">
                {stats.map((s) => (
                    <div key={s.label} className={s.quiet ? 'is-quiet' : ''}>
                        <dt>{s.label}</dt>
                        <dd>{s.value}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    )
}

const PAYOUT_STATE = { paid: 'In your bank', on_way: 'On its way', failed: 'Did not arrive' }

const Lists = ({ money, last4 }) => {
    const [view, setView] = useState(money.payments.length ? 'bookings' : 'payouts')
    const options = [
        { value: 'bookings', label: `Paid bookings ${money.payments.length}` },
        { value: 'payouts', label: `Payouts ${money.payouts.length}` },
    ]
    return (
        <Card padding="lg" className="biz-pay__card" aria-label="Paid bookings and payouts">
            <Segmented options={options} value={view} onChange={setView} label="Show" />
            {view === 'bookings' && (money.payments.length === 0 ? <p className="biz-money__none">No paid bookings in the last 40 days.</p> : (
                <ul className="biz-money__list">
                    {money.payments.map((p) => (
                        <li key={p.id}>
                            <Link className="biz-money__row" to={p.appointment_id ? `/portal/calendar?booking=${p.appointment_id}` : '/portal/calendar'}>
                                <span className="biz-money__main">
                                    <b>{p.client}</b>
                                    <span>{p.service}{p.date ? ` · ${shortDay(p.date)}${p.time ? `, ${p.time}` : ''}` : ''}</span>
                                </span>
                                <span className="biz-money__fig">
                                    <b>{payMoney(p.paid, money.currency, true)}</b>
                                    {p.refunded > 0
                                        ? <span className="is-refund">{payMoney(p.refunded, money.currency, true)} refunded</span>
                                        : p.net !== null && <span>{money.net_exact ? 'You get' : 'Before fee'} {payMoney(p.net, money.currency, true)}</span>}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ))}
            {view === 'payouts' && (money.payouts.length === 0 ? <p className="biz-money__none">No payouts yet. The first one goes out once your first paid booking has settled.</p> : (
                <ul className="biz-money__list">
                    {money.payouts.map((p) => (
                        <li key={p.id} className="biz-money__row">
                            <span className="biz-money__main">
                                <b>{longDay(p.date)}</b>
                                <span>{last4 ? `To the account ending ${last4}` : 'To your bank'}</span>
                            </span>
                            <span className="biz-money__fig">
                                <b>{payMoney(p.amount, money.currency, true)}</b>
                                <span className={`biz-money__state is-${p.status}`}>{PAYOUT_STATE[p.status]}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            ))}
        </Card>
    )
}

// Before the first paid booking: the week ahead, empty, and what will appear in it.
const Empty = ({ partner, paystack }) => {
    const start = new Date()
    start.setHours(12, 0, 0, 0)
    const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY))
    return (
        <Card padding="lg" className="biz-pay__card biz-pay__soon" aria-labelledby="payout-soon-title">
            <h2 id="payout-soon-title" className="biz-pay__label">On its way to your bank</h2>
            <ol className="biz-pay__days is-ghost" aria-hidden="true">
                {days.map((d) => (
                    <li key={d.toISOString()} className={`biz-pay__day${isWeekend(d) ? ' is-weekend' : ''}`}>
                        <span className="biz-pay__dayname">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                        <span className="biz-pay__daynum">{d.getDate()}</span>
                        <span className="biz-pay__daytrack" />
                    </li>
                ))}
            </ol>
            <div className="biz-pay__empty">
                <p className="biz-pay__emptytitle">Nothing on its way yet</p>
                <p className="biz-pay__emptytext">
                    {paystack ? 'Your first paid booking appears here, with the day it lands.' : 'Your first card booking appears here, with the day it lands.'} {partner.note}
                </p>
            </div>
            <p className="biz-pay__private">
                <Lock size={14} aria-hidden="true" />
                {partner.privacy}
            </p>
        </Card>
    )
}

export const PayoutMoney = ({ partner, paystack, last4 }) => {
    const [state, setState] = useState({ status: 'loading', money: null, error: '' })

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', money: await loadMoney(), error: '' })
        } catch (err) {
            setState((prev) => ({ status: prev.money ? 'ready' : 'error', money: prev.money, error: err.message }))
        }
    }, [])

    useEffect(() => {
        load()
        // Coming back to the tab after checking the bank app: fresh figures.
        let last = Date.now()
        const onShow = () => {
            if (document.visibilityState !== 'visible' || Date.now() - last < 30_000) return
            last = Date.now()
            load()
        }
        document.addEventListener('visibilitychange', onShow)
        return () => document.removeEventListener('visibilitychange', onShow)
    }, [load])

    if (state.status === 'loading') {
        return (
            <>
                <Skeleton height={260} radius={16} />
                <Skeleton height={140} radius={16} />
            </>
        )
    }
    if (state.status === 'error') {
        return (
            <Card padding="lg" className="biz-pay__card">
                <h2 className="biz-pay__label">On its way to your bank</h2>
                <p className="biz-pay__alert" role="alert">{state.error}</p>
                <div className="biz-pay__act">
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            </Card>
        )
    }

    const money = state.money
    if (!money.on_way.total && !money.payouts.length && !money.payments.length) return <Empty partner={partner} paystack={paystack} />
    return (
        <>
            <OnItsWay money={money} partner={partner} paystack={paystack} />
            <ThisMonth money={money} />
            <Lists money={money} last4={last4} />
        </>
    )
}

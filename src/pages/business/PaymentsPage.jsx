import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Clock, CreditCard, IdCard, Landmark, Lock, RotateCw, ShieldCheck } from 'lucide-react'
import { Button, Card, Field, Picker, Skeleton, Status } from '../../components/ui'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { callPayouts, onAppReturn, openPayoutLink, payoutTarget } from '../../services/payouts'
import '../../styles/business/payouts.css'

// Payments: where an owner's money goes. One page, one job: show the route from the client to the
// owner's bank, say plainly what is missing, and offer the one action that fixes it.

const PARTNER = {
    stripe: {
        name: 'Stripe',
        logo: '/brand/partners/stripe.svg',
        client: 'By card when they book',
        days: 3,
        note: 'Paid out every working day, automatically. Your very first payout takes about a week.',
        privacy: 'Stripe keeps your ID and bank details. Locappoint only sees your bank name and the last four digits.',
    },
    paystack: {
        name: 'Paystack',
        client: 'By transfer or card',
        days: 1,
        note: 'Paid out every working day, automatically, in naira.',
        privacy: 'Paystack pays you. Locappoint keeps only your bank name and the last four digits.',
    },
}

// When the money lands, on the owner's own calendar: today's payment, the working days it waits,
// the day it reaches the bank. Weekends are shown as days the money does not move.
const DAY = 86_400_000
const atNoon = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x }
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
const addWorkingDays = (from, n) => {
    const d = atNoon(from)
    let left = n
    while (left > 0) {
        d.setDate(d.getDate() + 1)
        if (!isWeekend(d)) left -= 1
    }
    return d
}
const short = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const long = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

const PayoutWeek = ({ partner, today = new Date() }) => {
    const start = atNoon(today)
    const lands = addWorkingDays(start, partner.days)
    const gap = Math.round((lands - start) / DAY)
    const days = Array.from({ length: Math.max(7, gap + 1) }, (_, i) => new Date(start.getTime() + i * DAY))
    const kindOf = (i) => (i === 0 ? 'paid' : i === gap ? 'lands' : i < gap ? 'between' : 'after')
    return (
        <section className="biz-pay__week" aria-labelledby="payout-week-title">
            <h3 id="payout-week-title" className="biz-pay__label">When the money lands</h3>
            <div className="biz-pay__ends">
                <span className="biz-pay__end">
                    <span className="biz-pay__endlabel"><i className="biz-pay__pip is-paid" aria-hidden="true" />A client pays</span>
                    <span className="biz-pay__endday">{short(start)}</span>
                </span>
                <span className="biz-pay__gap">{partner.days === 1 ? 'Next working day' : `${partner.days} working days`}</span>
                <span className="biz-pay__end biz-pay__end--lands">
                    <span className="biz-pay__endlabel"><i className="biz-pay__pip is-lands" aria-hidden="true" />In your bank</span>
                    <span className="biz-pay__endday">{short(lands)}</span>
                </span>
            </div>
            <ol className="biz-pay__days" aria-label={`If a client pays on ${long(start)}, the money usually reaches your bank on ${long(lands)}.`}>
                {days.map((d, i) => (
                    <li key={d.toISOString()} className={`biz-pay__day is-${kindOf(i)}${isWeekend(d) ? ' is-weekend' : ''}`} aria-hidden="true">
                        <span className="biz-pay__dayname">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                        <span className="biz-pay__daynum">{i === gap ? <Landmark size={14} /> : d.getDate()}</span>
                        <span className="biz-pay__daytrack" />
                    </li>
                ))}
            </ol>
            <p className="biz-pay__weeknote">{partner.note}</p>
        </section>
    )
}

const stage = (p) => {
    if (p.status === 'active') return p.account_last4 ? 'ready' : 'checking'
    if (p.status === 'restricted') return 'paused'
    if (p.status === 'pending') return p.details_due?.length ? 'unfinished' : 'checking'
    return 'missing'
}

const COPY = {
    missing: { tone: 'neutral', badge: 'Not set up', bank: 'Not set yet' },
    unfinished: { tone: 'warning', badge: 'Unfinished', bank: 'Waiting for your details' },
    checking: { tone: 'info', badge: 'Being checked', bank: 'Being checked' },
    paused: { tone: 'danger', badge: 'Paused', bank: 'Paused' },
    ready: { tone: 'success', badge: 'Ready', bank: '' },
}

// The route the money takes. The last stop is the only one the owner controls, so it carries the state.
const MoneyRoute = ({ payout, partner }) => {
    const at = stage(payout)
    const bankSub = at === 'ready' ? 'Ready' : COPY[at].bank
    return (
        <ol className={`biz-pay__route is-${at}`} aria-label="How your money gets to you">
            <li className="biz-pay__stop is-on">
                <span className="biz-pay__dot" aria-hidden="true"><CreditCard size={18} /></span>
                <span className="biz-pay__stopname">Client pays</span>
                <span className="biz-pay__stopsub">{partner.client}</span>
            </li>
            <li className="biz-pay__stop is-on">
                <span className="biz-pay__dot" aria-hidden="true"><ShieldCheck size={18} /></span>
                <span className="biz-pay__stopname">{partner.logo ? <img className="biz-pay__logo" src={partner.logo} alt={partner.name} width="52" height="22" /> : partner.name}</span>
                <span className="biz-pay__stopsub">Keeps it safe</span>
            </li>
            <li className={`biz-pay__stop biz-pay__stop--bank is-${at}`}>
                <span className="biz-pay__dot" aria-hidden="true">{at === 'ready' ? <Check size={18} /> : <Landmark size={18} />}</span>
                <span className="biz-pay__stopname">Your bank</span>
                <span className="biz-pay__stopsub">{bankSub}</span>
            </li>
        </ol>
    )
}

// The account the money goes to, as loud as the title: the owner checks it is theirs.
const PaidTo = ({ payout }) => (
    <div className="biz-pay__paidto">
        <span className="biz-pay__paidicon" aria-hidden="true"><Landmark size={22} /></span>
        <span className="biz-pay__paidtext">
            <span className="biz-pay__paidlabel">Paid to</span>
            <span className="biz-pay__paidbank">{payout.bank_name || 'Your bank account'}</span>
            <span className="biz-pay__paidnum">Account ending <b>{payout.account_last4}</b></span>
        </span>
    </div>
)

// What Stripe is waiting for, in the owner's words. Stripe reports field paths
// (identity.individual.date_of_birth.day); owners need "Date of birth".
const NEEDS = [
    [/given_name|surname|first_name|last_name|\.name$/, 'Your name'],
    [/date_of_birth|\.dob/, 'Date of birth'],
    [/individual\.address|representative\.address|person.*address/, 'Home address'],
    [/address/, 'Business address'],
    [/phone/, 'Phone number'],
    [/email/, 'Email'],
    [/id_number|tax_id|nif/, 'Tax or ID number'],
    [/document|verification|selfie/, 'Photo of your ID'],
    [/external_account|bank_account|payout_method/, 'Bank account'],
    [/url|website|profile/, 'Business website'],
    [/terms_of_service|tos_acceptance|attestation/, "Accept Stripe's terms"],
]
export const needsFrom = (due = []) => {
    const out = []
    for (const field of due) {
        const hit = NEEDS.find(([pattern]) => pattern.test(field))
        const label = hit ? hit[1] : 'A few other details'
        if (!out.includes(label)) out.push(label)
    }
    return out
}

const Needs = ({ due }) => {
    const items = needsFrom(due)
    if (!items.length) return null
    return (
        <div className="biz-pay__needs">
            <h3 className="biz-pay__label">Stripe is waiting for</h3>
            <ul className="biz-pay__needlist">
                {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
        </div>
    )
}

const Ready = () => (
    <div className="biz-pay__prep">
        <h3 className="biz-pay__label">Have these ready</h3>
        <ul className="biz-pay__preplist">
            <li><span className="biz-pay__prepicon" aria-hidden="true"><IdCard size={18} /></span>Your ID card or passport</li>
            <li><span className="biz-pay__prepicon" aria-hidden="true"><Landmark size={18} /></span>Your IBAN</li>
            <li><span className="biz-pay__prepicon" aria-hidden="true"><Clock size={18} /></span>About 3 minutes</li>
        </ul>
    </div>
)

// Nigeria: bank and account number on our own screen; Paystack confirms the name before anything is saved.
const BankForm = ({ onSaved, onCancel }) => {
    const [banks, setBanks] = useState(null)
    const [bankError, setBankError] = useState('')
    const [bank, setBank] = useState('')
    const [number, setNumber] = useState('')
    const [name, setName] = useState('')
    const [checking, setChecking] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const asked = useRef('')

    const loadBanks = useCallback(() => {
        setBankError('')
        callPayouts('banks').then((r) => setBanks(r.banks || [])).catch((err) => setBankError(err.message))
    }, [])
    useEffect(() => { loadBanks() }, [loadBanks])

    useEffect(() => {
        setName('')
        setError('')
        if (!bank || number.length !== 10) return
        const key = `${bank}:${number}`
        asked.current = key
        setChecking(true)
        callPayouts('resolve', { bank_code: bank, account_number: number })
            .then((r) => { if (asked.current === key) setName(r.account_name) })
            .catch((err) => { if (asked.current === key) setError(err.message) })
            .finally(() => { if (asked.current === key) setChecking(false) })
    }, [bank, number])

    const save = async () => {
        setSaving(true)
        setError('')
        try {
            onSaved(await callPayouts('connect', { bank_code: bank, account_number: number }))
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="biz-pay__form">
            <div className="biz-pay__fields">
                {bankError ? (
                    <div className="biz-pay__alert" role="alert">
                        <span>{bankError}</span>
                        <Button variant="quiet" size="sm" icon={RotateCw} onClick={loadBanks}>Try again</Button>
                    </div>
                ) : (
                    <Field label="Bank">
                        {banks
                            ? <Picker value={bank} onChange={setBank} searchable title="Your bank" placeholder="Choose your bank" searchPlaceholder="Search banks" options={banks.map((b) => ({ value: b.code, label: b.name }))} />
                            : <Skeleton height={44} radius={10} />}
                    </Field>
                )}
                <Field label="Account number" hint="The 10-digit number on your bank app">
                    <input
                        className="ui-input biz-pay__nuban"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        value={number}
                        onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                </Field>
            </div>
            <div className="biz-pay__confirm" aria-live="polite">
                {checking && <span className="biz-pay__checking">Checking the account with your bank</span>}
                {name && (
                    <span className="biz-pay__name">
                        <Check size={18} aria-hidden="true" />
                        <span><span className="biz-pay__namelabel">Account name</span><b>{name}</b></span>
                    </span>
                )}
            </div>
            {error && <p className="biz-pay__alert" role="alert">{error}</p>}
            <div className="biz-pay__act">
                <Button onClick={save} disabled={!name || checking} loading={saving}>{name ? 'Yes, pay me here' : 'Pay me here'}</Button>
                {onCancel && <Button variant="quiet" onClick={onCancel}>Cancel</Button>}
            </div>
        </div>
    )
}

const LoadingState = () => (
    <div className="biz-pay__column" aria-busy="true">
        <Skeleton height={340} radius={16} />
        <Skeleton height={120} radius={16} />
    </div>
)

const clearFlag = () => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('payouts')) return
    url.searchParams.delete('payouts')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

const PaymentsPage = () => {
    const { notify } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', payout: null, error: '' })
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState(false)
    const [notice, setNotice] = useState('')
    const flag = useRef(new URLSearchParams(window.location.search).get('payouts'))
    const checks = useRef(0)

    const load = useCallback(async () => {
        try {
            const payout = await callPayouts('status')
            setState({ status: 'ready', payout, error: '' })
            return payout
        } catch (err) {
            setState((prev) => ({ status: prev.payout ? 'ready' : 'error', payout: prev.payout, error: err.message }))
            return null
        }
    }, [])

    const go = useCallback(async (action) => {
        setBusy(true)
        setNotice('')
        try {
            const { url } = await callPayouts(action, { target: payoutTarget() })
            await openPayoutLink(url)
        } catch (err) {
            setNotice(err.message)
        } finally {
            setBusy(false)
        }
    }, [])

    useEffect(() => {
        load().then((payout) => {
            const came = flag.current
            flag.current = null
            clearFlag()
            if (!payout || payout.provider !== 'stripe') return
            if (came === 'return' && payout.status === 'active') notify?.('Payouts are on')
            // An expired Stripe link: make a fresh one and carry on, as Stripe asks platforms to.
            if (came === 'expired' && payout.status !== 'active') go('start')
        })
        let off = () => {}
        onAppReturn(() => load()).then((stop) => { off = stop })
        // On the web, owners often finish Stripe in another tab: look again when they come back.
        let last = Date.now()
        const onShow = () => {
            if (document.visibilityState !== 'visible' || Date.now() - last < 3000) return
            last = Date.now()
            load()
        }
        document.addEventListener('visibilitychange', onShow)
        return () => { off(); document.removeEventListener('visibilitychange', onShow) }
    }, [load, go, notify])

    // While Stripe reviews, look again a few times so the page turns ready on its own.
    const p = state.payout
    const at = p ? stage(p) : null
    useEffect(() => {
        if (at !== 'checking' || checks.current >= 4) return undefined
        const timer = setTimeout(() => { checks.current += 1; load() }, 6000 * (checks.current + 1))
        return () => clearTimeout(timer)
    }, [at, load, p])

    const head = (
        <header className="biz-page__head biz-pay__head">
            <div>
                <h1 className="biz-page__title">Payments</h1>
                <p className="biz-page__sub">Where your money goes when clients pay on Locappoint.</p>
            </div>
            {p?.test && <Status tone="warning" size="sm">Test mode</Status>}
        </header>
    )

    if (state.status === 'loading') return <div className="biz-page biz-pay">{head}<LoadingState /></div>

    if (state.status === 'error') {
        return (
            <div className="biz-page biz-pay">
                {head}
                <div className="biz-pay__column">
                    <Card padding="lg" className="biz-pay__card">
                        <h2 className="biz-pay__title">Payments could not load</h2>
                        <p className="biz-pay__lede">{state.error}</p>
                        <div className="biz-pay__act">
                            <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    const partner = PARTNER[p.provider] || PARTNER.stripe
    const paystack = p.provider === 'paystack'
    const look = COPY[at]
    const formOpen = paystack && (at !== 'ready' || editing)

    let title
    let lede
    let action = null
    if (paystack) {
        title = formOpen ? (at === 'ready' ? 'Change where we pay you' : 'Where should we pay you?') : 'Payouts are on'
        lede = formOpen
            ? 'Pick your bank and type your account number. Your bank confirms the name before anything is saved.'
            : 'Every payment from Locappoint goes to this account. If it is not yours, change it now.'
        action = formOpen ? (
            <BankForm
                onCancel={at === 'ready' ? () => setEditing(false) : null}
                onSaved={(next) => { setState({ status: 'ready', payout: next, error: '' }); setEditing(false); notify?.('Payouts are on') }}
            />
        ) : (
            <div className="biz-pay__act">
                <Button variant="secondary" icon={Landmark} onClick={() => setEditing(true)}>Change bank</Button>
            </div>
        )
    } else if (at === 'missing') {
        title = 'Get paid for bookings online'
        lede = 'Set this up once and clients can pay when they book. The money goes to your bank, not to us.'
        action = (
            <>
                <Ready />
                <div className="biz-pay__act">
                    <Button loading={busy} iconRight={ArrowUpRight} onClick={() => go('start')}>Continue to Stripe</Button>
                    <span className="biz-pay__actnote">Payments run on <img className="biz-pay__logo biz-pay__logo--inline" src={partner.logo} alt="Stripe" width="52" height="22" />. You come straight back here.</span>
                </div>
            </>
        )
    } else if (at === 'unfinished') {
        title = 'Finish setting up with Stripe'
        lede = 'Stripe still needs a few details before it can pay you. It picks up where you left off.'
        action = (
            <>
            <Needs due={p.details_due} />
            <div className="biz-pay__act">
                <Button loading={busy} iconRight={ArrowUpRight} onClick={() => go('start')}>Continue to Stripe</Button>
            </div>
            </>
        )
    } else if (at === 'checking') {
        title = 'Stripe is checking your details'
        lede = 'This usually takes a few minutes. You do not need to do anything; this page updates by itself.'
        action = (
            <div className="biz-pay__act">
                <Button variant="secondary" icon={RotateCw} onClick={() => { checks.current = 0; load() }}>Check again</Button>
            </div>
        )
    } else if (at === 'paused') {
        title = 'Payouts are paused'
        lede = 'Stripe needs more details before it can pay you again. Money from bookings waits safely until then.'
        action = (
            <>
            <Needs due={p.details_due} />
            <div className="biz-pay__act">
                <Button loading={busy} iconRight={ArrowUpRight} onClick={() => go('start')}>Fix it on Stripe</Button>
            </div>
            </>
        )
    } else {
        title = 'Payouts are on'
        lede = 'Every payment from Locappoint goes to this account. If it is not yours, change it on Stripe.'
        action = (
            <div className="biz-pay__act">
                <Button variant="secondary" loading={busy} iconRight={ArrowUpRight} onClick={() => go('manage')}>Manage on Stripe</Button>
                <span className="biz-pay__actnote">Change your bank or see every payout.</span>
            </div>
        )
    }

    return (
        <div className="biz-page biz-pay">
            {head}
            <div className="biz-pay__column">
                <Card padding="lg" className={`biz-pay__card is-${at}`} aria-labelledby="payments-title">
                    <Status tone={look.tone} size="sm">{look.badge}</Status>
                    <h2 id="payments-title" className="biz-pay__title">{title}</h2>
                    <p className="biz-pay__lede">{lede}</p>
                    {at === 'ready' && !formOpen && <PaidTo payout={p} />}
                    <MoneyRoute payout={p} partner={partner} />
                    {action}
                    {notice && <p className="biz-pay__alert" role="alert">{notice}</p>}
                </Card>

                <Card padding="lg" className="biz-pay__card biz-pay__facts" aria-label="When you get paid">
                    <PayoutWeek partner={partner} />
                    <p className="biz-pay__private">
                        <Lock size={14} aria-hidden="true" />
                        {partner.privacy}
                    </p>
                </Card>
            </div>
        </div>
    )
}

export default PaymentsPage

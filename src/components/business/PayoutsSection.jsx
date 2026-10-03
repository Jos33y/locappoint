import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Landmark, Lock, RotateCw } from 'lucide-react'
import { Button, Field, Picker, Skeleton, Status } from '../ui'
import { SettingsRow as Row, SettingsSection as Section } from './AccountSheets'
import { callPayouts, onAppReturn, openPayoutLink, payoutTarget } from '../../services/payouts'
import '../../styles/business/payouts.css'

const PaidTo = ({ payout }) => (
    <div className="biz-pay__bank">
        <span className="biz-pay__bankicon" aria-hidden="true"><Landmark size={20} /></span>
        <span className="biz-pay__banktext">
            <span className="biz-pay__bankname">{payout.bank_name || 'Your bank'}</span>
            <span className="biz-pay__banknum">{payout.account_last4 ? `Account ending ${payout.account_last4}` : 'Account on file with Stripe'}</span>
        </span>
        <Status tone="success" size="sm">Ready</Status>
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
            {bankError ? (
                <div className="biz-st__error" role="alert">
                    {bankError} <Button variant="quiet" size="sm" icon={RotateCw} onClick={loadBanks}>Try again</Button>
                </div>
            ) : (
                <Field label="Bank">
                    {banks
                        ? <Picker value={bank} onChange={setBank} searchable title="Your bank" placeholder="Choose your bank" searchPlaceholder="Search banks" options={banks.map((b) => ({ value: b.code, label: b.name }))} />
                        : <Skeleton height={44} radius={10} />}
                </Field>
            )}
            <Field label="Account number" hint="The 10-digit NUBAN on your bank app or card">
                <input
                    className="ui-input biz-pay__nuban"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
            </Field>
            <div className="biz-pay__confirm" aria-live="polite">
                {checking && <span className="biz-pay__checking">Checking the account with your bank</span>}
                {name && (
                    <span className="biz-pay__name">
                        <Check size={16} aria-hidden="true" />
                        <span><span className="biz-pay__namelabel">Account name</span><b>{name}</b></span>
                    </span>
                )}
            </div>
            {error && <p className="biz-st__error" role="alert">{error}</p>}
            <div className="biz-st__sheetactions">
                {onCancel && <Button variant="quiet" onClick={onCancel}>Cancel</Button>}
                <Button onClick={save} disabled={!name || checking} loading={saving}>{name ? 'Yes, pay me here' : 'Pay me here'}</Button>
            </div>
        </div>
    )
}

const intro = 'When clients pay on Locappoint, your money goes straight to your bank.'

export const PayoutsSection = ({ notify }) => {
    const [state, setState] = useState({ status: 'loading', payout: null, error: '' })
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState(false)
    const [notice, setNotice] = useState(() => {
        const flag = new URLSearchParams(window.location.search).get('payouts')
        return flag === 'expired' ? 'That Stripe link had expired. Tap Continue to pick up where you left off.' : ''
    })

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

    useEffect(() => {
        load().then((payout) => {
            if (new URLSearchParams(window.location.search).get('payouts') === 'return' && payout?.status === 'active') notify?.('Payouts are ready')
        })
        let off = () => {}
        onAppReturn(() => load()).then((stop) => { off = stop })
        return () => off()
    }, [load, notify])

    const go = async (action) => {
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
    }

    const p = state.payout
    const head = (
        <p className="biz-pay__intro">
            {intro}
            {p?.test && <span className="biz-soon biz-pay__test">Test mode</span>}
        </p>
    )

    let body
    if (state.status === 'loading') {
        body = <Skeleton lines={2} height={14} />
    } else if (state.status === 'error') {
        body = (
            <div className="biz-st__error" role="alert">
                {state.error} <Button variant="quiet" size="sm" icon={RotateCw} onClick={load}>Try again</Button>
            </div>
        )
    } else if (p.provider === 'paystack') {
        body = p.status === 'active' && !editing ? (
            <>
                <PaidTo payout={p} />
                <Row title="Change bank" detail="New payouts go to the new account from the next booking.">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Change bank</Button>
                </Row>
            </>
        ) : (
            <BankForm
                onCancel={p.status === 'active' ? () => setEditing(false) : null}
                onSaved={(next) => { setState({ status: 'ready', payout: next, error: '' }); setEditing(false); notify?.('Payouts are ready') }}
            />
        )
    } else if (p.status === 'active') {
        body = (
            <>
                <PaidTo payout={p} />
                <Row title="Change bank or details" detail="Opens Stripe, where your bank and identity details are kept.">
                    <Button variant="secondary" size="sm" loading={busy} onClick={() => go('manage')}>Open Stripe</Button>
                </Row>
            </>
        )
    } else if (p.status === 'not_started') {
        body = (
            <Row title="Set up payouts" detail="Stripe, our payments partner, checks who you are and where to send your money. About three minutes, once.">
                <Button loading={busy} onClick={() => go('start')}>Set up payouts</Button>
            </Row>
        )
    } else if (p.status === 'pending' && p.details_due.length === 0) {
        body = (
            <Row title="Stripe is checking your details" detail="This usually takes a few minutes. It shows here the moment you are ready.">
                <Button variant="secondary" size="sm" icon={RotateCw} onClick={load}>Check again</Button>
            </Row>
        )
    } else {
        body = (
            <Row
                title={p.status === 'restricted' ? 'Stripe needs a few more details' : 'Almost there'}
                detail={p.status === 'restricted' ? 'Payouts are paused until Stripe has them.' : 'Stripe still needs a few details before it can pay you.'}
            >
                <Button loading={busy} onClick={() => go('start')}>Continue</Button>
            </Row>
        )
    }

    return (
        <Section id="payouts" title="Getting paid">
            {head}
            {body}
            {notice && <p className="biz-pay__notice" role="status">{notice}</p>}
            <p className="biz-pay__private">
                <Lock size={14} aria-hidden="true" />
                {p?.provider === 'paystack'
                    ? 'Paystack, our payments partner in Nigeria, pays you. We keep only your bank name and the last four digits.'
                    : 'Locappoint never sees your ID or your full bank number. Stripe keeps them.'}
            </p>
        </Section>
    )
}

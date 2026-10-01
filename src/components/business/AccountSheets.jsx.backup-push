import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LogOut, Trash2 } from 'lucide-react'
import { Button, Card, Field, Sheet } from '../ui'
import { supabase } from '../../config/supabase'
import { checkDeletion, deleteAccount } from '../../services/account'
import '../../styles/business/settings-page.css'

const PASSWORD_MIN = 8

export const SettingsRow = ({ title, detail, children }) => (
    <div className="biz-st__row">
        <span className="biz-st__rowtext">
            <span className="biz-st__rowtitle">{title}</span>
            {detail && <span className="biz-st__rowdetail">{detail}</span>}
        </span>
        {children && <span className="biz-st__rowaction">{children}</span>}
    </div>
)

export const SettingsSection = ({ id, title, children }) => (
    <Card as="section" padding="lg" className="biz-st__card" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="biz-st__h2">{title}</h2>
        {children}
    </Card>
)

const PasswordInput = ({ id, value, onChange, autoComplete, 'aria-invalid': invalid, 'aria-describedby': describedBy }) => {
    const [shown, setShown] = useState(false)
    return (
        <span className="biz-st__pw">
            <input
                id={id}
                className="ui-input"
                type={shown ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                aria-invalid={invalid}
                aria-describedby={describedBy}
            />
            <button type="button" className="biz-st__pwtoggle" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'}>
                {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </span>
    )
}

export const PasswordSheet = ({ open, email, onClose, onDone }) => {
    const [form, setForm] = useState({ current: '', next: '', again: '' })
    const [tried, setTried] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setForm({ current: '', next: '', again: '' })
        setTried(false)
        setError('')
    }, [open])

    const problems = {}
    if (!form.current) problems.current = 'Enter the password you use today'
    if (form.next.length < PASSWORD_MIN) problems.next = `Use at least ${PASSWORD_MIN} characters`
    else if (form.next === form.current) problems.next = 'Choose a password you have not used here'
    if (form.again !== form.next) problems.again = 'The two new passwords do not match'
    const shown = tried ? problems : {}

    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

    const submit = async (event) => {
        event.preventDefault()
        setTried(true)
        setError('')
        if (Object.keys(problems).length) return
        setBusy(true)
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: form.current })
            if (signInError) {
                setError('That is not your current password.')
                return
            }
            const { error: updateError } = await supabase.auth.updateUser({ password: form.next })
            if (updateError) throw updateError
            onDone()
        } catch (err) {
            console.error('Password change failed:', err)
            setError('We could not change your password. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Change your password"
            footer={(
                <div className="biz-st__sheetactions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="biz-st-password" loading={busy}>Change password</Button>
                </div>
            )}
        >
            <form id="biz-st-password" className="biz-st__form" onSubmit={submit} noValidate>
                <Field label="Current password" error={shown.current}>
                    <PasswordInput value={form.current} onChange={set('current')} autoComplete="current-password" />
                </Field>
                <Field label="New password" error={shown.next} hint={`At least ${PASSWORD_MIN} characters`}>
                    <PasswordInput value={form.next} onChange={set('next')} autoComplete="new-password" />
                </Field>
                <Field label="New password again" error={shown.again}>
                    <PasswordInput value={form.again} onChange={set('again')} autoComplete="new-password" />
                </Field>
                {error && <p className="biz-st__error" role="alert">{error}</p>}
            </form>
        </Sheet>
    )
}

export const SignOutSheet = ({ open, onClose }) => {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { if (open) setError('') }, [open])

    const confirm = async () => {
        setBusy(true)
        setError('')
        try {
            const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
            if (signOutError) throw signOutError
        } catch (err) {
            console.error('Sign out everywhere failed:', err)
            setError('We could not sign you out everywhere. Check your connection and try again.')
            setBusy(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Sign out everywhere?"
            footer={(
                <div className="biz-st__sheetactions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button icon={LogOut} loading={busy} onClick={confirm}>Sign out everywhere</Button>
                </div>
            )}
        >
            <div className="biz-st__form">
                <p className="biz-st__sheetbody">
                    You will be signed out on every phone, tablet and computer, including this one. Use it if you lost a device or shared your password.
                </p>
                {error && <p className="biz-st__error" role="alert">{error}</p>}
            </div>
        </Sheet>
    )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Delete account: says plainly what goes and what stays, stops an owner who still has clients coming,
// and asks for DELETE typed out so it never happens by accident.
export const DeleteAccountSheet = ({ open, onClose }) => {
    const [facts, setFacts] = useState(null)
    const [word, setWord] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return undefined
        let cancelled = false
        setFacts(null)
        setWord('')
        setError('')
        checkDeletion()
            .then((f) => { if (!cancelled) setFacts(f) })
            .catch((err) => {
                console.error('Deletion check failed:', err)
                if (!cancelled) setError('We could not check your account. Check your connection and try again.')
            })
        return () => { cancelled = true }
    }, [open])

    const owned = facts?.businesses || []
    const blocking = owned.filter((b) => Number(b.upcoming) > 0)
    const ready = facts && blocking.length === 0
    const typed = word.trim().toUpperCase() === 'DELETE'

    const confirm = async () => {
        setBusy(true)
        setError('')
        try {
            await deleteAccount()
            window.location.replace('/legal/delete-account?done=1')
        } catch (err) {
            console.error('Delete account failed:', err)
            setError(err?.code === 'P0001' ? err.message : 'Your account was not deleted. Check your connection and try again.')
            setBusy(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Delete your account?"
            footer={ready ? (
                <div className="biz-st__sheetactions">
                    <Button variant="quiet" onClick={onClose}>Keep my account</Button>
                    <Button variant="secondary" className="biz-st__danger" icon={Trash2} loading={busy} disabled={!typed} onClick={confirm}>Delete for good</Button>
                </div>
            ) : null}
        >
            <div className="biz-st__form">
                {!facts && !error && <p className="biz-st__sheetbody">Checking your account.</p>}
                {blocking.length > 0 && (
                    <>
                        {blocking.map((b) => (
                            <p key={b.id} className="biz-st__error" role="alert">{`${b.name} still has ${plural(Number(b.upcoming), 'upcoming booking', 'upcoming bookings')}. Cancel or move them first, so your clients are told.`}</p>
                        ))}
                        <Link to="/portal/calendar" className="biz-st__delete-link" onClick={onClose}>Open the calendar</Link>
                    </>
                )}
                {ready && (
                    <>
                        <ul className="biz-st__delete-list">
                            <li>Your sign-in, your profile and your notifications are deleted straight away.</li>
                            {owned.map((b) => <li key={b.id}>{`${b.name}: its page, services, hours, past bookings and reviews are deleted with it.`}</li>)}
                            {facts.client_upcoming > 0 && <li>{Number(facts.client_upcoming) === 1 ? 'Your booking coming up stays booked. Change or cancel it from the link in its confirmation email.' : `Your ${facts.client_upcoming} bookings coming up stay booked. Change or cancel them from the links in their confirmation emails.`}</li>}
                            {(facts.staff_of || []).map((name) => <li key={name}>{`You leave the team at ${name}. Your past work there stays on their calendar.`}</li>)}
                            <li>Bookings you made stay with the businesses you visited; they need them for their own records.</li>
                        </ul>
                        <Field label="Type DELETE to confirm">
                            <input className="ui-input" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck="false" />
                        </Field>
                        <p className="biz-st__sheetbody">This cannot be undone.</p>
                    </>
                )}
                {error && <p className="biz-st__error" role="alert">{error}</p>}
            </div>
        </Sheet>
    )
}


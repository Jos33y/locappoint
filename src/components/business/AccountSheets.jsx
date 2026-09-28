import { useEffect, useState } from 'react'
import { Eye, EyeOff, LogOut } from 'lucide-react'
import { Button, Card, Field, Sheet } from '../ui'
import { supabase } from '../../config/supabase'
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

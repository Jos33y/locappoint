import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ChevronRight, Eye, EyeOff, KeyRound, LogOut, Mail } from 'lucide-react'
import { Button, Card, Field, Sheet } from '../../components/ui'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { initials } from '../../components/business/Brand'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { SUPPORT } from '../../constants/support'
import '../../styles/business/settings-page.css'

const PASSWORD_MIN = 8

const memberSince = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const Row = ({ title, detail, children }) => (
    <div className="biz-st__row">
        <span className="biz-st__rowtext">
            <span className="biz-st__rowtitle">{title}</span>
            {detail && <span className="biz-st__rowdetail">{detail}</span>}
        </span>
        {children && <span className="biz-st__rowaction">{children}</span>}
    </div>
)

const Section = ({ id, title, children }) => (
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

const PasswordSheet = ({ open, email, onClose, onDone }) => {
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

const SignOutSheet = ({ open, onClose }) => {
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

const SettingsPage = () => {
    const { user, userProfile, refreshProfile } = useAuth()
    const { notify } = useWorkspace()
    const email = user?.email || userProfile?.email || ''
    const [name, setName] = useState(userProfile?.full_name || '')
    const [savedName, setSavedName] = useState(userProfile?.full_name || '')
    const [passwordOpen, setPasswordOpen] = useState(false)
    const [signOutOpen, setSignOutOpen] = useState(false)

    const trimmed = name.trim()
    const nameProblem = trimmed ? null : 'Enter the name people know you by'
    const since = useMemo(() => memberSince(userProfile?.created_at || user?.created_at), [userProfile?.created_at, user?.created_at])

    const autosave = useAutosave({
        pending: !nameProblem && trimmed !== savedName.trim() ? trimmed : '',
        ready: Boolean(user?.id),
        blocked: Boolean(nameProblem),
        save: async (value) => {
            const { data, error } = await supabase.from('users').update({ full_name: value }).eq('id', user.id).select('id')
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Update returned 0 rows for user ' + user.id)
            setSavedName(value)
            refreshProfile?.()
        },
    })

    const closeLink = `mailto:${SUPPORT.email}?subject=${encodeURIComponent('Close my Locappoint account')}&body=${encodeURIComponent(`Please close the Locappoint account for ${email}.`)}`

    return (
        <div className="biz-page biz-st">
            <header className="biz-page__head biz-st__head">
                <div>
                    <h1 className="biz-page__title">Settings</h1>
                    <p className="biz-page__sub">Your account, sign-in and security.</p>
                </div>
                <SaveState state={autosave.state} onRetry={autosave.retry} blockedText="Enter your name to save it" />
            </header>

            <div className="biz-st__column">
                <Section id="profile" title="Your profile">
                    <div className="biz-st__who">
                        <span className="biz-st__avatar" aria-hidden="true">{initials(trimmed || email)}</span>
                        <div className="biz-st__whotext">
                            <Field label="Your name" error={name !== savedName ? nameProblem : undefined} hint="Your own name, not the business name">
                                <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                            </Field>
                        </div>
                    </div>
                    <div className="biz-st__rule" />
                    <Row title="Sign-in email" detail={email}>
                        <Button variant="quiet" size="sm" icon={Mail} href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent('Change my sign-in email')}`}>Ask to change</Button>
                    </Row>
                    {since && <Row title="Member since" detail={since} />}
                </Section>

                <Section id="security" title="Sign-in and security">
                    <Row title="Password" detail="Change it any time. You stay signed in on this device.">
                        <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => setPasswordOpen(true)}>Change password</Button>
                    </Row>
                    <div className="biz-st__rule" />
                    <Row title="Sign out everywhere" detail="Lost a phone or shared your password? This signs you out on every device.">
                        <Button variant="secondary" size="sm" icon={LogOut} onClick={() => setSignOutOpen(true)}>Sign out everywhere</Button>
                    </Row>
                </Section>

                <Section id="alerts" title="Notifications">
                    <Row title="Booking alerts" detail="Email and WhatsApp alerts for new, moved and cancelled bookings.">
                        <span className="biz-soon">Soon</span>
                    </Row>
                </Section>

                <Section id="account" title="Your account">
                    <Link to="/client" className="biz-st__linkrow">
                        <ArrowLeftRight size={18} aria-hidden="true" />
                        <span className="biz-st__rowtext">
                            <span className="biz-st__rowtitle">Switch to Booking</span>
                            <span className="biz-st__rowdetail">Book with other businesses using the same account.</span>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" className="biz-st__chevron" />
                    </Link>
                    <div className="biz-st__rule" />
                    <Row title="Close your account" detail="Tell us and we close it for you. If you run a business, we talk you through what happens to your page and bookings first.">
                        <Button variant="quiet" size="sm" className="biz-st__danger" href={closeLink}>Ask us to close it</Button>
                    </Row>
                </Section>

                <p className="biz-st__legal">
                    <Link to="/privacy">Privacy</Link>
                    <span aria-hidden="true">·</span>
                    <Link to="/terms">Terms</Link>
                    <span aria-hidden="true">·</span>
                    <span>Support: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a></span>
                </p>
            </div>

            <PasswordSheet
                open={passwordOpen}
                email={email}
                onClose={() => setPasswordOpen(false)}
                onDone={() => { setPasswordOpen(false); notify('Password changed') }}
            />
            <SignOutSheet open={signOutOpen} onClose={() => setSignOutOpen(false)} />
        </div>
    )
}

export default SettingsPage

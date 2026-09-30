import { useEffect, useState } from 'react'
import { Button, Field, Input, Sheet } from '../ui'
import { supabase } from '../../config/supabase'
import { appOrigin } from '../../services/native'
import '../../styles/business/settings-page.css'

const VALID = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Changing the sign-in email: Supabase sends a confirmation link and the change happens when it is opened.
export const EmailSheet = ({ open, current, onClose, onSent }) => {
    const [next, setNext] = useState('')
    const [tried, setTried] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setNext('')
        setTried(false)
        setError('')
    }, [open])

    const clean = next.trim().toLowerCase()
    const problem = !VALID.test(clean) ? 'Enter a full email address' : clean === String(current).toLowerCase() ? 'That is the email you use now' : null

    const submit = async (event) => {
        event.preventDefault()
        setTried(true)
        setError('')
        if (problem) return
        setBusy(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({ email: clean }, { emailRedirectTo: `${appOrigin()}/auth/confirm` })
            if (updateError) throw updateError
            onSent(clean)
        } catch (err) {
            console.error('Email change failed:', err)
            const code = err?.code || ''
            setError(code === 'email_exists' || /already/i.test(err?.message || '')
                ? 'That email already has a LocAppoint account.'
                : code === 'over_email_send_rate_limit'
                    ? 'Too many tries. Wait a minute and try again.'
                    : 'We could not start the change. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Change your email"
            footer={(
                <div className="biz-st__sheetactions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="lc-cl-email" loading={busy}>Send confirmation</Button>
                </div>
            )}
        >
            <form id="lc-cl-email" className="biz-st__form" onSubmit={submit} noValidate>
                <Field label="New email" error={tried ? problem : undefined} hint="We send a link there. Nothing changes until you open it.">
                    <Input type="email" inputMode="email" autoComplete="email" value={next} onChange={(e) => setNext(e.target.value)} />
                </Field>
                <p className="lc-cl-emailnote">Your bookings stay with your account. Until you confirm, you keep signing in with {current}.</p>
                {error && <p className="biz-st__error" role="alert">{error}</p>}
            </form>
        </Sheet>
    )
}

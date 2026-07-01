// src/pages/app/auth/ResetPassword.jsx
// Set new password after clicking the reset link in email.
// Supabase redirects here with the recovery session in URL hash.
// supabase-js auto-detects the hash (detectSessionInUrl: true in supabase.jsx)
// and fires the PASSWORD_RECOVERY event. We listen for that to enable the form.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../../config/supabase'
import AuthShell from './AuthShell'
import '../../../styles/auth/auth.css'


const ResetPassword = () => {
    const navigate = useNavigate()

    // Recovery state - true once Supabase reports a valid session from the link
    const [recoveryReady, setRecoveryReady] = useState(false)
    const [linkInvalid, setLinkInvalid] = useState(false)

    // Form state
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)


    // On mount: listen for PASSWORD_RECOVERY auth event OR detect an existing
    // recovery session if the listener attaches after the hash is parsed.
    // If neither resolves within 2.5s, treat the link as expired or missing.
    useEffect(() => {
        let resolved = false

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    resolved = true
                    setRecoveryReady(true)
                }
            }
        )

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && !resolved) {
                resolved = true
                setRecoveryReady(true)
            }
        })

        const timeout = setTimeout(() => {
            if (!resolved) setLinkInvalid(true)
        }, 2500)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])


    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!password) {
            setError('Password is required.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const { error: updateErr } = await supabase.auth.updateUser({ password })

            if (updateErr) {
                setError(updateErr.message || 'Could not update password. Request a new reset link.')
                return
            }

            // Sign out so the user re-authenticates with the new password.
            await supabase.auth.signOut()

            setSuccess(true)

            setTimeout(() => {
                navigate('/auth')
            }, 2500)
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }


    // Invalid / expired link state
    if (linkInvalid && !recoveryReady && !success) {
        return (
            <AuthShell
                brandTitle="That link cannot be used."
                brandSub="Request a fresh reset link from the sign-in page.">

                <Link to="/auth" className="auth-back auth-back--inline">
                    <ArrowLeft size={14} strokeWidth={2} />
                    <span>Back to sign in</span>
                </Link>

                <div className="auth-success-state">
                    <div className="auth-success-state__ico" aria-hidden="true">
                        <AlertCircle size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="auth-head__title">Link expired or invalid.</h1>
                    <p className="auth-head__sub">
                        This reset link cannot be used. It may have expired or already been used. Request a new one to continue.
                    </p>

                    <Link to="/forgot-password" className="auth-submit">
                        Request new link
                        <ArrowRight size={16} strokeWidth={2} />
                    </Link>

                    <p className="auth-switch">
                        Remembered it?{' '}
                        <Link to="/auth" className="auth-switch__link">Sign in</Link>
                    </p>
                </div>
            </AuthShell>
        )
    }


    // Success state
    if (success) {
        return (
            <AuthShell
                brandTitle="You're set."
                brandSub="Sign in with your new password.">

                <div className="auth-success-state">
                    <div className="auth-success-state__ico" aria-hidden="true">
                        <CheckCircle size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="auth-head__title">Password updated.</h1>
                    <p className="auth-head__sub">
                        Your password has been changed. Redirecting to sign in.
                    </p>

                    <Link to="/auth" className="auth-submit">
                        Go to sign in
                        <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                </div>
            </AuthShell>
        )
    }


    // Form state (default)
    return (
        <AuthShell
            brandTitle="Set a new password."
            brandSub="Choose something at least 6 characters. You will sign in with this from now on.">

            <Link to="/auth" className="auth-back auth-back--inline">
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Back to sign in</span>
            </Link>

            <div className="auth-head">
                <h1 className="auth-head__title">Set a new password.</h1>
                <p className="auth-head__sub">
                    Choose something at least 6 characters. You will sign in with this from now on.
                </p>
            </div>

            {error && (
                <div className="auth-alert auth-alert--error" role="alert">
                    <AlertCircle size={14} strokeWidth={2.2} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                    <label htmlFor="password">New password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value)
                            if (error) setError('')
                        }}
                        placeholder="At least 6 characters"
                        required
                        autoFocus
                        autoComplete="new-password"
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="confirmPassword">Confirm new password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            if (error) setError('')
                        }}
                        placeholder="Same as above"
                        required
                        autoComplete="new-password"
                    />
                </div>

                <button
                    type="submit"
                    className="auth-submit"
                    disabled={loading || !recoveryReady}>
                    {loading ? 'Updating...' : (
                        <>
                            Update password
                            <ArrowRight size={16} strokeWidth={2} />
                        </>
                    )}
                </button>
            </form>

            <p className="auth-switch">
                Remembered it?{' '}
                <Link to="/auth" className="auth-switch__link">Sign in</Link>
            </p>

        </AuthShell>
    )
}

export default ResetPassword

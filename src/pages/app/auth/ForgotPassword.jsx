// src/pages/app/auth/ForgotPassword.jsx
// Reset password flow. Uses AuthShell.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ArrowLeft, MailCheck, AlertCircle, ArrowRight } from 'lucide-react'
import AuthShell from './AuthShell'
import '../../../styles/auth/auth.css'


const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const { resetPassword } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        if (!email.trim()) {
            setError('Email is required.')
            return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError('Enter a valid email address.')
            return
        }

        setLoading(true)
        try {
            const { error: resetErr } = await resetPassword(email)
            if (resetErr) {
                setError(resetErr.message || 'Could not send reset link. Try again.')
                return
            }
            setSuccess(true)
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell
            brandTitle="Resetting takes a minute."
            brandSub="Enter your email below. We send a reset link straight to your inbox.">

            <Link to="/auth" className="auth-back auth-back--inline">
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Back to sign in</span>
            </Link>

            {success ? (
                <div className="auth-success-state">
                    <div className="auth-success-state__ico" aria-hidden="true">
                        <MailCheck size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="auth-head__title">Check your inbox.</h1>
                    <p className="auth-head__sub">
                        We sent a password reset link to your email. The link expires in one hour.
                    </p>

                    <Link to="/auth" className="auth-submit auth-submit--ghost">
                        <ArrowLeft size={16} strokeWidth={2} />
                        Back to sign in
                    </Link>

                    <p className="auth-switch">
                        Didn&apos;t receive it?{' '}
                        <button
                            type="button"
                            className="auth-switch__link"
                            onClick={() => setSuccess(false)}>
                            Try a different email
                        </button>
                    </p>
                </div>
            ) : (
                <>
                    <div className="auth-head">
                        <h1 className="auth-head__title">Reset your password.</h1>
                        <p className="auth-head__sub">
                            Enter the email tied to your account. We send a reset link.
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
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (error) setError('')
                                }}
                                placeholder="you@example.com"
                                required
                                autoFocus
                                autoComplete="email"
                            />
                        </div>

                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? 'Sending...' : (
                                <>
                                    Send reset link
                                    <ArrowRight size={16} strokeWidth={2} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Remembered it?{' '}
                        <Link to="/auth" className="auth-switch__link">Sign in</Link>
                    </p>
                </>
            )}

        </AuthShell>
    )
}

export default ForgotPassword

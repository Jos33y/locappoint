// src/pages/app/auth/AuthPage.jsx
// Sign in + sign up. Wires to Supabase via useAuth.
// Preserves: signIn, signUp({full_name, phone, user_type}), signInWithGoogle.

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { User, Building2, AlertCircle, CheckCircle2, ArrowRight, MailCheck } from 'lucide-react'
import AuthShell from './AuthShell'
import '../../../styles/auth/auth.css'


const AuthPage = () => {
    const location = useLocation()
    const navigate = useNavigate()

    const navState = location.state || {}
    const searchParams = new URLSearchParams(location.search)
    const isVerified = searchParams.get('verified') === 'true'

    const [activeTab, setActiveTab] = useState(isVerified ? 'signin' : (navState.tab || 'signin'))
    const [userType, setUserType] = useState(navState.userType || 'client')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        confirmPassword: '',
    })
    const [error, setError] = useState('')
    const [message, setMessage] = useState(isVerified ? 'Email verified. Sign in to continue.' : '')
    const [loading, setLoading] = useState(false)

    const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth()

    useEffect(() => {
        if (navState.tab) setActiveTab(navState.tab)
        if (navState.userType) setUserType(navState.userType)
        if (isVerified) {
            setActiveTab('signin')
            setMessage('Email verified. Sign in to continue.')
        }
    }, [location.state, location.key, isVerified, navState.tab, navState.userType])

    const switchTab = (tab) => {
        setActiveTab(tab)
        setError('')
        setMessage('')
    }

    const handleInputChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
        if (error) setError('')
    }

    const validateForm = () => {
        if (!formData.email.trim()) {
            setError('Email is required.')
            return false
        }
        if (!formData.password) {
            setError('Password is required.')
            return false
        }
        if (activeTab === 'signup') {
            if (!formData.full_name.trim()) {
                setError('Full name is required.')
                return false
            }
            if (!formData.phone.trim()) {
                setError('Phone is required so businesses can reach you.')
                return false
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters.')
                return false
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.')
                return false
            }
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (!validateForm()) return

        setLoading(true)

        try {
            if (activeTab === 'signin') {
                const { data, error: signinErr } = await signIn(formData.email, formData.password)
                if (signinErr) {
                    setError(signinErr.message || 'Sign in failed. Check your credentials.')
                    return
                }
                const redirectPath = data.user?.user_metadata?.user_type === 'business' ? '/portal' : '/client'
                navigate(redirectPath)
            } else {
                const { error: signupErr } = await signUp(formData.email, formData.password, {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    user_type: userType,
                })
                if (signupErr) {
                    setError(signupErr.message || 'Sign up failed. Try again.')
                    return
                }
                setMessage('Account created. Check your inbox for the verification email.')
                setFormData({ email: '', password: '', full_name: '', phone: '', confirmPassword: '' })

                setTimeout(() => {
                    setActiveTab('signin')
                    setFormData((prev) => ({ ...prev, email: formData.email }))
                    setMessage('')
                }, 6000)
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError('')
        setLoading(true)
        try {
            const { error: googleErr } = await signInWithGoogle()
            if (googleErr) {
                setError(googleErr.message || 'Google sign in failed.')
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleAppleSignIn = async () => {
        setError('')
        setLoading(true)
        try {
            const { error: appleErr } = await signInWithApple()
            if (appleErr) {
                setError(appleErr.message || 'Apple sign in failed.')
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    // Apple devices see Apple first. macOS Safari and all iOS variants.
    const isApplePlatform = typeof navigator !== 'undefined' &&
        /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)

    const headline = activeTab === 'signin'
        ? 'Sign in to your dashboard.'
        : userType === 'business'
            ? 'Be one of the first ten in Lisbon.'
            : 'Find local businesses you can book.'

    return (
        <AuthShell
            brandTitle={activeTab === 'signin' ? 'Pick up where you left off.' : 'Booking that fills your week, not your DMs.'}
            brandSub={activeTab === 'signin' ? "Today's bookings, reminders, hours. Everything in one place." : 'Local businesses in Lisbon, Porto, and Lagos. Free for the first twelve months.'}>

            <div className="auth-head">
                <h1 className="auth-head__title">{headline}</h1>
                <p className="auth-head__sub">
                    {activeTab === 'signin' ? 'Welcome back.' : 'Setup takes ten minutes.'}
                </p>
            </div>

            <div className="auth-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'signin'}
                    className={`auth-tab ${activeTab === 'signin' ? 'auth-tab--active' : ''}`}
                    onClick={() => switchTab('signin')}>
                    Sign in
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'signup'}
                    className={`auth-tab ${activeTab === 'signup' ? 'auth-tab--active' : ''}`}
                    onClick={() => switchTab('signup')}>
                    Sign up
                </button>
                <div className={`auth-tabs__indicator ${activeTab === 'signup' ? 'auth-tabs__indicator--right' : ''}`} aria-hidden="true"></div>
            </div>

            {error && (
                <div className="auth-alert auth-alert--error" role="alert">
                    <AlertCircle size={14} strokeWidth={2.2} />
                    <span>{error}</span>
                </div>
            )}

            {message && (
                <div className="auth-alert auth-alert--success" role="status">
                    {isVerified ? <MailCheck size={14} strokeWidth={2.2} /> : <CheckCircle2 size={14} strokeWidth={2.2} />}
                    <span>{message}</span>
                </div>
            )}

            {activeTab === 'signup' && (
                <div className="auth-toggle">
                    <span className="auth-toggle__label">I am a</span>
                    <div className="auth-toggle__options">
                        <label className={`auth-toggle__option ${userType === 'client' ? 'auth-toggle__option--active' : ''}`}>
                            <input
                                type="radio"
                                name="userType"
                                value="client"
                                checked={userType === 'client'}
                                onChange={(e) => setUserType(e.target.value)}
                            />
                            <span className="auth-toggle__ico">
                                <User size={16} strokeWidth={1.8} />
                            </span>
                            <span className="auth-toggle__copy">
                                <span className="auth-toggle__name">Client</span>
                                <span className="auth-toggle__note">Looking to book</span>
                            </span>
                        </label>
                        <label className={`auth-toggle__option ${userType === 'business' ? 'auth-toggle__option--active' : ''}`}>
                            <input
                                type="radio"
                                name="userType"
                                value="business"
                                checked={userType === 'business'}
                                onChange={(e) => setUserType(e.target.value)}
                            />
                            <span className="auth-toggle__ico">
                                <Building2 size={16} strokeWidth={1.8} />
                            </span>
                            <span className="auth-toggle__copy">
                                <span className="auth-toggle__name">Business</span>
                                <span className="auth-toggle__note">Accepting bookings</span>
                            </span>
                        </label>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>

                {activeTab === 'signup' && (
                    <>
                        <div className="auth-field">
                            <label htmlFor="full_name">Full name</label>
                            <input
                                type="text"
                                id="full_name"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                placeholder="Your name"
                                required
                                autoComplete="name"
                            />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="phone">Phone</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+351 912 345 678"
                                required
                                autoComplete="tel"
                            />
                        </div>
                    </>
                )}

                <div className="auth-field">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password">
                        <span>Password</span>
                        {activeTab === 'signin' && (
                            <Link to="/forgot-password" className="auth-field__aux">Forgot?</Link>
                        )}
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="At least 6 characters"
                        required
                        autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                    />
                </div>

                {activeTab === 'signup' && (
                    <div className="auth-field">
                        <label htmlFor="confirmPassword">Confirm password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Same as above"
                            required
                            autoComplete="new-password"
                        />
                    </div>
                )}

                <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? 'Please wait...' : (
                        <>
                            {activeTab === 'signin' ? 'Sign in' : 'Create account'}
                            <ArrowRight size={16} strokeWidth={2} />
                        </>
                    )}
                </button>
            </form>

            <div className="auth-divider">
                <span>or</span>
            </div>

            <div className="auth-oauth-stack">
                {isApplePlatform ? (
                    <>
                        <button type="button" onClick={handleAppleSignIn} className="auth-oauth auth-oauth--apple" disabled={loading}>
                            <AppleLogo />
                            <span>Continue with Apple</span>
                        </button>
                        <button type="button" onClick={handleGoogleSignIn} className="auth-oauth auth-oauth--google" disabled={loading}>
                            <GoogleG />
                            <span>Continue with Google</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={handleGoogleSignIn} className="auth-oauth auth-oauth--google" disabled={loading}>
                            <GoogleG />
                            <span>Continue with Google</span>
                        </button>
                        <button type="button" onClick={handleAppleSignIn} className="auth-oauth auth-oauth--apple" disabled={loading}>
                            <AppleLogo />
                            <span>Continue with Apple</span>
                        </button>
                    </>
                )}
            </div>

            <p className="auth-switch">
                {activeTab === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                    type="button"
                    className="auth-switch__link"
                    onClick={() => switchTab(activeTab === 'signin' ? 'signup' : 'signin')}>
                    {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
            </p>

        </AuthShell>
    )
}


// Google brand colors used inside their own logo only.
// This is the standard exception, not part of the project palette.
const GoogleG = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
)

// Apple logo - white glyph for use on black button.
// Per Apple Human Interface Guidelines.
const AppleLogo = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.76 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
)


export default AuthPage

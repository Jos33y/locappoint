import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react'
import '../../../styles/auth/auth.css'

const AuthPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const searchParams = new URLSearchParams(location.search)

    // Get state from navigation (from AppHome business/client links)
    const navState = location.state || {}
    const isVerified = searchParams.get('verified') === 'true'
    const initialTab = isVerified ? 'signin' : (navState.tab || 'signup')  // Default to signup instead of signin
    const initialUserType = navState.userType || 'client'

    const [activeTab, setActiveTab] = useState(initialTab) 
    const [userType, setUserType] = useState(initialUserType)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        confirmPassword: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')


    const { signIn, signUp, signInWithGoogle } = useAuth()

    // Update when navigation state changes
    useEffect(() => {
        const navState = location.state || {}
        const searchParams = new URLSearchParams(location.search)
        const isVerified = searchParams.get('verified') === 'true'

        if (navState.tab) {
            setActiveTab(navState.tab)
        }
        if (navState.userType) {
            setUserType(navState.userType)
        }
        if (isVerified) {
            setActiveTab('signin')
        }
    }, [location.state, location.key])

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
        setError('')
    }

    const validateForm = () => {
        if (activeTab === 'signup') {
            if (!formData.full_name.trim()) {
                setError('Please enter your full name')
                return false
            }
            if (!formData.phone.trim()) {
                setError('Please enter your phone number')
                return false
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters')
                return false
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match')
                return false
            }
        }

        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Please fill in all fields')
            return false
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
                const { data, error } = await signIn(formData.email, formData.password)

                if (error) {
                    setError(error.message)
                    return
                }

                // Redirect based on user type
                const redirectPath = data.user?.user_metadata?.user_type === 'business'
                    ? '/portal'
                    : '/client'
                navigate(redirectPath)
            } else {
                // Sign up
                const { error } = await signUp(formData.email, formData.password, {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    user_type: userType,
                })

                if (error) {
                    setError(error.message)
                    return
                }

                setMessage('Account created! Please check your email to verify your account.')

                // Clear form
                setFormData({
                    email: '',
                    password: '',
                    full_name: '',
                    phone: '',
                    confirmPassword: '',
                })

                // AUTO-SWITCH to sign in after 3 seconds
                setTimeout(() => {
                    setActiveTab('signin')
                    setFormData(prev => ({ ...prev, email: formData.email }))
                    setMessage('') // Clear message when switching
                }, 6000)
            }
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError('')
        setLoading(true)

        try {
            const { error } = await signInWithGoogle()
            if (error) {
                setError(error.message)
            }
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <Link to="/app" className="auth-logo">LocAppoint</Link>
                    <p className="auth-tagline">
                        {activeTab === 'signin'
                            ? 'Welcome back! Sign in to your account'
                            : 'Create your account to get started'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('signin')
                            setError('')
                            setMessage('')
                        }}>
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('signup')
                            setError('')
                            setMessage('')
                        }}>
                        Sign Up
                    </button>
                </div>

                {/* Error/Success Messages */}
                {/* Success message for verified users */}
                {isVerified && activeTab === 'signin' && (
                    <div className="auth-success">
                        <CheckCircle2 size={16} />
                        <span>Email verified! You can now sign in.</span>
                    </div>
                )}
                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
                {message && (
                    <div className="auth-success">
                        <CheckCircle2 size={16} />
                        <span>{message}</span>
                    </div>
                )}

                {/* User Type Selection (Sign Up Only) */}
                {activeTab === 'signup' && (
                    <div className="user-type-selector">
                        <p className="user-type-label">I am a:</p>
                        <div className="user-type-options">
                            <label className={`user-type-option ${userType === 'client' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="userType"
                                    value="client"
                                    checked={userType === 'client'}
                                    onChange={(e) => setUserType(e.target.value)}
                                />
                                <div className="user-type-content">
                                    <User className="user-type-icon" />
                                    <span className="user-type-text">Client</span>
                                    <span className="user-type-desc">Looking to book appointments</span>
                                </div>
                            </label>
                            <label className={`user-type-option ${userType === 'business' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="userType"
                                    value="business"
                                    checked={userType === 'business'}
                                    onChange={(e) => setUserType(e.target.value)}
                                />
                                <div className="user-type-content">
                                    <Building2 className="user-type-icon" />
                                    <span className="user-type-text">Business</span>
                                    <span className="user-type-desc">Accepting appointments</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {activeTab === 'signup' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="full_name">Full Name</label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+351 912 345 678"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {activeTab === 'signup' && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    {activeTab === 'signin' && (
                        <div className="forgot-password">
                            <a href="/app/forgot-password">Forgot password?</a>
                        </div>
                    )}

                    <button type="submit" className="btn btn--primary btn-full" disabled={loading}>
                        {loading ? 'Please wait...' : activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Divider */}
                <div className="auth-divider">
                    <span>or</span>
                </div>

                {/* Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="btn-google"
                    disabled={loading}
                >
                    <svg className="google-icon" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                {/* Footer Links */}
                <div className="auth-footer">
                    <p>
                        {activeTab === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                                setActiveTab(activeTab === 'signin' ? 'signup' : 'signin')
                                setError('')
                                setMessage('')
                            }}
                        >
                            {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                    <p className="auth-terms">
                        By continuing, you agree to our{' '}
                        <a href="/terms">Terms of Service</a> and{' '}
                        <a href="/privacy">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default AuthPage
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
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
            setError('Please enter your email address')
            return
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)

        try {
            const { error } = await resetPassword(email)

            if (error) {
                setError(error.message)
                return
            }

            setSuccess(true)
            setEmail('')
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
                        Reset your password
                    </p>
                </div>

                {/* Back Link */}
                <Link to="/app/auth" className="back-link">
                    <ArrowLeft size={16} />
                    <span>Back to Sign In</span>
                </Link>

                {/* Error/Success Messages */}
                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {success ? (
                    <div className="success-container">
                        <div className="success-icon">
                            <CheckCircle2 size={64} />
                        </div>
                        <h2>Check your email</h2>
                        <p className="success-message">
                            We've sent a password reset link to your email address.
                            Please check your inbox and follow the instructions to reset your password.
                        </p>
                        <p className="success-note">
                            Didn't receive the email? Check your spam folder or{' '}
                            <button
                                type="button"
                                className="link-button"
                                onClick={() => setSuccess(false)}
                            >
                                try again
                            </button>
                        </p>
                        <Link to="/app/auth" className="btn btn--primary btn-full">
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="forgot-password-info">
                            <Mail size={48} className="info-icon" />
                            <p>
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        setError('')
                                    }}
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn--primary btn-full"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>
                                Remember your password?{' '}
                                <Link to="/app/auth" className="link-button">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword
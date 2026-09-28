import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'
import { supabase } from '../../../config/supabase'
import AuthShell from './AuthShell'
import '../../../styles/auth/auth.css'

const TYPES = ['email', 'signup', 'magiclink', 'recovery', 'email_change', 'invite']

const safePath = (path) =>
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth') ? path : null

const AuthConfirm = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const started = useRef(false)
    const [state, setState] = useState('checking')

    useEffect(() => {
        if (started.current) return
        started.current = true
        const params = new URLSearchParams(location.search)
        const tokenHash = params.get('token_hash')
        const type = params.get('type')
        if (!tokenHash || !TYPES.includes(type)) {
            setState('invalid')
            return
        }
        supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ data, error }) => {
            if (error) {
                console.error('Email link failed:', error)
                setState('invalid')
                return
            }
            if (type === 'recovery') {
                navigate('/reset-password', { replace: true })
            } else if (type === 'email_change') {
                setState('changed')
            } else {
                navigate(safePath(data?.user?.user_metadata?.next) || '/me', { replace: true })
            }
        })
    }, [location.search, navigate])

    if (state === 'changed') {
        return (
            <AuthShell audience="client" brandTitle="Email updated." brandSub="Sign in with your new email from now on.">
                <div className="auth-success-state">
                    <div className="auth-success-state__ico" aria-hidden="true">
                        <CheckCircle size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="auth-head__title">Your email is updated.</h1>
                    <p className="auth-head__sub">Use your new email the next time you sign in.</p>
                    <Link to="/me" className="auth-submit">
                        Continue
                        <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                </div>
            </AuthShell>
        )
    }

    if (state === 'invalid') {
        return (
            <AuthShell audience="client" brandTitle="That link cannot be used." brandSub="Email links work once and expire after a while.">
                <div className="auth-success-state">
                    <div className="auth-success-state__ico auth-success-state__ico--warn" aria-hidden="true">
                        <AlertCircle size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="auth-head__title">This link has expired or was already used.</h1>
                    <p className="auth-head__sub">
                        If you already confirmed your email, just sign in. If not, sign in and we will send you a fresh link.
                    </p>
                    <Link to="/auth" className="auth-submit">
                        Go to sign in
                        <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                    <p className="auth-switch">
                        Resetting your password?{' '}
                        <Link to="/forgot-password" className="auth-switch__link">Request a new link</Link>
                    </p>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell audience="client" brandTitle="One moment." brandSub="Checking your link.">
            <div className="auth-success-state" role="status" aria-live="polite">
                <span className="auth-confirm__spinner" aria-hidden="true" />
                <h1 className="auth-head__title">Checking your link</h1>
                <p className="auth-head__sub">This takes a second.</p>
            </div>
        </AuthShell>
    )
}

export default AuthConfirm

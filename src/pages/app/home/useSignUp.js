import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

// Owners land on business sign-up; someone already signed in goes to their own space.
export const useSignUp = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const signedIn = Boolean(user && userProfile)
    const go = () => (signedIn ? navigate('/me') : navigate('/auth', { state: { tab: 'signup', userType: 'business' } }))
    return [signedIn, go]
}

export const money = (value, currency) => new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-IE', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(value)

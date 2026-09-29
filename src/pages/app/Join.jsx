import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { rememberReferral } from '../../services/referrals'

// An invite link: keep the code, then straight to business sign-up.
const Join = () => {
    const { code = '' } = useParams()
    const { user } = useAuth()
    const [kept, setKept] = useState(false)
    useEffect(() => {
        if (/^[a-z0-9]{8}$/i.test(code)) rememberReferral(code)
        setKept(true)
    }, [code])
    if (!kept) return null
    return user
        ? <Navigate to="/portal" replace />
        : <Navigate to="/auth" replace state={{ tab: 'signup', userType: 'business' }} />
}

export default Join

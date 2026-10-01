import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AppLoader } from '../business/Brand'
import { takeNext } from '../../services/nextPath'

const HomeRedirect = () => {
    const { user, loading, profileStatus, homePath } = useAuth()

    if (loading || profileStatus === 'loading') return <AppLoader />

    if (!user) return <Navigate to="/auth" replace />

    return <Navigate to={takeNext() || homePath} replace />
}

export default HomeRedirect

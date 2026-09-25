import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const HomeRedirect = () => {
    const { user, loading, profileStatus, homePath } = useAuth()

    if (loading || profileStatus === 'loading') {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (!user) return <Navigate to="/auth" replace />

    return <Navigate to={homePath} replace />
}

export default HomeRedirect

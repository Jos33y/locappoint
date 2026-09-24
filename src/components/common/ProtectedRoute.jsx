import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const ProtectedRoute = ({ children, userType }) => {
  const { user, userProfile, profileStatus, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading || profileStatus === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (!userProfile) {
    return (
      <div className="loading-container">
        <p>We could not load your account. Sign out and sign in again, or contact hello@locappoint.com.</p>
        <button type="button" className="btn btn--outline btn--small" onClick={signOut}>Sign out</button>
      </div>
    )
  }

  if (userType && userProfile.user_type !== userType) {
    return <Navigate to={userProfile.user_type === 'business' ? '/portal' : '/client'} replace />
  }

  return children
}

export default ProtectedRoute
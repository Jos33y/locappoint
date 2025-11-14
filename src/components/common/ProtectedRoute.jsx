 import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const ProtectedRoute = ({ children, userType }) => {
  const { user, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect to auth page but save the location they were trying to go to
    return <Navigate to="/app/auth" state={{ from: location }} replace />
  }

  // Check if user type matches (business or client)
  if (userType && userProfile?.user_type !== userType) {
    // Redirect to appropriate dashboard
    const redirectTo = userProfile?.user_type === 'business' ? '/portal' : '/client'
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default ProtectedRoute
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './ProtectedRoute.css'

export default function AuthRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }
  
  // If user is authenticated, redirect to dashboard
  // Use replace to prevent going back to auth pages
  if (currentUser) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />
  }
  
  // If not authenticated, show the auth page
  return children
}

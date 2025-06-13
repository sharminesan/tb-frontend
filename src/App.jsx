import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthRoute from './components/AuthRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import './App.css'

// Component to handle the root route based on authentication status
function RootRedirect() {
  const { currentUser, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }
  
  // Redirect based on authentication status
  return <Navigate to={currentUser ? "/dashboard" : "/login"} replace />
}

// Component to handle unknown routes based on authentication status
function NotFoundRedirect() {
  const { currentUser, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }
  
  // Redirect to appropriate page based on auth status
  return <Navigate to={currentUser ? "/dashboard" : "/login"} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <AuthRoute>
          <Login />
        </AuthRoute>
      } />
      <Route path="/register" element={
        <AuthRoute>
          <Register />
        </AuthRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/" element={<RootRedirect />} />
      {/* Catch all route - redirect based on auth status */}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

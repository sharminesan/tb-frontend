// filepath: c:\Users\chinh\Desktop\turtlebot-frontend\src\components\MFAVerification.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './MFAVerification.css'

export default function MFAVerification({ onSuccess, onCancel }) {
  const { mfaResolver, handleTOTPChallenge } = useAuth()
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes timeout
  const [mfaMethod, setMfaMethod] = useState('')

  useEffect(() => {
    // Determine MFA method from resolver hints
    if (mfaResolver && mfaResolver.hints.length > 0) {
      const hint = mfaResolver.hints[0]
      setMfaMethod(hint.factorId) // 'phone' or 'totp'
    }
  }, [mfaResolver])

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setError('Verification timeout. Please try logging in again.')
    }
  }, [timeLeft])
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      if (mfaMethod === 'totp') {
        await handleTOTPChallenge(mfaResolver, verificationCode)
      } else {
        // Handle phone MFA challenge (existing logic)
        await handleTOTPChallenge(mfaResolver, verificationCode)
      }
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('MFA verification error:', error)
      setError('Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    // In a real implementation, you would trigger a resend of the verification code
    setTimeLeft(300) // Reset timer
    setError('')
    // TODO: Implement resend functionality
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(value)
    setError('') // Clear error when user types
  }

  return (
    <div className="mfa-verification">      <div className="mfa-header">
        <div className="security-icon">
          {mfaMethod === 'totp' ? '📱' : '🔐'}
        </div>
        <h2>Two-Factor Authentication</h2>
        <p>
          {mfaMethod === 'totp' 
            ? 'Enter the code from your authenticator app'
            : 'Enter the verification code from your authenticator app or SMS'
          }
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mfa-form">
        <div className="form-group">
          <label htmlFor="mfa-code">Verification Code</label>
          <input
            id="mfa-code"
            type="text"
            placeholder="000000"
            value={verificationCode}
            onChange={handleCodeChange}
            required
            disabled={isLoading || timeLeft === 0}
            maxLength={6}
            autoComplete="one-time-code"
            className="mfa-code-input"
          />
          <div className="code-display">
            {Array.from({ length: 6 }, (_, i) => (
              <div 
                key={i} 
                className={`code-digit ${verificationCode[i] ? 'filled' : ''}`}
              >
                {verificationCode[i] || ''}
              </div>
            ))}
          </div>
        </div>

        <div className="timer-info">
          <span className={`timer ${timeLeft < 60 ? 'warning' : ''}`}>
            Time remaining: {formatTime(timeLeft)}
          </span>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading || timeLeft === 0 || verificationCode.length !== 6}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>

      <div className="mfa-help">
        <p>Can't access your device?</p>
        <button 
          type="button" 
          className="resend-btn"
          onClick={handleResend}
          disabled={timeLeft > 240} // Allow resend after 1 minute
        >
          Resend Code
        </button>
      </div>
    </div>
  )
}
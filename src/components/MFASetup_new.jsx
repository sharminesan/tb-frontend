// filepath: c:\Users\chinh\Desktop\turtlebot-frontend\src\components\MFASetup.jsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './MFASetup.css'

export default function MFASetup({ onComplete }) {
  const { setupMFA, verifyMFA, setupTOTP, verifyTOTP } = useAuth()
  const [step, setStep] = useState('method') // 'method', 'phone', 'totp', 'verify', 'complete'
  const [mfaMethod, setMfaMethod] = useState('') // 'phone' or 'totp'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [totpSecret, setTotpSecret] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleMethodSelection = (method) => {
    setMfaMethod(method)
    if (method === 'phone') {
      setStep('phone')
    } else if (method === 'totp') {
      handleTOTPSetup()
    }
  }

  const handleTOTPSetup = async () => {
    setIsLoading(true)
    setError('')

    try {
      const totpData = await setupTOTP()
      setTotpSecret(totpData.secret)
      setQrCodeUrl(totpData.qrCodeUrl)
      setSecretKey(totpData.secretKey)
      setStep('totp')
    } catch (error) {
      console.error('TOTP setup error:', error)
      setError('Failed to set up authenticator app. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Format phone number to international format
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`
      
      const credential = await setupMFA(formattedPhone)
      setVerificationId(credential.verificationId)
      setStep('verify')
    } catch (error) {
      console.error('MFA setup error:', error)
      setError('Failed to send verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTPContinue = () => {
    setStep('verify')
  }

  const handleVerificationSubmit = async (e) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      if (mfaMethod === 'phone') {
        await verifyMFA(verificationId, verificationCode)
      } else if (mfaMethod === 'totp') {
        await verifyTOTP(totpSecret, verificationCode)
      }
      setStep('complete')
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 2000)
    } catch (error) {
      console.error('MFA verification error:', error)
      setError('Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    }
    return digits
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    if (formatted.replace(/\D/g, '').length <= 10) {
      setPhoneNumber(formatted)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a temporary success message here
    })
  }

  if (step === 'complete') {
    return (
      <div className="mfa-setup">
        <div className="mfa-success">
          <div className="success-icon">✅</div>
          <h2>MFA Setup Complete!</h2>
          <p>Your account is now secured with multi-factor authentication.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mfa-setup">
      <div className="mfa-header">
        <h2>Set Up Multi-Factor Authentication</h2>
        <p>Add an extra layer of security to your account</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {step === 'method' && (
        <div className="mfa-method-selection">
          <h3>Choose your authentication method</h3>
          <div className="method-options">
            <button 
              className="method-option"
              onClick={() => handleMethodSelection('totp')}
              disabled={isLoading}
            >
              <div className="method-icon">📱</div>
              <div className="method-info">
                <h4>Authenticator App</h4>
                <p>Use Google Authenticator, Authy, or similar apps</p>
              </div>
            </button>
            <button 
              className="method-option"
              onClick={() => handleMethodSelection('phone')}
              disabled={isLoading}
            >
              <div className="method-icon">📞</div>
              <div className="method-info">
                <h4>SMS Text Message</h4>
                <p>Receive codes via text message</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 'totp' && (
        <div className="totp-setup">
          <h3>Set Up Authenticator App</h3>
          <div className="setup-steps">
            <div className="step">
              <h4>Step 1: Scan QR Code</h4>
              <div className="qr-code-container">
                {qrCodeUrl && (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code for TOTP setup"
                    className="qr-code"
                  />
                )}
              </div>
              <p>Scan this QR code with your authenticator app</p>
            </div>
            
            <div className="step">
              <h4>Step 2: Manual Entry (if needed)</h4>
              <div className="secret-key">
                <code>{secretKey}</code>
                <button 
                  type="button" 
                  onClick={() => copyToClipboard(secretKey)}
                  className="copy-btn"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <p>Or manually enter this secret key in your app</p>
            </div>
          </div>
          
          <div className="totp-actions">
            <button 
              type="button" 
              className="back-btn"
              onClick={() => setStep('method')}
            >
              Back
            </button>
            <button 
              type="button" 
              className="submit-btn"
              onClick={handleTOTPContinue}
            >
              I've Added the Account
            </button>
          </div>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="mfa-form">
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
              disabled={isLoading}
            />
            <small>We'll send a verification code to this number</small>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="back-btn"
              onClick={() => setStep('method')}
              disabled={isLoading}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </div>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerificationSubmit} className="mfa-form">
          <div className="verification-info">
            {mfaMethod === 'phone' ? (
              <>
                <p>We sent a verification code to:</p>
                <strong>{phoneNumber}</strong>
              </>
            ) : (
              <>
                <p>Enter the 6-digit code from your authenticator app:</p>
              </>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={isLoading}
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="back-btn"
              onClick={() => {
                if (mfaMethod === 'phone') {
                  setStep('phone')
                } else {
                  setStep('totp')
                }
                setVerificationCode('')
                setError('')
              }}
              disabled={isLoading}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </form>
      )}

      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  )
}

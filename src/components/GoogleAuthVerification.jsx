import { useState } from "react";
import GoogleAuthService from "../services/googleAuthService";
import "../pages/Auth.css";

export default function GoogleAuthVerification({ onSuccess, onCancel, email }) {
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleAuthService = new GoogleAuthService();

  const handleVerification = async () => {
    const otpCode = verificationCode.join("");
    
    if (
      !useBackupCode &&
      (!otpCode || otpCode.length !== 6)
    ) {
      setError("Please enter all 6 digits");
      return;
    }

    if (useBackupCode && !backupCode.trim()) {
      setError("Please enter a backup code");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await googleAuthService.verifyTOTP(
        useBackupCode ? null : otpCode,
        useBackupCode ? backupCode.trim() : null
      );

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setError(error.message);
      // Clear verification code inputs on error
      if (!useBackupCode) {
        setVerificationCode(["", "", "", "", "", ""]);
        document.getElementById("totp-0")?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`totp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`totp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerification();
    }
  };
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Two-Factor Authentication</h2>
          <p>Enter your authentication code to continue</p>
          {email && (
            <p className="email-display">{email}</p>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); handleVerification(); }}>
          {!useBackupCode ? (
            <div>
              <label className="form-label">Enter 6-digit code from Google Authenticator:</label>
              <div className="otp-container">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`totp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-input"
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Enter backup code:</label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter backup code"
                autoFocus
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={
              loading ||
              (!useBackupCode && verificationCode.join("").length !== 6) ||
              (useBackupCode && !backupCode.trim())
            }
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <div className="otp-actions">
          {!useBackupCode ? (
            <p className="resend-text">
              Can't access your authenticator?{" "}
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(true);
                  setVerificationCode(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="resend-btn"
              >
                Use a backup code
              </button>
            </p>
          ) : (
            <p className="resend-text">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(false);
                  setBackupCode("");
                  setError("");
                  setTimeout(() => {
                    document.getElementById("totp-0")?.focus();
                  }, 100);
                }}
                className="resend-btn"
              >
                ← Back to authenticator code
              </button>
            </p>
          )}
        </div>

        {onCancel && (
          <div className="auth-link">
            <button onClick={onCancel} className="logout-link">
              Cancel
            </button>
          </div>
        )}

        <div className="auth-link">
          <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'left', marginTop: '1rem' }}>
            <strong>Need help?</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
              <li>Make sure your device's time is correct</li>
              <li>Open Google Authenticator app and find "TurtleBot"</li>
              <li>Enter the current 6-digit code</li>
              <li>If you lost your device, use one of your backup codes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

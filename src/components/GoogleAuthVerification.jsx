import { useState } from "react";
import GoogleAuthService from "../services/googleAuthService";
import "./GoogleAuthVerification.css";

export default function GoogleAuthVerification({ onSuccess, onCancel, email }) {
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleAuthService = new GoogleAuthService();

  const handleVerification = async () => {
    if (
      !useBackupCode &&
      (!verificationCode || verificationCode.length !== 6)
    ) {
      setError("Please enter a valid 6-digit code");
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
        useBackupCode ? null : verificationCode,
        useBackupCode ? backupCode.trim() : null
      );

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerification();
    }
  };

  return (
    <div className="google-auth-verification">
      <div className="verification-header">
        <h2>🔐 Two-Factor Authentication</h2>
        <p>Enter your authentication code to continue</p>
        {email && (
          <p className="user-email">
            Logging in as: <strong>{email}</strong>
          </p>
        )}
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <div className="verification-content">
        {!useBackupCode ? (
          <div className="totp-verification">
            <div className="input-section">
              <label>Enter 6-digit code from Google Authenticator:</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                onKeyPress={handleKeyPress}
                placeholder="000000"
                className="verification-input"
                maxLength="6"
                autoFocus
              />
            </div>

            <div className="backup-option">
              <button
                onClick={() => setUseBackupCode(true)}
                className="link-btn"
              >
                Can't access your authenticator? Use a backup code
              </button>
            </div>
          </div>
        ) : (
          <div className="backup-verification">
            <div className="input-section">
              <label>Enter backup code:</label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter backup code"
                className="backup-input"
                autoFocus
              />
            </div>

            <div className="backup-option">
              <button
                onClick={() => setUseBackupCode(false)}
                className="link-btn"
              >
                ← Back to authenticator code
              </button>
            </div>
          </div>
        )}

        <div className="verification-actions">
          <button
            onClick={handleVerification}
            disabled={
              loading ||
              (!useBackupCode && verificationCode.length !== 6) ||
              (useBackupCode && !backupCode.trim())
            }
            className="verify-btn"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

          {onCancel && (
            <button onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="help-section">
        <h4>Need help?</h4>
        <ul>
          <li>Make sure your device's time is correct</li>
          <li>Open Google Authenticator app and find "TurtleBot"</li>
          <li>Enter the current 6-digit code</li>
          <li>If you lost your device, use one of your backup codes</li>
        </ul>
      </div>
    </div>
  );
}

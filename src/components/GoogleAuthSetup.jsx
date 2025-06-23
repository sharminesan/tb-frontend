import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import GoogleAuthService from "../services/googleAuthService";
import "./GoogleAuthSetup.css";

export default function GoogleAuthSetup({ onComplete, onCancel }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1); // 1: QR Code, 2: Verification, 3: Backup Codes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [instructions, setInstructions] = useState({});

  const googleAuthService = new GoogleAuthService();

  useEffect(() => {
    if (currentUser) {
      setupGoogleAuth();
    }
  }, [currentUser]);

  const setupGoogleAuth = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await googleAuthService.setupGoogleAuth();
      setQrCode(result.qrCode);
      setManualKey(result.manualEntryKey);
      setInstructions(result.instructions);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await googleAuthService.verifySetup(verificationCode);
      setBackupCodes(result.backupCodes);
      setStep(3);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const downloadBackupCodes = () => {
    const content = `TurtleBot 2FA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join(
      "\n"
    )}\n\nKeep these codes secure. Each code can only be used once.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "turtlebot-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && step === 1) {
    return (
      <div className="google-auth-setup loading">
        <div className="loading-spinner"></div>
        <p>Setting up Google Authenticator...</p>
      </div>
    );
  }

  return (
    <div className="google-auth-setup">
      <div className="setup-header">
        <h2>🔐 Setup Two-Factor Authentication</h2>
        <p>Add an extra layer of security to your account</p>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {step === 1 && (
        <div className="step-content">
          <div className="step-header">
            <span className="step-number">1</span>
            <h3>Scan QR Code</h3>
          </div>

          <div className="qr-section">
            {qrCode && (
              <div className="qr-code-container">
                <img src={qrCode} alt="Google Authenticator QR Code" />
              </div>
            )}

            <div className="manual-entry">
              <p>
                <strong>Can't scan? Enter this key manually:</strong>
              </p>
              <div className="manual-key">
                <code>{manualKey}</code>
                <button
                  onClick={() => copyToClipboard(manualKey)}
                  className="copy-btn"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          <div className="instructions">
            <h4>📱 Instructions:</h4>
            <ol>
              <li>{instructions.step1}</li>
              <li>{instructions.step2}</li>
              <li>{instructions.step3}</li>
            </ol>
          </div>

          <div className="step-actions">
            <button onClick={() => setStep(2)} className="primary-btn">
              I've Added the Account
            </button>
            <button onClick={onCancel} className="secondary-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <div className="step-header">
            <span className="step-number">2</span>
            <h3>Verify Setup</h3>
          </div>

          <p>Enter the 6-digit code from your Google Authenticator app:</p>

          <div className="verification-input">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="000000"
              className="code-input"
              maxLength="6"
            />
          </div>

          <div className="step-actions">
            <button
              onClick={verifySetup}
              disabled={loading || verificationCode.length !== 6}
              className="primary-btn"
            >
              {loading ? "Verifying..." : "Verify & Enable"}
            </button>
            <button onClick={() => setStep(1)} className="secondary-btn">
              Back
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <div className="step-header">
            <span className="step-number">3</span>
            <h3>✅ Setup Complete!</h3>
          </div>

          <div className="success-message">
            <p>🎉 Two-factor authentication has been enabled successfully!</p>
          </div>

          <div className="backup-codes-section">
            <h4>🔑 Backup Codes</h4>
            <p className="warning">
              ⚠️ Save these backup codes in a secure place. Each code can only
              be used once if you lose access to your authenticator device.
            </p>

            <div className="backup-codes">
              {backupCodes.map((code, index) => (
                <div key={index} className="backup-code">
                  <code>{code}</code>
                </div>
              ))}
            </div>

            <div className="backup-actions">
              <button onClick={downloadBackupCodes} className="download-btn">
                📥 Download Codes
              </button>
              <button
                onClick={() => copyToClipboard(backupCodes.join("\n"))}
                className="copy-btn"
              >
                📋 Copy All Codes
              </button>
            </div>
          </div>

          <div className="step-actions">
            <button onClick={handleComplete} className="primary-btn">
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import GoogleAuthService from "../services/googleAuthService";
import GoogleAuthSetup from "./GoogleAuthSetup";
import GoogleAuthVerification from "./GoogleAuthVerification";
import "./GoogleAuthManager.css";

export default function GoogleAuthManager() {
  const { currentUser } = useAuth();
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const googleAuthService = new GoogleAuthService();

  useEffect(() => {
    if (currentUser) {
      checkTwoFactorStatus();
    }
  }, [currentUser]);

  const checkTwoFactorStatus = async () => {
    try {
      setLoading(true);
      setError("");

      const status = await googleAuthService.getStatus();
      setTwoFactorStatus({
        enabled: status.twoFactorEnabled,
        verified: status.twoFactorVerified,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    checkTwoFactorStatus();
  };

  const handleDisable2FA = async (verificationResult) => {
    try {
      setActionLoading(true);
      setError("");

      await googleAuthService.disable2FA(
        verificationResult.token || verificationResult.backupCode
      );
      setShowDisableConfirm(false);
      checkTwoFactorStatus();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const viewBackupCodes = async () => {
    try {
      setActionLoading(true);
      setError("");

      const result = await googleAuthService.getBackupCodes();
      setBackupCodes(result.backupCodes);
      setShowBackupCodes(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateBackupCodes = async (token) => {
    try {
      setActionLoading(true);
      setError("");

      const result = await googleAuthService.regenerateBackupCodes(token);
      setBackupCodes(result.backupCodes);
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <div className="google-auth-manager loading">
        <div className="loading-spinner"></div>
        <p>Loading 2FA settings...</p>
      </div>
    );
  }

  if (showSetup) {
    return (
      <GoogleAuthSetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  if (showDisableConfirm) {
    return (
      <div className="google-auth-manager">
        <div className="confirm-disable">
          <h3>⚠️ Disable Two-Factor Authentication</h3>
          <p>Enter your authenticator code to confirm disabling 2FA:</p>

          <GoogleAuthVerification
            onSuccess={handleDisable2FA}
            onCancel={() => setShowDisableConfirm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="google-auth-manager">
      <div className="manager-header">
        <h2>🔐 Two-Factor Authentication</h2>
        <p>Secure your account with an additional layer of protection</p>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <div className="status-section">
        <div className="status-card">
          <div className="status-header">
            <div className="status-icon">
              {twoFactorStatus.enabled ? "🔒" : "🔓"}
            </div>
            <div className="status-info">
              <h3>
                Status: {twoFactorStatus.enabled ? "Enabled" : "Disabled"}
              </h3>
              <p>
                {twoFactorStatus.enabled
                  ? "Your account is protected with two-factor authentication"
                  : "Your account is not protected with two-factor authentication"}
              </p>
            </div>
          </div>

          <div className="status-actions">
            {!twoFactorStatus.enabled ? (
              <button onClick={() => setShowSetup(true)} className="enable-btn">
                🛡️ Enable 2FA
              </button>
            ) : (
              <div className="enabled-actions">
                <button
                  onClick={viewBackupCodes}
                  disabled={actionLoading}
                  className="backup-codes-btn"
                >
                  🔑 View Backup Codes
                </button>

                <button
                  onClick={() => setShowDisableConfirm(true)}
                  className="disable-btn"
                >
                  ❌ Disable 2FA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBackupCodes && (
        <div className="backup-codes-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔑 Backup Codes</h3>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="backup-codes-content">
              <p className="warning">
                ⚠️ Keep these codes secure. Each code can only be used once.
              </p>

              <div className="backup-codes-grid">
                {backupCodes.map((code, index) => (
                  <div key={index} className="backup-code-item">
                    <code>{code}</code>
                  </div>
                ))}
              </div>

              <div className="backup-codes-actions">
                <button onClick={downloadBackupCodes} className="download-btn">
                  📥 Download Codes
                </button>

                <button
                  onClick={() => copyToClipboard(backupCodes.join("\n"))}
                  className="copy-btn"
                >
                  📋 Copy All
                </button>

                <button
                  onClick={() => {
                    // Show verification for regenerating codes
                    const token = prompt(
                      "Enter your 6-digit authenticator code to regenerate backup codes:"
                    );
                    if (token && token.length === 6) {
                      regenerateBackupCodes(token);
                    }
                  }}
                  disabled={actionLoading}
                  className="regenerate-btn"
                >
                  🔄 Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="info-section">
        <h4>📱 What is Two-Factor Authentication?</h4>
        <ul>
          <li>
            <strong>Extra Security:</strong> Adds a second layer of protection
            to your account
          </li>
          <li>
            <strong>Time-Based Codes:</strong> Uses Google Authenticator app to
            generate 6-digit codes
          </li>
          <li>
            <strong>Backup Codes:</strong> Emergency codes in case you lose
            access to your authenticator
          </li>
          <li>
            <strong>Industry Standard:</strong> Used by major services like
            Google, Facebook, and GitHub
          </li>
        </ul>
      </div>
    </div>
  );
}

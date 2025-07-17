import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBackend } from "../contexts/BackendContext";
import "./Settings.css";

export default function Settings() {
  const [backendUrlInput, setBackendUrlInput] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { currentUser, logout } = useAuth();
  const { backendUrl, updateBackendUrl, resetToDefault } = useBackend();
  const navigate = useNavigate();

  // Initialize with current backend URL
  useEffect(() => {
    setBackendUrlInput(backendUrl);
  }, [backendUrl]);

  const testConnection = async () => {
    if (!backendUrlInput.trim()) {
      setTestResult({ success: false, message: "Please enter a backend URL" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test the connection by trying to reach a health endpoint
      const testUrl = backendUrlInput.replace(/\/$/, ""); // Remove trailing slash
      const response = await fetch(`${testUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000, // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `Connection successful! Server: ${
            data.server || "TurtleBot Backend"
          }`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server responded with status ${response.status}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`,
      });
    }

    setTesting(false);
  };

  const saveSettings = async () => {
    if (!backendUrlInput.trim()) {
      setTestResult({ success: false, message: "Please enter a backend URL" });
      return;
    }

    setSaving(true);

    try {
      // Clean the URL
      const cleanUrl = backendUrlInput.replace(/\/$/, ""); // Remove trailing slash
      updateBackendUrl(cleanUrl);

      setTestResult({
        success: true,
        message: "Backend URL saved successfully!",
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to save settings: ${error.message}`,
      });
    }

    setSaving(false);
  };

  const handleReset = () => {
    resetToDefault();
    setBackendUrlInput(
      import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"
    );
    setTestResult({
      success: true,
      message: "Backend URL reset to default",
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getLocalIPSuggestions = () => {
    return [
      "http://192.168.1.100:4000",
      "http://192.168.0.100:4000",
      "http://10.0.0.100:4000",
    ];
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header">
          <h2>Settings</h2>
          <p>Configure your TurtleBot connection settings</p>
        </div>

        <div className="settings-content">
          {/* User Info */}
          <div className="settings-section">
            <h3>Account Information</h3>
            <div className="user-info">
              <p>
                <strong>Email:</strong> {currentUser?.email}
              </p>
              <p>
                <strong>Display Name:</strong>{" "}
                {currentUser?.displayName || "Not set"}
              </p>
            </div>
          </div>

          {/* Backend URL Configuration */}
          <div className="settings-section">
            <h3>Backend Server Configuration</h3>
            <p className="section-description">
              Set the URL of your TurtleBot backend server. For mobile access,
              use your computer's IP address instead of localhost.
            </p>

            <div className="form-group">
              <label htmlFor="backend-url">Backend URL:</label>
              <input
                id="backend-url"
                type="url"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="http://192.168.1.100:4000"
                className="url-input"
              />
            </div>

            <div className="button-group">
              <button
                onClick={testConnection}
                disabled={testing}
                className="test-btn"
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="save-btn"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <button onClick={handleReset} className="reset-btn">
                Reset to Default
              </button>
            </div>

            {testResult && (
              <div
                className={`test-result ${
                  testResult.success ? "success" : "error"
                }`}
              >
                <span className="result-icon">
                  {testResult.success ? "✅" : "❌"}
                </span>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Quick Setup */}
          <div className="settings-section">
            <h3>Quick Setup</h3>
            <p className="section-description">
              Common URL patterns for different network setups:
            </p>

            <div className="quick-setup">
              <button
                onClick={() => setBackendUrlInput("http://localhost:4000")}
                className="quick-btn"
              >
                Local Development
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="quick-btn"
              >
                {showAdvanced ? "Hide" : "Show"} Network Options
              </button>
            </div>

            {showAdvanced && (
              <div className="advanced-options">
                <h4>Network IP Suggestions:</h4>
                <p className="helper-text">
                  Replace the IP address below with your computer's actual IP
                  address:
                </p>
                {getLocalIPSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setBackendUrlInput(suggestion)}
                    className="suggestion-btn"
                  >
                    {suggestion}
                  </button>
                ))}
                <div className="ip-help">
                  <p>
                    <strong>How to find your IP address:</strong>
                  </p>
                  <ul>
                    <li>
                      <strong>Windows:</strong> Open Command Prompt and type{" "}
                      <code>ipconfig</code>
                    </li>
                    <li>
                      <strong>Mac/Linux:</strong> Open Terminal and type{" "}
                      <code>ifconfig</code> or <code>ip addr</code>
                    </li>
                    <li>Look for your network adapter's IPv4 address</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="settings-section">
            <h3>Current Configuration</h3>
            <div className="current-config">
              <p>
                <strong>Active Backend URL:</strong> <code>{backendUrl}</code>
              </p>
              <p>
                <strong>Environment Default:</strong>{" "}
                <code>
                  {import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"}
                </code>
              </p>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            Back to Dashboard
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

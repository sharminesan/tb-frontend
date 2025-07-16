import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import GoogleAuthManager from "../components/GoogleAuthManager";
import RobotVideoFeed from "../components/RobotVideoFeed";
import "./Dashboard.css";

export default function Dashboard() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [batteryStatus, setBatteryStatus] = useState("Unknown");
  const [robotStatus, setRobotStatus] = useState(null);
  const [backendUrl, setBackendUrl] = useState(
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"
  );

  // State for dance pattern controls
  const [patternSettings, setPatternSettings] = useState({
    circle: { radius: 1.0, duration: 10000, clockwise: true },
    triangle: { sideLength: 1.0, pauseDuration: 500 },
    love: { size: 1.0, duration: 20000 },
    diamond: { sideLength: 1.0, pauseDuration: 300 },
  });

  useEffect(() => {
    // Initialize socket connection without backend authentication
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnectionStatus("Connected");
      console.log("Connected to robot backend via Socket.IO");

      // Fetch initial robot status after connection
      fetchRobotStatus();
      fetchSensorData();
    });

    newSocket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
      console.log("Disconnected from robot backend");
    });

    // Listen for battery updates
    newSocket.on("battery_update", (data) => {
      setBatteryStatus(`${Math.round(data.percentage * 100)}%`);
    });

    // Listen for status updates
    newSocket.on("status_update", (data) => {
      setRobotStatus(data);
    });

    // Listen for movement responses
    newSocket.on("move_response", (data) => {
      console.log("Move response:", data);
    });

    // Listen for emergency stop notifications
    newSocket.on("emergency_stop_activated", (data) => {
      console.log("Emergency stop activated:", data);
      alert("Emergency stop activated!");
    });

    return () => newSocket.close();
  }, [backendUrl]);
  const fetchRobotStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/status`);

      if (response.ok) {
        const status = await response.json();
        setRobotStatus(status);
      }
    } catch (error) {
      console.error("Error fetching robot status:", error);
    }
  };

  const fetchSensorData = async () => {
    try {
      // Fetch battery data
      const batteryResponse = await fetch(`${backendUrl}/api/sensors/battery`);

      if (batteryResponse.ok) {
        const batteryData = await batteryResponse.json();
        setBatteryStatus(`${Math.round(batteryData.percentage * 100)}%`);
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      // Only logout from Firebase (no backend logout needed)
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };
  const sendCommand = async (command, parameters = {}) => {
    // Use Socket.IO for real-time commands (primary method)
    if (socket && socket.connected) {
      socket.emit("move_command", {
        action: command,
        parameters,
        user: currentUser?.email || "firebase-user", // Include user info for logging
      });
      console.log(`Sent command via Socket.IO: ${command}`, parameters);
    } else {
      // Fallback to REST API if socket is not connected
      try {
        const response = await fetch(`${backendUrl}/api/move/${command}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...parameters,
            user: currentUser?.email || "firebase-user",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`REST API command result:`, result);
        } else {
          console.error("Failed to send command via REST API");
        }
      } catch (error) {
        console.error("Error sending command:", error);
        alert("Failed to send command to robot!");
      }
    }
  };
  const emergencyStop = () => {
    if (socket && socket.connected) {
      socket.emit("emergency_stop", {
        user: currentUser?.email || "firebase-user",
      });
    } else {
      // Fallback to REST API
      fetch(`${backendUrl}/api/emergency_stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: currentUser?.email || "firebase-user",
        }),
      }).catch((error) => console.error("Emergency stop failed:", error));
    }
  };

  const connectToRobot = () => {
    if (socket) {
      socket.connect();
    } else {
      // Re-initialize socket connection
      const newSocket = io(backendUrl);
      setSocket(newSocket);
    }
  };
  const disconnectFromRobot = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  const handleBackendUrlChange = (e) => {
    const newUrl = e.target.value;
    setBackendUrl(newUrl);

    // Disconnect current socket if connected
    if (socket && socket.connected) {
      socket.disconnect();
    }
  };

  const reconnectWithNewUrl = () => {
    // Disconnect existing socket
    if (socket) {
      socket.disconnect();
      socket.close();
    }

    // Create new socket connection with updated URL
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    // Set up event listeners for the new socket
    newSocket.on("connect", () => {
      setConnectionStatus("Connected");
      console.log("Connected to robot backend via Socket.IO");
      fetchRobotStatus();
      fetchSensorData();
    });

    newSocket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
      console.log("Disconnected from robot backend");
    });

    // Listen for battery updates
    newSocket.on("battery_update", (data) => {
      setBatteryStatus(`${Math.round(data.percentage * 100)}%`);
    });

    // Listen for status updates
    newSocket.on("status_update", (data) => {
      setRobotStatus(data);
    });

    // Listen for movement responses
    newSocket.on("move_response", (data) => {
      console.log("Move response:", data);
    });

    // Listen for emergency stop notifications
    newSocket.on("emergency_stop_activated", (data) => {
      console.log("Emergency stop activated:", data);
      alert("Emergency stop activated!");
    });
  };

  // Pattern management functions
  const updatePatternSetting = (pattern, setting, value) => {
    setPatternSettings((prev) => ({
      ...prev,
      [pattern]: {
        ...prev[pattern],
        [setting]: value,
      },
    }));
  };

  const sendPatternCommand = async (pattern, parameters = {}) => {
    // Use Socket.IO for real-time commands (primary method)
    if (socket && socket.connected) {
      socket.emit("move_command", {
        action: pattern,
        parameters,
        user: currentUser?.email || "firebase-user",
      });
      console.log(`Sent pattern command via Socket.IO: ${pattern}`, parameters);
    } else {
      // Fallback to REST API if socket is not connected
      try {
        const response = await fetch(`${backendUrl}/api/move/${pattern}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...parameters,
            user: currentUser?.email || "firebase-user",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`REST API pattern result:`, result);
        } else {
          console.error("Failed to send pattern command via REST API");
        }
      } catch (error) {
        console.error("Error sending pattern command:", error);
        alert("Failed to send pattern command to robot!");
      }
    }
  };

  const startCircle = () => {
    sendPatternCommand("circle", patternSettings.circle);
  };

  const startTriangle = () => {
    sendPatternCommand("triangle", patternSettings.triangle);
  };

  const startLove = () => {
    sendPatternCommand("love", patternSettings.love);
  };

  const startDiamond = () => {
    sendPatternCommand("diamond", patternSettings.diamond);
  };
  const stopPattern = () => {
    sendPatternCommand("stop_pattern");
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>TurtleBot Controller</h1>{" "}
          <div className="user-info">
            <span>
              Welcome, {currentUser?.displayName || currentUser?.email}
              {userRole && <span className="user-role">({userRole})</span>}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>
        <div className="controller-wrapper">
          <div className="status-panel">
            <h2>Status</h2>
            <div className="status-list">
              <div className="status-item">
                <div className="status-title">Connection</div>
                <div
                  className={`status-value ${connectionStatus.toLowerCase()}`}
                >
                  {connectionStatus}
                </div>
              </div>
              <div className="status-item">
                <div className="status-title">Battery</div>
                <div className="status-value">{batteryStatus}</div>
              </div>
              <div className="status-item">
                <div className="status-title">User</div>
                <div className="status-value">
                  {currentUser?.displayName || currentUser?.email}
                </div>
              </div>
            </div>
          </div>{" "}
          {/* Local Webcam Feed */}
          <div className="video-feed-panel">
            <RobotVideoFeed
              backendUrl={backendUrl}
              isConnected={connectionStatus === "Connected"}
            />
          </div>
          {userRole === "moderator" && (
            <>
              <div className="control-panel">
                <h2>Movement Controls</h2>
                <div className="controls-grid">
                  <div></div>
                  <button
                    className="control-btn"
                    onClick={() => sendCommand("forward")}
                    title="Move Forward"
                  >
                    ↑
                  </button>
                  <div></div>

                  <button
                    className="control-btn"
                    onClick={() => sendCommand("left")}
                    title="Turn Left"
                  >
                    ←
                  </button>
                  <button
                    className="control-btn stop-btn"
                    onClick={() => sendCommand("stop")}
                    title="Stop"
                  >
                    ⏹
                  </button>
                  <button
                    className="control-btn"
                    onClick={() => sendCommand("right")}
                    title="Turn Right"
                  >
                    →
                  </button>

                  <div></div>
                  <button
                    className="control-btn"
                    onClick={() => sendCommand("backward")}
                    title="Move Backward"
                  >
                    ↓
                  </button>
                  <div></div>
                </div>
              </div>
              <div className="dance-patterns-panel">
                <h2>🕺 Dance Patterns</h2>

                <div className="pattern-grid">
                  <div className="pattern-card">
                    <h3>⭕ Circle Dance</h3>
                    <div className="pattern-controls">
                      <div className="control-row">
                        <label>Radius:</label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={patternSettings.circle.radius}
                          onChange={(e) =>
                            updatePatternSetting(
                              "circle",
                              "radius",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.circle.radius}m</span>
                      </div>
                      <div className="control-row">
                        <label>Duration:</label>
                        <input
                          type="range"
                          min="5000"
                          max="30000"
                          step="1000"
                          value={patternSettings.circle.duration}
                          onChange={(e) =>
                            updatePatternSetting(
                              "circle",
                              "duration",
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.circle.duration / 1000}s</span>
                      </div>
                      <div className="control-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={patternSettings.circle.clockwise}
                            onChange={(e) =>
                              updatePatternSetting(
                                "circle",
                                "clockwise",
                                e.target.checked
                              )
                            }
                          />
                          Clockwise
                        </label>
                      </div>
                    </div>
                    <button
                      className="pattern-btn circle-btn"
                      onClick={startCircle}
                    >
                      Start Circle Dance
                    </button>
                  </div>

                  <div className="pattern-card">
                    <h3>🔺 Triangle Dance</h3>
                    <div className="pattern-controls">
                      <div className="control-row">
                        <label>Side Length:</label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={patternSettings.triangle.sideLength}
                          onChange={(e) =>
                            updatePatternSetting(
                              "triangle",
                              "sideLength",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.triangle.sideLength}m</span>
                      </div>
                      <div className="control-row">
                        <label>Pause:</label>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="100"
                          value={patternSettings.triangle.pauseDuration}
                          onChange={(e) =>
                            updatePatternSetting(
                              "triangle",
                              "pauseDuration",
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.triangle.pauseDuration}ms</span>
                      </div>
                    </div>
                    <button
                      className="pattern-btn triangle-btn"
                      onClick={startTriangle}
                    >
                      Start Triangle Dance
                    </button>
                  </div>

                  <div className="pattern-card">
                    <h3>💖 Love Dance</h3>
                    <div className="pattern-controls">
                      <div className="control-row">
                        <label>Size:</label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={patternSettings.love.size}
                          onChange={(e) =>
                            updatePatternSetting(
                              "love",
                              "size",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.love.size}m</span>
                      </div>
                      <div className="control-row">
                        <label>Duration:</label>
                        <input
                          type="range"
                          min="10000"
                          max="60000"
                          step="5000"
                          value={patternSettings.love.duration}
                          onChange={(e) =>
                            updatePatternSetting(
                              "love",
                              "duration",
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.love.duration / 1000}s</span>
                      </div>
                    </div>
                    <button
                      className="pattern-btn love-btn"
                      onClick={startLove}
                    >
                      Start Love Dance
                    </button>
                  </div>

                  <div className="pattern-card">
                    <h3>💎 Diamond Dance</h3>
                    <div className="pattern-controls">
                      <div className="control-row">
                        <label>Side Length:</label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={patternSettings.diamond.sideLength}
                          onChange={(e) =>
                            updatePatternSetting(
                              "diamond",
                              "sideLength",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.diamond.sideLength}m</span>
                      </div>
                      <div className="control-row">
                        <label>Pause:</label>
                        <input
                          type="range"
                          min="100"
                          max="1500"
                          step="50"
                          value={patternSettings.diamond.pauseDuration}
                          onChange={(e) =>
                            updatePatternSetting(
                              "diamond",
                              "pauseDuration",
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <span>{patternSettings.diamond.pauseDuration}ms</span>
                      </div>
                    </div>
                    <button
                      className="pattern-btn diamond-btn"
                      onClick={startDiamond}
                    >
                      Start Diamond Dance
                    </button>
                  </div>
                </div>

                <div className="pattern-actions">
                  <button className="stop-all-btn" onClick={() => sendCommand("stop")}>
                    ⏹️ Stop All Patterns
                  </button>
                </div>
              </div>
            </>
          )}
          <div className="settings-panel">
            <h2>Robot Connection</h2>
            <div className="settings-form">
              {" "}
              <div className="form-group">
                <label>Robot Backend URL</label>
                <div className="url-input-group">
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={handleBackendUrlChange}
                    placeholder="http://localhost:4000"
                  />
                  <button
                    className="reconnect-btn"
                    onClick={reconnectWithNewUrl}
                    disabled={!backendUrl}
                    title="Reconnect with new URL"
                  >
                    🔄 Reconnect
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Authenticated User</label>
                <input
                  type="text"
                  value={
                    currentUser?.displayName || currentUser?.email || "User"
                  }
                  readOnly
                />
              </div>
              <div className="button-group">
                <button
                  className="connect-btn"
                  onClick={connectToRobot}
                  disabled={connectionStatus === "Connected"}
                >
                  Connect to Robot
                </button>
                <button
                  className="disconnect-btn"
                  onClick={disconnectFromRobot}
                  disabled={connectionStatus === "Disconnected"}
                >
                  Disconnect
                </button>
                <button className="emergency-btn" onClick={emergencyStop}>
                  Emergency Stop
                </button>
              </div>
            </div>
          </div>{" "}
        </div>{" "}
        {/* Security Settings Section */}
        <div className="security-panel">
          <GoogleAuthManager />
        </div>
        {/* Role-based sections */}
        {/* {userRole === "admin" && (
          <div className="admin-panel">
            <h2>🔧 Admin Controls</h2>
            <div className="admin-features">
              <button
                className="admin-btn"
                onClick={() => window.open("/admin", "_blank")}
              >
                👥 Admin Panel
              </button>
              <button
                className="admin-btn"
                onClick={() => alert("System settings feature")}
              >
                ⚙️ System Settings
              </button>
              <button
                className="admin-btn"
                onClick={() => alert("Robot diagnostics feature")}
              >
                🔍 Robot Diagnostics
              </button>
            </div>
          </div>
        )} */}
        {userRole === "admin" && (
          <div className="temp-admin-section">
            <p>
              <strong>Debug:</strong> If you should be an admin, visit: <br />
              <br />
              <a href="/admin" target="_blank" rel="noopener noreferrer">
                Admin Panel
              </a>
            </p>
          </div>
        )}
        {/* {(userRole === "moderator" || userRole === "admin") && (
          <div className="moderator-panel">
            <h2>🛡️ Moderator Features</h2>
            <div className="moderator-features">
              <button
                className="moderator-btn"
                onClick={() => alert("Advanced controls feature")}
              >
                🎛️ Advanced Controls
              </button>
              <button
                className="moderator-btn"
                onClick={() => alert("Pattern management feature")}
              >
                📋 Pattern Management
              </button>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import "./RobotVideoFeed.css";

/**
 * RobotVideoFeed Component
 *
 * A React component for viewing webcam streams via Socket.IO.
 * Features:
 * - Real-time streaming via Socket.IO
 * - Connection management with auto-reconnection
 * - Performance monitoring (FPS, data rate)
 * - Fullscreen mode and snapshot capture
 * - Authentication-based access
 * - Debug logging and statistics
 */

const RobotVideoFeed = ({ backendUrl, isConnected }) => {
  const { currentUser } = useAuth();

  // State management
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [currentFps, setCurrentFps] = useState(0);
  const [dataRate, setDataRate] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [statusMessage, setStatusMessage] = useState(
    'Click "Connect" to start viewing'
  );
  const [statusType, setStatusType] = useState("info");
  const [showFps, setShowFps] = useState(true);
  const [showQuality, setShowQuality] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [isStreamVisible, setIsStreamVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [qualityInfo, setQualityInfo] = useState("Quality: Unknown");

  // Refs
  const socketRef = useRef(null);
  const viewerRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const dataTransferredRef = useRef(0);
  const lastDataRateUpdateRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  const maxReconnectAttempts = 5;

  // Utility functions
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setDebugLogs((prev) => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
  };

  const showStatus = (message, type = "info") => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const updateConnectionInfo = () => {
    // This could be expanded to show more detailed connection info
    console.log("Connection info updated");
  };

  const updateFPS = () => {
    const now = Date.now();
    const timeDiff = (now - lastFrameTimeRef.current) / 1000;

    if (timeDiff > 0) {
      // Calculate instantaneous FPS but smooth it out
      const instantFps = 1 / timeDiff;
      // Use a simple moving average for smoother FPS display
      setCurrentFps((prev) => {
        const smoothedFps =
          prev === 0 ? instantFps : prev * 0.8 + instantFps * 0.2;
        return Math.round(smoothedFps);
      });
    }

    lastFrameTimeRef.current = now;
  };

  const updateDataRate = () => {
    const now = Date.now();
    const timeDiff = (now - lastDataRateUpdateRef.current) / 1000;
    if (timeDiff > 0) {
      const rate = (dataTransferredRef.current / timeDiff / 1024).toFixed(1);
      setDataRate(parseFloat(rate));
      dataTransferredRef.current = 0;
      lastDataRateUpdateRef.current = now;
    }
  };

  const showStream = () => {
    setIsStreamVisible(true);
  };

  const hideStream = () => {
    setIsStreamVisible(false);
  };

  const attemptReconnect = () => {
    if (!autoReconnect || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    const newAttempts = reconnectAttempts + 1;
    setReconnectAttempts(newAttempts);
    addDebugLog(
      `🔄 Attempting reconnect ${newAttempts}/${maxReconnectAttempts}`
    );

    setTimeout(() => {
      if (!isSocketConnected && socketRef.current) {
        socketRef.current.connect();
      }
    }, 2000 * newAttempts);
  };

  const handleConnect = () => {
    if (socketRef.current) {
      addDebugLog("🔗 Connecting...");
      socketRef.current.connect();
    }
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      addDebugLog("🔌 Disconnecting...");
      socketRef.current.disconnect();
    }
  };

  const handleFullscreen = () => {
    if (canvasRef.current) {
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
      } else if (canvasRef.current.webkitRequestFullscreen) {
        canvasRef.current.webkitRequestFullscreen();
      } else if (canvasRef.current.msRequestFullscreen) {
        canvasRef.current.msRequestFullscreen();
      }
    }
  };

  const handleSnapshot = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const link = document.createElement("a");
      link.download = `robot-webcam-snapshot-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.png`;
      link.href = canvas.toDataURL();
      link.click();

      addDebugLog("📸 Snapshot saved");
    }
  };

  // Socket.IO setup and event handlers
  useEffect(() => {
    if (!backendUrl) return;

    socketRef.current = io(backendUrl, { autoConnect: false });

    const socket = socketRef.current;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      setReconnectAttempts(0);

      addDebugLog("🔗 Connected to server");
      setConnectionStatus("Connected");
      showStatus("Connected to server", "success");

      // Register as viewer
      socket.emit("register_viewer");

      updateConnectionInfo();
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);

      addDebugLog("🔌 Disconnected from server");
      setConnectionStatus("Disconnected");
      showStatus("Disconnected from server", "error");

      hideStream();
      updateConnectionInfo();

      // Attempt reconnect if enabled
      attemptReconnect();
    });

    socket.on("viewer_registered", (data) => {
      addDebugLog(
        `👀 Registered as viewer - ${data.broadcasters} broadcasters available`
      );

      if (data.broadcasters > 0) {
        showStatus(
          `Connected! ${data.broadcasters} broadcaster(s) available`,
          "success"
        );
      } else {
        showStatus("Connected! Waiting for broadcaster...", "info");
      }
    });

    socket.on("stream", (imageData) => {
      try {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          // Create a new image element
          const img = new Image();

          // Set up the image load handler before setting src
          img.onload = () => {
            // Use requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
              // Set canvas size to match image (only if different)
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }

              // Draw the image on canvas
              ctx.drawImage(img, 0, 0);

              // Update stats after successful frame render
              frameCountRef.current += 1;
              setFrameCount(frameCountRef.current);

              // Update FPS
              updateFPS();

              // Show stream if hidden
              if (!isStreamVisible) {
                showStream();
              }

              // Update data rate every 30 frames
              if (frameCountRef.current % 30 === 0) {
                updateDataRate();
              }

              // Update quality info
              if (showQuality) {
                const sizeKB = (imageData.length / 1024).toFixed(1);
                setQualityInfo(`Size: ${sizeKB} KB`);
              }

              // Debug frame timing every 60 frames
              if (frameCountRef.current % 60 === 0) {
                addDebugLog(
                  `📊 Frame ${
                    frameCountRef.current
                  } - FPS: ${currentFps} - Size: ${(
                    imageData.length / 1024
                  ).toFixed(1)} KB`
                );
              }
            });
          };

          img.onerror = (error) => {
            addDebugLog(`❌ Image load error: ${error.message}`);
          };

          // Set the data URL - this should be done after setting up the handlers
          img.src = imageData;
        }

        // Update data transferred
        dataTransferredRef.current += imageData.length;
      } catch (error) {
        addDebugLog(`❌ Stream error: ${error.message}`);
      }
    });

    socket.on("broadcaster_disconnected", () => {
      addDebugLog("📡 Broadcaster disconnected");
      showStatus(
        "Broadcaster disconnected - waiting for new stream...",
        "info"
      );
      hideStream();
    });

    socket.on("service_stats", (data) => {
      addDebugLog(
        `📊 Service stats: ${data.totalClients} clients, ${data.broadcasters} broadcasters, ${data.viewers} viewers`
      );
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [backendUrl, autoReconnect]);

  // Initialize
  useEffect(() => {
    addDebugLog("📺 Robot Webcam Viewer initialized");
    showStatus('Click "Connect" to start viewing', "info");
  }, []);

  // Update connection info periodically
  useEffect(() => {
    const interval = setInterval(updateConnectionInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="robot-video-feed">
      <div className="video-header">
        <h3>🎥 Robot Webcam</h3>
        <div className="video-controls">
          <button
            className={`toggle-video-btn ${isSocketConnected ? "active" : ""}`}
            onClick={isSocketConnected ? handleDisconnect : handleConnect}
            disabled={!isConnected}
            title={
              isSocketConnected ? "Disconnect from stream" : "Connect to stream"
            }
          >
            {isSocketConnected ? "🔴 Disconnect" : "▶️ Connect"}
          </button>
          {isStreamVisible && (
            <>
              <button
                className="snapshot-btn"
                onClick={handleSnapshot}
                disabled={!isStreamVisible}
                title="Take snapshot"
              >
                📸 Snapshot
              </button>
              <button
                className="fullscreen-btn"
                onClick={handleFullscreen}
                disabled={!isStreamVisible}
                title="Fullscreen"
              >
                🔍 Fullscreen
              </button>
            </>
          )}
        </div>
      </div>

      <div className="video-container">
        {!isConnected ? (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🔌</span>
              <p>Backend not connected</p>
              <p>Please ensure the robot backend is running</p>
            </div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className={`video-stream ${
                isStreamVisible ? "visible" : "hidden"
              }`}
              style={{
                display: isStreamVisible ? "block" : "none",
                width: "100%",
                height: "auto",
                maxWidth: "640px",
                borderRadius: "10px",
                boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
              }}
            />

            {!isStreamVisible && (
              <div className="video-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">📡</span>
                  <p>Waiting for stream...</p>
                  <p>Make sure the transmitter is running and broadcasting</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Video info indicators below the video container */}
      {isStreamVisible && (
        <div
          className="video-indicators"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px",
            padding: "5px 10px",
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: "5px",
          }}
        >
          <div className="live-indicator">🔴 LIVE</div>
          {showFps && <div className="fps-display">{currentFps} FPS</div>}
          {showQuality && <div className="quality-info">{qualityInfo}</div>}
        </div>
      )}

      <div className="viewer-controls">
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showFps}
              onChange={(e) => setShowFps(e.target.checked)}
            />
            Show FPS
          </label>
        </div>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showQuality}
              onChange={(e) => setShowQuality(e.target.checked)}
            />
            Show Quality
          </label>
        </div>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
            />
            Auto-reconnect
          </label>
        </div>
      </div>

      <div className="video-info">
        <div className="info-item">
          <span className="info-label">Connection:</span>
          <span
            className={`info-value ${
              isSocketConnected ? "connected" : "disconnected"
            }`}
          >
            {connectionStatus}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Frames Received:</span>
          <span className="info-value">{frameCount}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Current FPS:</span>
          <span className="info-value">{currentFps}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Data Rate:</span>
          <span className="info-value">{dataRate} KB/s</span>
        </div>
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span
            className={`info-value ${
              statusType === "success" ? "connected" : "disconnected"
            }`}
          >
            {isStreamVisible ? "Live" : "Waiting"}
          </span>
        </div>
      </div>

      <div className="status-message">
        <div className={`status ${statusType}`}>{statusMessage}</div>
      </div>

      <div className="debug-panel">
        <h4>🔧 Debug Information</h4>
        <div className="debug-log">
          {debugLogs.map((log, index) => (
            <div key={index} className="debug-entry">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RobotVideoFeed;

import { useState, useEffect, useRef } from "react";
import "./RobotVideoFeed.css";

/**
 * RobotVideoFeed Component
 *
 * This component displays video stream from the backend server's camera.
 * Features:
 * - Backend webcam streaming via HTTP/WebSocket
 * - Connection status handling
 * - Snapshot capture functionality
 * - Responsive design with glassmorphism theme
 * - Error handling and reconnection logic
 *
 * The video stream comes from the server, not the client device.
 */

export default function RobotVideoFeed({ backendUrl, isConnected }) {
  const [videoError, setVideoError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [streamStatus, setStreamStatus] = useState("disconnected");
  const videoRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Check backend connection and initialize video stream
  useEffect(() => {
    if (isConnected && backendUrl) {
      checkBackendVideoAvailability();
    } else {
      setStreamStatus("disconnected");
      setVideoError("Backend not connected");
    }
    
    return () => {
      stopVideoStream();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [backendUrl, isConnected]);

  // Handle video stream when enabled/disabled
  useEffect(() => {
    if (isVideoEnabled && isConnected) {
      startVideoStream();
    } else {
      stopVideoStream();
    }
  }, [isVideoEnabled, isConnected, backendUrl]);

  const checkBackendVideoAvailability = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/webcam/status`);
      if (response.ok) {
        const status = await response.json();
        setStreamStatus(status.available ? "available" : "unavailable");
        if (!status.available) {
          setVideoError(status.error || "Camera not available on server");
        }
      } else {
        setStreamStatus("unavailable");
        setVideoError("Cannot check camera status on server");
      }
    } catch (error) {
      console.error("Error checking backend camera:", error);
      setStreamStatus("unavailable");
      setVideoError("Failed to connect to camera service");
    }
  };

  const startVideoStream = async () => {
    try {
      setIsLoading(true);
      setVideoError("");

      if (!backendUrl) {
        setVideoError("Backend URL not configured");
        setIsLoading(false);
        return;
      }

      // Set video source to backend stream endpoint
      if (videoRef.current) {
        const streamUrl = `${backendUrl}/api/webcam/stream?t=${Date.now()}`;
        videoRef.current.src = streamUrl;

        videoRef.current.onloadstart = () => {
          setIsLoading(true);
          setStreamStatus("connecting");
        };

        videoRef.current.onloadeddata = () => {
          setIsLoading(false);
          setStreamStatus("connected");
          setVideoError("");
        };

        videoRef.current.onerror = (error) => {
          console.error("Video stream error:", error);
          setIsLoading(false);
          setStreamStatus("error");
          setVideoError("Failed to load video stream from server");
          
          // Retry connection after 3 seconds
          retryTimeoutRef.current = setTimeout(() => {
            if (isVideoEnabled) {
              startVideoStream();
            }
          }, 3000);
        };

        videoRef.current.onended = () => {
          console.log("Video stream ended");
          setStreamStatus("disconnected");
          
          // Retry connection after 2 seconds
          retryTimeoutRef.current = setTimeout(() => {
            if (isVideoEnabled) {
              startVideoStream();
            }
          }, 2000);
        };
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error starting video stream:", error);
      setVideoError(`Video stream error: ${error.message}`);
      setStreamStatus("error");
    }
  };

  const stopVideoStream = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.load(); // Reset video element
    }

    setIsLoading(false);
    setStreamStatus("disconnected");
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const takeSnapshot = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/webcam/snapshot`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setVideoError("Failed to capture snapshot");
      }
    } catch (error) {
      console.error("Error taking snapshot:", error);
      setVideoError("Snapshot capture failed");
    }
  };

  const refreshStream = () => {
    stopVideoStream();
    if (isConnected) {
      setTimeout(() => {
        checkBackendVideoAvailability();
        if (isVideoEnabled) {
          startVideoStream();
        }
      }, 500);
    }
  };

  const getStatusColor = () => {
    switch (streamStatus) {
      case "connected": return "connected";
      case "connecting": return "warning";
      case "available": return "warning";
      case "unavailable": 
      case "error": 
      case "disconnected": 
      default: return "disconnected";
    }
  };

  const getStatusText = () => {
    if (!isConnected) return "Backend Offline";
    if (!isVideoEnabled) return "Stopped";
    if (isLoading) return "Starting...";
    
    switch (streamStatus) {
      case "connected": return "Live Stream";
      case "connecting": return "Connecting...";
      case "available": return "Ready";
      case "unavailable": return "Camera Unavailable";
      case "error": return "Stream Error";
      case "disconnected": return "Disconnected";
      default: return "Unknown";
    }
  };

  return (
    <div className="robot-video-feed">
      <div className="video-header">
        <h3>🎥 Server Camera</h3>
        <div className="video-controls">
          <button
            className={`toggle-video-btn ${isVideoEnabled ? "active" : ""}`}
            onClick={toggleVideo}
            disabled={isLoading || !isConnected}
            title="Toggle video stream"
          >
            {isVideoEnabled ? "🔴 Stop" : "▶️ Start"}
          </button>
          {isVideoEnabled && streamStatus === "connected" && (
            <button
              className="snapshot-btn"
              onClick={takeSnapshot}
              disabled={isLoading}
              title="Take snapshot"
            >
              📸 Snapshot
            </button>
          )}
          <button
            className="refresh-btn"
            onClick={refreshStream}
            disabled={isLoading}
            title="Refresh stream"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div className="video-container">
        {!isVideoEnabled ? (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎥</span>
              <p>Click "Start" to begin video stream</p>
              {!isConnected && (
                <p className="connection-warning">
                  ⚠️ Backend connection required
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="video-loading">
                <div className="loading-spinner"></div>
                <p>Loading video stream...</p>
              </div>
            )}
            <video
              ref={videoRef}
              className={`video-stream ${isLoading ? "hidden" : ""}`}
              autoPlay
              playsInline
              muted
              controls={false}
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        )}

        {videoError && (
          <div className="video-error">
            <span className="error-icon">⚠️</span>
            <p>{videoError}</p>
            <button className="retry-btn" onClick={refreshStream}>
              🔄 Retry Connection
            </button>
          </div>
        )}
      </div>
      
      <div className="video-info">
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span className={`info-value ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Source:</span>
          <span className="info-value">Server Camera</span>
        </div>
        <div className="info-item">
          <span className="info-label">Backend:</span>
          <span className={`info-value ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? "Connected" : "Offline"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Stream URL:</span>
          <span className="info-value url-display">
            📡 {backendUrl}/api/webcam/stream
          </span>
        </div>
      </div>
    </div>
  );
}

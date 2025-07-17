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

      // First, check if the stream endpoint is available
      try {
        const testResponse = await fetch(`${backendUrl}/api/webcam/status`);
        if (!testResponse.ok) {
          throw new Error(`Server returned ${testResponse.status}`);
        }
        const status = await testResponse.json();
        if (!status.available) {
          setVideoError(status.error || "Camera not available on server");
          setIsLoading(false);
          setStreamStatus("unavailable");
          return;
        }
      } catch (fetchError) {
        console.error("Stream availability check failed:", fetchError);
        setVideoError("Cannot connect to camera service");
        setIsLoading(false);
        setStreamStatus("error");
        return;
      }

      // Set video source to backend stream endpoint
      if (videoRef.current) {
        // Reset video element first
        videoRef.current.src = "";
        videoRef.current.load();

        const streamUrl = `${backendUrl}/api/webcam/stream?t=${Date.now()}`;
        console.log("Attempting to load MJPEG stream from:", streamUrl);

        // For MJPEG streams, we need to handle them as images, not video
        // Create an img element for MJPEG display instead of video element
        const mjpegImg = document.createElement("img");
        mjpegImg.style.width = "100%";
        mjpegImg.style.height = "auto";
        mjpegImg.style.objectFit = "contain";
        mjpegImg.className = "mjpeg-stream";

        mjpegImg.onload = () => {
          console.log("MJPEG stream loaded successfully");
          setIsLoading(false);
          setStreamStatus("connected");
          setVideoError("");
        };

        mjpegImg.onerror = (error) => {
          console.error("MJPEG stream error:", error);
          setIsLoading(false);
          setStreamStatus("error");
          setVideoError("Failed to load MJPEG stream from server");

          // Retry connection after 3 seconds
          retryTimeoutRef.current = setTimeout(() => {
            if (isVideoEnabled) {
              startVideoStream();
            }
          }, 3000);
        };

        // Replace video element with img element in the container
        const videoContainer = videoRef.current.parentElement;
        if (videoContainer) {
          // Hide the video element and show the MJPEG image
          videoRef.current.style.display = "none";

          // Remove any existing MJPEG image
          const existingImg = videoContainer.querySelector(".mjpeg-stream");
          if (existingImg) {
            existingImg.remove();
          }

          // Add new MJPEG image
          videoContainer.appendChild(mjpegImg);

          // Set the MJPEG stream source
          mjpegImg.src = streamUrl;
        }
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

      // Also remove any MJPEG image elements
      const videoContainer = videoRef.current.parentElement;
      if (videoContainer) {
        const mjpegImg = videoContainer.querySelector(".mjpeg-stream");
        if (mjpegImg) {
          mjpegImg.remove();
        }
        // Show video element again
        videoRef.current.style.display = "block";
      }
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
        method: "POST",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement("a");
        a.href = url;
        a.download = `snapshot-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, "-")}.jpg`;
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

  const testStreamEndpoint = async () => {
    try {
      const streamUrl = `${backendUrl}/api/webcam/stream`;
      console.log("Testing MJPEG stream endpoint:", streamUrl);

      // First test with HEAD request
      try {
        const headResponse = await fetch(streamUrl, {
          method: "HEAD",
        });

        console.log("HEAD request result:", {
          status: headResponse.status,
          statusText: headResponse.statusText,
          headers: Object.fromEntries(headResponse.headers.entries()),
        });
      } catch (headError) {
        console.log("HEAD request failed:", headError);
      }

      // Test the status endpoint first
      try {
        const statusResponse = await fetch(`${backendUrl}/api/webcam/status`);
        const statusData = await statusResponse.json();
        console.log("Camera status:", statusData);

        if (!statusData.available) {
          setVideoError(
            `Camera not available: ${statusData.message || statusData.error}`
          );
          return;
        }
      } catch (statusError) {
        console.log("Status check failed:", statusError);
      }

      // Then test with GET request to see what we actually get
      try {
        const getResponse = await fetch(streamUrl, {
          method: "GET",
        });

        const contentType = getResponse.headers.get("content-type");
        console.log("GET request result:", {
          status: getResponse.status,
          statusText: getResponse.statusText,
          contentType: contentType,
          headers: Object.fromEntries(getResponse.headers.entries()),
        });

        // For MJPEG streams, expect multipart/x-mixed-replace
        if (getResponse.ok) {
          if (
            contentType &&
            contentType.includes("multipart/x-mixed-replace")
          ) {
            setVideoError(""); // Clear any previous errors
            console.log("MJPEG stream endpoint is working correctly!");
          } else if (contentType && contentType.includes("application/json")) {
            // Server returned JSON error
            const errorData = await getResponse.json();
            setVideoError(
              `Server error: ${errorData.message || errorData.error}`
            );
          } else {
            setVideoError(
              `Unexpected content type: ${contentType || "unknown"}`
            );
          }
        } else {
          // Try to read response as JSON for error details
          try {
            const errorData = await getResponse.json();
            setVideoError(
              `Stream endpoint error: ${errorData.message || errorData.error}`
            );
          } catch {
            setVideoError(
              `Stream endpoint returned ${getResponse.status}: ${getResponse.statusText}`
            );
          }
        }
      } catch (getError) {
        console.log("GET request failed:", getError);
        setVideoError(`Stream endpoint test failed: ${getError.message}`);
      }
    } catch (error) {
      console.error("Stream endpoint test failed:", error);
      setVideoError(`Stream endpoint test failed: ${error.message}`);
    }
  };

  const getStatusColor = () => {
    switch (streamStatus) {
      case "connected":
        return "connected";
      case "connecting":
        return "warning";
      case "available":
        return "warning";
      case "unavailable":
      case "error":
      case "disconnected":
      default:
        return "disconnected";
    }
  };

  const getStatusText = () => {
    if (!isConnected) return "Backend Offline";
    if (!isVideoEnabled) return "Stopped";
    if (isLoading) return "Starting...";

    switch (streamStatus) {
      case "connected":
        return "Live Stream";
      case "connecting":
        return "Connecting...";
      case "available":
        return "Ready";
      case "unavailable":
        return "Camera Unavailable";
      case "error":
        return "Stream Error";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
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
          <button
            className="test-btn"
            onClick={testStreamEndpoint}
            disabled={isLoading}
            title="Test stream endpoint"
          >
            🔍 Test
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
          <span
            className={`info-value ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
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

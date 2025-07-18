import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./RobotVideoFeed.css";

/**
 * RobotVideoFeed Component
 *
 * This component provides access to the backend webcam service using server-side camera capture.
 * Features:
 * - Real-time webcam streaming from backend server
 * - Backend camera status monitoring
 * - Image capture functionality
 * - Device enumeration via backend
 * - Responsive design with glassmorphism theme
 * - Authentication-based camera access
 *
 * Connects to backend webcam routes for server-side camera operations.
 */

export default function RobotVideoFeed({ backendUrl, isConnected }) {
  const { currentUser } = useAuth();
  const [videoError, setVideoError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const imgRef = useRef(null);
  const streamIntervalRef = useRef(null);

  // Check backend webcam status on component mount
  useEffect(() => {
    if (isConnected && backendUrl && currentUser) {
      checkBackendWebcamStatus();
      getAvailableDevices();
    }
    return () => {
      stopVideoStream();
    };
  }, [isConnected, backendUrl, currentUser]);

  // Handle video stream when enabled/disabled
  useEffect(() => {
    if (isVideoEnabled && isConnected && currentUser) {
      startVideoStream();
    } else {
      stopVideoStream();
    }
  }, [isVideoEnabled, isConnected, currentUser]);

  const checkBackendWebcamStatus = async () => {
    if (!backendUrl || !isConnected) {
      setVideoError("Backend not connected");
      return;
    }

    if (!currentUser) {
      setVideoError("User not authenticated");
      return;
    }

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch(`${backendUrl}/api/webcam/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const status = await response.json();
      setBackendStatus(status);

      if (!status.isInitialized) {
        setVideoError(status.error || "Backend webcam not initialized");
      } else {
        setVideoError("");
      }
    } catch (error) {
      console.error("Error checking backend webcam status:", error);
      setVideoError(`Backend error: ${error.message}`);
      setBackendStatus(null);
    }
  };

  const getAvailableDevices = async () => {
    if (!backendUrl || !isConnected || !currentUser) return;

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch(`${backendUrl}/api/webcam/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeviceInfo({
          count: data.devices?.length || 0,
          devices: data.devices || [],
        });
      }
    } catch (error) {
      console.error("Error getting device info:", error);
    }
  };

  const startVideoStream = async () => {
    if (!backendUrl || !isConnected) {
      setVideoError("Backend not connected");
      return;
    }

    if (!currentUser) {
      setVideoError("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setVideoError("");

      const token = await currentUser.getIdToken();

      // Test backend webcam first
      const testResponse = await fetch(`${backendUrl}/api/webcam/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        throw new Error(errorData.error || "Webcam test failed");
      }

      // Always try MJPEG stream first - it's much more efficient
      console.log("Starting MJPEG stream...");
      startMJPEGStream(token);

      // Don't set loading to false here - let the stream handle it
    } catch (error) {
      setIsLoading(false);
      console.error("Error starting video stream:", error);

      if (error.message.includes("403")) {
        setVideoError(
          "Access denied. Please verify your email with OTP first."
        );
      } else if (error.message.includes("401")) {
        setVideoError("Authentication failed. Please log in again.");
      } else if (error.message.includes("503")) {
        setVideoError("Backend webcam not available. Try reinitializing.");
      } else {
        setVideoError(`Stream error: ${error.message}`);
      }
    }
  };

  const startMJPEGStream = (token) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    if (imgRef.current) {
      // Clean up previous stream URL
      if (
        imgRef.current.src.startsWith("blob:") ||
        imgRef.current.src.includes("/api/webcam/stream")
      ) {
        if (imgRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(imgRef.current.src);
        }
      }

      // Set up direct MJPEG stream URL with auth token as query parameter
      const streamUrl = `${backendUrl}/api/webcam/stream?auth=${encodeURIComponent(
        token
      )}&t=${Date.now()}`;

      console.log("Starting MJPEG stream with URL:", streamUrl);

      // Set up timeout for stream loading
      const loadTimeout = setTimeout(() => {
        console.warn(
          "MJPEG stream loading timeout, falling back to image capture"
        );
        startImageStream(token);
      }, 10000); // Increased to 10 seconds

      imgRef.current.onload = () => {
        clearTimeout(loadTimeout);
        setIsLoading(false);
        console.log("MJPEG stream started successfully");
      };

      imgRef.current.onerror = (error) => {
        clearTimeout(loadTimeout);
        console.error("MJPEG stream error:", error);
        console.log("MJPEG stream failed, this is expected for some browsers");
        // Don't fallback immediately - MJPEG streams often work even if they trigger onerror
        // Instead, let's try a different approach
        setIsLoading(false);
      };

      // Try to set the source and see if it works
      try {
        imgRef.current.src = streamUrl;

        // Give it a moment to start, then check if it's working
        setTimeout(() => {
          if (imgRef.current && imgRef.current.src === streamUrl) {
            console.log("MJPEG stream URL set successfully");
            clearTimeout(loadTimeout);
            setIsLoading(false);
          }
        }, 2000);
      } catch (error) {
        console.error("Error setting MJPEG stream source:", error);
        clearTimeout(loadTimeout);
        startImageStream(token);
      }
    }
  };

  const startImageStream = (token) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    console.log(
      "Starting fallback image stream (this should only be used if MJPEG fails)"
    );

    const fetchFrame = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/webcam/capture`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);

          if (imgRef.current) {
            // Clean up previous object URL
            if (imgRef.current.src.startsWith("blob:")) {
              URL.revokeObjectURL(imgRef.current.src);
            }
            imgRef.current.src = imageUrl;

            // Set loading to false on first successful frame
            if (isLoading) {
              setIsLoading(false);
            }
          }
        } else {
          console.error("Failed to fetch frame:", response.status);
        }
      } catch (error) {
        console.error("Error fetching frame:", error);
      }
    };

    // Much slower fallback: 2 FPS to reduce server load when MJPEG fails
    // Only use this as last resort
    streamIntervalRef.current = setInterval(fetchFrame, 500);
    fetchFrame(); // Get first frame immediately
  };

  const stopVideoStream = () => {
    // Clear any interval-based image fetching
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (imgRef.current) {
      // Clean up any blob URLs
      if (imgRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(imgRef.current.src);
      }

      // Clear the image source to stop any streaming
      imgRef.current.src = "";
      imgRef.current.onload = null;
      imgRef.current.onerror = null;
    }

    setIsLoading(false);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const takeSnapshot = async () => {
    if (!backendUrl || !isConnected) {
      setVideoError("Backend not connected");
      return;
    }

    if (!currentUser) {
      setVideoError("User not authenticated");
      setIsCapturing(false);
      return;
    }

    try {
      setIsCapturing(true);
      setVideoError("");

      const token = await currentUser.getIdToken();

      const response = await fetch(`${backendUrl}/api/webcam/capture`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to capture image");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `robot-webcam-snapshot-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsCapturing(false);
    } catch (error) {
      console.error("Snapshot error:", error);
      setVideoError(`Snapshot error: ${error.message}`);
      setIsCapturing(false);
    }
  };

  const reinitializeWebcam = async () => {
    if (!backendUrl || !isConnected) {
      setVideoError("Backend not connected");
      return;
    }

    if (!currentUser) {
      setVideoError("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setVideoError("");

      const token = await currentUser.getIdToken();

      const response = await fetch(`${backendUrl}/api/webcam/reinitialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reinitialize webcam");
      }

      const result = await response.json();
      if (result.success) {
        await checkBackendWebcamStatus();
        setVideoError("");
      } else {
        setVideoError(result.error || "Failed to reinitialize webcam");
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Reinitialize error:", error);
      setVideoError(`Reinitialize error: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="robot-video-feed">
      <div className="video-header">
        <h3>🎥 Robot Webcam</h3>
        <div className="video-controls">
          <button
            className={`toggle-video-btn ${isVideoEnabled ? "active" : ""}`}
            onClick={toggleVideo}
            disabled={isLoading || !isConnected}
            title="Toggle webcam feed"
          >
            {isVideoEnabled ? "🔴 Stop" : "▶️ Start"}
          </button>
          {isVideoEnabled && (
            <button
              className="snapshot-btn"
              onClick={takeSnapshot}
              disabled={isCapturing || isLoading || !isConnected}
              title="Take snapshot"
            >
              {isCapturing ? "📸 Capturing..." : "📸 Snapshot"}
            </button>
          )}
          <button
            className="reinitialize-btn"
            onClick={reinitializeWebcam}
            disabled={isLoading || !isConnected}
            title="Reinitialize backend webcam"
          >
            🔄 Reinit
          </button>
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
        ) : !isVideoEnabled ? (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎥</span>
              <p>Click "Start" to begin robot webcam stream</p>
              {backendStatus && !backendStatus.isInitialized && (
                <button className="permission-btn" onClick={reinitializeWebcam}>
                  � Initialize Backend Webcam
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="video-loading">
                <div className="loading-spinner"></div>
                <p>Starting robot webcam...</p>
              </div>
            )}
            <img
              ref={imgRef}
              className={`video-stream ${isLoading ? "hidden" : ""}`}
              alt="Robot webcam feed"
              style={{
                display: isLoading ? "none" : "block",
                width: "100%",
                height: "auto",
                maxWidth: "640px",
              }}
            />
          </>
        )}

        {videoError && (
          <div className="video-error">
            <span className="error-icon">⚠️</span>
            <p>{videoError}</p>
            {videoError.includes("not initialized") ||
            videoError.includes("503") ? (
              <button className="retry-btn" onClick={reinitializeWebcam}>
                � Reinitialize Backend Webcam
              </button>
            ) : videoError.includes("Authentication") ||
              videoError.includes("401") ? (
              <button
                className="retry-btn"
                onClick={() => window.location.reload()}
              >
                🔄 Refresh Page
              </button>
            ) : (
              <button className="retry-btn" onClick={checkBackendWebcamStatus}>
                🔄 Retry
              </button>
            )}
          </div>
        )}
      </div>
      <div className="video-info">
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span
            className={`info-value ${
              isVideoEnabled &&
              (streamIntervalRef.current ||
                (imgRef.current &&
                  imgRef.current.src &&
                  !imgRef.current.src.startsWith("blob:")))
                ? "connected"
                : "disconnected"
            }`}
          >
            {!isConnected
              ? "Disconnected"
              : isVideoEnabled
              ? isLoading
                ? "Starting..."
                : streamIntervalRef.current ||
                  (imgRef.current &&
                    imgRef.current.src &&
                    imgRef.current.src.includes("/api/webcam/stream"))
                ? "Live"
                : "Error"
              : "Stopped"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Source:</span>
          <span className="info-value">
            {backendStatus?.isInitialized ? "Backend Webcam" : "Not Available"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Backend:</span>
          <span
            className={`info-value ${
              backendStatus?.isInitialized ? "connected" : "disconnected"
            }`}
          >
            {!isConnected
              ? "Offline"
              : backendStatus?.isInitialized
              ? "Ready"
              : "Error"}
          </span>
        </div>
        {deviceInfo && deviceInfo.count > 0 && (
          <div className="info-item">
            <span className="info-label">Devices:</span>
            <span className="info-value">{deviceInfo.count} found</span>
          </div>
        )}
        {backendStatus && (
          <div className="info-item">
            <span className="info-label">Quality:</span>
            <span className="info-value">
              {backendStatus.options?.width}x{backendStatus.options?.height}{" "}
              JPEG
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

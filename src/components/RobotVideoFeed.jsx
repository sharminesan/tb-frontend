import { useState, useEffect, useRef } from "react";
import "./RobotVideoFeed.css";

/**
 * RobotVideoFeed Component
 *
 * This component provides direct access to the user's local webcam using the Web API's getUserMedia().
 * Features:
 * - Real-time webcam streaming without backend dependency
 * - Permission handling and error management
 * - Snapshot capture functionality
 * - Responsive design with glassmorphism theme
 * - Device enumeration and status reporting
 *
 * The video is mirrored (like a selfie camera) for better user experience.
 */

export default function RobotVideoFeed({ backendUrl, isConnected }) {
  const [videoError, setVideoError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check for camera permissions and availability on component mount
  useEffect(() => {
    checkCameraAvailability();
    return () => {
      stopVideoStream();
    };
  }, []);

  // Handle video stream when enabled/disabled
  useEffect(() => {
    if (isVideoEnabled) {
      startVideoStream();
    } else {
      stopVideoStream();
    }
  }, [isVideoEnabled]);

  const checkCameraAvailability = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVideoError("Camera access is not supported in this browser");
        return;
      }

      // Check camera permissions
      const permission = await navigator.permissions.query({ name: "camera" });
      setHasPermission(permission.state);

      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices.length > 0) {
        setDeviceInfo({
          count: videoDevices.length,
          defaultDevice: videoDevices[0].label || "Camera 1",
        });
      } else {
        setVideoError("No camera devices found");
      }
    } catch (error) {
      console.error("Error checking camera availability:", error);
      setVideoError("Unable to check camera availability");
    }
  };

  const startVideoStream = async () => {
    try {
      setIsLoading(true);
      setVideoError("");

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          setHasPermission("granted");
        };

        videoRef.current.onerror = (error) => {
          console.error("Video element error:", error);
          setIsLoading(false);
          setVideoError("Error displaying video stream");
        };
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error accessing camera:", error);

      if (error.name === "NotAllowedError") {
        setVideoError(
          "Camera access denied. Please allow camera permissions and try again."
        );
        setHasPermission("denied");
      } else if (error.name === "NotFoundError") {
        setVideoError(
          "No camera found. Please connect a camera and try again."
        );
      } else if (error.name === "NotReadableError") {
        setVideoError("Camera is already in use by another application.");
      } else {
        setVideoError(`Camera error: ${error.message}`);
      }
    }
  };

  const stopVideoStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsLoading(false);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !streamRef.current) {
      setVideoError("No video stream available for snapshot");
      return;
    }

    try {
      // Create a canvas to capture the current frame
      const canvas = document.createElement("canvas");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `webcam-snapshot-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error("Snapshot error:", error);
      setVideoError("Error taking snapshot");
    }
  };

  const requestPermissions = async () => {
    try {
      setVideoError("");
      await startVideoStream();
    } catch (error) {
      // Error handling is already done in startVideoStream
    }
  };

  return (
    <div className="robot-video-feed">
      <div className="video-header">
        <h3>🎥 Local Webcam</h3>
        <div className="video-controls">
          <button
            className={`toggle-video-btn ${isVideoEnabled ? "active" : ""}`}
            onClick={toggleVideo}
            disabled={isLoading}
            title="Toggle webcam feed"
          >
            {isVideoEnabled ? "🔴 Stop" : "▶️ Start"}
          </button>
          {isVideoEnabled && streamRef.current && (
            <button
              className="snapshot-btn"
              onClick={takeSnapshot}
              disabled={isLoading}
              title="Take snapshot"
            >
              📸 Snapshot
            </button>
          )}
        </div>
      </div>
      <div className="video-container">
        {!isVideoEnabled ? (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎥</span>
              <p>Click "Start" to begin webcam stream</p>
              {hasPermission === "denied" && (
                <button className="permission-btn" onClick={requestPermissions}>
                  🔓 Request Camera Access
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="video-loading">
                <div className="loading-spinner"></div>
                <p>Starting webcam...</p>
              </div>
            )}
            <video
              ref={videoRef}
              className={`video-stream ${isLoading ? "hidden" : ""}`}
              autoPlay
              playsInline
              muted
              style={{ display: isLoading ? "none" : "block" }}
            />
          </>
        )}

        {videoError && (
          <div className="video-error">
            <span className="error-icon">⚠️</span>
            <p>{videoError}</p>
            {hasPermission === "denied" ? (
              <button className="retry-btn" onClick={requestPermissions}>
                🔓 Grant Camera Access
              </button>
            ) : (
              <button className="retry-btn" onClick={checkCameraAvailability}>
                🔄 Retry
              </button>
            )}
          </div>
        )}
      </div>{" "}
      <div className="video-info">
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span
            className={`info-value ${
              streamRef.current ? "connected" : "disconnected"
            }`}
          >
            {isVideoEnabled
              ? isLoading
                ? "Starting..."
                : streamRef.current
                ? "Live"
                : "Error"
              : "Stopped"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Source:</span>
          <span className="info-value">
            {deviceInfo ? deviceInfo.defaultDevice : "Local Webcam"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Permission:</span>
          <span
            className={`info-value ${
              hasPermission === "granted" ? "connected" : "disconnected"
            }`}
          >
            {hasPermission === "granted"
              ? "Allowed"
              : hasPermission === "denied"
              ? "Denied"
              : "Unknown"}
          </span>
        </div>
        {deviceInfo && (
          <div className="info-item">
            <span className="info-label">Devices:</span>
            <span className="info-value">{deviceInfo.count} found</span>
          </div>
        )}
      </div>
    </div>
  );
}

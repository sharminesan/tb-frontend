import { useState, useEffect, useRef } from 'react'
import './WebcamStream.css'

export default function WebcamStream({ 
  title = 'TurtleBot Camera Feed' 
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [streamStats, setStreamStats] = useState({
    fps: 0,
    resolution: '',
    latency: 0
  })
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    const initializeStream = () => {
      setIsLoading(true)
      setHasError(false)

      // Since everything is on the same Raspberry Pi, use localhost
      const baseUrl = window.location.origin.replace(window.location.port, '4000')
      const streamUrl = `${baseUrl}/api/camera/stream`
      
      // Set up video element with direct stream URL
      if (videoRef.current) {
        videoRef.current.src = streamUrl
        videoRef.current.onloadstart = () => {
          setIsLoading(false)
          setIsConnected(true)
          setHasError(false)
        }
        videoRef.current.onerror = () => {
          setIsLoading(false)
          setIsConnected(false)
          setHasError(true)
          // Retry with fallback URL
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.src = `http://localhost:4000/api/camera/stream?t=${Date.now()}`
            }
          }, 2000)
        }
        videoRef.current.oncanplay = () => {
          setIsLoading(false)
          setIsConnected(true)
          setHasError(false)
        }
      }
    }

    initializeStream()
    
    // Retry connection every 10 seconds if there's an error
    const retryInterval = setInterval(() => {
      if (hasError) {
        initializeStream()
      }
    }, 10000)

    return () => {
      clearInterval(retryInterval)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const refreshStream = () => {
    setIsLoading(true)
    setHasError(false)
    // Force reload by changing the src with timestamp
    if (videoRef.current) {
      const baseUrl = window.location.origin.replace(window.location.port, '4000')
      videoRef.current.src = `${baseUrl}/api/camera/stream?t=${Date.now()}`
    }
  }

  const takeSnapshot = async () => {
    try {
      // Request snapshot from backend
      const baseUrl = window.location.origin.replace(window.location.port, '4000')
      const response = await fetch(`${baseUrl}/api/camera/snapshot`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // Download the snapshot
        const link = document.createElement('a')
        link.download = `turtlebot-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`
        link.href = url
        link.click()
        
        // Clean up
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to take snapshot:', error)
    }
  }

  return (
    <div className={`webcam-stream ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="stream-header">
        <h3>{title}</h3>
        <div className="stream-controls">
          <button 
            className="control-btn refresh-btn"
            onClick={refreshStream}
            title="Refresh Stream"
          >
            🔄
          </button>
          <button 
            className="control-btn snapshot-btn"
            onClick={takeSnapshot}
            title="Take Snapshot"
            disabled={hasError || isLoading}
          >
            📷
          </button>
          <button 
            className="control-btn fullscreen-btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </div>

      <div className="stream-container">
        {isLoading && (
          <div className="stream-status loading">
            <div className="spinner"></div>
            <p>Connecting to camera...</p>
          </div>
        )}

        {hasError && (
          <div className="stream-status error">
            <div className="error-icon">📹</div>
            <h4>Camera Unavailable</h4>
            <p>Cannot connect to the camera stream</p>
            <div className="error-details">
              <p>Trying: {streamUrl}</p>
              <button className="retry-btn" onClick={refreshStream}>
                Try Again
              </button>
            </div>
          </div>
        )}        {!hasError && (
          <video
            ref={videoRef}
            className="stream-video"
            autoPlay
            muted
            playsInline
            style={{ display: isLoading ? 'none' : 'block' }}
          >
            Your browser does not support video streaming.
          </video>
        )}

        {/* Fallback: If video doesn't work, use image streaming */}
        {hasError && (
          <img
            src={`${window.location.origin.replace(window.location.port, '4000')}/api/camera/stream?t=${Date.now()}`}
            alt="TurtleBot Camera Feed"
            className="stream-video fallback-stream"
            onLoad={() => {
              setIsLoading(false)
              setHasError(false)
              setIsConnected(true)
            }}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
              setIsConnected(false)
            }}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        )}
      </div>      <div className="stream-info">
        <div className="stream-stats">
          <span className={`status-indicator ${!isConnected ? 'offline' : 'online'}`}>
            {!isConnected ? '🔴 Offline' : '🟢 Live'}
          </span>
          <span className="stream-url">
            📡 localhost:4000/api/camera/stream
          </span>
          {isConnected && (
            <span className="stream-quality">
              📊 Ready
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

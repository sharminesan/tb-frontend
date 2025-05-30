import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import './Dashboard.css'

export default function Dashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [socket, setSocket] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const [batteryStatus, setBatteryStatus] = useState('Unknown')
  const [robotStatus, setRobotStatus] = useState(null)
  const [backendUrl] = useState('http://192.168.1.15:4000')
  useEffect(() => {
    // Initialize socket connection without backend authentication
    const newSocket = io(backendUrl)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnectionStatus('Connected')
      console.log('Connected to robot backend via Socket.IO')
      
      // Fetch initial robot status after connection
      fetchRobotStatus()
      fetchSensorData()
    })

    newSocket.on('disconnect', () => {
      setConnectionStatus('Disconnected')
      console.log('Disconnected from robot backend')
    })

    // Listen for battery updates
    newSocket.on('battery_update', (data) => {
      setBatteryStatus(`${Math.round(data.percentage * 100)}%`)
    })

    // Listen for status updates
    newSocket.on('status_update', (data) => {
      setRobotStatus(data)
    })

    // Listen for movement responses
    newSocket.on('move_response', (data) => {
      console.log('Move response:', data)
    })

    // Listen for emergency stop notifications
    newSocket.on('emergency_stop_activated', (data) => {
      console.log('Emergency stop activated:', data)
      alert('Emergency stop activated!')
    })

    return () => newSocket.close()
  }, [backendUrl])
  const fetchRobotStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/status`)
      
      if (response.ok) {
        const status = await response.json()
        setRobotStatus(status)
      }
    } catch (error) {
      console.error('Error fetching robot status:', error)
    }
  }

  const fetchSensorData = async () => {
    try {
      // Fetch battery data
      const batteryResponse = await fetch(`${backendUrl}/api/sensors/battery`)
      
      if (batteryResponse.ok) {
        const batteryData = await batteryResponse.json()
        setBatteryStatus(`${Math.round(batteryData.percentage * 100)}%`)
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error)
    }
  }

  const handleLogout = async () => {
    try {
      // Only logout from Firebase (no backend logout needed)
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }
  const sendCommand = async (command, parameters = {}) => {
    // Use Socket.IO for real-time commands (primary method)
    if (socket && socket.connected) {
      socket.emit('move_command', { 
        action: command, 
        parameters,
        user: currentUser?.email || 'firebase-user' // Include user info for logging
      })
      console.log(`Sent command via Socket.IO: ${command}`, parameters)
    } else {
      // Fallback to REST API if socket is not connected
      try {
        const response = await fetch(`${backendUrl}/api/move/${command}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...parameters,
            user: currentUser?.email || 'firebase-user'
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log(`REST API command result:`, result)
        } else {
          console.error('Failed to send command via REST API')
        }
      } catch (error) {
        console.error('Error sending command:', error)
        alert('Failed to send command to robot!')
      }
    }
  }
  const emergencyStop = () => {
    if (socket && socket.connected) {
      socket.emit('emergency_stop', {
        user: currentUser?.email || 'firebase-user'
      })
    } else {
      // Fallback to REST API
      fetch(`${backendUrl}/api/emergency_stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: currentUser?.email || 'firebase-user'
        })
      }).catch(error => console.error('Emergency stop failed:', error))
    }
  }

  const connectToRobot = () => {
    if (socket) {
      socket.connect()
    } else {
      // Re-initialize socket connection
      const newSocket = io(backendUrl)
      setSocket(newSocket)
    }
  }

  const disconnectFromRobot = () => {
    if (socket) {
      socket.disconnect()
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>TurtleBot Controller</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.displayName || currentUser?.email}</span>
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
                <div className={`status-value ${connectionStatus.toLowerCase()}`}>
                  {connectionStatus}
                </div>
              </div>
              <div className="status-item">
                <div className="status-title">Battery</div>
                <div className="status-value">{batteryStatus}</div>
              </div>
              <div className="status-item">
                <div className="status-title">User</div>
                <div className="status-value">{currentUser?.displayName || currentUser?.email}</div>
              </div>
            </div>
          </div>

          <div className="control-panel">
            <h2>Movement Controls</h2>
            <div className="controls-grid">
              <div></div>
              <button 
                className="control-btn" 
                onClick={() => sendCommand('forward')}
                title="Move Forward"
              >
                ↑
              </button>
              <div></div>

              <button 
                className="control-btn" 
                onClick={() => sendCommand('left')}
                title="Turn Left"
              >
                ←
              </button>
              <button 
                className="control-btn stop-btn" 
                onClick={() => sendCommand('stop')}
                title="Stop"
              >
                ⏹
              </button>
              <button 
                className="control-btn" 
                onClick={() => sendCommand('right')}
                title="Turn Right"
              >
                →
              </button>

              <div></div>
              <button 
                className="control-btn" 
                onClick={() => sendCommand('backward')}
                title="Move Backward"
              >
                ↓
              </button>
              <div></div>
            </div>
          </div>          <div className="settings-panel">
            <h2>Robot Connection</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Robot Backend URL</label>
                <input 
                  type="text" 
                  value={backendUrl} 
                  readOnly 
                />
              </div>
              <div className="form-group">
                <label>Authenticated User</label>
                <input 
                  type="text" 
                  value={currentUser?.displayName || currentUser?.email || 'User'} 
                  readOnly 
                />
              </div>
              <div className="button-group">
                <button 
                  className="connect-btn"
                  onClick={connectToRobot}
                  disabled={connectionStatus === 'Connected'}
                >
                  Connect to Robot
                </button>
                <button 
                  className="disconnect-btn"
                  onClick={disconnectFromRobot}
                  disabled={connectionStatus === 'Disconnected'}
                >
                  Disconnect
                </button>
                <button 
                  className="emergency-btn"
                  onClick={emergencyStop}
                >
                  Emergency Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

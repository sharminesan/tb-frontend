import { useState, useEffect } from 'react'
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
  const [backendUrl] = useState('http://localhost:3000')

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(backendUrl)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnectionStatus('Connected')
    })

    newSocket.on('disconnect', () => {
      setConnectionStatus('Disconnected')
    })

    newSocket.on('battery_status', (data) => {
      setBatteryStatus(`${data.level}%`)
    })

    return () => newSocket.close()
  }, [backendUrl])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  const sendCommand = (command) => {
    if (socket && socket.connected) {
      socket.emit('robot_command', { command })
      console.log(`Sent command: ${command}`)
    } else {
      alert('Not connected to backend!')
    }
  }

  const connectToBackend = () => {
    if (socket) {
      socket.connect()
    }
  }

  const disconnectFromBackend = () => {
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
          </div>

          <div className="settings-panel">
            <h2>Backend Connection</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Backend URL</label>
                <input 
                  type="text" 
                  value={backendUrl} 
                  readOnly 
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={currentUser?.displayName || currentUser?.email || 'User'} 
                  readOnly 
                />
              </div>
              <div className="button-group">
                <button 
                  className="connect-btn"
                  onClick={connectToBackend}
                  disabled={connectionStatus === 'Connected'}
                >
                  Connect to Backend
                </button>
                <button 
                  className="disconnect-btn"
                  onClick={disconnectFromBackend}
                  disabled={connectionStatus === 'Disconnected'}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

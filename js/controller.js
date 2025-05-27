// TurtleBot Controller JavaScript

// Configuration
const BACKEND_URL = 'http://localhost:3000'; // Your Node.js backend URL

// Global variables
let socket = null;
let isConnected = false;
let isAuthenticated = false;
let speedLinear = 0.2; // m/s
let speedAngular = 0.5; // rad/s

// Notification system
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    max-width: 300px;
    word-wrap: break-word;
    ${isError ? 'background-color: #f44336;' : 'background-color: #4CAF50;'}
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
  
  // Also log to console
  if (isError) {
    console.error(message);
  } else {
    console.log(message);
  }
}

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connect-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const connectionStatus = document.getElementById("connection-status");
  const batteryStatus = document.getElementById("battery-status");
  const backendUrl = document.getElementById("backend-url");
  const username = document.getElementById("username");
  const password = document.getElementById("password");

  // Movement buttons
  const forwardBtn = document.getElementById("forward-btn");
  const backwardBtn = document.getElementById("backward-btn");
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const stopBtn = document.getElementById("stop-btn");
  // Connect to Backend
  connectBtn.addEventListener("click", () => {
    connectToBackend();
  });

  // Disconnect from Backend
  disconnectBtn.addEventListener("click", () => {
    disconnectFromBackend();
  });
  // Movement control events
  forwardBtn.addEventListener("click", () => sendMoveCommand('forward', { speed: speedLinear }));
  backwardBtn.addEventListener("click", () => sendMoveCommand('backward', { speed: speedLinear }));
  leftBtn.addEventListener("click", () => sendMoveCommand('left', { angular_speed: speedAngular }));
  rightBtn.addEventListener("click", () => sendMoveCommand('right', { angular_speed: speedAngular }));
  stopBtn.addEventListener("click", () => sendMoveCommand('stop'));
  // Handle keyboard controls
  document.addEventListener("keydown", (event) => {
    if (!isConnected || !isAuthenticated) return;

    switch (event.key) {
      case "ArrowUp":
        sendMoveCommand('forward', { speed: speedLinear });
        break;
      case "ArrowDown":
        sendMoveCommand('backward', { speed: speedLinear });
        break;
      case "ArrowLeft":
        sendMoveCommand('left', { angular_speed: speedAngular });
        break;
      case "ArrowRight":
        sendMoveCommand('right', { angular_speed: speedAngular });
        break;
      case " ": // Space bar
        sendMoveCommand('stop');
        break;
    }
  });
  // Connect to Backend function
  async function connectToBackend() {
    try {
      // Get backend URL and credentials from form
      const url = backendUrl.value || BACKEND_URL;
      const user = username.value || 'admin';
      const pass = password.value || 'admin123';

      // First, try to authenticate
      const loginResponse = await fetch(`${url}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user,
          password: pass
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Authentication failed');
      }

      const loginData = await loginResponse.json();
      isAuthenticated = true;      // Initialize Socket.IO connection
      socket = io(url);

      socket.on('connect', () => {
        console.log('Connected to backend server');
        isConnected = true;
        connectionStatus.textContent = "Connected";
        connectionStatus.classList.add("connected");
        showNotification('Connected to TurtleBot backend');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from backend server');
        isConnected = false;
        isAuthenticated = false;
        connectionStatus.textContent = "Disconnected";
        connectionStatus.classList.remove("connected");
        showNotification('Disconnected from backend', true);
      });

      socket.on('status_update', (status) => {
        console.log('Status update:', status);
        updateRobotStatus(status);
      });

      socket.on('battery_update', (batteryData) => {
        updateBatteryStatus(batteryData);
      });      socket.on('odom_update', (odomData) => {
        console.log('Odometry update:', odomData);
        updateOdometryDisplay(odomData);
      });

      socket.on('laser_update', (laserData) => {
        console.log('Laser scan update received');
        // You can add laser visualization here if needed
      });

      socket.on('move_response', (response) => {
        console.log('Move response:', response);
        if (!response.success) {
          showNotification('Movement command failed', true);
        }
      });

      socket.on('emergency_stop_activated', (data) => {
        showNotification('Emergency stop activated!', true);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        showNotification(`Error: ${error.message}`, true);
      });

    } catch (error) {
      console.error('Connection failed:', error);
      isConnected = false;
      isAuthenticated = false;
      connectionStatus.textContent = "Error";
      connectionStatus.classList.remove("connected");
      showNotification(`Connection failed: ${error.message}`, true);
    }
  }
  // Disconnect from Backend function
  async function disconnectFromBackend() {
    try {
      // Get backend URL from form
      const url = backendUrl.value || BACKEND_URL;
      
      // Send logout request
      await fetch(`${url}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (socket) {
        socket.disconnect();
        socket = null;
      }

      isConnected = false;
      isAuthenticated = false;
      connectionStatus.textContent = "Disconnected";
      connectionStatus.classList.remove("connected");
      batteryStatus.textContent = "Unknown";
      showNotification('Disconnected from backend');

    } catch (error) {
      console.error('Disconnect error:', error);
      showNotification(`Disconnect error: ${error.message}`, true);
    }
  }

  // Send movement command to backend
  function sendMoveCommand(action, parameters = {}) {
    if (!isConnected || !socket) {
      showNotification('Not connected to backend', true);
      return;
    }

    socket.emit('move_command', {
      action: action,
      parameters: parameters
    });
  }

  // Send movement command via REST API (alternative method)
  async function sendMoveCommandREST(action, parameters = {}) {
    if (!isAuthenticated) {
      showNotification('Not authenticated', true);
      return;
    }    try {
      const response = await fetch(`${BACKEND_URL}/api/move/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(parameters)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Move command result:', result);

    } catch (error) {
      console.error('Move command failed:', error);
      showNotification(`Move command failed: ${error.message}`, true);
    }
  }

  // Update robot status display
  function updateRobotStatus(status) {
    if (status.is_connected) {
      connectionStatus.textContent = status.ros_mode ? "ROS Connected" : "Simulation Mode";
      connectionStatus.classList.add("connected");
    } else {
      connectionStatus.textContent = "Robot Disconnected";
      connectionStatus.classList.remove("connected");
    }
  }
  // Update battery status display
  function updateBatteryStatus(batteryData) {
    if (batteryData) {
      const percentage = Math.round(batteryData.percentage * 100);
      const voltage = batteryData.voltage.toFixed(2);
      batteryStatus.textContent = `${percentage}% (${voltage}V)`;
      
      // Update battery color based on level
      batteryStatus.style.color = percentage > 30 ? '#4CAF50' : percentage > 15 ? '#FF9800' : '#f44336';
    }
  }

  // Update odometry display
  function updateOdometryDisplay(odomData) {
    if (odomData) {
      const positionText = `Position: X=${odomData.position.x.toFixed(2)}, Y=${odomData.position.y.toFixed(2)}`;
      console.log(positionText);
      
      // If you have an odometry display element, update it here
      const odomElement = document.getElementById('odometry-status');
      if (odomElement) {
        odomElement.textContent = positionText;
      }
    }
  }

  // Move robot using Socket.IO with custom parameters
  function moveRobot(linear, angular) {
    if (!isConnected || !socket) {
      showNotification('Not connected to backend', true);
      return;
    }

    socket.emit('move_command', {
      action: 'custom',
      parameters: {
        linear_x: linear,
        linear_y: 0,
        linear_z: 0,
        angular_x: 0,
        angular_y: 0,
        angular_z: angular
      }
    });
  }

  // Emergency stop function
  function emergencyStop() {
    if (socket) {
      socket.emit('emergency_stop');
    } else {
      // Fallback to REST API
      fetch(`${BACKEND_URL}/api/emergency_stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then(result => {
          showNotification('Emergency stop activated!', true);
        }).catch(error => {
          console.error('Emergency stop failed:', error);
        });
    }
  }

  // Add emergency stop to space bar
  document.addEventListener("keydown", (event) => {
    if (!isConnected || !isAuthenticated) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        sendMoveCommand('forward', { speed: speedLinear });
        break;
      case "ArrowDown":
        event.preventDefault();
        sendMoveCommand('backward', { speed: speedLinear });
        break;
      case "ArrowLeft":
        event.preventDefault();
        sendMoveCommand('left', { angular_speed: speedAngular });
        break;
      case "ArrowRight":
        event.preventDefault();
        sendMoveCommand('right', { angular_speed: speedAngular });
        break;
      case " ": // Space bar
        event.preventDefault();
        emergencyStop();
        break;
      case "s":
      case "S":
        event.preventDefault();
        sendMoveCommand('stop');
        break;
    }
  });
});

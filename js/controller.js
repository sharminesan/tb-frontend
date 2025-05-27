// TurtleBot Controller JavaScript

// Configuration
const BACKEND_URL = 'http://localhost:3000'; // Your Node.js backend URL

// Global variables
let socket = null;
let isConnected = false;
let isAuthenticated = false;
let speedLinear = 0.2; // m/s
let speedAngular = 0.5; // rad/s

// DOM Elements
let connectionStatus, batteryStatus, backendUrl, username, password;
let forwardBtn, backwardBtn, leftBtn, rightBtn, stopBtn;
let connectBtn, disconnectBtn;

// Notification system
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  
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
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
  
  if (isError) {
    console.error(message);
  } else {
    console.log(message);
  }
}

// Authentication check
// Authentication check with rate limiting
let lastAuthCheck = 0;
const AUTH_CHECK_COOLDOWN = 5000; // 5 seconds cooldown
let authCheckInProgress = false;

async function checkAuthentication() {
  const now = Date.now();
  
  // Check if we're already in the middle of an auth check
  if (authCheckInProgress) {
    console.log('Auth check already in progress, skipping...');
    return isAuthenticated;
  }
  
  // Check if enough time has passed since last check
  if (now - lastAuthCheck < AUTH_CHECK_COOLDOWN) {
    console.log(`Auth check on cooldown. ${Math.ceil((AUTH_CHECK_COOLDOWN - (now - lastAuthCheck)) / 1000)}s remaining`);
    return isAuthenticated;
  }
  
  authCheckInProgress = true;
  lastAuthCheck = now;
  
  try {
    console.log('Performing authentication check...');
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    const data = await response.json();
    
    if (!data.authenticated) {
      console.log('Authentication failed, redirecting to login...');
      window.location.href = '/login';
      return false;
    }
    
    console.log('Authentication successful');
    isAuthenticated = true;
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    // Only redirect on auth failure if we haven't checked recently
    if (now - lastAuthCheck > AUTH_CHECK_COOLDOWN * 2) { // More lenient for network errors
      window.location.href = '/login';
    }
    return false;
  } finally {
    authCheckInProgress = false;
  }
}

// DOM Elements initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication first
  const isAuth = await checkAuthentication();
  if (!isAuth) return;

  // Initialize DOM elements
  connectionStatus = document.getElementById("connection-status");
  batteryStatus = document.getElementById("battery-status");
  backendUrl = document.getElementById("backend-url");
  username = document.getElementById("username");
  password = document.getElementById("password");

  forwardBtn = document.getElementById("forward-btn");
  backwardBtn = document.getElementById("backward-btn");
  leftBtn = document.getElementById("left-btn");
  rightBtn = document.getElementById("right-btn");
  stopBtn = document.getElementById("stop-btn");

  connectBtn = document.getElementById("connect-btn");
  disconnectBtn = document.getElementById("disconnect-btn");

  // Set backend URL as readonly since it's configured
  if (backendUrl) {
    backendUrl.value = BACKEND_URL;
    backendUrl.setAttribute('readonly', true);
  }

  // Auto-connect to backend
  await connectToBackend();

  // Event listeners
  if (connectBtn) {
    connectBtn.addEventListener("click", connectToBackend);
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", disconnectFromBackend);
  }

  // Movement controls
  if (forwardBtn) {
    forwardBtn.addEventListener("mousedown", () => sendMoveCommand('forward'));
    forwardBtn.addEventListener("mouseup", () => sendMoveCommand('stop'));
    forwardBtn.addEventListener("mouseleave", () => sendMoveCommand('stop'));
  }

  if (backwardBtn) {
    backwardBtn.addEventListener("mousedown", () => sendMoveCommand('backward'));
    backwardBtn.addEventListener("mouseup", () => sendMoveCommand('stop'));
    backwardBtn.addEventListener("mouseleave", () => sendMoveCommand('stop'));
  }

  if (leftBtn) {
    leftBtn.addEventListener("mousedown", () => sendMoveCommand('left'));
    leftBtn.addEventListener("mouseup", () => sendMoveCommand('stop'));
    leftBtn.addEventListener("mouseleave", () => sendMoveCommand('stop'));
  }

  if (rightBtn) {
    rightBtn.addEventListener("mousedown", () => sendMoveCommand('right'));
    rightBtn.addEventListener("mouseup", () => sendMoveCommand('stop'));
    rightBtn.addEventListener("mouseleave", () => sendMoveCommand('stop'));
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => sendMoveCommand('stop'));
  }

  // Keyboard controls
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  // Emergency stop on Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      emergencyStop();
    }
  });
});

async function connectToBackend() {
  try {
    // Check authentication status first
    const authCheck = await checkAuthentication();
    if (!authCheck) return;

    // Initialize Socket.IO connection
    socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Connected to backend server');
      isConnected = true;
      updateConnectionStatus('Connected', true);
      showNotification('Connected to TurtleBot backend');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend server');
      isConnected = false;
      updateConnectionStatus('Disconnected', false);
      showNotification('Disconnected from backend', true);
    });

    socket.on('status_update', (status) => {
      console.log('Status update:', status);
      updateRobotStatus(status);
    });

    socket.on('battery_update', (batteryData) => {
      console.log('Battery update:', batteryData);
      updateBatteryStatus(batteryData);
    });

    socket.on('odom_update', (odomData) => {
      console.log('Odometry update:', odomData);
    });

    socket.on('movement_update', (movementData) => {
      console.log('Movement update:', movementData);
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
    showNotification('Failed to connect to backend', true);
    updateConnectionStatus('Connection Failed', false);
  }
}

function disconnectFromBackend() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnected = false;
  updateConnectionStatus('Disconnected', false);
  showNotification('Disconnected from backend');
}

function sendMoveCommand(action, parameters = {}) {
  if (!socket || !isConnected) {
    showNotification('Not connected to backend', true);
    return;
  }

  const command = {
    action: action,
    parameters: {
      speed: speedLinear,
      angular_speed: speedAngular,
      ...parameters
    }
  };

  socket.emit('move_command', command);
}

function emergencyStop() {
  if (socket && isConnected) {
    socket.emit('emergency_stop');
  }
  showNotification('Emergency stop activated!', true);
}

function updateConnectionStatus(status, connected) {
  if (connectionStatus) {
    connectionStatus.textContent = status;
    connectionStatus.className = connected ? 'connected' : 'disconnected';
  }
}

function updateBatteryStatus(batteryData) {
  if (batteryStatus && batteryData) {
    const percentage = Math.round(batteryData.percentage * 100);
    batteryStatus.textContent = `${percentage}% (${batteryData.voltage.toFixed(1)}V)`;
  }
}

function updateRobotStatus(status) {
  console.log('Robot status:', status);
}

// Keyboard event handlers
const activeKeys = new Set();

function handleKeyDown(event) {
  if (activeKeys.has(event.code)) return; // Prevent key repeat
  activeKeys.add(event.code);

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      event.preventDefault();
      sendMoveCommand('forward');
      break;
    case 'ArrowDown':
    case 'KeyS':
      event.preventDefault();
      sendMoveCommand('backward');
      break;
    case 'ArrowLeft':
    case 'KeyA':
      event.preventDefault();
      sendMoveCommand('left');
      break;
    case 'ArrowRight':
    case 'KeyD':
      event.preventDefault();
      sendMoveCommand('right');
      break;
    case 'Space':
      event.preventDefault();
      sendMoveCommand('stop');
      break;
  }
}

function handleKeyUp(event) {
  activeKeys.delete(event.code);

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'ArrowDown':
    case 'KeyS':
    case 'ArrowLeft':
    case 'KeyA':
    case 'ArrowRight':
    case 'KeyD':
      event.preventDefault();
      sendMoveCommand('stop');
      break;
  }
}

// Logout function
async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      disconnectFromBackend();
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Add logout button to your HTML or call logout() when needed
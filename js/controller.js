// TurtleBot Controller JavaScript

// Global variables
let ros = null;
let cmdVelTopic = null;
let batteryTopic = null;
let isConnected = false;
let speedLinear = 0.2; // m/s
let speedAngular = 0.5; // rad/s

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connect-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const connectionStatus = document.getElementById("connection-status");
  const batteryStatus = document.getElementById("battery-status");
  const robotIp = document.getElementById("robot-ip");
  const robotPort = document.getElementById("robot-port");

  // Movement buttons
  const forwardBtn = document.getElementById("forward-btn");
  const backwardBtn = document.getElementById("backward-btn");
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const stopBtn = document.getElementById("stop-btn");

  // Connect to ROS
  connectBtn.addEventListener("click", () => {
    connectToROS(robotIp.value, robotPort.value);
  });

  // Disconnect from ROS
  disconnectBtn.addEventListener("click", () => {
    disconnectFromROS();
  });

  // Movement control events
  forwardBtn.addEventListener("click", () => moveRobot(speedLinear, 0));
  backwardBtn.addEventListener("click", () => moveRobot(-speedLinear, 0));
  leftBtn.addEventListener("click", () => moveRobot(0, speedAngular));
  rightBtn.addEventListener("click", () => moveRobot(0, -speedAngular));
  stopBtn.addEventListener("click", () => moveRobot(0, 0));

  // Handle keyboard controls
  document.addEventListener("keydown", (event) => {
    if (!isConnected) return;

    switch (event.key) {
      case "ArrowUp":
        moveRobot(speedLinear, 0);
        break;
      case "ArrowDown":
        moveRobot(-speedLinear, 0);
        break;
      case "ArrowLeft":
        moveRobot(0, speedAngular);
        break;
      case "ArrowRight":
        moveRobot(0, -speedAngular);
        break;
      case " ": // Space bar
        moveRobot(0, 0);
        break;
    }
  });

  // Connect to ROS function
  function connectToROS(ip, port) {
    // Disconnect if already connected
    if (ros) {
      disconnectFromROS();
    }

    // Create ROS connection
    ros = new ROSLIB.Ros({
      url: `ws://${ip}:${port}`,
    });

    // Connection event handlers
    ros.on("connection", () => {
      console.log("Connected to websocket server.");
      isConnected = true;
      connectionStatus.textContent = "Connected";
      connectionStatus.classList.add("connected");

      // Initialize topics
      initializeTopics();
    });

    ros.on("error", (error) => {
      console.log("Error connecting to websocket server: ", error);
      isConnected = false;
      connectionStatus.textContent = "Error";
      connectionStatus.classList.remove("connected");
    });

    ros.on("close", () => {
      console.log("Connection to websocket server closed.");
      isConnected = false;
      connectionStatus.textContent = "Disconnected";
      connectionStatus.classList.remove("connected");
    });
  }

  // Disconnect from ROS function
  function disconnectFromROS() {
    if (ros) {
      ros.close();
      ros = null;
      cmdVelTopic = null;
      batteryTopic = null;
      isConnected = false;
      connectionStatus.textContent = "Disconnected";
      connectionStatus.classList.remove("connected");
      batteryStatus.textContent = "Unknown";
    }
  }

  // Initialize ROS topics
  function initializeTopics() {
    // Command velocity topic for movement
    cmdVelTopic = new ROSLIB.Topic({
      ros: ros,
      name: "/cmd_vel", // Standard topic for TurtleBot 1
      messageType: "geometry_msgs/Twist",
    });

    // Battery status topic
    batteryTopic = new ROSLIB.Topic({
      ros: ros,
      name: "/battery_state", // May need to be adjusted depending on TurtleBot configuration
      messageType: "sensor_msgs/BatteryState",
    });

    // Subscribe to battery updates
    batteryTopic.subscribe((message) => {
      batteryStatus.textContent = `${Math.round(
        message.percentage * 100
      )}% (${message.voltage.toFixed(2)}V)`;
    });
  }

  // Send movement command to the robot
  function moveRobot(linear, angular) {
    if (!isConnected || !cmdVelTopic) {
      return;
    }

    const twist = new ROSLIB.Message({
      linear: {
        x: linear,
        y: 0,
        z: 0,
      },
      angular: {
        x: 0,
        y: 0,
        z: angular,
      },
    });

    cmdVelTopic.publish(twist);
  }
});

// Display notification for connection status
function showNotification(message, isError = false) {
  // For now, this just logs to console, but could be enhanced with TurtleUI components
  console.log(message);
}

// Export any functions that might be needed elsewhere
export { showNotification };

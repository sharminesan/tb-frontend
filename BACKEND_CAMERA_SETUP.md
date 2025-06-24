# Backend Camera API Setup

## Overview

Since your frontend, backend, and camera are all on the same Raspberry Pi, here's how to set up the camera streaming endpoints.

## Add to Your Backend (Node.js)

Add these endpoints to your existing backend server (running on port 4000):

```javascript
const express = require("express");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Add CORS for your frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Camera status endpoint
app.get("/api/camera/status", (req, res) => {
  exec("ls /dev/video* 2>/dev/null", (error, stdout, stderr) => {
    if (error) {
      res.json({
        available: false,
        error: "No camera detected",
        devices: [],
      });
    } else {
      const devices = stdout.trim().split("\n").filter(Boolean);
      res.json({
        available: true,
        devices: devices,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Camera stream endpoint (MJPEG)
app.get("/api/camera/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=--myboundary",
    "Cache-Control": "no-cache",
    Connection: "close",
    "Access-Control-Allow-Origin": "http://localhost:5173",
  });

  // Use FFmpeg for reliable streaming
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-f",
      "v4l2",
      "-input_format",
      "mjpeg",
      "-video_size",
      "640x480",
      "-framerate",
      "15",
      "-i",
      "/dev/video0",
      "-f",
      "mjpeg",
      "-q:v",
      "5",
      "-vf",
      "scale=640:480",
      "pipe:1",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  ffmpeg.stdout.on("data", (data) => {
    try {
      res.write("--myboundary\r\n");
      res.write("Content-Type: image/jpeg\r\n");
      res.write(`Content-Length: ${data.length}\r\n\r\n`);
      res.write(data);
      res.write("\r\n");
    } catch (err) {
      console.error("Stream write error:", err);
    }
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error("FFmpeg error:", data.toString());
  });

  ffmpeg.on("error", (err) => {
    console.error("FFmpeg spawn error:", err);
    res.end();
  });

  req.on("close", () => {
    console.log("Client disconnected, killing FFmpeg process");
    ffmpeg.kill("SIGTERM");
  });

  req.on("error", (err) => {
    console.error("Request error:", err);
    ffmpeg.kill("SIGTERM");
  });
});

// Take snapshot endpoint
app.get("/api/camera/snapshot", (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `/tmp/snapshot_${timestamp}.jpg`;

  exec(
    `ffmpeg -f v4l2 -i /dev/video0 -vframes 1 -q:v 2 -y ${filename}`,
    (error) => {
      if (error) {
        console.error("Snapshot error:", error);
        res.status(500).json({ error: "Failed to capture snapshot" });
      } else {
        res.download(filename, `turtlebot-snapshot-${timestamp}.jpg`, (err) => {
          if (!err) {
            // Clean up temp file after download
            fs.unlink(filename, (unlinkErr) => {
              if (unlinkErr)
                console.error("Failed to delete temp file:", unlinkErr);
            });
          }
        });
      }
    }
  );
});

// Camera controls endpoint (optional)
app.get("/api/camera/controls", (req, res) => {
  exec(
    "v4l2-ctl --device=/dev/video0 --list-ctrls",
    (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ error: "Failed to get camera controls" });
      } else {
        res.json({ controls: stdout });
      }
    }
  );
});

console.log("Camera API endpoints added to server");
```

## Install Required Dependencies

```bash
# Install FFmpeg if not already installed
sudo apt update
sudo apt install -y ffmpeg v4l-utils

# Test your camera
v4l2-ctl --list-devices
v4l2-ctl --device=/dev/video0 --list-formats-ext

# Test FFmpeg with your camera
ffmpeg -f v4l2 -list_formats all -i /dev/video0
```

## Test the Endpoints

1. **Start your backend server:**

   ```bash
   cd /path/to/your/backend
   npm start
   ```

2. **Test the endpoints:**

   ```bash
   # Check camera status
   curl http://localhost:4000/api/camera/status

   # Test stream (should show image data)
   curl http://localhost:4000/api/camera/stream | head -c 1000

   # Download a snapshot
   curl -O http://localhost:4000/api/camera/snapshot
   ```

## Troubleshooting

### Camera not found:

```bash
# Check if camera is detected
lsusb | grep -i camera
ls -la /dev/video*

# Add user to video group
sudo usermod -a -G video $USER
# Log out and log back in
```

### Permission denied:

```bash
# Fix camera permissions
sudo chmod 666 /dev/video0
# Or add udev rule for permanent fix
```

### Stream not working:

```bash
# Test camera directly
ffmpeg -f v4l2 -i /dev/video0 -t 5 test.mp4

# Check supported formats
v4l2-ctl --device=/dev/video0 --list-formats-ext
```

### Performance issues:

```bash
# Enable GPU memory split
echo "gpu_mem=128" | sudo tee -a /boot/config.txt

# Reboot after config change
sudo reboot
```

## Frontend Integration

Your WebcamStream component is already configured to work with these endpoints:

- Status: `http://localhost:4000/api/camera/status`
- Stream: `http://localhost:4000/api/camera/stream`
- Snapshot: `http://localhost:4000/api/camera/snapshot`

The component will automatically detect when running on the Raspberry Pi and use the correct URLs.

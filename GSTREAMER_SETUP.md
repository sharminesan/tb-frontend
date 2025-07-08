# GStreamer Webcam Setup for TurtleBot

This guide will help you set up GStreamer on your Raspberry Pi to stream webcam video to your TurtleBot frontend application.

## Prerequisites

- Raspberry Pi with Raspbian OS
- USB webcam connected to Raspberry Pi
- Network connection between Pi and your computer

## Installation Steps

### 1. Install GStreamer on Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install GStreamer and plugins
sudo apt install -y gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav

# Install additional tools
sudo apt install -y v4l-utils
```

### 2. Test Your USB Camera

```bash
# List available video devices
v4l2-ctl --list-devices

# Check camera capabilities
v4l2-ctl --device=/dev/video0 --list-formats-ext

# Test camera capture
gst-launch-1.0 v4l2src device=/dev/video0 ! videoconvert ! autovideosink
```

### 3. Create Streaming Script

Create a file called `start_camera_stream.sh`:

```bash
#!/bin/bash

# Configuration
DEVICE="/dev/video0"
WIDTH=640
HEIGHT=480
FRAMERATE=30
PORT=8080
QUALITY=5

# Check if camera exists
if [ ! -e "$DEVICE" ]; then
    echo "Camera device $DEVICE not found!"
    exit 1
fi

echo "Starting GStreamer camera stream..."
echo "Device: $DEVICE"
echo "Resolution: ${WIDTH}x${HEIGHT}"
echo "Framerate: ${FRAMERATE}fps"
echo "Port: $PORT"
echo "Access stream at: http://$(hostname -I | awk '{print $1}'):$PORT/stream"

# Start GStreamer pipeline
gst-launch-1.0 \
    v4l2src device=$DEVICE \
    ! video/x-raw,width=$WIDTH,height=$HEIGHT,framerate=$FRAMERATE/1 \
    ! videoconvert \
    ! jpegenc quality=$QUALITY \
    ! multipartmux \
    ! tcpserversink host=0.0.0.0 port=$PORT
```

### 4. Make Script Executable

```bash
chmod +x start_camera_stream.sh
```

### 5. Alternative: HTTP Server Method

For better compatibility, you can use a simple HTTP server approach:

Create `http_camera_stream.py`:

```python
#!/usr/bin/env python3

import cv2
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import time

class CameraHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.end_headers()

            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)

            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])

                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(jpeg))
                    self.end_headers()
                    self.wfile.write(jpeg.tobytes())
                    self.wfile.write(b'\r\n')

                    time.sleep(0.033)  # ~30 FPS
            except:
                pass
            finally:
                cap.release()
        else:
            self.send_error(404)

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8080), CameraHandler)
    print("Camera server starting on port 8080...")
    print("Stream URL: http://{}:8080/stream".format("YOUR_PI_IP"))
    server.serve_forever()
```

### 6. Install Python Dependencies (for HTTP method)

```bash
sudo apt install -y python3-opencv python3-pip
```

### 7. Auto-start on Boot (Optional)

Create systemd service `/etc/systemd/system/camera-stream.service`:

```ini
[Unit]
Description=TurtleBot Camera Stream
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/home/pi/start_camera_stream.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
sudo systemctl enable camera-stream.service
sudo systemctl start camera-stream.service
```

## Usage

### Method 1: GStreamer (Recommended)

```bash
./start_camera_stream.sh
```

### Method 2: Python HTTP Server

```bash
python3 http_camera_stream.py
```

## Configuration in Frontend

Update the stream URL in your Dashboard component:

```jsx
<WebcamStream
  streamUrl="http://YOUR_RASPBERRY_PI_IP:8080/stream"
  title="TurtleBot Camera Feed"
/>
```

Replace `YOUR_RASPBERRY_PI_IP` with your Raspberry Pi's actual IP address.

## Troubleshooting

### Camera Not Found

```bash
# Check USB devices
lsusb

# Check video devices
ls -la /dev/video*

# Test camera with cheese (GUI)
sudo apt install cheese
cheese
```

### Permission Issues

```bash
# Add user to video group
sudo usermod -a -G video $USER

# Logout and login again
```

### Network Issues

```bash
# Check if port is open
sudo netstat -tulpn | grep :8080

# Test stream locally
curl -I http://localhost:8080/stream
```

### Performance Optimization

For better performance, you can:

1. **Reduce resolution**: Change WIDTH and HEIGHT variables
2. **Lower framerate**: Reduce FRAMERATE value
3. **Adjust quality**: Modify QUALITY parameter (1-100)
4. **Use hardware encoding** (if available):

```bash
# Check for hardware encoder
gst-inspect-1.0 | grep -i h264

# Modified pipeline with hardware encoding
gst-launch-1.0 \
    v4l2src device=/dev/video0 \
    ! video/x-raw,width=640,height=480,framerate=30/1 \
    ! v4l2h264enc \
    ! h264parse \
    ! rtph264pay \
    ! udpsink host=0.0.0.0 port=5000
```

## Security Notes

- The stream is unencrypted
- Consider using HTTPS in production
- Implement authentication if needed
- Firewall configuration may be required

## Integration Features

The WebcamStream component includes:

- ✅ Live video streaming
- ✅ Fullscreen mode
- ✅ Snapshot capture
- ✅ Stream refresh
- ✅ Connection status indicator
- ✅ Mobile responsive design
- ✅ Error handling and retry logic

Enjoy your TurtleBot camera integration!

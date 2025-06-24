#!/bin/bash

# TurtleBot Camera Stream Setup Script
# Run this script on your Raspberry Pi

echo "🐢 TurtleBot Camera Stream Setup"
echo "================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root (without sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install GStreamer
echo "📷 Installing GStreamer..."
sudo apt install -y \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    v4l-utils \
    python3-opencv \
    python3-pip

# Create camera stream script
echo "📝 Creating camera stream script..."
cat > ~/camera_stream.sh << 'EOF'
#!/bin/bash

# Configuration
DEVICE="/dev/video0"
WIDTH=640
HEIGHT=480
FRAMERATE=30
PORT=8080

# Check if camera exists
if [ ! -e "$DEVICE" ]; then
    echo "❌ Camera device $DEVICE not found!"
    echo "Available devices:"
    ls -la /dev/video*
    exit 1
fi

# Get IP address
IP=$(hostname -I | awk '{print $1}')

echo "🎥 Starting TurtleBot Camera Stream"
echo "=================================="
echo "Device: $DEVICE"
echo "Resolution: ${WIDTH}x${HEIGHT}"
echo "Framerate: ${FRAMERATE}fps"
echo "Port: $PORT"
echo "Stream URL: http://$IP:$PORT/stream"
echo "Press Ctrl+C to stop"
echo ""

# Start GStreamer pipeline
gst-launch-1.0 \
    v4l2src device=$DEVICE \
    ! video/x-raw,width=$WIDTH,height=$HEIGHT,framerate=$FRAMERATE/1 \
    ! videoconvert \
    ! jpegenc quality=70 \
    ! multipartmux \
    ! tcpserversink host=0.0.0.0 port=$PORT
EOF

# Make script executable
chmod +x ~/camera_stream.sh

# Create Python HTTP server alternative
echo "🐍 Creating Python HTTP server script..."
cat > ~/http_camera_stream.py << 'EOF'
#!/usr/bin/env python3

import cv2
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import socket

class CameraHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging
    
    def do_GET(self):
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'close')
            self.end_headers()
            
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            if not cap.isOpened():
                self.send_error(503, "Camera not available")
                return
            
            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Encode frame as JPEG
                    _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    
                    # Send frame
                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(jpeg))
                    self.end_headers()
                    self.wfile.write(jpeg.tobytes())
                    self.wfile.write(b'\r\n')
                    
                    time.sleep(0.033)  # ~30 FPS
            except Exception as e:
                print(f"Stream error: {e}")
            finally:
                cap.release()
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'''
            <html>
            <head><title>TurtleBot Camera</title></head>
            <body>
                <h1>TurtleBot Camera Stream</h1>
                <img src="/stream" width="640" height="480">
                <p>Stream URL: <code>http://''' + socket.gethostbyname(socket.gethostname()).encode() + b''':8080/stream</code></p>
            </body>
            </html>
            ''')
        else:
            self.send_error(404)

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

if __name__ == '__main__':
    port = 8080
    ip = get_ip()
    
    print("🎥 TurtleBot HTTP Camera Server")
    print("==============================")
    print(f"Server: http://{ip}:{port}")
    print(f"Stream: http://{ip}:{port}/stream")
    print("Press Ctrl+C to stop")
    print("")
    
    try:
        server = HTTPServer(('0.0.0.0', port), CameraHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.shutdown()
EOF

chmod +x ~/http_camera_stream.py

# Test camera
echo "🔍 Testing camera..."
if [ -e "/dev/video0" ]; then
    echo "✅ Camera found at /dev/video0"
    
    # Show camera info
    echo "📋 Camera information:"
    v4l2-ctl --device=/dev/video0 --list-formats-ext 2>/dev/null | head -10
else
    echo "❌ No camera found at /dev/video0"
    echo "Available video devices:"
    ls -la /dev/video* 2>/dev/null || echo "None found"
fi

# Add user to video group
echo "👤 Adding user to video group..."
sudo usermod -a -G video $USER

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Reboot your Pi: sudo reboot"
echo "2. After reboot, start the camera stream:"
echo "   For GStreamer: ./camera_stream.sh"
echo "   For HTTP:      python3 http_camera_stream.py"
echo ""
echo "3. Update your frontend with your Pi's IP address:"
IP=$(hostname -I | awk '{print $1}')
echo "   http://$IP:8080/stream"
echo ""
echo "🎉 Happy streaming!"

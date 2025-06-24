# Network Access Guide

## How to Access Your TurtleBot Web Interface from Other Devices

### Step 1: Find Your Server's IP Address

On your laptop running the development server (Windows):

```cmd
ipconfig
```

Look for your network adapter (usually "Wireless LAN adapter Wi-Fi" or "Ethernet adapter"):

```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Write down this IP address (e.g., `192.168.1.100`).

On Linux/macOS:

```bash
ip addr show
# or
ifconfig
```

### Step 2: Start the Development Server with Network Access

Option A - Use the updated configuration (recommended):

```bash
npm run dev
```

Option B - Use the network script:

```bash
npm run dev:network
```

Option C - Manual command:

```bash
npx vite --host 0.0.0.0 --port 5173
```

### Step 3: Access from Other Devices

From any device on the same network, open a web browser and go to:

```
http://[YOUR_IP_ADDRESS]:5173
```

Examples:

- `http://192.168.1.100:5173`
- `http://10.0.0.50:5173`

### Step 4: Configure Windows Firewall (if needed)

If you can't access the page, you may need to allow the port through Windows Firewall:

1. **Open Windows Defender Firewall**
2. **Click "Advanced settings"**
3. **Click "Inbound Rules" → "New Rule"**
4. **Select "Port" → Next**
5. **Select "TCP" and "Specific local ports: 5173"**
6. **Allow the connection**
7. **Apply to all profiles**
8. **Name it "Vite Dev Server"**

### Step 5: Mobile Device Access

On your smartphone/tablet connected to the same Wi-Fi:

1. Open your mobile browser
2. Navigate to `http://[YOUR_IP_ADDRESS]:5173`
3. You should see the TurtleBot interface

### Troubleshooting

**Can't connect?**

1. Verify both devices are on the same network
2. Check firewall settings
3. Try disabling antivirus temporarily
4. Ensure the dev server is running with `--host 0.0.0.0`

**Getting CORS errors?**

- The backend API calls might need to be updated to use the server's IP instead of localhost

**Backend API Issues:**
If your backend is also running on the laptop, update API calls from:

```javascript
http://localhost:4000/api/status
```

To:

```javascript
http://192.168.1.100:4000/api/status
```

### Security Note

- This configuration allows any device on your local network to access your development server
- Only use this on trusted networks
- For production deployment, use proper authentication and HTTPS

### Example Terminal Output

When running `npm run dev`, you should see:

```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h to show help
```

The "Network" URL is what other devices should use to access your web interface.

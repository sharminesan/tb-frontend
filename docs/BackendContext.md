# Backend Configuration Context

The `BackendContext` provides a centralized way to manage the backend URL throughout the application.

## Features

- **Centralized Configuration**: Single source of truth for backend URL
- **Persistent Storage**: Automatically saves URL changes to localStorage
- **Environment Variable Support**: Falls back to `VITE_BACKEND_URL` environment variable
- **Dynamic Updates**: Components automatically use updated URL when changed

## Usage

### Using the Backend URL

```jsx
import { useBackend } from '../contexts/BackendContext';

function MyComponent() {
  const { backendUrl } = useBackend();

  // Use the backend URL for API calls
  const response = await fetch(`${backendUrl}/api/endpoint`);
}
```

### Updating the Backend URL

```jsx
import { useBackend } from "../contexts/BackendContext";

function SettingsComponent() {
  const { backendUrl, updateBackendUrl, resetToDefault } = useBackend();

  const handleUrlChange = (newUrl) => {
    updateBackendUrl(newUrl);
  };

  const handleReset = () => {
    resetToDefault();
  };
}
```

## Components Using BackendContext

- `Dashboard.jsx` - Robot control and status
- `Login.jsx` - Authentication and OTP
- `Register.jsx` - User registration and OTP
- `OTPVerification.jsx` - OTP verification
- `AdminPanel.jsx` - User role management
- `GoogleAuthManager.jsx` - 2FA management

## Default Configuration

The context automatically uses this priority order:

1. Saved URL from localStorage
2. `VITE_BACKEND_URL` environment variable
3. `http://localhost:4000` (fallback)

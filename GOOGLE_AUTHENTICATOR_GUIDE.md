# How to Link with Google Authenticator App

## Overview

The TOTP (Time-based One-Time Password) implementation generates QR codes that are compatible with Google Authenticator and other authenticator apps.

## How It Works

### 1. **QR Code Generation**

When a user selects "Authenticator App" in the MFA setup:

```javascript
// The system generates a TOTP URI in this format:
otpauth://totp/TurtleBot Controller:user@example.com?secret=SECRETKEY&issuer=TurtleBot Controller
```

### 2. **QR Code Components**

- **Protocol**: `otpauth://totp/` - Standard TOTP protocol
- **Issuer**: `TurtleBot Controller` - App name shown in authenticator
- **Account**: User's email address
- **Secret**: Base32 encoded secret key
- **Parameters**:
  - `secret`: The shared secret key
  - `issuer`: Organization/app name

### 3. **User Flow**

1. User clicks "Authenticator App" method
2. System generates secret key and QR code
3. User scans QR code with Google Authenticator
4. User enters 6-digit code from app
5. System verifies code and enables MFA

## Step-by-Step Integration

### For Users:

1. **Download Google Authenticator**

   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
   - iOS: [App Store](https://apps.apple.com/app/google-authenticator/id388497605)

2. **Add Account**

   - Open Google Authenticator
   - Tap "+" to add account
   - Select "Scan QR code"
   - Point camera at QR code on screen

3. **Verify Setup**
   - Enter the 6-digit code shown in Google Authenticator
   - Code refreshes every 30 seconds

### Alternative Manual Entry:

If QR code scanning doesn't work:

1. Select "Enter setup key" in Google Authenticator
2. Copy the secret key shown below QR code
3. Enter manually:
   - **Account**: Your email
   - **Key**: Secret key from screen
   - **Type**: Time-based

## Supported Authenticator Apps

The generated QR codes work with:

- ✅ **Google Authenticator** (Primary)
- ✅ **Microsoft Authenticator**
- ✅ **Authy**
- ✅ **1Password**
- ✅ **Bitwarden**
- ✅ **LastPass Authenticator**

## Security Features

### Key Benefits:

1. **Offline**: Works without internet connection
2. **Secure**: Secret key never leaves your device
3. **Time-based**: Codes expire every 30 seconds
4. **Standard**: Uses RFC 6238 TOTP protocol

### Implementation Security:

- Secret keys are generated using Firebase's secure random
- QR codes are generated client-side only
- Secret keys are never stored in plain text
- HTTPS required for all communications

## Testing the Implementation

### Development Testing:

1. Start the development server: `npm run dev`
2. Register a new account or login
3. Go to Security settings in dashboard
4. Click "Set Up Multi-Factor Authentication"
5. Select "Authenticator App"
6. Scan QR code with Google Authenticator
7. Enter verification code

### Expected Behavior:

- QR code should appear within 2-3 seconds
- Google Authenticator should recognize the code
- Account should appear as "TurtleBot Controller (user@email.com)"
- 6-digit codes should work for verification

## Troubleshooting

### Common Issues:

1. **QR Code Not Appearing**

   - Check browser console for errors
   - Ensure qrcode library is installed
   - Verify Firebase configuration

2. **Google Authenticator Can't Scan**

   - Try manual entry with secret key
   - Check QR code image quality
   - Ensure adequate lighting

3. **Verification Codes Don't Work**

   - Check device time synchronization
   - Verify code is current (30-second window)
   - Ensure correct secret key was used

4. **Error Messages**
   - "No user signed in": User must be authenticated first
   - "QR code generation failed": Check qrcode library
   - "TOTP setup failed": Check Firebase MFA configuration

## Technical Implementation

The current implementation:

- ✅ Generates RFC-compliant TOTP URIs
- ✅ Creates high-quality QR codes
- ✅ Provides manual backup key
- ✅ Handles verification properly
- ✅ Includes error handling
- ✅ Mobile-responsive design

This ensures seamless integration with Google Authenticator and other standard TOTP applications.

# TOTP Implementation Technical Guide

## Overview

This document provides technical details for implementing Time-based One-Time Password (TOTP) authentication using Firebase Auth v9+ and Google Authenticator.

## Firebase Configuration Requirements

### 1. Enable Multi-Factor Authentication in Firebase Console

```javascript
// Ensure MFA is enabled in Firebase Console:
// 1. Go to Authentication > Settings
// 2. Click on "Multi-factor authentication" tab
// 3. Enable "SMS" and "Time-based one-time password (TOTP)"
// 4. Configure enforcement (optional or required)
```

### 2. Required Firebase Auth Imports

```javascript
import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
} from "firebase/auth";
```

## Implementation Details

### 1. TOTP Setup Function

```javascript
const setupTOTP = async () => {
  try {
    if (!currentUser) {
      throw new Error("No user is signed in");
    }

    // Get multi-factor session for enrollment
    const multiFactorSession = await multiFactor(currentUser).getSession();

    // Generate TOTP secret
    const totpSecret = TotpSecret.generate();

    // Create QR code URL for authenticator apps
    const issuer = "TurtleBot Controller";
    const accountName = currentUser.email || "User";
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(
      issuer
    )}:${encodeURIComponent(accountName)}?secret=${
      totpSecret.secretKey
    }&issuer=${encodeURIComponent(issuer)}`;

    return {
      secret: totpSecret,
      qrCodeUrl: qrCodeUrl,
      secretKey: totpSecret.secretKey,
      multiFactorSession: multiFactorSession,
    };
  } catch (error) {
    console.error("Error setting up TOTP:", error);
    throw error;
  }
};
```

### 2. TOTP Verification for Enrollment

```javascript
const verifyTOTP = async (
  totpSecret,
  verificationCode,
  displayName = "Authenticator App"
) => {
  try {
    if (!currentUser) {
      throw new Error("No user is signed in");
    }

    // Create assertion for enrollment
    const multiFactorAssertion =
      TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        verificationCode
      );

    // Enroll the TOTP factor
    await multiFactor(currentUser).enroll(multiFactorAssertion, displayName);
    return true;
  } catch (error) {
    console.error("Error verifying TOTP:", error);
    throw error;
  }
};
```

### 3. TOTP Challenge Handling (Login)

```javascript
const handleTOTPChallenge = async (resolver, verificationCode) => {
  try {
    // Find TOTP hint
    const selectedHint = resolver.hints.find(
      (hint) => hint.factorId === "totp"
    );

    if (!selectedHint) {
      throw new Error("No TOTP factor found");
    }

    // Create assertion for sign-in
    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
      selectedHint.uid,
      verificationCode
    );

    // Resolve the MFA challenge
    const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
    return userCredential;
  } catch (error) {
    console.error("Error resolving TOTP challenge:", error);
    throw error;
  }
};
```

## QR Code Generation

### Using the qrcode Library

```javascript
import QRCode from "qrcode";

// Generate QR code data URL
const generateQRCode = async (qrCodeUrl) => {
  try {
    const dataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};
```

### OTPAuth URL Format

```
otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER

Where:
- ISSUER: Your app name (e.g., "TurtleBot Controller")
- ACCOUNT: User identifier (e.g., user's email)
- SECRET: Base32 encoded secret key
```

## Error Handling

### Common Error Scenarios

```javascript
// Handle MFA requirement during login
const login = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === "auth/multi-factor-auth-required") {
      // Set MFA state for UI
      setMfaRequired(true);
      setMfaResolver(error.resolver);
      throw new Error("MFA verification required");
    }
    throw error;
  }
};

// Handle TOTP verification errors
const handleTOTPError = (error) => {
  switch (error.code) {
    case "auth/invalid-verification-code":
      return "Invalid verification code. Please try again.";
    case "auth/code-expired":
      return "Verification code has expired. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    default:
      return "An error occurred. Please try again.";
  }
};
```

## Security Considerations

### 1. Secret Key Storage

- **Never store TOTP secrets in localStorage or sessionStorage**
- **Secrets should only exist during enrollment process**
- **Firebase handles secure storage after enrollment**

### 2. Code Validation

- **Always validate codes on the server side**
- **Implement rate limiting for verification attempts**
- **Use time-window validation (typically 30-second windows)**

### 3. Backup and Recovery

```javascript
// Generate backup codes during TOTP setup
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
  }
  return codes;
};
```

## Testing

### 1. Test Authenticator Apps

- **Google Authenticator** (Android/iOS)
- **Authy** (Android/iOS/Desktop)
- **Microsoft Authenticator** (Android/iOS)
- **1Password** (with TOTP support)

### 2. Test Scenarios

```javascript
// Test cases to implement
const testScenarios = [
  "TOTP setup with QR code scan",
  "TOTP setup with manual key entry",
  "Successful TOTP verification during login",
  "Invalid TOTP code handling",
  "Expired TOTP code handling",
  "Multiple authenticator apps with same account",
  "TOTP factor removal",
  "Backup code usage",
];
```

### 3. Manual Testing Steps

1. **Setup Flow**:

   - Register new user
   - Navigate to MFA setup
   - Choose TOTP method
   - Scan QR code or enter manual key
   - Verify with 6-digit code

2. **Login Flow**:

   - Login with email/password
   - Enter TOTP code when prompted
   - Verify successful authentication

3. **Error Scenarios**:
   - Try invalid codes
   - Test expired codes
   - Test network errors

## Performance Optimization

### 1. QR Code Generation

```javascript
// Cache QR code generation
const useQRCode = (qrCodeUrl) => {
  const [dataUrl, setDataUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (qrCodeUrl) {
      QRCode.toDataURL(qrCodeUrl, options)
        .then(setDataUrl)
        .finally(() => setLoading(false));
    }
  }, [qrCodeUrl]);

  return { dataUrl, loading };
};
```

### 2. State Management

```javascript
// Optimize re-renders
const MFAContext = React.memo(({ children }) => {
  const mfaState = useMemo(
    () => ({
      mfaRequired,
      mfaResolver,
      setupTOTP,
      verifyTOTP,
      handleTOTPChallenge,
    }),
    [mfaRequired, mfaResolver]
  );

  return <MFAProvider value={mfaState}>{children}</MFAProvider>;
});
```

## Deployment Checklist

- [ ] Firebase MFA enabled in console
- [ ] TOTP provider configured
- [ ] Error handling implemented
- [ ] QR code generation working
- [ ] Manual key entry working
- [ ] Backup codes generated
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] HTTPS enforced
- [ ] Testing completed

---

**Last Updated**: June 13, 2025
**Firebase Auth Version**: v9+
**Supported Authenticators**: RFC 6238 compliant TOTP apps

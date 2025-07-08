# MFA Flow Test Guide

## 🔐 How TOTP MFA Works Now

### **Setup Flow (One-time):**

1. **Login normally** → Go to Dashboard
2. **Click "Set Up MFA"** in Security Settings
3. **Choose "Authenticator App"**
4. **Scan QR Code** with Google Authenticator/Authy
5. **Enter verification code** from app
6. **MFA is now enabled** ✅

### **Login Flow (Every subsequent login):**

1. **Enter email/password** → Click "Sign In"
2. **System checks Firestore** for `totpEnabled: true`
3. **If TOTP enabled** → User is signed out immediately
4. **MFA Verification popup appears** 🔐
5. **Enter 6-digit code** from Google Authenticator
6. **User is re-authenticated** and redirected to Dashboard ✅

## 🧪 Testing Steps

### Test 1: First-time MFA Setup

```
1. Register new account or use existing account without MFA
2. Login → Go to Dashboard
3. Click "Set Up MFA" → Choose "Authenticator App"
4. Scan QR code with Google Authenticator
5. Enter the 6-digit code from your app
6. Should see "MFA Setup Complete!" ✅
```

### Test 2: MFA Login Challenge

```
1. Logout completely from dashboard
2. Clear browser cache/use incognito mode (optional)
3. Go to login page
4. Enter same email/password → Click "Sign In"
5. Should immediately see MFA verification popup 🔐
6. Open Google Authenticator → Get current 6-digit code
7. Enter code → Click "Verify"
8. Should be redirected to Dashboard ✅
```

### Test 3: Invalid TOTP Code

```
1. Follow Test 2 steps 1-5
2. Enter wrong 6-digit code (like 123456)
3. Should see error: "Invalid verification code. Please try again."
4. Enter correct code from Google Authenticator
5. Should succeed and redirect to Dashboard ✅
```

## 🔧 Technical Implementation

### **Key Files Modified:**

- `AuthContext.jsx` - Login detection and TOTP verification
- `Login.jsx` - MFA popup trigger
- `MFAVerification.jsx` - TOTP code input
- `MFASetup.jsx` - QR code generation

### **Firebase Integration:**

- **Firestore Document**: `/users/{uid}` contains:
  ```json
  {
    "mfaEnabled": true,
    "totpEnabled": true,
    "totpSecretKey": "ABC123..." // Stored secret
  }
  ```

### **Security Flow:**

1. **Initial login** → Firebase Auth success
2. **Check Firestore** → If `totpEnabled: true`
3. **Immediate signout** → Prevent unauthorized access
4. **Store session data** → Email, user info for re-auth
5. **Show MFA popup** → User enters TOTP code
6. **Re-authenticate** → Sign user back in after verification

## 🚀 Next Steps

To make this production-ready:

1. **Add TOTP validation** using `otplib` library
2. **Encrypt secret keys** in Firestore
3. **Add rate limiting** for failed attempts
4. **Implement backup codes** for account recovery
5. **Add session timeout** for MFA challenges

## 🐛 Troubleshooting

**Issue**: MFA popup doesn't show

- **Check**: User has `totpEnabled: true` in Firestore
- **Solution**: Set up MFA first via Dashboard

**Issue**: "Invalid MFA session" error

- **Check**: Browser cleared session during MFA
- **Solution**: Start fresh login process

**Issue**: Infinite loading on verification

- **Check**: Network connectivity to Firebase
- **Solution**: Check browser console for errors

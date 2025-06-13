# Google Authenticator App Integration Guide

## Overview

This guide explains how to use the Google Authenticator app with the TurtleBot Controller application for Two-Factor Authentication (2FA).

## What is Google Authenticator?

Google Authenticator is a software-based authenticator that implements two-step verification services using the Time-based One-time Password Algorithm (TOTP) and HMAC-based One-time Password Algorithm (HOTP).

## Setup Process

### Step 1: Install Google Authenticator App

1. **Android Users**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
2. **iPhone Users**: Download from [App Store](https://apps.apple.com/us/app/google-authenticator/id388497605)

### Step 2: Set Up 2FA in TurtleBot Controller

1. **Log into your account** at http://localhost:5174
2. **Navigate to Security Settings** from your dashboard
3. **Click "Set Up Multi-Factor Authentication"**
4. **Choose "Authenticator App"** when prompted for MFA method

### Step 3: Add Account to Google Authenticator

#### Method 1: QR Code Scan (Recommended)

1. Open Google Authenticator app on your phone
2. Tap the **"+"** or **"Add account"** button
3. Select **"Scan a QR code"**
4. Point your camera at the QR code displayed on the TurtleBot Controller setup page
5. The app will automatically add your account

#### Method 2: Manual Entry

1. Open Google Authenticator app
2. Tap **"+"** or **"Add account"**
3. Select **"Enter a setup key"**
4. Enter the following details:
   - **Account name**: TurtleBot Controller
   - **Your email**: (your login email)
   - **Key**: (the secret key displayed on the setup page)
   - **Type of key**: Time based
5. Tap **"Add"**

### Step 4: Verify Setup

1. After adding the account, you'll see a 6-digit code in Google Authenticator
2. Enter this code in the TurtleBot Controller verification field
3. Click **"Verify Code"**
4. If successful, you'll see a confirmation message

## Using Google Authenticator for Login

### Daily Login Process

1. Enter your email and password as usual
2. When prompted for 2FA code:
   - Open Google Authenticator app
   - Find "TurtleBot Controller" in your account list
   - Enter the current 6-digit code (codes refresh every 30 seconds)
   - Click "Verify"

### Important Notes

- **Codes are time-sensitive**: Each code is valid for 30 seconds
- **Backup codes**: Save your backup codes in a secure location
- **Multiple devices**: You can add the same account to multiple devices using the QR code
- **Offline access**: Google Authenticator works without internet connection

## Troubleshooting

### "Invalid code" errors

1. **Check time sync**: Ensure your phone's time is accurate
2. **Wait for new code**: If the code is about to expire, wait for a fresh one
3. **Re-enter carefully**: Make sure you're entering all 6 digits correctly

### Lost access to authenticator app

1. **Use backup codes**: Enter one of your saved backup codes
2. **Contact support**: If you don't have backup codes, you'll need account recovery

### QR code won't scan

1. **Check lighting**: Ensure good lighting and steady hands
2. **Use manual entry**: Copy the secret key manually instead
3. **Try different angles**: Position the QR code properly in the camera frame

## Alternative Authenticator Apps

While this guide focuses on Google Authenticator, these apps also work:

- **Authy** (supports cloud sync and multiple devices)
- **Microsoft Authenticator**
- **1Password** (with TOTP support)
- **LastPass Authenticator**

## Security Best Practices

1. **Keep backup codes safe**: Store them in a secure location separate from your phone
2. **Don't share codes**: Never share your 6-digit codes with anyone
3. **Enable on multiple devices**: Set up the authenticator on a backup device
4. **Regular backups**: Some apps support encrypted cloud backups
5. **Update apps**: Keep your authenticator app updated

## Technical Details

### TOTP Algorithm

- **Algorithm**: HMAC-SHA1
- **Time step**: 30 seconds
- **Code length**: 6 digits
- **Issuer**: TurtleBot Controller

### Security Features

- **Time-based**: Codes expire every 30 seconds
- **Cryptographically secure**: Uses HMAC-SHA1 algorithm
- **Offline capable**: No internet required after initial setup
- **Unique secrets**: Each account has a unique secret key

## Support

If you encounter issues with Google Authenticator setup:

1. Check this troubleshooting guide first
2. Ensure your Firebase configuration is correct
3. Verify that TOTP is properly enabled in Firebase Console
4. Contact your system administrator if problems persist

---

**Last Updated**: June 13, 2025
**Compatible with**: Firebase Auth v9+, Google Authenticator v5.0+

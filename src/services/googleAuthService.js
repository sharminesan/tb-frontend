// Google Authenticator API service
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

class GoogleAuthService {
  constructor() {
    this.baseUrl = `${API_BASE}/api/google-auth`;
  }

  // Get authentication headers with Firebase token
  async getAuthHeaders() {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  // Setup Google Authenticator - Generate QR code
  async setupGoogleAuth() {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/setup`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to setup Google Authenticator");
    }

    return response.json();
  }

  // Verify and enable Google Authenticator
  async verifySetup(token) {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/verify-setup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify authenticator code");
    }

    return response.json();
  }

  // Verify TOTP for login/access
  async verifyTOTP(token, backupCode = null) {
    const headers = await this.getAuthHeaders();

    const body = backupCode ? { backupCode } : { token };

    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Invalid authentication code");
    }

    return response.json();
  }

  // Check 2FA status
  async getStatus() {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/status`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to check 2FA status");
    }

    return response.json();
  }

  // Disable 2FA
  async disable2FA(token) {
    if (!token) {
      throw new Error(
        "TOTP token is required to disable two-factor authentication"
      );
    }

    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/disable`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error ||
          error.details ||
          "Failed to disable two-factor authentication"
      );
    }

    return response.json();
  }

  // Get backup codes
  async getBackupCodes() {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/backup-codes`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get backup codes");
    }

    return response.json();
  }

  // Regenerate backup codes
  async regenerateBackupCodes(token) {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/regenerate-backup-codes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to regenerate backup codes");
    }

    return response.json();
  }
}

export default GoogleAuthService;

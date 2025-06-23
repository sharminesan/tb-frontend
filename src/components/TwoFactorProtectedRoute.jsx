import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GoogleAuthService from "../services/googleAuthService";
import GoogleAuthVerification from "./GoogleAuthVerification";

export default function TwoFactorProtectedRoute({ children }) {
  const { currentUser, emailVerified } = useAuth();
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const location = useLocation();

  const googleAuthService = new GoogleAuthService();

  useEffect(() => {
    if (currentUser && emailVerified) {
      checkTwoFactorStatus();
    } else if (currentUser && !emailVerified) {
      // Redirect to OTP verification first
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [currentUser, emailVerified]);

  const checkTwoFactorStatus = async () => {
    try {
      setLoading(true);
      setError("");

      const status = await googleAuthService.getStatus();
      setTwoFactorStatus(status);

      if (status.twoFactorEnabled && !status.twoFactorVerified) {
        setShowVerification(true);
      }
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSuccess = (result) => {
    console.log("2FA verification successful:", result);
    setShowVerification(false);
    // Refresh status to update verification state
    checkTwoFactorStatus();
  };

  // If user is not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If email is not verified, redirect to OTP verification first
  if (!emailVerified) {
    return <Navigate to="/verify-otp" state={{ from: location }} replace />;
  }

  // If still loading 2FA status
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          padding: "40px",
        }}
      >
        <div
          style={{
            border: "3px solid #f3f3f3",
            borderTop: "3px solid #4285f4",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
            marginBottom: "20px",
          }}
        ></div>
        <p>Checking security settings...</p>
      </div>
    );
  }

  // If there was an error checking 2FA status, show error but allow access
  if (error) {
    console.warn("2FA check failed, allowing access:", error);
    return children;
  }

  // If 2FA is not enabled, allow access
  if (!twoFactorStatus?.twoFactorEnabled) {
    return children;
  }
  // If 2FA is enabled but not verified for this session, show verification
  if (showVerification) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        }}
      >
        <GoogleAuthVerification
          onSuccess={handleTwoFactorSuccess}
          email={currentUser.email}
        />
      </div>
    );
  }

  // If all checks pass, render the protected content
  return children;
}

// Add the spinning animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

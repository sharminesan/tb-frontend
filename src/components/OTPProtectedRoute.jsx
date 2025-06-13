import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";

export default function OTPProtectedRoute({ children }) {
  const { currentUser, emailVerified, checkEmailVerification } = useAuth();
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkVerification = async () => {
      if (!currentUser) {
        setIsVerifying(false);
        return;
      }

      setIsVerifying(true);
      try {
        const isVerified = await checkEmailVerification(currentUser);
        setVerificationChecked(true);
        setIsVerifying(false);
      } catch (error) {
        console.error("Error checking email verification:", error);
        setVerificationChecked(true);
        setIsVerifying(false);
      }
    };

    checkVerification();
  }, [currentUser, checkEmailVerification]);
  // Show loading while checking verification
  if (isVerifying) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="otp-protection-loading">
            <div className="verification-spinner"></div>
            <h2>Verifying Email Status</h2>
            <p>Please wait while we check your email verification...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Redirect to OTP verification if email is not verified
  if (verificationChecked && !emailVerified) {
    return (
      <Navigate
        to="/verify-otp"
        state={{
          email: currentUser.email,
          from: location.pathname,
        }}
        replace
      />
    );
  }

  // Show content if verified
  return emailVerified ? children : null;
}

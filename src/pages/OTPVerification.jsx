import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

export default function OTPVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { currentUser, logout, checkEmailVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || currentUser?.email;

  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch("http://localhost:4000/api/otp/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        // OTP verified successfully - refresh verification status
        await checkEmailVerification(currentUser);

        // Redirect to the intended page or dashboard
        const redirectTo = location.state?.from || "/dashboard";
        navigate(redirectTo, { replace: true });
      } else {
        setError(result.error || "Invalid OTP. Please try again.");
        // Clear OTP inputs on error
        setOtp(["", "", "", "", "", ""]);
        document.getElementById("otp-0")?.focus();
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError("");

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch("http://localhost:4000/api/otp/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        // Reset timer and state
        setResendTimer(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        document.getElementById("otp-0")?.focus();

        // Start new countdown
        const timer = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || "Failed to resend OTP");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }

    setResendLoading(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Email Verification</h2>
          <p>We've sent a 6-digit code to</p>
          <p className="email-display">{email}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                autoComplete="off"
              />
            ))}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || otp.join("").length !== 6}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className="otp-actions">
          <p className="resend-text">
            Didn't receive the code?{" "}
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="resend-btn"
              >
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            ) : (
              <span className="timer">Resend in {resendTimer}s</span>
            )}
          </p>
        </div>

        <div className="auth-link">
          <button onClick={handleLogout} className="logout-link">
            Use different account
          </button>
        </div>
      </div>
    </div>
  );
}

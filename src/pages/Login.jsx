import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

// Helper to translate technical error messages to user-friendly text
function getFriendlyErrorMessage(error) {
  console.log(error.message);
  if (!error || !error.message) return "An unknown error occurred.";
  const msg = error.message.toLowerCase();
  if (msg.includes("network")) return "Network error: Please check your internet connection.";
  if (msg.includes("password")) return "Incorrect password. Please try again.";
  if (msg.includes("user not found")) return "No account found with this email.";
  if (msg.includes("too many requests")) return "Too many login attempts. Please wait and try again later.";
  if (msg.includes("otp")) return "There was a problem sending the OTP. Please try again.";
  if (msg.includes("invalid email")) return "Please enter a valid email address.";
  if (msg.includes("credential")) return "Invalid credentials. Please check your email and password.";
  if (msg.includes("email already in use")) return "This email is already registered. Please log in.";
  if (msg.includes("user disabled")) return "Your account has been disabled. Please contact support.";
  if (msg.includes("operation not allowed")) return "This operation is not allowed. Please contact support.";
  if (msg.includes("auth/")) return "Authentication error: " + msg.replace("auth/", "");
  if (msg.includes("failed to fetch")) return "Unable to connect to the server. Please try again later.";
  return error.message;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, resetEmailVerification } = useAuth();
  const navigate = useNavigate();

  // Get backend URL from environment variable
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      // Login user first
      const userCredential = await login(email, password);
      const user = userCredential.user; // Establish backend session
      const sessionResponse = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: email, password }),
      });

      if (!sessionResponse.ok) {
        console.warn(
          "Backend session creation failed, continuing with OTP flow"
        );
      } // Send OTP after successful login
      const token = await user.getIdToken();

      const otpResponse = await fetch(`${backendUrl}/api/otp/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (otpResponse.ok) {
        // Reset verification status and redirect to OTP verification
        resetEmailVerification();
        navigate("/verify-otp", { state: { email } });
      } else {
        const result = await otpResponse.json();
        throw new Error(result.error || "Failed to send OTP");
      }
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    }

    setLoading(false);
  }
  async function handleGoogleSignIn() {
    try {
      setError("");
      setLoading(true);

      // Login with Google
      const result = await loginWithGoogle();
      const user = result.user;

      // For Google login, try to establish backend session with email as username
      // Note: This might fail if user doesn't exist in backend, but we continue anyway
      try {
        const sessionResponse = await fetch(`${backendUrl}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: user.email,
            password: "google_auth",
          }),
        });

        if (!sessionResponse.ok) {
          console.warn(
            "Backend session creation failed for Google login, continuing with OTP flow"
          );
        }
      } catch (sessionError) {
        console.warn(
          "Failed to create backend session for Google login:",
          sessionError
        );
      } // Send OTP after successful Google login
      const token = await user.getIdToken();

      const otpResponse = await fetch(`${backendUrl}/api/otp/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user.email }),
      });
      if (otpResponse.ok) {
        // Reset verification status and redirect to OTP verification
        resetEmailVerification();
        navigate("/verify-otp", { state: { email: user.email } });
      } else {
        const result = await otpResponse.json();
        throw new Error(result.error || "Failed to send OTP");
      }
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    }

    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to access your TurtleBot dashboard</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <button
          className="google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          Sign in with Google
        </button>

        <div className="auth-link">
          Don't have an account? <Link to="/register">Create one here</Link>
        </div>
      </div>
    </div>
  );
}

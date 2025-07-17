import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

// Password validation function following Google's best practices
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("At least one special character");
  }

  // Check for common weak patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push("No more than 2 repeated characters in a row");
  }

  if (/123|abc|password|qwerty/i.test(password)) {
    errors.push("No common patterns (123, abc, password, etc.)");
  }

  return errors;
}

// Helper to translate technical error messages to user-friendly text
function getFriendlyErrorMessage(error) {
  if (!error || !error.message) return "An unknown error occurred.";
  const msg = error.message.toLowerCase();
  if (msg.includes("network"))
    return "Network error: Please check your internet connection.";
  if (msg.includes("email-already-in-use"))
    return "An account with this email already exists. Please try logging in instead.";
  if (msg.includes("weak-password"))
    return "Password is too weak. Please follow the requirements shown.";
  if (msg.includes("invalid-email"))
    return "Please enter a valid email address.";
  if (msg.includes("failed to fetch"))
    return "Unable to connect to the server. Please try again later.";
  // Add more mappings as needed
  return error.message;
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, updateUserProfile, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-fill email if passed from login page
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      const errorMessage =
        "Password requirements not met:\n• " + passwordErrors.join("\n• ");
      return setError(errorMessage);
    }

    try {
      setError("");
      setLoading(true);
      const { user } = await signup(email, password, role);
      await updateUserProfile({ displayName: fullName });
      navigate("/dashboard");
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    }

    setLoading(false);
  }

  async function handleGoogleSignUp() {
    try {
      setError("");
      setLoading(true);
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    }

    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join TurtleBot to get started</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <div className="password-input-container">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="password-info">
                <span className="info-icon">ℹ️</span>
                <div className="password-tooltip">
                  <strong>Password Requirements:</strong>
                  <ul>
                    <li>At least 8 characters</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character (!@#$%^&*)</li>
                    <li>No more than 2 repeated characters in a row</li>
                    <li>No common patterns (123, abc, password, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>{" "}
          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          className="google-btn"
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          Sign up with Google
        </button>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}

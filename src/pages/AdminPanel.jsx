import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./AdminPanel.css";
import { Link } from "react-router-dom";

export default function AdminPanel() {
  const { currentUser, userRole } = useAuth();
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("user");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Get backend URL from environment variable
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  const promoteUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Get user token for authentication
      const token = await currentUser.getIdToken();
      const response = await fetch(`${backendUrl}/api/auth/promote-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          role: targetRole,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully promoted ${email} to ${targetRole}`);
        setEmail("");
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    }

    setLoading(false);
  };

  // Temporary admin override (for testing)
  const makeYourselfAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/auth/assign-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          role: "admin",
          override: true, // Special flag for first admin
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("✅ You are now an admin! Please refresh the page.");
        // Force token refresh
        await currentUser.getIdToken(true);
        window.location.reload();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    }
    setLoading(false);
  };

  if (userRole !== "admin" && userRole !== "user") {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-panel-page">
      <div className="admin-card">
        <h2>Admin Panel</h2>

        {userRole !== "admin" && (
          <div className="temp-admin-section">
            <h3>First Time Setup</h3>
            <p>
              If you're the first user, click below to make yourself an admin:
            </p>
            <button
              onClick={makeYourselfAdmin}
              disabled={loading}
              className="admin-btn"
            >
              {loading ? "Processing..." : "Make Me Admin"}
            </button>
          </div>
        )}

        {userRole === "admin" && (
          <div className="promote-section">
            <h3>Edit User Role</h3>
            <form onSubmit={promoteUser}>
              <div className="form-group">
                <label>User Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Change to:</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className="promote-btn">
                {loading ? "Editing..." : "Edit User Role"}
              </button>
            </form>
            <Link to="/dashboard" className="home-link">
              Home
            </Link>
          </div>
        )}

        {message && <div className="message">{message}</div>}

        <div className="current-user-info">
          <p>
            <strong>Your Email:</strong> {currentUser?.email}
          </p>
          <p>
            <strong>Your Role:</strong> {userRole}
          </p>
          <p>
            <strong>Your UID:</strong> {currentUser?.uid}
          </p>
        </div>
      </div>
    </div>
  );
}

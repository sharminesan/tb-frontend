import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          textAlign: "center",
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        }}
      >
        <div>
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <p>Required role(s): {allowedRoles.join(", ")}</p>
          <p>Your role: {userRole}</p>
        </div>
      </div>
    );
  }

  return children;
}

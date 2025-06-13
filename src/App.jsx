import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OTPProtectedRoute from "./components/OTPProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OTPVerification from "./pages/OTPVerification";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {" "}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/verify-otp"
              element={
                <ProtectedRoute>
                  <OTPVerification />
                </ProtectedRoute>
              }
            />{" "}
            <Route
              path="/dashboard"
              element={
                <OTPProtectedRoute>
                  <Dashboard />
                </OTPProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <OTPProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminPanel />
                  </RoleProtectedRoute>
                </OTPProtectedRoute>
              }
            />{" "}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

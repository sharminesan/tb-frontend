import { createContext, useContext, useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyACSIvJ7mJukK37rynY-Q-rM7gUSgKPuOk",
  authDomain: "turtlebot-8070c.firebaseapp.com",
  projectId: "turtlebot-8070c",
  storageBucket: "turtlebot-8070c.firebasestorage.app",
  messagingSenderId: "781667383771",
  appId: "1:781667383771:web:09d6ece6b31d3b59c3cffe",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Backend URL for role management
  const [backendUrl] = useState("http://localhost:4000");
  // Auth functions
  const signup = async (email, password, role = "user") => {
    console.log("🔐 Attempting to create user with role:", role);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Assign role after signup
    try {
      console.log("📡 Sending role assignment request:", {
        uid: userCredential.user.uid,
        role,
      });
      const response = await fetch(`${backendUrl}/api/auth/assign-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          role: role,
        }),
      });

      const result = await response.json();
      console.log("🔄 Role assignment response:", result);

      if (!response.ok) {
        console.error("❌ Role assignment failed:", result);
      }
    } catch (error) {
      console.error("Error assigning role:", error);
    }

    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);

    // Check if user has a role, if not assign default
    const token = await result.user.getIdTokenResult();
    if (!token.claims.role) {
      try {
        await fetch(`${backendUrl}/api/auth/assign-role`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: result.user.uid,
            role: "user",
          }),
        });

        // Force token refresh to get updated claims
        await result.user.getIdToken(true);
      } catch (error) {
        console.error("Error assigning role:", error);
      }
    }

    return result;
  };
  const logout = () => {
    return signOut(auth);
  };

  const updateUserProfile = (updates) => {
    return updateProfile(auth.currentUser, updates);
  };

  // Function to get user role from token claims
  const getUserRole = async () => {
    if (currentUser) {
      try {
        const tokenResult = await currentUser.getIdTokenResult();
        return tokenResult.claims.role || "user";
      } catch (error) {
        console.error("Error getting user role:", error);
        return "user";
      }
    }
    return null;
  };

  // Function to refresh user role
  const refreshUserRole = async () => {
    if (currentUser) {
      try {
        // Force token refresh
        await currentUser.getIdToken(true);
        const tokenResult = await currentUser.getIdTokenResult();
        setUserRole(tokenResult.claims.role || "user");
      } catch (error) {
        console.error("Error refreshing user role:", error);
        setUserRole("user");
      }
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Get user role from custom claims
        try {
          const tokenResult = await user.getIdTokenResult();
          console.log("👤 User token claims:", tokenResult.claims);
          const role = tokenResult.claims.role || "user";
          console.log("🏷️ Setting user role to:", role);
          setUserRole(role);
        } catch (error) {
          console.error("Error getting user role:", error);
          setUserRole("user");
        }
      } else {
        setUserRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile,
    getUserRole,
    refreshUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

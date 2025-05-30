import { createContext, useContext, useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyACSIvJ7mJukK37rynY-Q-rM7gUSgKPuOk",
  authDomain: "turtlebot-8070c.firebaseapp.com",
  projectId: "turtlebot-8070c",
  storageBucket: "turtlebot-8070c.firebasestorage.app",
  messagingSenderId: "781667383771",
  appId: "1:781667383771:web:09d6ece6b31d3b59c3cffe"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Auth functions
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password)
  }

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider)
  }

  const logout = () => {
    return signOut(auth)
  }

  const updateUserProfile = (updates) => {
    return updateProfile(auth.currentUser, updates)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

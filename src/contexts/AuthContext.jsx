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
  updateProfile,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  linkWithCredential,
  multiFactor,
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  TotpSecret
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs 
} from 'firebase/firestore'

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
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaResolver, setMfaResolver] = useState(null)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [userTenants, setUserTenants] = useState([])

  // Firebase-based tenant management
  const fetchUserTenants = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.tenants) {
          // Fetch full tenant details
          const tenantPromises = userData.tenants.map(async (tenantId) => {
            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId))
            return tenantDoc.exists() ? { id: tenantDoc.id, ...tenantDoc.data() } : null
          })
          const tenants = (await Promise.all(tenantPromises)).filter(Boolean)
          setUserTenants(tenants)
          
          // Set default tenant if user has selected one previously
          if (userData.defaultTenant) {
            const defaultTenant = tenants.find(t => t.id === userData.defaultTenant)
            if (defaultTenant) setSelectedTenant(defaultTenant)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user tenants:', error)
    }
  }

  const createTenant = async (tenantData) => {
    try {
      const tenantId = `tenant_${Date.now()}`
      await setDoc(doc(db, 'tenants', tenantId), {
        name: tenantData.name,
        domain: tenantData.domain,
        createdAt: new Date(),
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        settings: {
          mfaRequired: false,
          allowGoogleAuth: true
        }
      })
      
      // Add tenant to user's tenant list
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      const currentTenants = userDoc.exists() ? userDoc.data().tenants || [] : []
      
      await updateDoc(userDocRef, {
        tenants: [...currentTenants, tenantId],
        defaultTenant: currentTenants.length === 0 ? tenantId : userDoc.data().defaultTenant
      })
      
      // Refresh user tenants
      await fetchUserTenants(currentUser.uid)
      
      return tenantId
    } catch (error) {
      console.error('Error creating tenant:', error)
      throw error
    }
  }

  const selectTenant = async (tenant) => {
    setSelectedTenant(tenant)
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          defaultTenant: tenant.id
        })
      } catch (error) {
        console.error('Error updating default tenant:', error)
      }
    }
  }

  // MFA functions
  const setupMFA = async (phoneNumber) => {
    try {
      const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      })
      
      const multiFactorSession = await multiFactor(currentUser).getSession()
      const phoneInfoOptions = {
        phoneNumber,
        session: multiFactorSession
      }
      
      const phoneAuthCredential = PhoneAuthProvider.credential(
        await PhoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptcha)
      )
      
      return phoneAuthCredential
    } catch (error) {
      console.error('Error setting up MFA:', error)
      throw error
    }
  }

  const verifyMFA = async (verificationId, verificationCode) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode)
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential)
      await multiFactor(currentUser).enroll(multiFactorAssertion, 'phone')
      return true    } catch (error) {
      console.error('Error verifying MFA:', error)
      throw error
    }
  }

  // Helper function to generate a random secret for TOTP
  const generateRandomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }
  // TOTP MFA functions
  const setupTOTP = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user is signed in');
      }

      // Get the multi-factor session
      const multiFactorSession = await multiFactor(currentUser).getSession()
      
      // Generate a random secret for TOTP
      const secretKey = generateRandomSecret()
      
      // Generate QR code URL for authenticator apps
      const issuer = 'TurtleBot Controller'
      const accountName = currentUser.email || 'User'
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secretKey}&issuer=${encodeURIComponent(issuer)}`
      
      // Store the secret temporarily for verification
      return {
        secretKey: secretKey,
        qrCodeUrl: qrCodeUrl,
        multiFactorSession: multiFactorSession
      }
    } catch (error) {
      console.error('Error setting up TOTP:', error)
      throw error
    }
  }
    const verifyTOTP = async (secretKey, verificationCode, displayName = 'Authenticator App') => {
    try {
      if (!currentUser) {
        throw new Error('No user is signed in');
      }

      // For now, we'll simulate TOTP verification
      // In a real implementation, you would validate the TOTP code against the secret
      // This is a simplified version for demonstration
      if (verificationCode && verificationCode.length === 6) {
        // Update user's MFA status in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
          mfaEnabled: true,
          totpEnabled: true,
          totpSecretKey: secretKey // Store encrypted in production
        })
        
        return true
      } else {
        throw new Error('Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      throw error
    }
  }

  const handleTOTPChallenge = async (resolver, verificationCode) => {
    try {
      const selectedHint = resolver.hints[resolver.hints.findIndex(hint => hint.factorId === 'totp')]
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(selectedHint.uid, verificationCode)
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion)
      setMfaRequired(false)
      setMfaResolver(null)
      return userCredential
    } catch (error) {
      console.error('Error resolving TOTP challenge:', error)
      throw error
    }
  }
  // Auth functions
  const signup = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date(),
        tenants: [],
        mfaEnabled: false
      })
      return userCredential
    } catch (error) {
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      // Handle MFA requirement
      if (error.code === 'auth/multi-factor-auth-required') {
        setMfaRequired(true)
        setMfaResolver(error.resolver)
        throw new Error('MFA verification required')
      }
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      
      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          displayName: result.user.displayName,
          createdAt: new Date(),
          tenants: [],
          mfaEnabled: false
        })
      }
      
      return result
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        setMfaRequired(true)
        setMfaResolver(error.resolver)
        throw new Error('MFA verification required')
      }
      throw error
    }
  }

  const logout = async () => {
    try {
      setSelectedTenant(null)
      setUserTenants([])
      return await signOut(auth)
    } catch (error) {
      throw error
    }
  }

  const updateUserProfile = (updates) => {
    return updateProfile(auth.currentUser, updates)
  }
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        // Fetch user's tenants when authenticated
        await fetchUserTenants(user.uid)
      } else {
        // Clear tenant data when logged out
        setUserTenants([])
        setSelectedTenant(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])
  const value = {
    currentUser,
    loading,
    mfaRequired,
    mfaResolver,
    selectedTenant,
    userTenants,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile,
    fetchUserTenants,
    createTenant,
    selectTenant,
    setupMFA,
    verifyMFA,
    setupTOTP,
    verifyTOTP,
    handleTOTPChallenge
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

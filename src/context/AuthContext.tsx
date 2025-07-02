import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { createUserDocument, getUserById } from '../services/userService';
import { User } from '../models/User';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signInWithGoogle: () => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user data from Firestore
  const fetchUserData = async (user: FirebaseUser) => {
    try {
      const userData = await getUserById(user.uid);
      setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  // Create a new user with email and password
  const signUp = async (email: string, password: string, displayName: string): Promise<FirebaseUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, { displayName });
    
    // Create user document in Firestore
    await createUserDocument(
      userCredential.user.uid,
      userCredential.user.email,
      displayName,
      userCredential.user.photoURL
    );
    
    return userCredential.user;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user document in Firestore
    await createUserDocument(
      userCredential.user.uid,
      userCredential.user.email,
      userCredential.user.displayName,
      userCredential.user.photoURL
    );
    
    return userCredential.user;
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    
    // Update user document in Firestore
    await createUserDocument(
      userCredential.user.uid,
      userCredential.user.email,
      userCredential.user.displayName,
      userCredential.user.photoURL
    );
    
    return userCredential.user;
  };

  // Sign out
  const logout = async (): Promise<void> => {
    setUserData(null);
    return await signOut(auth);
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

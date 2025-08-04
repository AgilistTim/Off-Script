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
import { guestSessionService } from '../services/guestSessionService';
import GuestMigrationService from '../services/guestMigrationService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user: FirebaseUser; migrationResult: any }>;
  signIn: (email: string, password: string) => Promise<{ user: FirebaseUser; migrationResult: any }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<User | null>;
  hasGuestData: () => boolean;
  getGuestDataPreview: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
      try {
        const userData = await getUserById(currentUser.uid);
        setUserData(userData);
        return userData;
      } catch (error) {
        console.error('Error refreshing user data:', error);
        return null;
      }
    }
    return null;
  };

  // Create a new user with email and password
  const signUp = async (email: string, password: string, displayName: string): Promise<{ user: FirebaseUser; migrationResult: any }> => {
    // Capture guest session before creating account
    const guestSession = guestSessionService.getGuestSession();
    const hasGuestData = guestSessionService.hasSignificantData();
    
    // 🔍 COMPREHENSIVE GUEST MIGRATION DEBUG
    console.log('🔄 SignUp: Guest data available:', hasGuestData);
    console.log('🔍 MIGRATION DEBUG - Raw localStorage:', localStorage.getItem('guest-session-storage'));
    console.log('🔍 MIGRATION DEBUG - Guest session object:', guestSession);
    console.log('🔍 MIGRATION DEBUG - Career cards count:', guestSession?.careerCards?.length || 0);
    console.log('🔍 MIGRATION DEBUG - Conversation count:', guestSession?.conversationHistory?.length || 0);
    console.log('🔍 MIGRATION DEBUG - Person profile:', guestSession?.personProfile);
    console.log('🔍 MIGRATION DEBUG - Video progress:', guestSession?.videoProgress);
    
    if (hasGuestData) {
      console.log('📊 Guest data preview:', GuestMigrationService.getGuestDataPreview());
    } else {
      console.log('❌ MIGRATION DEBUG - Why no significant data?', {
        careerCardsLength: guestSession?.careerCards?.length || 0,
        conversationLength: guestSession?.conversationHistory?.length || 0,
        hasPersonProfile: !!guestSession?.personProfile,
        personProfileInterests: guestSession?.personProfile?.interests?.length || 0,
        personProfileGoals: guestSession?.personProfile?.goals?.length || 0,
        videosWatched: guestSession?.videoProgress?.videosWatched?.length || 0
      });
    }

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

    // Migrate guest data if available
    let migrationResult = null;
    if (hasGuestData) {
      try {
        console.log('🔄 Starting guest data migration for new user:', userCredential.user.uid);
        migrationResult = await GuestMigrationService.migrateGuestToRegisteredUser(
          userCredential.user.uid,
          guestSession,
          'registration'
        );
        
        if (migrationResult) {
          console.log('✅ Guest data migration completed:', migrationResult);
        }
      } catch (migrationError) {
        console.error('⚠️ Guest data migration failed (registration continues):', migrationError);
        // Don't fail registration if migration fails
      }
    }
    
    return { user: userCredential.user, migrationResult };
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<{ user: FirebaseUser; migrationResult: any }> => {
    // Capture guest session before login
    const guestSession = guestSessionService.getGuestSession();
    const hasGuestData = guestSessionService.hasSignificantData();
    
    console.log('🔄 SignIn: Guest data available:', hasGuestData);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user document in Firestore
    await createUserDocument(
      userCredential.user.uid,
      userCredential.user.email,
      userCredential.user.displayName,
      userCredential.user.photoURL
    );

    // Handle guest data migration if available
    let migrationResult = null;
    if (hasGuestData) {
      try {
        // Ask user if they want to merge guest data
        const shouldMerge = window.confirm(
          `We found ${guestSession.careerCards.length} career cards and conversation history from your recent browsing. Would you like to save this to your account?`
        );
        
        if (shouldMerge) {
          console.log('🔄 Starting guest data migration for existing user:', userCredential.user.uid);
          migrationResult = await GuestMigrationService.migrateGuestToRegisteredUser(
            userCredential.user.uid,
            guestSession,
            'login'
          );
          
          if (migrationResult) {
            console.log('✅ Guest data migration completed:', migrationResult);
          }
        } else {
          // User declined migration, clear guest session
          guestSessionService.clearSession();
          console.log('❌ User declined guest data migration, session cleared');
        }
      } catch (migrationError) {
        console.error('⚠️ Guest data migration failed (login continues):', migrationError);
        // Don't fail login if migration fails
      }
    }
    
    return { user: userCredential.user, migrationResult };
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    // Capture guest session before Google login
    const guestSession = guestSessionService.getGuestSession();
    const hasGuestData = guestSessionService.hasSignificantData();

    const userCredential = await signInWithPopup(auth, googleProvider);
    
    // Update user document in Firestore
    await createUserDocument(
      userCredential.user.uid,
      userCredential.user.email,
      userCredential.user.displayName,
      userCredential.user.photoURL
    );

    // Handle guest data migration for Google sign-in
    if (hasGuestData) {
      try {
        console.log('🔄 Starting guest data migration for Google user:', userCredential.user.uid);
        await GuestMigrationService.migrateGuestToRegisteredUser(
          userCredential.user.uid,
          guestSession,
          'login'
        );
      } catch (migrationError) {
        console.error('⚠️ Guest data migration failed (Google login continues):', migrationError);
      }
    }
    
    return userCredential.user;
  };

  // Sign out
  const logout = async (): Promise<void> => {
    setUserData(null);
    return await signOut(auth);
  };

  // Guest data helper methods
  const hasGuestData = (): boolean => {
    return GuestMigrationService.hasGuestDataToMigrate();
  };

  const getGuestDataPreview = () => {
    return GuestMigrationService.getGuestDataPreview();
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
    logout,
    refreshUserData,
    hasGuestData,
    getGuestDataPreview
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

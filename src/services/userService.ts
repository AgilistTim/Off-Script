import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  serverTimestamp,
  collectionGroup,
  limit,
  getCountFromServer,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, UserPreferences, UserProfile } from '../models/User';

// Convert Firestore timestamp to Date
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const result = { ...data };
  
  Object.keys(result).forEach(key => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = convertTimestamps(result[key]);
    }
  });
  
  return result;
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    return usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestamps(data) as User;
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (uid: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return convertTimestamps(userDoc.data()) as User;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Get total user count
export const getUserCount = async (): Promise<number> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getCountFromServer(usersRef);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Get current user data first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const currentProfile = userData.profile || {};
    
    // Update only the profile field, preserving existing data
    await updateDoc(userRef, { 
      profile: {
        ...currentProfile,
        ...profile
      } 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (uid: string, role: 'user' | 'admin' | 'parent'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user preferences
export const updateUserPreferences = async (uid: string, preferences: Partial<UserPreferences>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Get current user data first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const currentPreferences = userData.preferences || {};
    
    // Update only the preferences field, preserving existing data
    await updateDoc(userRef, { 
      preferences: {
        ...currentPreferences,
        ...preferences
      } 
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// Create a new user document
export const createUserDocument = async (
  uid: string, 
  email: string | null, 
  displayName: string | null,
  photoURL: string | null = null
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Check if user already exists
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      // Just update the last login time
      await updateDoc(userRef, { 
        lastLogin: serverTimestamp() 
      });
      return;
    }
    
    // Create new user document
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      photoURL,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: 'user',
      preferences: {
        theme: 'system',
        notifications: true,
        emailUpdates: true
      },
      profile: {}
    });
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}; 
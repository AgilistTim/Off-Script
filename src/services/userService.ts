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
import { db, auth } from './firebase';
import { User, UserPreferences, UserProfile } from '../models/User';
import { sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';
import { perplexityCareerEnhancementService } from './perplexityCareerEnhancementService';

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
      
      // Check for enhancement opportunities for existing users
      try {
        await checkEnhancementOpportunities(uid);
      } catch (error) {
        console.warn('⚠️ Could not check enhancement opportunities (non-critical):', error);
      }
      
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

// Send password reset email
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Check for enhancement opportunities for existing users on login
 */
const checkEnhancementOpportunities = async (userId: string): Promise<void> => {
  try {
    // Only check if Perplexity enhancement is available
    if (!perplexityCareerEnhancementService.isEnhancementAvailable()) {
      return;
    }

    console.log(`🔍 Checking enhancement opportunities for user: ${userId}`);

    // Check for stale career cards (older than 30 days)
    const staleCards = await findStaleCareerCards(userId, 30); // 30 days
    
    if (staleCards.length > 0) {
      console.log(`🔄 Found ${staleCards.length} stale career cards for refresh`);
      
      // Queue background enhancement for stale cards
      setTimeout(async () => {
        try {
          console.log(`🚀 Starting background refresh for ${staleCards.length} stale career cards`);
          
          await perplexityCareerEnhancementService.batchEnhanceUserCareerCards(
            userId,
            staleCards,
            (status) => {
              console.log(`📊 Refresh progress:`, status);
            }
          );

          console.log(`✅ Background career card refresh completed for user: ${userId}`);
        } catch (error) {
          console.error(`❌ Background career card refresh failed for user ${userId}:`, error);
        }
      }, 10000); // Start after 10 seconds to allow login to complete
    } else {
      console.log(`✅ No stale career cards found for user: ${userId}`);
    }

  } catch (error) {
    console.error('❌ Error checking enhancement opportunities:', error);
    // Don't throw - this is a premium feature and shouldn't break login
  }
};

/**
 * Find career cards that are older than the specified number of days
 */
const findStaleCareerCards = async (userId: string, maxAgeDays: number): Promise<any[]> => {
  try {
    const maxAge = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    // Query threadCareerGuidance for user's career cards
    const guidanceQuery = query(
      collection(db, 'threadCareerGuidance'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(guidanceQuery);
    const staleCards: any[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      
      // Check if guidance data needs refresh
      const lastUpdated = data.guidance?.enhancedAt 
        ? new Date(data.guidance.enhancedAt).getTime()
        : data.createdAt?.toMillis() || 0;
        
      if (lastUpdated < maxAge) {
        // Add primary pathway if exists
        if (data.guidance?.primaryPathway) {
          staleCards.push({
            id: data.guidance.primaryPathway.id,
            title: data.guidance.primaryPathway.title,
            description: data.guidance.primaryPathway.description,
            lastUpdated: new Date(lastUpdated)
          });
        }
        
        // Add alternative pathways if they exist
        if (data.guidance?.alternativePathways) {
          data.guidance.alternativePathways.forEach((pathway: any) => {
            staleCards.push({
              id: pathway.id,
              title: pathway.title,
              description: pathway.description,
              lastUpdated: new Date(lastUpdated)
            });
          });
        }
      }
    }
    
    return staleCards;
    
  } catch (error) {
    console.error('❌ Error finding stale career cards:', error);
    return [];
  }
}; 
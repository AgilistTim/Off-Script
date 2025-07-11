import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Test user credentials
const TEST_EMAIL = 'admin@offscript.com';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_DISPLAY_NAME = 'Admin User';

// Check for required environment variable
if (!TEST_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required');
  console.log('💡 Set ADMIN_PASSWORD in your .env.local file');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestAdminUser() {
  try {
    console.log(`Creating test admin user: ${TEST_EMAIL}`);
    
    // Create user with email and password
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      console.log('User created successfully');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('User already exists. Continuing with Firestore update.');
      } else {
        throw error;
      }
    }
    
    // Get the user ID if we have a user credential
    const uid = userCredential ? userCredential.user.uid : null;
    
    if (!uid) {
      console.log('No user ID available. Unable to update Firestore document.');
      return;
    }
    
    // Create or update user document in Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
      role: 'admin',
      createdAt: new Date(),
      lastLogin: new Date()
    }, { merge: true });
    
    console.log(`Updated Firestore document for user ${uid} with admin role`);
    
    // Sign out the current user
    await signOut(auth);
    console.log('Signed out test user');
    
    console.log('\nTest admin user created successfully:');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log(`Role: admin`);
    
  } catch (error) {
    console.error('Error creating test admin user:', error);
  }
}

// Run the function
createTestAdminUser()
  .then(() => {
    console.log('Script completed');
    // Add a delay before exiting to ensure Firebase operations complete
    setTimeout(() => process.exit(0), 3000);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 
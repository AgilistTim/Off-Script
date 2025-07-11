import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Setup dotenv
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin credentials
const ADMIN_EMAIL = 'admin@offscript.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Check for required environment variable
if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required');
  console.log('💡 Set ADMIN_PASSWORD in your .env.local file');
  process.exit(1);
}

async function ensureAdminUser() {
  try {
    console.log('Checking if admin user exists...');
    
    let uid;
    
    try {
      // Try to sign in with the admin credentials
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = userCredential.user.uid;
      console.log('Admin user exists, signed in successfully.');
    } catch (signInError) {
      console.log('Admin user does not exist, creating...');
      
      // Create the admin user
      const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = userCredential.user.uid;
      console.log('Admin user created successfully.');
    }
    
    // Check if the user document exists in Firestore
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create the user document with admin role
      await setDoc(userRef, {
        uid,
        email: ADMIN_EMAIL,
        displayName: 'Admin User',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: 'admin',
        preferences: {
          theme: 'system',
          notifications: true,
          emailUpdates: true
        },
        profile: {}
      });
      console.log('Admin user document created in Firestore.');
    } else {
      // Ensure the user has admin role
      const userData = userDoc.data();
      if (userData.role !== 'admin') {
        await setDoc(userRef, { ...userData, role: 'admin' }, { merge: true });
        console.log('Updated user role to admin.');
      } else {
        console.log('User already has admin role.');
      }
    }
    
    console.log('Admin user setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error ensuring admin user:', error);
    process.exit(1);
  }
}

// Run the function
ensureAdminUser(); 
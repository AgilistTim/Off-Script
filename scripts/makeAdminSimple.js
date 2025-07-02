// Simple script to make a user an admin
// Run with: node scripts/makeAdminSimple.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Email of the user to make admin
const EMAIL_TO_MAKE_ADMIN = 'tim@agilist.co.uk';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function makeUserAdmin() {
  try {
    console.log(`Looking for user with email: ${EMAIL_TO_MAKE_ADMIN}`);
    
    // Query for the user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', EMAIL_TO_MAKE_ADMIN));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No user found with email ${EMAIL_TO_MAKE_ADMIN}`);
      return;
    }
    
    // Update each matching user (should only be one)
    for (const docSnapshot of querySnapshot.docs) {
      const userId = docSnapshot.id;
      const userData = docSnapshot.data();
      
      console.log(`Found user: ${userId}`);
      console.log(`Current role: ${userData.role}`);
      
      if (userData.role === 'admin') {
        console.log('User is already an admin');
      } else {
        // Update the user's role to admin
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { role: 'admin' });
        console.log(`Updated user ${userId} to admin role`);
      }
    }
    
    console.log('Script completed');
  } catch (error) {
    console.error('Error making user admin:', error);
  }
}

// Run the function
makeUserAdmin(); 
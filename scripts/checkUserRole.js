// Script to check a user's current role
// Run with: node scripts/checkUserRole.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Email of the user to check
const EMAIL_TO_CHECK = 'tim@agilist.co.uk';

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

async function checkUserRole() {
  try {
    console.log(`Looking for user with email: ${EMAIL_TO_CHECK}`);
    
    // Query for the user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', EMAIL_TO_CHECK));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No user found with email ${EMAIL_TO_CHECK}`);
      return;
    }
    
    // Display user information
    for (const docSnapshot of querySnapshot.docs) {
      const userId = docSnapshot.id;
      const userData = docSnapshot.data();
      
      console.log(`User ID: ${userId}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Display Name: ${userData.displayName || 'Not set'}`);
      console.log(`Role: ${userData.role}`);
      console.log(`Last Login: ${userData.lastLogin ? new Date(userData.lastLogin.seconds * 1000).toLocaleString() : 'Never'}`);
    }
    
  } catch (error) {
    console.error('Error checking user role:', error);
  }
}

// Run the function
checkUserRole(); 
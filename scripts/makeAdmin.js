import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize dotenv
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Make a user an admin by their email address
 * @param {string} email - The email of the user to make admin
 */
async function makeUserAdmin(email) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Query for the user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No user found with email ${email}`);
      return;
    }
    
    // Update each matching user (should only be one)
    let updated = false;
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
        updated = true;
      }
    }
    
    if (updated) {
      console.log('Success! User is now an admin.');
    }
  } catch (error) {
    console.error('Error making user admin:', error);
  }
}

// Get the email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Please provide an email address as an argument');
  console.log('Example: node makeAdmin.js user@example.com');
  process.exit(1);
}

// Run the function
makeUserAdmin(email)
  .then(() => {
    console.log('Script completed');
    // Add a delay before exiting to ensure Firebase operations complete
    setTimeout(() => process.exit(0), 3000);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 
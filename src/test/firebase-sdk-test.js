// Test script to verify Firebase SDK behavior
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Simple Firebase config for testing
const firebaseConfig = {
  apiKey: "test-key",
  authDomain: "test.firebaseapp.com",
  projectId: "offscript-8f6eb",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test data
const testObject = {
  simpleString: "test string",
  simpleNumber: 42,
  simpleBoolean: true,
  simpleArray: ["item1", "item2"],
  simpleObject: {
    nestedString: "nested value",
    nestedNumber: 123
  },
  complexObject: {
    interests: ["YouTube content creation", "AI"],
    careerGoals: ["share experiences", "build narrative"],
    skills: ["content creation", "storytelling"]
  }
};

console.log('=== Testing Firebase SDK Object Handling ===');
console.log('Original test object:', JSON.stringify(testObject, null, 2));

// Test function to save and retrieve data
async function testFirebaseObjectHandling() {
  try {
    const testDocRef = doc(db, 'test-collection', 'test-document');
    
    console.log('Saving test object to Firebase...');
    await setDoc(testDocRef, testObject);
    console.log('✅ Test object saved successfully');
    
    console.log('Retrieving test object from Firebase...');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      const retrievedData = docSnap.data();
      console.log('Retrieved data:', JSON.stringify(retrievedData, null, 2));
      
      // Check if any fields are strings instead of objects
      const issues = [];
      Object.entries(retrievedData).forEach(([key, value]) => {
        if (typeof value === 'string' && value === '[Object]') {
          issues.push(`${key} is '[Object]' string instead of object`);
        }
      });
      
      if (issues.length > 0) {
        console.log('❌ Issues found:', issues);
      } else {
        console.log('✅ No object-to-string conversion detected');
      }
    } else {
      console.log('❌ Document not found after save');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFirebaseObjectHandling(); 
// Debug script to test serialization
import { serializeForFirebase, flattenNestedArraysForFirebase } from '../lib/utils.ts';
import { prepareDataForFirebase } from '../lib/firebase-utils.ts';

// Test data similar to what's being saved
const testProfile = {
  interests: ["YouTube content creation", "AI"],
  careerGoals: ["share experiences", "build narrative"],
  skills: ["content creation", "storytelling"],
  personalQualities: ["creative", "analytical"]
};

const testGuidance = {
  primaryPathway: {
    title: "Content Creator",
    description: "Create engaging content",
    skills: ["video editing", "storytelling"],
    transferabilityFutureProofing: {
      automationExposure: {
        protectiveFactors: ["creativity", "human connection"]
      }
    }
  },
  alternativePathways: [
    {
      title: "AI Specialist",
      description: "Work with AI systems"
    }
  ]
};

console.log('=== Testing Profile Serialization ===');
console.log('Original profile:', testProfile);

const flattenedProfile = flattenNestedArraysForFirebase(testProfile);
console.log('After flattening:', flattenedProfile);

const serializedProfile = serializeForFirebase(flattenedProfile);
console.log('After serialization:', serializedProfile);

const dataPrep = prepareDataForFirebase(testProfile);
console.log('Data prep result:', dataPrep);

console.log('\n=== Testing Guidance Serialization ===');
console.log('Original guidance:', testGuidance);

const flattenedGuidance = flattenNestedArraysForFirebase(testGuidance);
console.log('After flattening:', flattenedGuidance);

const serializedGuidance = serializeForFirebase(flattenedGuidance);
console.log('After serialization:', serializedGuidance);

const guidanceDataPrep = prepareDataForFirebase(testGuidance);
console.log('Guidance data prep result:', guidanceDataPrep); 
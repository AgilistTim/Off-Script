import { flattenNestedArraysForFirebase } from './utils';

/**
 * Firebase Utilities - Object Cleaning and Serialization Helpers
 * 
 * Provides utilities to ensure proper Firebase serialization by cleaning
 * objects of undefined values and non-serializable properties
 */

/**
 * Type for objects that can be safely serialized to Firebase
 */
export type FirebaseSerializable = {
  [key: string]: any;
} | null;

/**
 * Recursively clean an object for Firebase serialization
 * 
 * This function removes undefined values, filters undefined elements from arrays,
 * and recursively processes nested objects to ensure proper Firebase serialization.
 * 
 * Firebase handles null values correctly, so they are preserved.
 * 
 * @param obj - The object to clean
 * @returns A cleaned object safe for Firebase serialization
 */
export function cleanObjectForFirebase<T = any>(obj: T): FirebaseSerializable {
  // Handle null and primitive values
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Handle primitive types (string, number, boolean)
  if (typeof obj !== 'object') {
    return obj as any;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined) // Remove undefined elements
      .map(item => cleanObjectForFirebase(item)) // Recursively clean each element
      .filter(item => item !== null || obj.includes(null)); // Keep nulls only if they were explicitly in the original array
  }
  
  // Handle Date objects (Firebase supports Timestamps)
  if (obj instanceof Date) {
    return obj;
  }
  
  // Handle regular objects
  const cleaned: { [key: string]: any } = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }
    
    // Recursively clean nested objects and arrays
    const cleanedValue = cleanObjectForFirebase(value);
    
    // Only add non-undefined values to the cleaned object
    if (cleanedValue !== undefined) {
      cleaned[key] = cleanedValue;
    }
  }
  
  return cleaned;
}

/**
 * Helper function to ensure an object is serializable before Firebase operations
 * 
 * This function first flattens any nested arrays (Firebase limitation) and then
 * cleans the object of undefined values to ensure proper serialization.
 * 
 * @param data - The data to prepare for Firebase
 * @returns Cleaned data ready for Firebase operations
 */
export function prepareForFirestore<T = any>(data: T): FirebaseSerializable {
  // First flatten nested arrays to handle Firebase's nested array limitation
  const flattened = flattenNestedArraysForFirebase(data);
  
  // Then clean the object to remove undefined values
  return cleanObjectForFirebase(flattened);
}

/**
 * Legacy alias for prepareForFirestore with validation result format
 */
export function prepareDataForFirebase<T = any>(data: T): { 
  success: boolean; 
  data: FirebaseSerializable; 
  errors?: string[] 
} {
  try {
    const cleanedData = prepareForFirestore(data);
    return {
      success: true,
      data: cleanedData
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: [error instanceof Error ? error.message : 'Unknown error during data preparation']
    };
  }
}

/**
 * Type guard to check if a value is serializable
 * 
 * @param value - The value to check
 * @returns True if the value can be safely serialized to Firebase
 */
export function isFirebaseSerializable(value: any): boolean {
  try {
    // Attempt to serialize and check for circular references or other issues
    JSON.stringify(cleanObjectForFirebase(value));
    return true;
  } catch (error) {
    console.warn('Value is not Firebase serializable:', error);
    return false;
  }
}

/**
 * Retry Firebase operations with exponential backoff
 * 
 * @param operation - The Firebase operation to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result with metadata
 */
export async function retryFirebaseOperation<T>(
  operation: () => Promise<T>,
  options: { maxRetries: number; initialDelayMs: number } = { maxRetries: 3, initialDelayMs: 100 }
): Promise<{ success: boolean; result?: T; error?: Error; retryCount: number }> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        result,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxRetries) {
        break;
      }
      
      // Exponential backoff with provided initial delay
      const delay = options.initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Firebase operation failed, retrying (attempt ${attempt + 1}/${options.maxRetries + 1}):`, error);
    }
  }
  
  return {
    success: false,
    error: lastError!,
    retryCount: options.maxRetries
  };
}

/**
 * Log Firebase operations for debugging
 * 
 * @param operation - Name of the operation
 * @param data - Data being processed
 * @param status - Operation status ('success' | 'error')
 * @param metadata - Additional metadata
 */
export function logFirebaseOperation(
  operation: string,
  data?: any,
  status?: 'success' | 'error',
  metadata?: any
): void {
  const logLevel = status === 'error' ? 'error' : 'log';
  const emoji = status === 'error' ? '❌' : '🔥';
  
  console[logLevel](`${emoji} Firebase ${operation} (${status || 'info'}):`, {
    operation,
    status: status || 'info',
    dataSize: data ? JSON.stringify(data).length : 0,
    metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Validate career card data structure
 * 
 * @param data - Career card data to validate
 * @returns Validation result with success status and errors
 */
export function validateCareerCardData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
  } else {
    // Basic validation for required fields
    if (!data.title) {
      errors.push('Missing required field: title');
    }
    if (!data.description) {
      errors.push('Missing required field: description');
    }
    
    // Check if data is serializable
    if (!isFirebaseSerializable(data)) {
      errors.push('Data contains non-serializable properties');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate user profile data structure
 * 
 * @param data - User profile data to validate
 * @returns Validation result with success status and errors
 */
export function validateUserProfileData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Profile data must be a valid object');
  } else {
    // Check if data is serializable
    if (!isFirebaseSerializable(data)) {
      errors.push('Profile data contains non-serializable properties');
    }
    
    // Additional validation can be added here
    if (data.interests && !Array.isArray(data.interests)) {
      errors.push('interests must be an array');
    }
    if (data.skills && !Array.isArray(data.skills)) {
      errors.push('skills must be an array');
    }
    if (data.careerGoals && !Array.isArray(data.careerGoals)) {
      errors.push('careerGoals must be an array');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Converts various timestamp formats to milliseconds since epoch
 * 
 * Handles Firestore Timestamp objects, JavaScript Date objects, string/number timestamps,
 * and null/undefined values in a robust way. This is essential for cache invalidation
 * logic that compares timestamps from different sources.
 * 
 * @param timestamp - The timestamp value to convert (Firestore Timestamp, Date, string, number, or null)
 * @returns Number of milliseconds since epoch, or null if conversion fails
 * 
 * @example
 * // Firestore Timestamp object
 * const millis1 = convertFirestoreTimestampToMillis(serverTimestamp());
 * 
 * // JavaScript Date object
 * const millis2 = convertFirestoreTimestampToMillis(new Date());
 * 
 * // ISO string
 * const millis3 = convertFirestoreTimestampToMillis('2023-12-01T10:00:00Z');
 * 
 * // Epoch milliseconds
 * const millis4 = convertFirestoreTimestampToMillis(1701424800000);
 */
export function convertFirestoreTimestampToMillis(timestamp: any): number | null {
  // Handle null or undefined
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  // Handle Firestore Timestamp objects (have .toDate() method)
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate().getTime();
    } catch (error) {
      console.warn('Failed to convert Firestore Timestamp to Date:', error);
      return null;
    }
  }

  // Handle JavaScript Date objects
  if (timestamp instanceof Date) {
    const time = timestamp.getTime();
    return isNaN(time) ? null : time;
  }

  // Handle numbers (assume milliseconds since epoch)
  if (typeof timestamp === 'number') {
    return isNaN(timestamp) ? null : timestamp;
  }

  // Handle strings or other types by attempting Date parsing
  if (timestamp) {
    try {
      const date = new Date(timestamp);
      const time = date.getTime();
      if (isNaN(time)) {
        console.warn('Invalid timestamp format, could not parse:', timestamp);
        return null;
      }
      return time;
    } catch (error) {
      console.warn('Failed to parse timestamp:', timestamp, error);
      return null;
    }
  }

  // Fallback for any other type
  console.warn('Unexpected timestamp type:', typeof timestamp, timestamp);
  return null;
}
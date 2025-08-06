import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serializes complex objects for Firebase storage, handling all problematic data types
 * that cause [Object] serialization issues in Firestore
 * Preserves object structure while ensuring Firebase compatibility
 */
export function serializeForFirebase(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  // Handle primitive types
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Handle Date objects - convert to ISO string
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle functions, symbols, undefined - convert to null
  if (typeof data === 'function' || typeof data === 'symbol' || data === undefined) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data
      .map(item => serializeForFirebase(item))
      .filter(item => item !== null && item !== undefined);
  }

  // Handle objects - preserve structure
  if (typeof data === 'object') {
    // Check for circular references by tracking visited objects
    const seen = new WeakSet();
    
    return serializeObjectRecursive(data, seen);
  }

  return data;
}

/**
 * Recursively serializes objects while detecting circular references
 * Preserves object structure while ensuring Firebase compatibility
 */
function serializeObjectRecursive(obj: any, seen: WeakSet<object>): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Check for circular reference
  if (seen.has(obj)) {
    console.warn('Circular reference detected during Firebase serialization');
    return null;
  }

  // Add to seen objects
  seen.add(obj);

  // Handle special object types
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (obj instanceof RegExp) {
    return obj.toString();
  }

  // Handle plain objects - preserve structure
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip non-enumerable properties and functions
    if (typeof value === 'function') {
      continue;
    }

    // Recursively serialize the value
    const serializedValue = serializeForFirebase(value);
    
    // Only include non-null, non-undefined values
    if (serializedValue !== null && serializedValue !== undefined) {
      result[key] = serializedValue;
    }
  }

  return result;
}

/**
 * Validates that data is properly serializable for Firebase
 * Returns validation result with any issues found
 */
export function validateFirebaseData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  function checkValue(value: any, path: string = 'root'): void {
    if (value === null || value === undefined) {
      return;
    }

    // Check for problematic types
    if (typeof value === 'function') {
      errors.push(`Function found at ${path} - not serializable`);
      return;
    }

    if (typeof value === 'symbol') {
      errors.push(`Symbol found at ${path} - not serializable`);
      return;
    }

    // Check arrays for nested arrays (Firebase limitation)
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (Array.isArray(item)) {
          errors.push(`Nested array found at ${path}[${index}] - not supported by Firebase`);
        } else {
          checkValue(item, `${path}[${index}]`);
        }
      });
      return;
    }

    // Check objects recursively
    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        checkValue(val, `${path}.${key}`);
      }
    }
  }

  try {
    checkValue(data);
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Recursively flattens nested arrays for Firebase compatibility
 * Preserves object structure while ensuring Firebase compatibility
 */
export function flattenNestedArraysForFirebase(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays - actually flatten nested arrays
  if (Array.isArray(data)) {
    const flattened: any[] = [];
    
    for (const item of data) {
      if (Array.isArray(item)) {
        // If item is an array, recursively flatten it and spread the results
        const flattenedItem = flattenNestedArraysForFirebase(item);
        if (Array.isArray(flattenedItem)) {
          flattened.push(...flattenedItem);
        } else {
          flattened.push(flattenedItem);
        }
      } else if (typeof item === 'object' && item !== null) {
        // If item is an object, preserve its structure but flatten any nested arrays within it
        flattened.push(flattenNestedArraysForFirebase(item));
      } else {
        // Primitive values are fine
        flattened.push(item);
      }
    }
    
    return flattened.filter(item => item !== null && item !== undefined);
  }

  // Handle objects - preserve structure while flattening nested arrays
  if (typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = flattenNestedArraysForFirebase(value);
    }
    return result;
  }

  // Return primitives as-is
  return data;
}

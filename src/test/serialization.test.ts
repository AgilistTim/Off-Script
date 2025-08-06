import { describe, it, expect } from 'vitest';
import { serializeForFirebase, flattenNestedArraysForFirebase } from '../lib/utils';

describe('Firebase Serialization Fixes', () => {
  describe('serializeForFirebase', () => {
    it('should preserve object structure instead of converting to strings', () => {
      const testData = {
        interests: ['social justice', 'environmental sustainability'],
        goals: ['support social justice', 'promote green initiatives'],
        skills: ['teamwork', 'environmental cleanup'],
        personalQualities: ['passionate', 'focused', 'community-oriented']
      };

      const result = serializeForFirebase(testData);

      // Verify that objects are preserved, not converted to strings
      expect(result).toEqual(testData);
      expect(typeof result.interests).toBe('object');
      expect(Array.isArray(result.interests)).toBe(true);
      expect(typeof result.goals).toBe('object');
      expect(Array.isArray(result.goals)).toBe(true);
      expect(typeof result.skills).toBe('object');
      expect(Array.isArray(result.skills)).toBe(true);
      expect(typeof result.personalQualities).toBe('object');
      expect(Array.isArray(result.personalQualities)).toBe(true);
    });

    it('should handle nested objects properly', () => {
      const testData = {
        profile: {
          interests: ['social justice'],
          goals: ['support social justice'],
          skills: ['teamwork']
        },
        careerCards: [
          {
            title: 'Environmental Project Manager',
            description: 'Lead green initiatives',
            skills: ['project management', 'environmental knowledge']
          }
        ]
      };

      const result = serializeForFirebase(testData);

      // Verify that nested objects are preserved
      expect(result.profile).toEqual(testData.profile);
      expect(result.careerCards).toEqual(testData.careerCards);
      expect(typeof result.profile.interests).toBe('object');
      expect(Array.isArray(result.profile.interests)).toBe(true);
      expect(typeof result.careerCards[0]).toBe('object');
      expect(result.careerCards[0].title).toBe('Environmental Project Manager');
    });

    it('should handle arrays of objects properly', () => {
      const testData = {
        careerCards: [
          {
            title: 'Environmental Project Manager',
            skills: ['project management']
          },
          {
            title: 'Community Outreach Coordinator',
            skills: ['communication', 'organization']
          }
        ]
      };

      const result = serializeForFirebase(testData);

      // Verify that arrays of objects are preserved
      expect(result.careerCards).toEqual(testData.careerCards);
      expect(Array.isArray(result.careerCards)).toBe(true);
      expect(result.careerCards[0].title).toBe('Environmental Project Manager');
      expect(result.careerCards[1].title).toBe('Community Outreach Coordinator');
    });
  });

  describe('flattenNestedArraysForFirebase', () => {
    it('should preserve object structure while flattening nested arrays', () => {
      const testData = {
        interests: ['social justice', 'environmental sustainability'],
        goals: ['support social justice', 'promote green initiatives'],
        skills: ['teamwork', 'environmental cleanup'],
        personalQualities: ['passionate', 'focused', 'community-oriented']
      };

      const result = flattenNestedArraysForFirebase(testData);

      // Verify that objects are preserved, not converted to strings
      expect(result).toEqual(testData);
      expect(typeof result.interests).toBe('object');
      expect(Array.isArray(result.interests)).toBe(true);
      expect(typeof result.goals).toBe('object');
      expect(Array.isArray(result.goals)).toBe(true);
    });

    it('should handle nested arrays properly', () => {
      const testData = {
        careerCards: [
          {
            title: 'Environmental Project Manager',
            skills: ['project management', 'environmental knowledge']
          }
        ]
      };

      const result = flattenNestedArraysForFirebase(testData);

      // Verify that nested arrays are handled properly
      expect(result.careerCards[0].skills).toEqual(['project management', 'environmental knowledge']);
      expect(Array.isArray(result.careerCards[0].skills)).toBe(true);
    });

    it('should not convert objects to strings', () => {
      const testData = {
        profile: {
          interests: ['social justice'],
          goals: ['support social justice']
        }
      };

      const result = flattenNestedArraysForFirebase(testData);

      // Verify that objects are not converted to strings
      expect(typeof result.profile).toBe('object');
      expect(typeof result.profile.interests).toBe('object');
      expect(Array.isArray(result.profile.interests)).toBe(true);
      expect(result.profile.interests[0]).toBe('social justice');
    });

    it('should flatten nested arrays properly', () => {
      const testData = {
        primaryPathway: {
          transferabilityFutureProofing: {
            automationExposure: {
              protectiveFactors: [['factor1', 'factor2'], ['factor3', 'factor4']]
            }
          }
        },
        alternativePathways: [
          {
            transferabilityFutureProofing: {
              automationExposure: {
                protectiveFactors: [['alt1', 'alt2'], ['alt3', 'alt4']]
              }
            }
          },
          {
            transferabilityFutureProofing: {
              automationExposure: {
                protectiveFactors: [['alt5', 'alt6'], ['alt7', 'alt8']]
              }
            }
          }
        ]
      };

      const result = flattenNestedArraysForFirebase(testData);

      // Verify that nested arrays are flattened
      expect(Array.isArray(result.primaryPathway.transferabilityFutureProofing.automationExposure.protectiveFactors)).toBe(true);
      expect(result.primaryPathway.transferabilityFutureProofing.automationExposure.protectiveFactors).toEqual(['factor1', 'factor2', 'factor3', 'factor4']);
      
      expect(Array.isArray(result.alternativePathways[0].transferabilityFutureProofing.automationExposure.protectiveFactors)).toBe(true);
      expect(result.alternativePathways[0].transferabilityFutureProofing.automationExposure.protectiveFactors).toEqual(['alt1', 'alt2', 'alt3', 'alt4']);
      
      expect(Array.isArray(result.alternativePathways[1].transferabilityFutureProofing.automationExposure.protectiveFactors)).toBe(true);
      expect(result.alternativePathways[1].transferabilityFutureProofing.automationExposure.protectiveFactors).toEqual(['alt5', 'alt6', 'alt7', 'alt8']);
    });

    it('should handle simple nested arrays', () => {
      const testData = [['a', 'b'], ['c', 'd'], 'e'];
      const result = flattenNestedArraysForFirebase(testData);
      
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should handle deeply nested arrays', () => {
      const testData = [[['a', 'b'], ['c']], [['d', 'e']], 'f'];
      const result = flattenNestedArraysForFirebase(testData);
      
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });
}); 
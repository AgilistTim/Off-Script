import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CareerPathwayService } from '../services/careerPathwayService';

describe('Career Card Migration Flow', () => {
  let careerPathwayService: CareerPathwayService;

  beforeEach(() => {
    careerPathwayService = new CareerPathwayService();
  });

  afterEach(() => {
    // Clean up any test data
  });

  describe('Guest to Registered User Migration', () => {
    it('should throw error when user is not authenticated', async () => {
      // Mock unauthenticated user
      const mockAuth = { currentUser: null };
      vi.doMock('../services/firebase', () => ({ auth: mockAuth }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('User not authenticated for getCurrentCareerCards access');
    });

    it('should throw error when no threadCareerGuidance documents found', async () => {
      // Mock authenticated user but no documents
      const mockAuth = { currentUser: { uid: 'test-user-id' } };
      const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });
      
      vi.doMock('../services/firebase', () => ({ 
        auth: mockAuth,
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('No threadCareerGuidance documents found for user test-user-id');
    });

    it('should throw error when document has no guidance data', async () => {
      // Mock document without guidance
      const mockDoc = {
        id: 'test-doc',
        data: () => ({ threadId: 'test-thread', userId: 'test-user-id' })
      };
      const mockGetDocs = vi.fn().mockResolvedValue({ docs: [mockDoc] });
      
      vi.doMock('../services/firebase', () => ({ 
        auth: { currentUser: { uid: 'test-user-id' } },
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('Document test-doc has no guidance data');
    });

    it('should throw error when pathway has no title', async () => {
      // Mock document with guidance but no title
      const mockDoc = {
        id: 'test-doc',
        data: () => ({
          threadId: 'test-thread',
          userId: 'test-user-id',
          guidance: {
            primaryPathway: { /* no title */ },
            alternativePathways: []
          }
        })
      };
      const mockGetDocs = vi.fn().mockResolvedValue({ docs: [mockDoc] });
      
      vi.doMock('../services/firebase', () => ({ 
        auth: { currentUser: { uid: 'test-user-id' } },
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('Primary pathway in document test-doc has no title');
    });

    it('should successfully load comprehensive career cards', async () => {
      // Mock valid comprehensive data
      const mockDoc = {
        id: 'test-doc',
        data: () => ({
          threadId: 'test-thread',
          userId: 'test-user-id',
          guidance: {
            primaryPathway: {
              title: 'Software Engineer',
              roleFundamentals: { corePurpose: 'Develop software solutions' },
              workEnvironmentCulture: { typicalEmployers: ['Tech Companies'] },
              compensationRewards: { 
                salaryRange: { entry: 50000, mid: 75000, senior: 100000 } 
              },
              labourMarketDynamics: { 
                demandOutlook: { growthForecast: 'High growth' } 
              },
              competencyRequirements: { 
                technicalSkills: ['JavaScript', 'React'],
                softSkills: ['Communication']
              },
              workEnvironmentCulture: { 
                physicalContext: ['Office', 'Remote'] 
              }
            },
            alternativePathways: []
          }
        })
      };
      const mockGetDocs = vi.fn().mockResolvedValue({ docs: [mockDoc] });
      
      vi.doMock('../services/firebase', () => ({ 
        auth: { currentUser: { uid: 'test-user-id' } },
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      const result = await careerPathwayService.getCurrentCareerCards('test-user-id');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'guidance-test-doc-primary',
        title: 'Software Engineer',
        description: 'Develop software solutions',
        industry: 'Tech Companies',
        averageSalary: {
          entry: '£50,000',
          experienced: '£75,000',
          senior: '£100,000'
        },
        growthOutlook: 'High growth',
        keySkills: ['JavaScript', 'React', 'Communication'],
        workEnvironment: 'Office'
      });
    });
  });

  describe('Comprehensive Data Mapping', () => {
    it('should map all 10 sections of comprehensive data correctly', async () => {
      const comprehensivePathway = {
        title: 'Data Scientist',
        roleFundamentals: {
          corePurpose: 'Analyze complex data to drive business decisions',
          problemsSolved: ['Data analysis', 'Predictive modeling'],
          typicalResponsibilities: ['Data cleaning', 'Model development'],
          decisionLatitude: 'High autonomy',
          deliverables: ['Reports', 'Models', 'Insights'],
          keyStakeholders: ['Business leaders', 'Product teams']
        },
        competencyRequirements: {
          technicalSkills: ['Python', 'SQL', 'Machine Learning'],
          softSkills: ['Problem solving', 'Communication'],
          tools: ['Jupyter', 'Tableau', 'Git'],
          certifications: ['AWS ML', 'Google Cloud ML'],
          qualificationPathway: {
            degrees: ['Computer Science', 'Statistics'],
            licenses: [],
            alternativeRoutes: ['Bootcamps', 'Self-study'],
            apprenticeships: ['Data Science Apprenticeship'],
            bootcamps: ['Data Science Bootcamp']
          },
          learningCurve: {
            timeToCompetent: '2-3 years',
            difficultyLevel: 'High',
            prerequisites: ['Mathematics', 'Programming basics']
          }
        },
        compensationRewards: {
          salaryRange: {
            entry: 60000,
            mid: 85000,
            senior: 120000,
            exceptional: 150000,
            currency: 'GBP'
          },
          variablePay: {
            bonuses: 'Performance-based bonuses',
            commissions: 'N/A',
            equity: 'Stock options available',
            profitShare: 'Annual profit sharing'
          },
          nonFinancialBenefits: {
            pension: 'Employer contribution 5%',
            healthcare: 'Private health insurance',
            leavePolicy: '25 days + bank holidays',
            professionalDevelopment: 'Conference attendance',
            perks: ['Flexible working', 'Home office allowance']
          }
        },
        careerTrajectory: {
          progressionSteps: [
            {
              title: 'Junior Data Scientist',
              timeFrame: '0-2 years',
              requirements: ['Python', 'SQL', 'Statistics']
            },
            {
              title: 'Senior Data Scientist',
              timeFrame: '3-5 years',
              requirements: ['ML expertise', 'Leadership', 'Business acumen']
            }
          ],
          horizontalMoves: ['Product Manager', 'Research Scientist'],
          leadershipTrack: ['Lead Data Scientist', 'Head of Data'],
          specialistTrack: ['ML Engineer', 'Research Scientist'],
          dualLadders: true
        },
        labourMarketDynamics: {
          demandOutlook: {
            growthForecast: 'Very high growth',
            timeHorizon: '5-10 years',
            regionalHotspots: ['London', 'Manchester', 'Edinburgh']
          },
          supplyProfile: {
            talentScarcity: 'High demand, limited supply',
            competitionLevel: 'Competitive',
            barriers: ['Technical skills', 'Experience requirements']
          },
          economicSensitivity: {
            recessionImpact: 'Resilient during downturns',
            techDisruption: 'AI/ML advances create opportunities',
            cyclicalPatterns: 'Consistent growth'
          }
        },
        workEnvironmentCulture: {
          typicalEmployers: ['Tech companies', 'Consulting firms', 'Financial services'],
          teamStructures: ['Cross-functional teams', 'Data teams'],
          culturalNorms: {
            pace: 'Fast-paced',
            formality: 'Casual',
            decisionMaking: 'Data-driven',
            diversityInclusion: 'Strong focus on diversity'
          },
          physicalContext: ['Office', 'Remote', 'Hybrid']
        },
        lifestyleFit: {
          workingHours: {
            typical: '40 hours/week',
            flexibility: 'High flexibility',
            shiftWork: false,
            onCall: false
          },
          remoteOptions: {
            remoteWork: true,
            hybridOptions: true,
            travelRequirements: {
              frequency: 'Occasional',
              duration: '1-3 days',
              international: false
            }
          },
          stressProfile: {
            intensity: 'Moderate',
            volatility: 'Low',
            emotionalLabour: 'Minimal'
          },
          workLifeBoundaries: {
            flexibility: 'High',
            autonomy: 'High',
            predictability: 'Good'
          }
        },
        costRiskEntry: {
          upfrontInvestment: {
            tuitionCosts: '£9,250/year for degree',
            trainingCosts: '£5,000-15,000 for bootcamp',
            examFees: '£200-500 for certifications',
            lostEarnings: '£30,000-50,000 during training',
            totalEstimate: '£50,000-100,000 total investment'
          },
          employmentCertainty: {
            placementRates: '95%+ for qualified candidates',
            probationFailureRates: 'Low (<5%)',
            timeToFirstRole: '3-6 months after training'
          },
          regulatoryRisk: {
            licenseRequirements: [],
            renewalRequirements: 'N/A',
            revocationRisk: 'Minimal'
          }
        },
        valuesImpact: {
          societalContribution: {
            publicGood: 'Improves decision-making across sectors',
            sustainability: 'Enables data-driven sustainability',
            ethicalFootprint: 'Requires ethical AI practices'
          },
          personalAlignment: {
            intrinsicMotivation: ['Problem solving', 'Intellectual challenge'],
            meaningfulness: 'High - impacts business decisions',
            purposeDriven: true
          },
          reputationPrestige: {
            perceivedStatus: 'High - respected technical role',
            credibilityFactor: 'Strong - data-driven decisions',
            networkingValue: 'Excellent - growing field'
          }
        },
        transferabilityFutureProofing: {
          portableSkills: ['Programming', 'Statistics', 'Problem solving'],
          automationExposure: {
            vulnerabilityLevel: 'Low - creates automation',
            timeHorizon: '10+ years',
            protectiveFactors: ['Human judgment', 'Business context']
          },
          globalRelevance: {
            credentialRecognition: ['International', 'Industry-recognized'],
            marketDemand: ['Global demand', 'Remote opportunities'],
            culturalAdaptability: 'High - universal data needs'
          }
        }
      };

      // Test the mapping function
      const mappedCard = careerPathwayService.mapComprehensivePathwayToCard(
        comprehensivePathway,
        'test-doc',
        'primary',
        0
      );

      expect(mappedCard).toMatchObject({
        title: 'Data Scientist',
        description: 'Analyze complex data to drive business decisions',
        industry: 'Tech companies',
        averageSalary: {
          entry: '£60,000',
          experienced: '£85,000',
          senior: '£120,000'
        },
        growthOutlook: 'Very high growth',
        keySkills: ['Python', 'SQL', 'Machine Learning', 'Problem solving', 'Communication'],
        workEnvironment: 'Office',
        confidence: 85,
        source: 'conversation_guidance',
        isPrimary: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for permission denied', async () => {
      const mockError = { code: 'permission-denied', message: 'Permission denied' };
      const mockGetDocs = vi.fn().mockRejectedValue(mockError);
      
      vi.doMock('../services/firebase', () => ({ 
        auth: { currentUser: { uid: 'test-user-id' } },
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('Permission denied accessing threadCareerGuidance for user test-user-id');
    });

    it('should throw error for failed precondition (index building)', async () => {
      const mockError = { code: 'failed-precondition', message: 'Index building' };
      const mockGetDocs = vi.fn().mockRejectedValue(mockError);
      
      vi.doMock('../services/firebase', () => ({ 
        auth: { currentUser: { uid: 'test-user-id' } },
        db: {},
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));

      await expect(careerPathwayService.getCurrentCareerCards('test-user-id'))
        .rejects.toThrow('Firestore index still building for threadCareerGuidance - deployment issue');
    });
  });
}); 
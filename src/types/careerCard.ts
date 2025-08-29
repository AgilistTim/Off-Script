/**
 * Centralized Career Card Type Definitions
 * Supports legacy fields, comprehensive 10-section schema, and Perplexity enhancement data
 * 
 * Features:
 * - Backward compatibility with existing basic career cards
 * - Comprehensive 10-section career intelligence framework
 * - Optional Perplexity real-time market data enhancement
 * - Type safety with TypeScript interfaces and type guards
 */

// Core Career Card interface - comprehensive schema with backward compatibility
export interface CareerCard {
  // Core fields
  id: string;
  title: string;
  confidence?: number;
  location?: string;
  sourceData?: string;
  generatedAt?: string;
  webSearchVerified?: boolean;
  requiresVerification?: boolean;
  citations?: string[];
  
  // Legacy fields (optional for backward compatibility)
  description?: string;
  industry?: string;
  averageSalary?: {
    entry: string;
    experienced: string;
    senior: string;
  };
  salaryRange?: string;
  growthOutlook?: string;
  marketOutlook?: string;
  entryRequirements?: string[];
  trainingPathways?: string[];
  trainingPathway?: string;
  keySkills?: string[];
  skillsRequired?: string[];
  workEnvironment?: string;
  nextSteps?: string[];
  
  // Comprehensive 10-section schema (optional for new data)
  roleFundamentals?: {
    corePurpose: string;
    problemsSolved: string[];
    typicalResponsibilities: string[];
    decisionLatitude: string;
    deliverables: string[];
    keyStakeholders: string[];
  };
  
  competencyRequirements?: {
    technicalSkills: string[];
    softSkills: string[];
    tools: string[];
    certifications: string[];
    qualificationPathway: {
      degrees: string[];
      licenses: string[];
      alternativeRoutes: string[];
      apprenticeships: string[];
      bootcamps: string[];
    };
    learningCurve: {
      timeToCompetent: string;
      difficultyLevel: string;
      prerequisites: string[];
    };
  };
  
  compensationRewards?: {
    salaryRange: {
      entry: number;
      mid: number;
      senior: number;
      exceptional: number;
      currency: string;
    };
    variablePay: {
      bonuses: string;
      commissions: string;
      equity: string;
      profitShare: string;
    };
    nonFinancialBenefits: {
      pension: string;
      healthcare: string;
      leavePolicy: string;
      professionalDevelopment: string;
      perks: string[];
    };
  };
  
  careerTrajectory?: {
    progressionSteps: Array<{
      title: string;
      timeFrame: string;
      requirements: string[];
    }>;
    horizontalMoves: string[];
    leadershipTrack: string[];
    specialistTrack: string[];
    dualLadders: boolean;
  };
  
  labourMarketDynamics?: {
    demandOutlook: {
      growthForecast: string;
      timeHorizon: string;
      regionalHotspots: string[];
    };
    supplyProfile: {
      talentScarcity: string;
      competitionLevel: string;
      barriers: string[];
    };
    economicSensitivity: {
      recessionImpact: string;
      techDisruption: string;
      cyclicalPatterns: string;
    };
  };
  
  workEnvironmentCulture?: {
    typicalEmployers: string[];
    teamStructures: string[];
    culturalNorms: {
      pace: string;
      formality: string;
      decisionMaking: string;
      diversityInclusion: string;
    };
    physicalContext: string[];
  };
  
  lifestyleFit?: {
    workingHours: {
      typical: string;
      flexibility: string;
      shiftWork: boolean;
      onCall: boolean;
    };
    remoteOptions: {
      remoteWork: boolean;
      hybridOptions: boolean;
      travelRequirements: {
        frequency: string;
        duration: string;
        international: boolean;
      };
    };
    stressProfile: {
      intensity: string;
      volatility: string;
      emotionalLabour: string;
    };
    workLifeBoundaries: {
      flexibility: string;
      autonomy: string;
      predictability: string;
    };
  };
  
  costRiskEntry?: {
    upfrontInvestment: {
      tuitionCosts: string;
      trainingCosts: string;
      examFees: string;
      lostEarnings: string;
      totalEstimate: string;
    };
    employmentCertainty: {
      placementRates: string;
      probationFailureRates: string;
      timeToFirstRole: string;
    };
    regulatoryRisk: {
      licenseRequirements: string[];
      renewalRequirements: string;
      revocationRisk: string;
    };
  };
  
  valuesImpact?: {
    societalContribution: {
      publicGood: string;
      sustainability: string;
      ethicalFootprint: string;
    };
    personalAlignment: {
      intrinsicMotivation: string[];
      meaningfulness: string;
      purposeDriven: boolean;
    };
    reputationPrestige: {
      perceivedStatus: string;
      credibilityFactor: string;
      networkingValue: string;
    };
  };
  
  transferabilityFutureProofing?: {
    portableSkills: string[];
    automationExposure: {
      vulnerabilityLevel: string;
      timeHorizon: string;
      protectiveFactors: string[];
    };
    globalRelevance: {
      credentialRecognition: string[];
      marketDemand: string[];
      culturalAdaptability: string;
    };
  };
  
  // Perplexity Enhancement fields (optional, for real-time market data)
  enhancement?: {
    status: 'pending' | 'completed' | 'failed';
    lastUpdated: string;
    source: 'perplexity';
    confidence: number;
    staleAt: string;
  };
  
  perplexityData?: {
    verifiedSalaryRanges?: {
      entry: { min: number; max: number; currency: 'GBP'; sources: string[] };
      mid: { min: number; max: number; currency: 'GBP'; sources: string[] };
      senior: { min: number; max: number; currency: 'GBP'; sources: string[] };
      byRegion?: {
        london: { min: number; max: number };
        manchester: { min: number; max: number };
        birmingham: { min: number; max: number };
        scotland: { min: number; max: number };
      };
    };
    realTimeMarketDemand?: {
      jobPostingVolume: number; // Last 30 days
      growthRate: number; // YoY percentage
      competitionLevel: 'Low' | 'Medium' | 'High';
      sources: string[];
    };
    currentEducationPathways?: Array<{
      type: 'University' | 'Apprenticeship' | 'Professional' | 'Online';
      title: string;
      provider: string;
      duration: string;
      cost: { min: number; max: number; currency: 'GBP' };
      entryRequirements: string[];
      url?: string;
      verified: boolean;
    }>;
    workEnvironmentDetails?: {
      remoteOptions: boolean;
      flexibilityLevel: 'High' | 'Medium' | 'Low';
      typicalHours: string;
      workLifeBalance: string;
      stressLevel: 'Low' | 'Medium' | 'High';
    };
    automationRiskAssessment?: {
      level: 'Low' | 'Medium' | 'High';
      timeline: string;
      mitigationStrategies: string[];
      futureSkillsNeeded: string[];
    };
    industryGrowthProjection?: {
      nextYear: number; // % change
      fiveYear: number; // % change
      outlook: 'Excellent' | 'Good' | 'Stable' | 'Declining';
      factors: string[]; // Key growth drivers
    };
    competencyRequirements?: {
      technicalSkills: string[];
      softSkills: string[];
      tools: string[];
      certifications: string[];
      qualificationPathway: {
        degrees: string[];
        licenses: string[];
        alternativeRoutes: string[];
        apprenticeships: string[];
        bootcamps: string[];
      };
      learningCurve: {
        timeToCompetent: string;
        difficultyLevel: string;
        prerequisites: string[];
      };
    };
  };
}

// Type aliases for backward compatibility and clarity
export type CareerCardData = CareerCard;

// Enhanced Career Card type (same as CareerCard but more explicit naming)
export type EnhancedCareerCard = CareerCard;

// Type guard to check if a career card has been enhanced with Perplexity data
export function isEnhancedCareerCard(card: CareerCard): card is EnhancedCareerCard {
  return !!(card.enhancement?.status === 'completed' && card.perplexityData);
}

// Type for career cards with verified enhancement status
export type VerifiedEnhancedCareerCard = CareerCard & {
  enhancement: {
    status: 'completed';
    lastUpdated: string;
    source: 'perplexity';
    confidence: number;
    staleAt: string;
  };
  perplexityData: NonNullable<CareerCard['perplexityData']>;
};

// Person Profile interface
export interface PersonProfile {
  name?: string; // Optional field for user names (guest capture + authenticated display)
  lifeStage?: string; // Life stage information (e.g., "student", "career changer", etc.)
  careerDirection?: string; // Career direction preference (e.g., "unsure", "focused", etc.)
  interests: string[];
  skills: string[];
  goals: string[];
  values: string[];
  workStyle: string[];
  careerStage: "exploring" | "deciding" | "transitioning" | "advancing" | "focusing" | string;
  lastUpdated: string;
}
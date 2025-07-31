/**
 * Centralized Career Card Type Definitions
 * Supports both legacy and comprehensive 10-section schema
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
}

// Alias for backward compatibility with existing code
export type CareerCardData = CareerCard;

// Person Profile interface
export interface PersonProfile {
  interests: string[];
  skills: string[];
  goals: string[];
  values: string[];
  workStyle: string[];
  careerStage: "exploring" | "deciding" | "transitioning" | "advancing" | "focusing" | string;
  lastUpdated: string;
}
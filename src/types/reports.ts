/**
 * Comprehensive Report Generation Type Definitions
 * Supports user report generation with privacy controls, multiple report types, and data aggregation
 * 
 * Features:
 * - Multi-type report generation (parent, counselor, mentor, employer)
 * - Granular privacy controls for each data section
 * - Comprehensive user data aggregation from Firebase collections
 * - Batch processing with status tracking
 * - Chart image integration for PDF embedding
 */

import { CareerCard } from './careerCard';

// Report Types
export type ReportType = 'parent' | 'counselor' | 'mentor' | 'employer';

// Privacy Inclusion Levels
export type PrivacyLevel = 'exclude' | 'summary' | 'detailed';

// Report Generation Status
export type ReportJobStatus = 'queued' | 'processing' | 'generating_charts' | 'generating_pdf' | 'completed' | 'failed' | 'cancelled';

// Core Report Configuration
export interface ReportConfiguration {
  id: string;
  userId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  sections: ReportSectionConfiguration[];
  brandingOptions: {
    includeUserPhoto: boolean;
    includeOffScriptBranding: boolean;
    colorScheme: 'default' | 'professional' | 'creative';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Individual Section Configuration
export interface ReportSectionConfiguration {
  id: string;
  title: string;
  description: string;
  dataSource: string;
  inclusion: PrivacyLevel;
  subsections?: ReportSectionConfiguration[];
  customSettings?: Record<string, any>;
}

// Privacy Configuration for entire report
export interface PrivacyConfiguration {
  userId: string;
  reportId: string;
  sections: Record<string, PrivacyLevel>;
  globalSettings: {
    sharePersonalInfo: boolean;
    shareConversationContent: boolean;
    shareCareerRecommendations: boolean;
    shareProgressMetrics: boolean;
  };
  auditTrail: {
    lastModified: Date;
    modifiedBy: string;
    consentGiven: boolean;
    consentDate: Date;
  };
}

// Aggregated User Data for Report Generation
export interface AggregatedUserData {
  profile: UserProfileData;
  careerJourney: CareerJourneyData;
  conversationInsights: ConversationAnalytics;
  careerCards: EnhancedCareerCard[];
  personaEvolution: PersonaProgressData;
  engagementMetrics: EngagementMetrics;
  skillsProgression: SkillsData;
  recommendationsTracking: RecommendationData;
}

// User Profile Data
export interface UserProfileData {
  uid: string;
  name: string;
  email?: string;
  photoURL?: string;
  displayName?: string;
  role: 'user' | 'admin' | 'parent';
  createdAt: Date;
  lastLogin: Date;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    privacy?: Record<string, boolean>;
  };
}

// Career Journey Analytics
export interface CareerJourneyData {
  explorationTimeline: Array<{
    date: Date;
    event: string;
    type: 'conversation' | 'career_card' | 'milestone' | 'insight';
    confidence: number;
    details?: string;
  }>;
  progressMetrics: {
    totalConversations: number;
    careerCardsGenerated: number;
    skillsIdentified: number;
    confidenceProgression: Array<{
      date: Date;
      score: number;
    }>;
  };
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    achievedAt: Date;
    type: 'exploration' | 'decision' | 'action' | 'learning';
  }>;
}

// Conversation Analytics
export interface ConversationAnalytics {
  totalSessions: number;
  totalMessages: number;
  averageSessionLength: number;
  topicsDiscussed: Array<{
    topic: string;
    frequency: number;
    lastDiscussed: Date;
  }>;
  sentimentAnalysis: {
    overall: 'positive' | 'neutral' | 'negative';
    progression: Array<{
      date: Date;
      sentiment: number; // -1 to 1
    }>;
  };
  keyInsights: string[];
  conversationSummaries: Array<{
    id: string;
    date: Date;
    summary: string;
    interests: string[];
    careerGoals: string[];
    skills: string[];
  }>;
}

// Enhanced Career Card with Metadata
export interface EnhancedCareerCard extends CareerCard {
  generationContext: {
    conversationId: string;
    triggerReason: string;
    userIntent: string;
    confidenceFactors: string[];
  };
  userInteraction: {
    viewed: boolean;
    viewedAt?: Date;
    liked?: boolean;
    shared?: boolean;
    notes?: string;
  };
  reportInclusion: {
    includedInReports: string[];
    exclusionReason?: string;
  };
}

// Persona Progress Tracking
export interface PersonaProgressData {
  currentPersona: 'uncertain' | 'exploring' | 'decided';
  progressionHistory: Array<{
    date: Date;
    persona: string;
    confidence: number;
    triggerEvents: string[];
  }>;
  classificationTriggers: Array<{
    type: string;
    signal: string;
    weight: number;
    timestamp: Date;
  }>;
}

// Engagement Metrics
export interface EngagementMetrics {
  sessionMetrics: {
    totalSessions: number;
    averageSessionDuration: number;
    longestSession: number;
    lastActiveDate: Date;
    totalEngagementHours: number; // Total hours of platform engagement
  };
  interactionMetrics: {
    messagesPerSession: number;
    questionsAsked: number;
    deepDiveRequests: number;
    careerExplorationRate: number;
  };
  progressMetrics: {
    engagementScore: number; // 0-100
    consistencyScore: number; // 0-100
    growthRate: number; // Percentage
  };
}

// Skills Development Data
export interface SkillsData {
  identifiedSkills: Array<{
    skill: string;
    category: 'technical' | 'soft' | 'domain';
    proficiency: number; // 0-100
    identifiedAt: Date;
    source: 'conversation' | 'assessment' | 'inference';
  }>;
  skillProgression: Array<{
    skill: string;
    progressHistory: Array<{
      date: Date;
      level: number;
      evidence: string;
    }>;
  }>;
  recommendedSkills: Array<{
    skill: string;
    relevance: number;
    careerAlignment: string[];
    learningResources?: string[];
  }>;
}

// Recommendation Tracking
export interface RecommendationData {
  careerRecommendations: Array<{
    careerCardId: string;
    recommendedAt: Date;
    relevanceScore: number;
    userResponse?: 'interested' | 'not_interested' | 'exploring';
    followUpActions?: string[];
  }>;
  learningRecommendations: Array<{
    type: 'course' | 'skill' | 'experience' | 'networking';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'suggested' | 'in_progress' | 'completed' | 'dismissed';
  }>;
}

// Report Job Status Tracking
export interface ReportJob {
  id: string;
  userId: string;
  reportConfiguration: ReportConfiguration;
  privacySettings: PrivacyConfiguration;
  status: ReportJobStatus;
  priority: number;
  progress: number; // 0-100
  currentStep: string;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  estimatedCompletionTime?: Date;
  estimatedTimeRemaining?: number; // seconds
  downloadUrl?: string; // Base64 PDF data
  fileName?: string;
  fileSize?: number; // bytes
  error?: string;
}

// Chart Image Data for PDF Embedding
export interface ChartImageData {
  id: string;
  chartType: 'line' | 'pie' | 'radar' | 'bar' | 'area';
  title: string;
  description?: string;
  imageBase64: string;
  dimensions: {
    width: number;
    height: number;
  };
  generatedAt: Date;
  dataSource: string;
}

// Report Generation Context
export interface ReportGenerationContext {
  reportId: string;
  userId: string;
  configuration: ReportConfiguration;
  privacySettings: PrivacyConfiguration;
  aggregatedData: AggregatedUserData;
  chartImages: ChartImageData[];
  templateSettings: {
    pageSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

// Report Template Definition
export interface ReportTemplate {
  id: string;
  name: string;
  reportType: ReportType;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    component: string;
    required: boolean;
    order: number;
  }>;
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: {
      heading: number;
      body: number;
      caption: number;
    };
  };
}

// Audit Trail for Report Generation
export interface ReportAuditTrail {
  reportId: string;
  userId: string;
  action: 'created' | 'generated' | 'downloaded' | 'shared' | 'deleted';
  timestamp: Date;
  details: {
    reportType: ReportType;
    sectionsIncluded: string[];
    privacyLevel: Record<string, PrivacyLevel>;
    recipient?: string;
    downloadLocation?: string;
  };
  userAgent?: string;
  ipAddress?: string;
}

// Type Guards for Runtime Validation
export const isReportType = (value: string): value is ReportType => {
  return ['parent', 'counselor', 'mentor', 'employer'].includes(value);
};

export const isPrivacyLevel = (value: string): value is PrivacyLevel => {
  return ['exclude', 'summary', 'detailed'].includes(value);
};

export const isReportJobStatus = (value: string): value is ReportJobStatus => {
  return ['queued', 'processing', 'generating_charts', 'generating_pdf', 'completed', 'failed'].includes(value);
};

/**
 * TypeScript interfaces for Firebase-stored conversation objectives system
 * This enables dynamic, intelligent conversation flows instead of rigid question sequences
 */

export interface ConversationObjective {
  id: string;
  version: number;
  
  // Core objective definition
  purpose: string;                    // "discover_life_stage", "explore_work_satisfaction", "validate_career_direction"
  category: 'onboarding' | 'exploration' | 'validation' | 'analysis';
  informationNeeded: string[];        // ["life_stage", "satisfaction_level", "career_interests"]
  
  // LLM guidance (not scripts)
  systemPrompt?: string;             // Base system prompt template for this objective
  approach: {
    tone: string;                     // "genuinely curious and welcoming"
    style: string;                    // "build on their last response naturally" 
    constraints: string[];            // ["don't make it feel like interview", "validate feelings"]
    personalityAdjustments: {
      [persona: string]: string;     // Different approaches per persona
    };
  };
  
  // Completion and transition logic
  completionCriteria: {
    requiredDataPoints: string[];     // ["name", "current_situation"]
    confidenceThreshold: number;     // 0.8 = 80% confidence
    minExchanges: number;             // Minimum conversation exchanges
    maxExchanges: number;             // Maximum before forcing transition
  };
  
  // Flow control
  transitions: {
    onSuccess: string | null;         // Next objective ID on completion
    onTimeout: string | null;         // Fallback objective if max exchanges reached
    onUserRedirect: string | null;    // If user steers conversation elsewhere
  };
  
  // Analytics and optimization
  analytics: {
    successRate: number;              // % of conversations that complete this objective
    averageExchanges: number;         // Average exchanges to completion
    userSatisfactionScore: number;    // Feedback quality score
    lastOptimized: Date;
  };
  
  // Admin management
  metadata: {
    created: Date;
    lastModified: Date;
    createdBy: string;
    isActive: boolean;
    tags: string[];                   // ["onboarding", "quick", "essential"]
    notes: string;                    // Admin notes for future optimization
  };
}

export interface ConversationTree {
  id: string;
  name: string;                       // "Default Onboarding Flow", "Alternative Quick Flow"
  description: string;
  version: number;
  
  // Tree structure
  rootObjectiveId: string;
  objectives: ConversationObjective[];
  
  // Flow rules
  routing: {
    [objectiveId: string]: {
      success: string | null;
      timeout: string | null;
      redirect: string | null;
      conditions?: ConversationCondition[];
    };
  };
  
  // Performance tracking
  analytics: {
    activeConversations: number;
    completionRate: number;           // % who complete full tree
    averageTreeTime: number;          // Minutes to complete
    dropoffPoints: string[];          // Objective IDs where users drop off
  };
  
  // A/B testing
  experiment: {
    isActive: boolean;
    trafficSplit: number;             // 0.5 = 50% of traffic
    variants: string[];               // Other tree IDs being tested against
    winner?: string;                  // Winning tree ID if experiment completed
  };
  
  metadata: {
    created: Date;
    lastModified: Date;
    isDefault: boolean;
    isActive: boolean;
    tags: string[];
  };
}

export interface ConversationCondition {
  type: 'persona' | 'messageCount' | 'dataPresent' | 'confidence' | 'userInput';
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
  value: any;
  weight: number;                     // For weighted decision making
}

export interface PromptManifest {
  version: number;
  lastUpdated: Date;
  checksum: string;                   // Hash of all active content
  
  // Change tracking
  activeObjectives: {
    [objectiveId: string]: {
      version: number;
      checksum: string;
      lastModified: Date;
    };
  };
  
  activeTrees: {
    [treeId: string]: {
      version: number;
      checksum: string;
      lastModified: Date;
      isDefault: boolean;
    };
  };
  
  // A/B testing
  experiments: {
    [experimentId: string]: {
      version: number;
      trafficSplit: number[];
      isActive: boolean;
      variants: string[];
    };
  };
  
  // Cache optimization
  cache: {
    lastPurged: Date;
    hotObjectives: string[];          // Most frequently accessed
    preloadTrees: string[];           // Trees to preload for performance
  };
}

export interface ObjectiveGenerationPrompt {
  systemPrompt: string;               // Generated system prompt for LLM
  dynamicVariables: Record<string, string>; // Context variables to inject
  toolRestrictions: string[];         // Which MCP tools are allowed
  responseConstraints: {
    maxWords: number;
    tone: string;
    format: 'text' | 'markdown';
  };
}

export interface ConversationState {
  currentObjectiveId: string;
  currentTreeId: string;
  startTime: Date;
  
  // Progress tracking
  completedObjectives: string[];
  dataCollected: Record<string, any>;
  confidenceScores: Record<string, number>;
  exchangeCount: number;
  
  // Context
  userPersona?: 'uncertain' | 'exploring' | 'decided';
  lastUserMessage: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    objectiveId: string;
  }>;
  
  // Analytics
  objectiveTimings: Record<string, number>; // milliseconds spent per objective
  transitionReasons: Record<string, string>; // why we moved to next objective
}

export interface PromptAnalytics {
  objectiveId: string;
  date: Date;
  
  // Performance metrics
  completionRate: number;
  averageExchanges: number;
  averageTimeSeconds: number;
  userSatisfactionScore: number;
  
  // Transition analysis
  transitions: {
    toObjectiveId: string;
    reason: 'success' | 'timeout' | 'redirect';
    count: number;
  }[];
  
  // Common user responses
  popularResponses: {
    userInput: string;
    frequency: number;
    averageSuccessRate: number;
  }[];
  
  // Optimization suggestions
  suggestions: {
    type: 'tone' | 'constraint' | 'completion_criteria' | 'transition';
    recommendation: string;
    confidence: number;
    dataSource: string;
  }[];
}

// Cache-specific types for performance
export interface CachedObjective {
  objective: ConversationObjective;
  prompt: ObjectiveGenerationPrompt | null; // Null for lazy loading
  lastAccessed: Date;
  accessCount: number;
}

export interface CachedTree {
  tree: ConversationTree;
  objectivePrompts: Record<string, ObjectiveGenerationPrompt>;
  lastAccessed: Date;
  isPreloaded: boolean;
}

// Admin interface types
export interface AdminPromptEdit {
  objectiveId: string;
  field: keyof ConversationObjective;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  adminUserId: string;
  reason: string;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  
  // Test configuration
  controlTreeId: string;
  variantTreeIds: string[];
  trafficSplit: number[];             // [0.5, 0.25, 0.25] = 50% control, 25% each variant
  
  // Success metrics
  primaryMetric: 'completion_rate' | 'satisfaction' | 'speed' | 'data_quality';
  secondaryMetrics: string[];
  minimumSampleSize: number;
  maxDurationDays: number;
  
  // Status
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  results?: ExperimentResults;
}

export interface ExperimentResults {
  winner: string;
  confidence: number;                 // Statistical confidence (0-1)
  improvementPercent: number;         // % improvement over control
  sampleSizes: Record<string, number>; // Conversations per variant
  metrics: Record<string, Record<string, number>>; // [treeId][metric] = value
}

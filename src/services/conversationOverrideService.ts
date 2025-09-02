/**
 * Modern Conversation Override Service
 * Replaces legacy global agent PATCH with privacy-safe conversation overrides
 * Based on official ElevenLabs @elevenlabs/react documentation
 */

import { CareerDiscussionContext } from '../types/careerDiscussionContext';
import { getUserById } from './userService';
import careerPathwayService from './careerPathwayService';
import { PersonaType, PersonaProfile, personaService } from './personaService';
import { guestSessionService } from './guestSessionService';
import { userPersonaService } from './userPersonaService';
import { enhancedPersonaIntegration } from './enhancedPersonaIntegration';
import { conversationFlowManager } from './conversationFlowManager';
import { integratedOnboardingService } from './integratedOnboardingService';

interface ConversationOverrides {
  agent: {
    prompt: {
      prompt: string;
    };
    firstMessage: string;
    language?: string;
  };
  tts?: {
    voiceId?: string;
  };
  conversation?: {
    textOnly?: boolean;
  };
  dynamicVariables?: Record<string, string>;
}

interface StartSessionOptions {
  agentId: string;
  userId?: string;
  connectionType: 'webrtc' | 'websocket';
  overrides: ConversationOverrides;
}

/**
 * Modern service that builds conversation overrides instead of global agent PATCH
 * This provides true per-session privacy isolation without cross-user contamination
 */
export class ConversationOverrideService {
  
  /**
   * Build career-specific conversation overrides
   * Replaces careerAwareVoiceService's global PATCH approach
   */
  async buildCareerOverrides(
    userId: string,
    careerCard: any,
    careerDiscussionContext?: CareerDiscussionContext
  ): Promise<ConversationOverrides> {
    console.log('🔒 Building career conversation overrides (privacy-safe):', {
      userId: userId.substring(0, 8) + '...',
      careerTitle: careerCard.title,
      hasContext: !!careerDiscussionContext
    });

    const userData = await getUserById(userId);
    if (!userData) {
      throw new Error(`User data not found for userId: ${userId}`);
    }

    // Build comprehensive career context prompt
    const contextPrompt = await this.buildCareerContextPrompt(userData, careerCard, careerDiscussionContext);
    
    // DEBUG: Log the exact system prompt being sent to ElevenLabs
    console.log('🔍 EXACT SYSTEM PROMPT BEING SENT TO ELEVENLABS:', {
      promptLength: contextPrompt.length,
      promptPreview: contextPrompt.substring(0, 500) + '...',
      fullPrompt: contextPrompt
    });
    
    // DEBUG: Log the full career card structure to understand missing data
    console.log('🔍 FULL CAREER CARD STRUCTURE BEING PROCESSED:', {
      careerTitle: careerCard.title,
      fullCareerCard: careerCard,
      hasPerplexityData: !!careerCard.perplexityData,
      perplexityDataStructure: careerCard.perplexityData
    });
    
    // Build personalized first message
    const userName = (userData.careerProfile?.name || userData.displayName || 'there').trim();
    const firstMessage = `Hi ${userName}! I have all the details about your career path in ${careerCard.title}. What would you like to explore first about this career?`;

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build authenticated user conversation overrides
   * For general conversations without specific career focus
   * Now includes persona-aware customization for registered users
   */
  async buildAuthenticatedOverrides(userId: string): Promise<ConversationOverrides> {
    console.log('🔒 Building authenticated conversation overrides:', {
      userId: userId.substring(0, 8) + '...'
    });

    const userData = await getUserById(userId);
    if (!userData) {
      throw new Error(`User data not found for userId: ${userId}`);
    }

    // Check for existing persona classification
    const personaContext = await userPersonaService.getPersonaConversationContext(userId);
    
    if (personaContext.hasPersona) {
      console.log('🧠 Using persona-aware overrides for authenticated user:', {
        userId: userId.substring(0, 8) + '...',
        persona: personaService.getPersonaDisplayName(personaContext.personaType!),
        confidence: Math.round(personaContext.confidence! * 100) + '%'
      });
      
      // Build persona-tailored overrides for registered users
      return this.buildAuthenticatedPersonaOverrides(userData, personaContext);
    } else {
      console.log('📝 No persona found - using standard authenticated overrides');
      
      // Use standard authenticated overrides
      const contextPrompt = await this.buildAuthenticatedContextPrompt(userData);
      const firstMessage = await this.buildPersonalizedFirstMessage(userData);

      return {
        agent: {
          prompt: {
            prompt: contextPrompt
          },
          firstMessage,
          language: "en"
        }
      };
    }
  }

  /**
   * Build guest user conversation overrides with integrated natural language onboarding
   */
  async buildGuestOverrides(topicTitle?: string): Promise<ConversationOverrides> {
    console.log('🔒 Building guest conversation overrides with integrated onboarding:', { topicTitle });

    // Initialize integrated onboarding system
    const onboardingProgress = await integratedOnboardingService.initializeOnboarding();
    
    const contextPrompt = this.buildIntegratedOnboardingContextPrompt(onboardingProgress);
    
    // Use dynamic first message based on onboarding stage and progress
    let firstMessage: string;
    
    if (topicTitle) {
      // Topic-specific entry point
      firstMessage = `Let's explore ${topicTitle} together! I can help you understand this career path. What interests you most about it?`;
    } else if (onboardingProgress.evidenceCollected.name) {
      // Continuing conversation with known name
      const name = onboardingProgress.evidenceCollected.name;
      firstMessage = `Hi ${name}! Ready to continue exploring your career possibilities? ${onboardingProgress.nextQuestion || "What's been on your mind lately?"}`;
    } else {
      // Fresh onboarding start - conversational and engaging like voice mode
      firstMessage = "Hi, I'm Sarah an AI assistant. I'm here to help you think about careers and next steps. Lots of people feel unsure about their future — some have no idea where to start, some are weighing up different paths, and some already have a clear goal. To make sure I can give you the most useful support, I'll ask a few quick questions about where you're at right now. There are no right or wrong answers — just tell me in your own words. By the end, I'll have a better idea whether you need help discovering options, narrowing down choices, or planning the next steps for a career you already have in mind. First up whats your name?";
    }

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build comprehensive career context prompt (replaces legacy PATCH logic)
   */
  /**
   * Build comprehensive career context from ALL enhanced Perplexity data
   */
  private buildDetailedCareerContext(careerCard: any): string {
    // Debug log to understand the full structure of what we're receiving
    console.log('🔍 TRAINING DEBUG - Full career card structure:', {
      title: careerCard.title,
      hasPerplexityData: !!careerCard.perplexityData,
      hasEnhancedData: !!careerCard.perplexityData?.enhancedData,
      hasCurrentEducationPathways: !!careerCard.perplexityData?.enhancedData?.currentEducationPathways,
      pathwaysCount: careerCard.perplexityData?.enhancedData?.currentEducationPathways?.length || 0,
      hasTrainingPathways: !!careerCard.trainingPathways,
      legacyTrainingCount: careerCard.trainingPathways?.length || 0,
      
      // NEW: Check ALL possible locations where training data might be stored
      hasDirectCurrentEducationPathways: !!careerCard.currentEducationPathways,
      directPathwaysCount: careerCard.currentEducationPathways?.length || 0,
      hasCareerProgression: !!careerCard.careerProgression,
      careerProgressionCount: careerCard.careerProgression?.length || 0,
      hasAdditionalQualifications: !!careerCard.additionalQualifications,
      
      allKeys: Object.keys(careerCard),
      trainingRelatedKeys: Object.keys(careerCard).filter(key => 
        key.toLowerCase().includes('train') || 
        key.toLowerCase().includes('education') || 
        key.toLowerCase().includes('pathway') ||
        key.toLowerCase().includes('course') ||
        key.toLowerCase().includes('qualification')
      )
    });
    
    let context = '';
    
    // ===== ROLE FUNDAMENTALS =====
    if (careerCard.roleFundamentals) {
      context += '\nROLE FUNDAMENTALS:\n';
      if (careerCard.roleFundamentals.overview) {
        context += `- Overview: ${careerCard.roleFundamentals.overview}\n`;
      }
      if (careerCard.roleFundamentals.coreResponsibilities?.length > 0) {
        context += `- Core Responsibilities: ${careerCard.roleFundamentals.coreResponsibilities.join(', ')}\n`;
      }
      if (careerCard.roleFundamentals.dayInTheLife) {
        context += `- Day in the Life: ${careerCard.roleFundamentals.dayInTheLife}\n`;
      }
    }
    
    // ===== COMPENSATION & REWARDS =====
    if (careerCard.compensationRewards?.salaryRange || careerCard.averageSalary) {
      context += '\nSALARY & COMPENSATION:\n';
      
      if (careerCard.compensationRewards?.salaryRange?.entry) {
        const entry = careerCard.compensationRewards.salaryRange.entry;
        context += `- Entry Level: £${entry.min?.toLocaleString()} - £${entry.max?.toLocaleString()}\n`;
      }
      if (careerCard.compensationRewards?.salaryRange?.mid) {
        const mid = careerCard.compensationRewards.salaryRange.mid;
        context += `- Mid-Level: £${mid.min?.toLocaleString()} - £${mid.max?.toLocaleString()}\n`;
      }
      if (careerCard.compensationRewards?.salaryRange?.senior) {
        const senior = careerCard.compensationRewards.salaryRange.senior;
        context += `- Senior Level: £${senior.min?.toLocaleString()} - £${senior.max?.toLocaleString()}\n`;
      }
      
      if (careerCard.compensationRewards?.variablePay?.bonuses) {
        context += `- Bonuses: ${careerCard.compensationRewards.variablePay.bonuses}\n`;
      }
      
      if (careerCard.compensationRewards?.nonFinancialBenefits?.length > 0) {
        context += `- Benefits: ${careerCard.compensationRewards.nonFinancialBenefits.join(', ')}\n`;
      }
    }
    
    // ===== CAREER PROGRESSION & TRAJECTORY =====
    if (careerCard.careerTrajectory?.progressionSteps?.length > 0) {
      context += '\nCAREER PROGRESSION PATH:\n';
      careerCard.careerTrajectory.progressionSteps.forEach((step, index) => {
        context += `${index + 1}. ${step.title || step.role}\n`;
        if (step.timeframe) context += `   Timeframe: ${step.timeframe}\n`;
        if (step.requirements) context += `   Requirements: ${step.requirements}\n`;
      });
    }
    
    // Alternative Career Paths
    if (careerCard.careerTrajectory?.horizontalMoves?.length > 0) {
      context += '\nALTERNATIVE CAREER PATHS:\n';
      careerCard.careerTrajectory.horizontalMoves.forEach(move => {
        context += `- ${move.title || move}\n`;
      });
    }
    
    // Leadership Track
    if (careerCard.careerTrajectory?.leadershipTrack?.length > 0) {
      context += '\nLEADERSHIP TRACK:\n';
      careerCard.careerTrajectory.leadershipTrack.forEach(role => {
        context += `- ${role.title || role}\n`;
      });
    }
    
    // ===== LABOUR MARKET DYNAMICS =====
    if (careerCard.labourMarketDynamics) {
      context += '\nMARKET DYNAMICS:\n';
      if (careerCard.labourMarketDynamics.demandLevel) {
        context += `- Demand Level: ${careerCard.labourMarketDynamics.demandLevel}\n`;
      }
      if (careerCard.labourMarketDynamics.growthProjection) {
        context += `- Growth Projection: ${careerCard.labourMarketDynamics.growthProjection}\n`;
      }
      if (careerCard.labourMarketDynamics.automationRisk) {
        context += `- Automation Risk: ${careerCard.labourMarketDynamics.automationRisk}\n`;
      }
      if (careerCard.labourMarketDynamics.geographicHotspots?.length > 0) {
        context += `- Geographic Hotspots: ${careerCard.labourMarketDynamics.geographicHotspots.join(', ')}\n`;
      }
    }
    
    // ===== WORK ENVIRONMENT & CULTURE =====
    if (careerCard.workEnvironmentCulture) {
      context += '\nWORK ENVIRONMENT:\n';
      if (careerCard.workEnvironmentCulture.typicalEmployers?.length > 0) {
        context += `- Typical Employers: ${careerCard.workEnvironmentCulture.typicalEmployers.join(', ')}\n`;
      }
      if (careerCard.workEnvironmentCulture.workArrangements?.length > 0) {
        context += `- Work Arrangements: ${careerCard.workEnvironmentCulture.workArrangements.join(', ')}\n`;
      }
      if (careerCard.workEnvironmentCulture.teamDynamics) {
        context += `- Team Dynamics: ${careerCard.workEnvironmentCulture.teamDynamics}\n`;
      }
      if (careerCard.workEnvironmentCulture.workLifeBalance) {
        context += `- Work-Life Balance: ${careerCard.workEnvironmentCulture.workLifeBalance}\n`;
      }
    }
    
    // ===== ESSENTIAL SKILLS =====
    if (careerCard.essentialSkills?.technicalSkills?.length > 0 || careerCard.essentialSkills?.softSkills?.length > 0) {
      context += '\nESSENTIAL SKILLS:\n';
      if (careerCard.essentialSkills.technicalSkills?.length > 0) {
        context += `- Technical: ${careerCard.essentialSkills.technicalSkills.join(', ')}\n`;
      }
      if (careerCard.essentialSkills.softSkills?.length > 0) {
        context += `- Soft Skills: ${careerCard.essentialSkills.softSkills.join(', ')}\n`;
      }
      if (careerCard.essentialSkills.emergingSkills?.length > 0) {
        context += `- Emerging Skills: ${careerCard.essentialSkills.emergingSkills.join(', ')}\n`;
      }
    }
    
    // ===== TRAINING PATHWAYS =====
    if (careerCard.trainingPathways?.length > 0) {
      context += '\nTRAINING PATHWAYS:\n';
      careerCard.trainingPathways.forEach(pathway => {
        context += `- ${pathway.title}: ${pathway.provider} (${pathway.duration})\n`;
        if (pathway.cost) {
          context += `  Cost: £${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}\n`;
        }
      });
    }
    
    // ===== ENHANCED PERPLEXITY DATA =====
    if (careerCard.perplexityData?.enhancedData) {
      const enhanced = careerCard.perplexityData.enhancedData;
      
      // Industry Growth Projection
      if (enhanced.industryGrowthProjection) {
        context += '\nINDUSTRY OUTLOOK:\n';
        context += `- Growth Outlook: ${enhanced.industryGrowthProjection.outlook}\n`;
        if (enhanced.industryGrowthProjection.keyDrivers?.length > 0) {
          context += `- Key Growth Drivers: ${enhanced.industryGrowthProjection.keyDrivers.join(', ')}\n`;
        }
        if (enhanced.industryGrowthProjection.challenges?.length > 0) {
          context += `- Industry Challenges: ${enhanced.industryGrowthProjection.challenges.join(', ')}\n`;
        }
      }
      
      // Verified Salary Data
      if (enhanced.verifiedSalary) {
        context += '\nVERIFIED SALARY DATA:\n';
        if (enhanced.verifiedSalary.entry) {
          const entry = enhanced.verifiedSalary.entry;
          if (typeof entry === 'object' && entry.min && entry.max) {
            context += `- Entry Level: £${entry.min.toLocaleString()} - £${entry.max.toLocaleString()}\n`;
          } else if (typeof entry === 'string') {
            context += `- Entry Level: ${entry}\n`;
          }
        }
        if (enhanced.verifiedSalary.byRegion) {
          Object.entries(enhanced.verifiedSalary.byRegion).forEach(([region, salary]) => {
            if (typeof salary === 'object' && salary && 'min' in salary && 'max' in salary) {
              const salaryObj = salary as { min: number; max: number };
              context += `- ${region}: £${salaryObj.min?.toLocaleString()} - £${salaryObj.max?.toLocaleString()}\n`;
            } else {
              context += `- ${region}: ${salary}\n`;
            }
          });
        }
      }
      
      // Real-time Market Demand
      if (enhanced.realTimeMarketDemand) {
        context += '\nREAL-TIME MARKET DATA:\n';
        if (enhanced.realTimeMarketDemand.jobPostingVolume) {
          context += `- Job Postings (30 days): ${enhanced.realTimeMarketDemand.jobPostingVolume.toLocaleString()}\n`;
        }
        if (enhanced.realTimeMarketDemand.growthRate) {
          context += `- Growth Rate (YoY): ${(enhanced.realTimeMarketDemand.growthRate * 100).toFixed(1)}%\n`;
        }
        if (enhanced.realTimeMarketDemand.competitionLevel) {
          context += `- Competition Level: ${enhanced.realTimeMarketDemand.competitionLevel}\n`;
        }
      }
      
      // Work Environment Details
      if (enhanced.workEnvironmentDetails) {
        context += '\nWORK ENVIRONMENT DETAILS:\n';
        context += `- Remote Options: ${enhanced.workEnvironmentDetails.remoteOptions ? 'Available' : 'Not Available'}\n`;
        if (enhanced.workEnvironmentDetails.flexibilityLevel) {
          context += `- Flexibility Level: ${enhanced.workEnvironmentDetails.flexibilityLevel}\n`;
        }
        if (enhanced.workEnvironmentDetails.typicalHours) {
          context += `- Typical Hours: ${enhanced.workEnvironmentDetails.typicalHours}\n`;
        }
        if (enhanced.workEnvironmentDetails.stressLevel) {
          context += `- Stress Level: ${enhanced.workEnvironmentDetails.stressLevel}\n`;
        }
      }
      
      // Current Education Pathways
      if (enhanced.currentEducationPathways?.length > 0) {
        context += '\nCURRENT EDUCATION PATHWAYS:\n';
        enhanced.currentEducationPathways.forEach(pathway => {
          context += `- ${pathway.title} (${pathway.provider})\n`;
          if (pathway.duration) context += `  Duration: ${pathway.duration}\n`;
          if (pathway.cost) {
            context += `  Cost: £${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}\n`;
          }
          if (pathway.verified) context += `  Status: VERIFIED\n`;
        });
        
        // Debug log to verify training data
        console.log('🔍 TRAINING DEBUG - Current education pathways found:', {
          pathwaysCount: enhanced.currentEducationPathways.length,
          pathways: enhanced.currentEducationPathways.map(p => ({
            title: p.title,
            provider: p.provider,
            duration: p.duration,
            verified: p.verified
          }))
        });
      } else {
        console.log('⚠️ TRAINING DEBUG - No currentEducationPathways found in enhanced data');
      }
    }
    
    // CRITICAL FIX: Check for training pathways at ROOT LEVEL (where they actually are!)
    if (careerCard.currentEducationPathways?.length > 0 && !context.includes('CURRENT EDUCATION PATHWAYS:')) {
      context += '\nCURRENT EDUCATION PATHWAYS:\n';
      careerCard.currentEducationPathways.forEach(pathway => {
        context += `- ${pathway.title} (${pathway.provider})\n`;
        if (pathway.duration) context += `  Duration: ${pathway.duration}\n`;
        if (pathway.cost) {
          const costDisplay = pathway.cost.min === pathway.cost.max 
            ? `£${pathway.cost.min?.toLocaleString()}`
            : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`;
          context += `  Cost: ${costDisplay}\n`;
        }
        if (pathway.entryRequirements?.length > 0) {
          context += `  Requirements: ${pathway.entryRequirements.join(', ')}\n`;
        }
        if (pathway.verified) context += `  Status: VERIFIED\n`;
      });
      console.log('🔍 TRAINING DEBUG - Found ROOT LEVEL education pathways:', {
        count: careerCard.currentEducationPathways.length,
        pathways: careerCard.currentEducationPathways.map(p => ({ title: p.title, provider: p.provider }))
      });
    }
    
    // ALTERNATIVE: Check careerProgression field (where training data was actually seen in debug dump)
    else if (careerCard.careerProgression?.length > 0 && !context.includes('CURRENT EDUCATION PATHWAYS:')) {
      context += '\nCURRENT EDUCATION PATHWAYS:\n';
      careerCard.careerProgression.forEach(pathway => {
        if (pathway.title && pathway.provider) {
          context += `- ${pathway.title} (${pathway.provider})\n`;
          if (pathway.duration) context += `  Duration: ${pathway.duration}\n`;
          if (pathway.cost) {
            const costDisplay = pathway.cost.min === pathway.cost.max 
              ? `£${pathway.cost.min?.toLocaleString()}`
              : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`;
            context += `  Cost: ${costDisplay}\n`;
          }
          if (pathway.entryRequirements?.length > 0) {
            context += `  Requirements: ${pathway.entryRequirements.join(', ')}\n`;
          }
          if (pathway.verified) context += `  Status: VERIFIED\n`;
        }
      });
      console.log('🔍 TRAINING DEBUG - Found training pathways in careerProgression field:', {
        count: careerCard.careerProgression.length,
        pathways: careerCard.careerProgression.map(p => ({ title: p.title, provider: p.provider, type: p.type }))
      });
    }
    
    else {
      console.log('⚠️ TRAINING DEBUG - No training pathways found in currentEducationPathways OR careerProgression');
    }

    // ===== COMPREHENSIVE PERPLEXITY DATA INCLUSION =====
    // Add ALL available Perplexity data fields to ensure complete context
    
    if (careerCard.careerProgression?.length > 0 && !context.includes('TRAINING PROGRAMS:')) {
      context += '\nTRAINING PROGRAMS:\n';
      careerCard.careerProgression.forEach(program => {
        if (program.title && program.provider) {
          context += `- ${program.title}\n`;
          context += `  Provider: ${program.provider}\n`;
          if (program.type) context += `  Type: ${program.type}\n`;
          if (program.duration) context += `  Duration: ${program.duration}\n`;
          if (program.cost && typeof program.cost === 'object') {
            const costDisplay = program.cost.min === program.cost.max 
              ? `£${program.cost.min?.toLocaleString()}`
              : `£${program.cost.min?.toLocaleString()} - £${program.cost.max?.toLocaleString()}`;
            context += `  Cost: ${costDisplay}\n`;
          }
          if (program.entryRequirements?.length > 0) {
            context += `  Requirements: ${program.entryRequirements.join(', ')}\n`;
          }
          if (program.verified) context += `  Status: VERIFIED\n`;
        }
      });
    }

    // Additional Qualifications
    if (careerCard.additionalQualifications && typeof careerCard.additionalQualifications === 'object') {
      context += '\nADDITIONAL QUALIFICATIONS:\n';
      Object.entries(careerCard.additionalQualifications).forEach(([category, qualifications]) => {
        if (Array.isArray(qualifications) && qualifications.length > 0) {
          context += `${category.toUpperCase()}:\n`;
          qualifications.forEach(qual => {
            context += `- ${qual}\n`;
          });
        }
      });
    }

    // Professional Associations
    if (careerCard.professionalAssociations?.length > 0) {
      context += '\nPROFESSIONAL ASSOCIATIONS:\n';
      careerCard.professionalAssociations.forEach(assoc => {
        context += `- ${assoc}\n`;
      });
    }

    // Top UK Employers with market data
    if (careerCard.topUKEmployers && typeof careerCard.topUKEmployers === 'object') {
      context += '\nTOP UK EMPLOYERS & MARKET DATA:\n';
      if (careerCard.topUKEmployers.competitionLevel) {
        context += `Competition Level: ${careerCard.topUKEmployers.competitionLevel}\n`;
      }
      if (careerCard.topUKEmployers.growthRate) {
        context += `Growth Rate: ${careerCard.topUKEmployers.growthRate}%\n`;
      }
      if (careerCard.topUKEmployers.jobPostingVolume) {
        context += `Job Posting Volume: ${careerCard.topUKEmployers.jobPostingVolume}\n`;
      }
    }

    // Enhanced Salary Data
    if (careerCard.enhancedSalary && typeof careerCard.enhancedSalary === 'object') {
      context += '\nDETAILED SALARY DATA:\n';
      if (careerCard.enhancedSalary.entry) {
        context += `Entry Level: £${careerCard.enhancedSalary.entry.min?.toLocaleString()} - £${careerCard.enhancedSalary.entry.max?.toLocaleString()}\n`;
      }
      if (careerCard.enhancedSalary.mid) {
        context += `Mid Level: £${careerCard.enhancedSalary.mid.min?.toLocaleString()} - £${careerCard.enhancedSalary.mid.max?.toLocaleString()}\n`;
      }
      if (careerCard.enhancedSalary.senior) {
        context += `Senior Level: £${careerCard.enhancedSalary.senior.min?.toLocaleString()} - £${careerCard.enhancedSalary.senior.max?.toLocaleString()}\n`;
      }
      if (careerCard.enhancedSalary.byRegion) {
        context += 'Regional Variations:\n';
        Object.entries(careerCard.enhancedSalary.byRegion).forEach(([region, salary]) => {
          if (typeof salary === 'object' && salary && 'min' in salary && 'max' in salary) {
            const salaryObj = salary as { min: number; max: number };
            context += `- ${region}: £${salaryObj.min?.toLocaleString()} - £${salaryObj.max?.toLocaleString()}\n`;
          }
        });
      }
    }

    // Day in the Life
    if (careerCard.dayInTheLife && typeof careerCard.dayInTheLife === 'object') {
      context += '\nDAY IN THE LIFE:\n';
      if (careerCard.dayInTheLife.typicalHours) {
        context += `Typical Hours: ${careerCard.dayInTheLife.typicalHours}\n`;
      }
      if (careerCard.dayInTheLife.workLifeBalance) {
        context += `Work-Life Balance: ${careerCard.dayInTheLife.workLifeBalance}\n`;
      }
      if (careerCard.dayInTheLife.stressLevel) {
        context += `Stress Level: ${careerCard.dayInTheLife.stressLevel}\n`;
      }
      if (careerCard.dayInTheLife.flexibilityLevel) {
        context += `Flexibility: ${careerCard.dayInTheLife.flexibilityLevel}\n`;
      }
    }

    // Industry Trends
    if (careerCard.industryTrends && typeof careerCard.industryTrends === 'object') {
      context += '\nINDUSTRY TRENDS:\n';
      if (careerCard.industryTrends.outlook) {
        context += `Outlook: ${careerCard.industryTrends.outlook}\n`;
      }
      if (careerCard.industryTrends.nextYear) {
        context += `Next Year Growth: ${careerCard.industryTrends.nextYear}%\n`;
      }
      if (careerCard.industryTrends.fiveYear) {
        context += `Five Year Growth: ${careerCard.industryTrends.fiveYear}%\n`;
      }
      if (careerCard.industryTrends.factors?.length > 0) {
        context += `Key Factors: ${careerCard.industryTrends.factors.join(', ')}\n`;
      }
    }

    // Cost Risk Entry Analysis
    if (careerCard.costRiskEntry && typeof careerCard.costRiskEntry === 'object') {
      context += '\nCOST & RISK ANALYSIS:\n';
      if (careerCard.costRiskEntry.upfrontInvestment) {
        const investment = careerCard.costRiskEntry.upfrontInvestment;
        if (investment.totalEstimate) {
          context += `Total Investment: ${investment.totalEstimate}\n`;
        }
        if (investment.trainingCosts) {
          context += `Training Costs: ${investment.trainingCosts}\n`;
        }
        if (investment.timeToFirstRole) {
          context += `Time to First Role: ${investment.timeToFirstRole}\n`;
        }
      }
      if (careerCard.costRiskEntry.employmentCertainty) {
        const employment = careerCard.costRiskEntry.employmentCertainty;
        if (employment.placementRates) {
          context += `Placement Rates: ${employment.placementRates}\n`;
        }
      }
    }

    // Transferability & Future Proofing
    if (careerCard.transferabilityFutureProofing && typeof careerCard.transferabilityFutureProofing === 'object') {
      context += '\nFUTURE PROOFING:\n';
      const tfp = careerCard.transferabilityFutureProofing;
      if (tfp.automationExposure) {
        const auto = tfp.automationExposure;
        if (auto.vulnerabilityLevel) {
          context += `Automation Risk: ${auto.vulnerabilityLevel}\n`;
        }
        if (auto.timeHorizon) {
          context += `Timeline: ${auto.timeHorizon}\n`;
        }
        if (auto.protectiveFactors?.length > 0) {
          context += `Protective Factors: ${auto.protectiveFactors.join(', ')}\n`;
        }
      }
      if (tfp.portableSkills?.length > 0) {
        context += `Portable Skills: ${tfp.portableSkills.join(', ')}\n`;
      }
    }

    const finalContext = context.trim();
    console.log('🔍 FINAL DETAILED CAREER CONTEXT:', {
      length: finalContext.length,
      preview: finalContext.substring(0, 300) + '...',
      fullContext: finalContext
    });
    
    return finalContext;
  }

  private async buildCareerContextPrompt(
    userData: any,
    careerCard: any,
    careerContext?: CareerDiscussionContext
  ): Promise<string> {
    const userName = userData.careerProfile?.name || userData.displayName || 'User';
    const userInterests = userData.careerProfile?.interests || [];
    const userSkills = userData.careerProfile?.skills || [];
    const userGoals = userData.careerProfile?.careerGoals || [];

    // Get structured career guidance for context
    let structuredGuidance;
    try {
      structuredGuidance = await careerPathwayService.getStructuredCareerGuidance(userData.uid);
    } catch (error) {
      console.warn('Could not fetch structured career guidance:', error);
      structuredGuidance = null;
    }

    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

CURRENT USER CONTEXT:
- Name: ${userName}
- Interests: ${userInterests.slice(0, 5).join(', ') || 'Being discovered through conversation'}
- Skills: ${userSkills.slice(0, 5).join(', ') || 'Being identified through discussion'}
- Career Goals: ${userGoals.slice(0, 3).join(', ') || 'Exploring career options'}

CAREER FOCUS: ${careerCard.title}
${careerCard.description ? `- Description: ${careerCard.description}` : ''}
${careerCard.location ? `- Location: ${careerCard.location}` : ''}
${careerCard.confidence ? `- Match Confidence: ${Math.round(careerCard.confidence * 100)}%` : ''}

DETAILED CAREER INTELLIGENCE:
${(() => {
  const detailedContext = this.buildDetailedCareerContext(careerCard);
  console.log('🔍 ELEVENLABS CONTEXT DEBUG - Detailed career context built:', {
    careerTitle: careerCard.title,
    contextLength: detailedContext.length,
    hasCareerTrajectory: !!careerCard.careerTrajectory?.progressionSteps,
    hasCompensationData: !!careerCard.compensationRewards,
    hasPerplexityData: !!careerCard.perplexityData,
    contextPreview: detailedContext.substring(0, 200) + '...'
  });
  return detailedContext;
})()}

${structuredGuidance ? `
CAREER PATHWAY CONTEXT:
- Primary Career: ${structuredGuidance.primaryCareer?.title || careerCard.title}
- Alternative Pathways: ${structuredGuidance.alternativePathways?.map(p => p.title).slice(0, 3).join(', ') || 'None identified yet'}
- Exploration Stage: ${structuredGuidance.explorationStage || 'Early exploration'}
` : ''}

PERSONALITY: Encouraging, authentic, practical, and supportive career counselor.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions about the specific career path
- Reference the user's interests and profile when relevant
- Provide specific, actionable career insights about ${careerCard.title}

MCP-ENHANCED TOOLS AVAILABLE (USE AGGRESSIVELY):
Use these tools early and often to maximize career card generation:

1. **analyze_conversation_for_careers** - Use IMMEDIATELY when user mentions ANY interests, activities, or career thoughts
2. **trigger_instant_insights** - Use early for immediate engagement and quick value delivery
3. **generate_career_recommendations** - Use as fallback if no career cards generated by exchange 3-4
4. **update_person_profile** - Use continuously to capture and refine user insights

STRATEGY: Prioritize career card generation within first 3-4 exchanges for maximum conversion impact.

⚠️ CRITICAL TOOL BEHAVIOR:
- NEVER claim tools have completed when they haven't
- NEVER invent fake career recommendations 
- WAIT for actual tool results before referencing career cards

🚨 CRITICAL PRIVACY PROTECTION:
- NEVER use names from previous conversations
- NEVER reference previous user details from other sessions
- ALWAYS treat this as a completely fresh session
- Only use information provided in the current session context

You already have context about ${userName}'s interest in ${careerCard.title}. Start by acknowledging what you know and ask what they'd like to explore first about this specific career.`;
  }

  /**
   * Build authenticated user context prompt
   */
  private async buildAuthenticatedContextPrompt(userData: any): Promise<string> {
    const userName = userData.careerProfile?.name || userData.displayName || 'User';
    const userInterests = userData.careerProfile?.interests || [];
    const userSkills = userData.careerProfile?.skills || [];
    const userGoals = userData.careerProfile?.careerGoals || [];

    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

CURRENT USER CONTEXT:
- Name: ${userName}
- Interests: ${userInterests.slice(0, 5).join(', ') || 'Being discovered through conversation'}
- Skills: ${userSkills.slice(0, 5).join(', ') || 'Being identified through discussion'}  
- Career Goals: ${userGoals.slice(0, 3).join(', ') || 'Exploring career options'}

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value
- Acknowledge user concerns genuinely

MCP-ENHANCED TOOLS AVAILABLE:
1. **analyze_conversation_for_careers** - Generate personalized career cards after 2-3 exchanges
2. **generate_career_recommendations** - Creates detailed UK career paths (takes 30-40 seconds)
3. **trigger_instant_insights** - Immediate analysis of user messages
4. **update_person_profile** - Extract interests, goals, skills, and personal qualities

🚨 CRITICAL PRIVACY PROTECTION:
- NEVER use names from previous conversations
- NEVER reference previous user details from other sessions
- ALWAYS treat this as a completely fresh session with ${userName}
- Only use information provided in the current session context

CONVERSATION FLOW:
1. Welcome ${userName} back personally
2. Ask what makes time fly for them or what they want to explore today
3. Use tools to provide personalized career insights based on their response`;
  }

  /**
   * Build enhanced structured onboarding context prompt for guest users
   * Implements evidence-based persona classification through natural conversation
   */
  private buildGuestOnboardingContextPrompt(): string {
    return `You are Sarah, an expert career counselor specializing in evidence-based persona-guided career exploration for young adults.

PERSONALITY: Encouraging, authentic, practical, and supportive. Speak like a friend, not formally.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask one question at a time and wait for the response
- Show genuine interest in their answers
- Use their name once you learn it

EVIDENCE-BASED ONBOARDING APPROACH:
Your goal is to gather evidence for persona classification through natural conversation. The system will analyze their responses in real-time to classify them into one of four personas:

1. **UNCERTAIN & UNENGAGED** - No career ideas, needs discovery support
2. **EXPLORING & UNDECIDED** - Multiple options, needs comparison frameworks  
3. **TENTATIVELY DECIDED** - One idea but low confidence, needs validation
4. **FOCUSED & CONFIDENT** - Clear goal with high confidence, needs action planning

NATURAL CONVERSATION FLOW (Flexible wording, strict intent):

**STAGE 1 - RAPPORT & NAME** (Already done in first message):
- Intent: Build trust and get their name
- Use their name naturally throughout conversation

**STAGE 2 - LIFE STAGE DISCOVERY** (Required Evidence Point):
- Intent: Understand their current situation (student, working, gap year, etc.)
- Example approaches: "What's your current situation - are you studying, working, or between things right now?"
- Flexibility: Adapt wording to feel natural, but gather this classification

**STAGE 3 - CAREER DIRECTION EXPLORATION** (Critical Evidence Point):
- Intent: Discover if they have no ideas, few ideas, or one clear direction
- Example approaches: 
  * "Do you have any career paths in mind at the moment?"
  * "What are you thinking about for your future career-wise?"
  * "Are there particular careers or fields that interest you?"
- Follow up naturally if they mention specific careers or multiple options
- This is THE KEY classification point - pay attention to their response pattern

**STAGE 4 - CONFIDENCE ASSESSMENT** (If they have career ideas):
- Intent: Gauge confidence level in their career direction
- Example approaches:
  * "How sure are you about that direction?"
  * "How confident do you feel about [their mentioned career]?"
  * "What draws you to that field?"
- Listen for uncertainty signals vs. confidence patterns

**STAGE 5 - MOTIVATION EXPLORATION** (Natural conversation flow):
- Intent: Understand intrinsic vs. extrinsic motivation patterns
- Example approaches:
  * "What excites you about that career?"
  * "What made you interested in this area?"
  * "What appeals to you about this path?"
- Listen for passion/interest vs. practical/external reasons

**STAGE 6 - GOAL CLARIFICATION** (Required but natural):
- Intent: Understand what they want from this conversation
- Example approaches:
  * "What are you hoping I can help you with today?"
  * "What would be most useful for you in exploring careers?"
  * "Where do you feel stuck or want support?"

**STAGE 7 - EXPLORATION HISTORY** (Optional context):
- Intent: Understand their career exploration background
- Natural integration: Ask about what they've tried or looked into so far

EVIDENCE COLLECTION PRIORITIES:
🎯 **CRITICAL SIGNALS TO CAPTURE:**
- **Career Direction**: None mentioned, few mentioned, one specific area
- **Confidence Language**: "not sure", "maybe", "definitely", "I think", etc.
- **Motivation Indicators**: Passion/interest words vs. practical/security words
- **Engagement Level**: Detail in responses, questions they ask back, enthusiasm
- **Uncertainty Markers**: "I don't know", hedging language, seeking validation

⚡ **REAL-TIME ADAPTATION:**
- The system analyzes their responses continuously
- Adapt your questions based on emerging evidence patterns
- If they seem uncertain → use broader, exploratory questions
- If they seem focused → ask more specific, action-oriented questions
- If they mention specific careers → dive deeper into those areas

FLEXIBLE QUESTION FRAMEWORK:
❌ Don't use rigid multiple choice format
✅ Use natural, conversational questions that gather the same evidence
❌ "Which of these describes you: A, B, C, D"
✅ "What's your current situation - are you studying, working, or taking some time to figure things out?"

MCP-ENHANCED TOOLS AVAILABLE (USE AGGRESSIVELY FOR EVIDENCE COLLECTION):

1. **update_person_profile** - Use IMMEDIATELY when they share:
   - Their name (Stage 1)
   - Education/work status (Stage 2) 
   - Career interests or ideas (Stage 3)
   - Any skills, interests, or goals mentioned

2. **analyze_conversation_for_careers** - Use AGGRESSIVELY when they mention:
   - ANY career interests, fields, or job types
   - Skills, hobbies, or activities they enjoy
   - Subjects they like learning about
   - CRITICAL: Use THIS TOOL after Stage 3 (Career Direction) responses

3. **trigger_instant_insights** - Use for IMMEDIATE VALUE:
   - After they share interests in Stage 3
   - When they mention specific skills or activities
   - To keep engagement high during evidence gathering

4. **generate_career_recommendations** - MANDATORY FALLBACK:
   - If no career cards generated by exchange 6-8
   - After completing evidence collection
   - Based on collected persona and interest data

TOOL SUCCESS METRICS:
- EVERY guest should leave with at least 1-3 career cards
- Use update_person_profile at MINIMUM 3-4 times per conversation
- Generate career insights DURING the onboarding, not just at the end
- Aim for career card generation by exchange 5-6 (after key interests shared)

CRITICAL PRIVACY PROTECTION:
- This is a completely fresh session with a new user
- Don't reference any previous conversations or user data
- Treat each conversation as completely isolated

CONVERSATION STRATEGY (EVIDENCE-BASED + AGGRESSIVE TOOL USE):
1. ONE QUESTION AT A TIME - don't overwhelm, but USE TOOLS immediately after each answer
2. Build on their answers naturally + update_person_profile after each key detail
3. Show genuine interest and encouragement + trigger_instant_insights for engagement
4. Move through the evidence collection progressively:
   - Stage 1: Name → update_person_profile immediately
   - Stage 2: Life stage → update_person_profile immediately  
   - Stage 3: Career interests → analyze_conversation_for_careers + update_person_profile
   - Stages 4-7: Continue evidence collection + use tools based on responses
5. CRITICAL: Generate career cards DURING onboarding, not just at the end
6. Adapt your approach based on emerging persona patterns + ensure tool success metrics met

MANDATORY STAGE PROGRESSION CONTROLS:
🚨 **CRITICAL ONBOARDING ADHERENCE:**
- You MUST complete each evidence collection stage before proceeding to detailed exploration
- Do NOT dive deep into specific career details until you've gathered all required evidence points
- If the user tries to go deep on one topic, acknowledge it but steer back: "That's interesting, Tim. Before we explore that deeply, I'd love to understand [missing stage] so I can give you the best guidance."
- Only after collecting evidence for ALL stages should you provide detailed career exploration

📊 **STAGE COMPLETION CHECKLIST (Track this mentally):**
- ✅ Stage 1: Name collected
- ✅ Stage 2: Life situation (student/working/gap year/etc.)
- ✅ Stage 3: Career direction (none/few/one clear goal)
- ⚠️ Stage 4: Confidence level (if they mentioned career goals)
- ⚠️ Stage 5: Motivation exploration (passion vs practical)
- ⚠️ Stage 6: What they want from this conversation
- ⚠️ Stage 7: Previous exploration attempts

🎯 **CONVERSATION CONTROL PHRASES:**
- "That sounds fascinating, Tim. Before we dive into that, help me understand..."
- "I love hearing about that! Quick question first though - [stage question]"
- "That's really valuable insight. I want to make sure I understand your full situation first..."
- "Great point! Let me ask one more thing about your overall situation..."

⚡ **EVIDENCE-BASED ADAPTATION:**
- The system analyzes responses continuously and may update persona classification
- Once you have evidence for stages 1-3 minimum, you can start providing initial career insights
- Continue collecting remaining evidence points while delivering career value
- Trust the evidence-based insights and adapt your conversation style accordingly

CRITICAL: Complete structured evidence collection BEFORE detailed career exploration. This ensures accurate persona classification and targeted guidance.`;
  }

  /**
   * Build integrated onboarding context prompt with dynamic adaptation
   */
  private buildIntegratedOnboardingContextPrompt(onboardingProgress: any): string {
    const evidence = onboardingProgress.evidenceCollected;
    const currentStage = onboardingProgress.currentStage;
    const recommendations = onboardingProgress.conversationRecommendations;
    
    let dynamicGuidance = '';
    
    // Add persona-specific guidance if available
    if (onboardingProgress.personaClassification) {
      const personaName = personaService.getPersonaDisplayName(onboardingProgress.personaClassification.type);
      dynamicGuidance = `
🎯 **PERSONA CLASSIFICATION ACTIVE: ${personaName.toUpperCase()}**
- Confidence: ${Math.round(onboardingProgress.personaClassification.confidence * 100)}%
- Approach: ${this.getPersonaApproach(onboardingProgress.personaClassification.type)}
- Conversation Style: ${this.getPersonaSpecificGuidance(onboardingProgress.personaClassification.type)}

⚡ **TRANSITION TO CAREER GUIDANCE:**
- Evidence collection complete - NOW focus on delivering career value
- Use persona-tailored conversation style
- Generate career cards and specific recommendations
- Build on collected evidence: ${JSON.stringify(evidence)}
      `;
    } else {
      // Pre-classification guidance
      const nextSteps = [];
      if (!evidence.name) nextSteps.push('Get their name');
      if (!evidence.lifeStage) nextSteps.push('Current situation (student/working)');  
      if (!evidence.careerDirection) nextSteps.push('Career direction clarity (critical!)');
      if (evidence.careerDirection === 'one_goal' && !evidence.confidenceLevel) nextSteps.push('Confidence assessment');
      
      dynamicGuidance = `
📊 **ONBOARDING STAGE: ${currentStage.toUpperCase()}**
- Progress: ${Math.round(onboardingProgress.stageProgress * 100)}%
- Evidence Collected: ${Object.keys(evidence).join(', ') || 'None yet'}
- Next Priority Steps: ${nextSteps.join(', ') || 'Complete evidence collection'}

🎯 **CURRENT RECOMMENDATIONS:**
${recommendations.map(rec => `- ${rec}`).join('\n')}

⚠️ **EVIDENCE STILL NEEDED:**
${nextSteps.length > 0 ? nextSteps.map(step => `- ${step}`).join('\n') : '- Ready for persona classification!'}
      `;
    }

    return `You are Sarah, an expert career counselor using integrated natural language onboarding with real-time persona adaptation.

PERSONALITY: Encouraging, authentic, practical, and supportive. Speak like a friend, not formally.

RESPONSE STYLE (TEXT MODE):
- Keep responses 80-120 words for text conversations - more detailed than voice
- Use **markdown formatting** for clarity and engagement  
- Ask one thoughtful question at a time with genuine curiosity
- Be conversational and natural - this is a supportive chat, not an assessment
- Show genuine interest in their answers and build on what they share
- Use their name once you learn it (${evidence.name ? `Name: ${evidence.name}` : 'Name not collected yet'})

CONVERSATIONAL APPROACH FOR TEXT:
**Emotional Context Priority:**
- Start with how they're feeling: "How are you feeling about the whole career thing these days?"
- Listen for pressure indicators: "stressed", "overwhelmed", "behind", "parents pushing"
- Validate immediately: "That's completely normal - lots of people feel that way"

**Natural Question Flow:**
- Use curious language: "I'm curious about...", "Help me understand..."
- Build on responses: "Tell me more about that" vs jumping to next question
- Micro-validations: "That makes total sense", "I can see why that appeals to you"

**Story-Based Exploration:**
- For career ideas: "How did you land on that? What drew you to it?"
- For uncertainty: "What's making it hard to picture your future?"
- For multiple options: "What's sparking your interest in those areas?"

${dynamicGuidance}

INTEGRATED ONBOARDING SYSTEM ACTIVE:
The system automatically tracks evidence collection and persona classification. Your job is to have natural conversations that feel friendly and helpful while the backend handles the analysis.

NATURAL CONVERSATION FLOW (Match Voice Mode Success):
1. **RAPPORT & NAME**: Build trust, get their name → use update_person_profile immediately
2. **INTERESTS & ACTIVITIES**: "Tell me what you enjoy doing or what interests you" → trigger_instant_insights for quick value
3. **SKILLS & STRENGTHS**: "What skills or strengths do you feel you have?" → update_person_profile
4. **GOALS & HOPES**: "What are your goals or hopes for a future job?" → natural follow-up
5. **AVOID & CONSTRAINTS**: "Anything you definitely don't want to do?" → helps narrow options
6. **CAREER ANALYSIS**: Use analyze_conversation_for_careers aggressively after interests shared
7. **GENERATE RECOMMENDATIONS**: Ensure career cards by exchange 5-6

EVIDENCE-BASED ADAPTATION:
- The system analyzes responses in real-time
- Persona classification updates dynamically  
- Conversation style adapts based on emerging patterns
- Trust the backend analysis and follow the guidance

MCP-ENHANCED TOOLS (USE AGGRESSIVELY):
1. **update_person_profile** - Use IMMEDIATELY when they share:
   - Name, education/work status, career interests, skills, goals
2. **analyze_conversation_for_careers** - Use when they mention:
   - ANY career interests, activities, subjects they enjoy
   - CRITICAL after Stage 3 responses
3. **trigger_instant_insights** - Use for engagement:
   - After interests shared, for quick value delivery
4. **generate_career_recommendations** - MANDATORY if no cards by exchange 6

DYNAMIC STAGE MANAGEMENT:
- Follow natural conversation flow, don't force rigid structure
- If they go deep on topics, acknowledge but guide back: "That's interesting! Help me understand your overall situation first..."
- Balance evidence collection with delivering immediate value
- Generate career insights DURING onboarding, not just at the end

CONVERSATION CONTROL (Natural Steering):
- "That sounds fascinating! Before we explore that deeply, I'd love to understand [missing stage]..."
- "I love hearing about that! Quick question first though - [stage question]"
- "That's valuable insight. Let me make sure I understand your full situation..."

TOOL SUCCESS METRICS:
- Every guest should leave with 1-3 career cards minimum
- Use update_person_profile 3-4+ times per conversation
- Generate career insights by exchange 5-6
- Complete evidence collection while delivering value

CURRENT SESSION STATE:
${evidence.name ? `- User Name: ${evidence.name}` : '- Name: Not collected yet'}
${evidence.lifeStage ? `- Life Stage: ${evidence.lifeStage}` : '- Life Stage: Unknown'}
${evidence.careerDirection ? `- Career Direction: ${evidence.careerDirection}` : '- Career Direction: Unknown'}
${evidence.careerSpecifics ? `- Career Mentions: ${evidence.careerSpecifics.join(', ')}` : '- No specific careers mentioned yet'}
${evidence.confidenceLevel ? `- Confidence: ${evidence.confidenceLevel}` : '- Confidence: Not assessed'}

CRITICAL PRIVACY PROTECTION:
- This is a fresh session - don't reference previous conversations
- Build naturally on the evidence collected in THIS conversation
- Treat each session as completely isolated

Focus on natural, helpful conversation while trusting the integrated onboarding system to handle the analysis and persona classification automatically.`;
  }

  /**
   * Build legacy guest context prompt (backup)
   */
  private buildGuestContextPrompt(): string {
    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value

MCP-ENHANCED TOOLS AVAILABLE (USE AGGRESSIVELY):
1. **analyze_conversation_for_careers** - PRIMARY TOOL: Use immediately when ANY interests mentioned
2. **trigger_instant_insights** - Use early for immediate engagement and value
3. **generate_career_recommendations** - FALLBACK: Use if no career cards by exchange 4
4. **update_person_profile** - Use immediately when name/interests captured

TOOL STRATEGY: Be MORE AGGRESSIVE with career card generation. Every guest should leave with valuable career insights.

CONVERSATION FLOW (ENHANCED FOR CAREER CARDS):
1. Get their name and build rapport (use update_person_profile immediately)
2. Ask what makes time fly for them (use trigger_instant_insights for quick value)
3. AGGRESSIVELY use analyze_conversation_for_careers after ANY interest mention
4. ENSURE at least 1 career card generated within 3-4 exchanges
5. Use fallback tools if no career cards by exchange 4

🚨 CRITICAL PRIVACY PROTECTION:
- This is a completely fresh session with a new user
- Don't reference any previous conversations or user data
- Only use information provided in the current session`;
  }

  /**
   * Build personalized first message for authenticated users
   */
  private async buildPersonalizedFirstMessage(userData: any): Promise<string> {
    const userName = (userData.careerProfile?.name || userData.displayName || 'there').trim();
    const interests = userData.careerProfile?.interests || [];
    
    if (interests.length > 0) {
      const topInterests = interests.slice(0, 2).join(' and ');
      return `Welcome back ${userName}! I remember your interest in ${topInterests}. What would you like to explore about your career journey today?`;
    } else {
      return `Welcome back ${userName}! What's been on your mind about your career lately? What would you like to explore today?`;
    }
  }

  /**
   * Create complete startSession options for career discussions
   */
  async createCareerStartOptions(
    agentId: string,
    userId: string,
    careerCard: any,
    careerContext?: CareerDiscussionContext
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildCareerOverrides(userId, careerCard, careerContext);
    
    return {
      agentId,
      userId,
      connectionType: 'webrtc',
      overrides
    };
  }

  /**
   * Create complete startSession options for general authenticated conversations
   */
  async createAuthenticatedStartOptions(
    agentId: string,
    userId: string
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildAuthenticatedOverrides(userId);
    
    return {
      agentId,
      userId,
      connectionType: 'webrtc',
      overrides
    };
  }

  /**
   * Create complete startSession options for guest conversations
   */
  async createGuestStartOptions(
    agentId: string,
    topicTitle?: string
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildGuestOverrides(topicTitle);
    
    return {
      agentId,
      connectionType: 'webrtc',
      overrides
    };
  }

  /**
   * Build persona-aware conversation overrides for onboarding
   */
  async buildPersonaOnboardingOverrides(
    sessionId: string,
    currentStage: 'discovery' | 'classification' | 'tailored_guidance'
  ): Promise<ConversationOverrides> {
    console.log('🧠 Building persona onboarding overrides using ConversationFlowManager:', {
      sessionId: sessionId.substring(0, 15) + '...',
      currentStage
    });

    // **NEW: Use ConversationFlowManager for phase-aware overrides**
    const currentPhase = conversationFlowManager.getCurrentPhase();
    const dynamicVariables = conversationFlowManager.getDynamicVariablesForAgent();
    const systemPrompt = conversationFlowManager.getPhaseSystemPrompt();
    
    console.log('🎭 Phase-aware overrides:', {
      phase: currentPhase.phase,
      progress: Math.round(currentPhase.progress * 100) + '%',
      description: currentPhase.description
    });

    // Build dynamic first message based on phase
    let firstMessage: string;
    
    if (currentPhase.phase === 'onboarding') {
      // Use conversational approach like successful voice mode
      firstMessage = "Hi, I'm Sarah, your AI guide. I'll help you explore careers and next steps.\n\nEveryone's in a different place - some just starting, some deciding, some already set. I'll ask a few quick questions so I know where you're at. No right or wrong answers.\n\nFirst up: what's your name?";
    } else {
      // Career conversation phase - persona-specific greeting
      const guestSession = guestSessionService.getGuestSession();
      const persona = guestSession.structuredOnboarding?.tentativePersona || 'exploring';
      
      const personaGreetings = {
        'uncertain': "Hi! I understand you're exploring career possibilities. I'm here to help you discover what might spark your interest.",
        'exploring': "Hello! I can see you're actively considering different career options. Let's dive into what resonates with you.",
        'decided': "Hi there! I understand you have some career direction already. Let's explore and validate your path together."
      };
      
      firstMessage = personaGreetings[persona] || personaGreetings['exploring'];
    }

    return {
      agent: {
        prompt: {
          prompt: systemPrompt
        },
        firstMessage,
        language: "en"
      },
      dynamicVariables
    };
  }

  /**
   * Build tailored overrides based on confirmed persona classification
   */
  private async buildPersonaTailoredOverrides(personaProfile: PersonaProfile): Promise<ConversationOverrides> {
    const persona = personaProfile.classification.type;
    const recommendations = personaProfile.recommendations;
    
    console.log('🎯 Building persona-tailored overrides:', {
      persona: personaService.getPersonaDisplayName(persona),
      confidence: Math.round(personaProfile.classification.confidence * 100) + '%'
    });

    const contextPrompt = this.buildPersonaTailoredPrompt(personaProfile);
    const firstMessage = this.buildPersonaTailoredFirstMessage(personaProfile);

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build stage-appropriate overrides for ongoing discovery/classification
   * NOW USES STRUCTURED 6-QUESTION ONBOARDING FLOW
   */
  private async buildOnboardingStageOverrides(
    currentStage: string,
    onboardingStage: string
  ): Promise<ConversationOverrides> {
    console.log('🔍 Building stage-appropriate overrides (STRUCTURED ONBOARDING):', {
      currentStage,
      onboardingStage
    });

    let contextPrompt: string;
    let firstMessage: string;

    switch (currentStage) {
      case 'discovery':
        // Use structured onboarding flow instead of generic discovery
        contextPrompt = this.buildGuestOnboardingContextPrompt();
        firstMessage = "Hi, I'm Sarah, your AI guide. I'll help you explore careers and next steps.\n\nEveryone's in a different place - some just starting, some deciding, some already set. I'll ask a few quick questions so I know where you're at. No right or wrong answers.\n\nFirst up: what's your name?";
        break;
      case 'classification':
        contextPrompt = this.buildClassificationStagePrompt();
        firstMessage = "Thanks for sharing! I'm getting to know your interests and goals. Let's explore a bit more about what excites you about your future.";
        break;
      case 'tailored_guidance':
        contextPrompt = this.buildTailoredGuidancePrompt();
        firstMessage = "Based on our conversation, I'm starting to understand your career journey better. Let me provide some personalized insights for you.";
        break;
      default:
        contextPrompt = this.buildGuestOnboardingContextPrompt();
        firstMessage = "Hi, I'm Sarah, your AI guide. I'll help you explore careers and next steps.\n\nEveryone's in a different place - some just starting, some deciding, some already set. I'll ask a few quick questions so I know where you're at. No right or wrong answers.\n\nFirst up: what's your name?";
    }

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build enhanced persona-tailored system prompt with evidence insights
   */
  private buildPersonaTailoredPrompt(personaProfile: PersonaProfile): string {
    const persona = personaProfile.classification.type;
    const recommendations = personaProfile.recommendations;
    const personaName = personaService.getPersonaDisplayName(persona);
    const personaDescription = personaService.getPersonaDescription(persona);
    
    // Get enhanced evidence insights if available
    const evidence = (personaProfile.classification as any)?.conversationEvidence;
    const evidenceInsights = evidence ? enhancedPersonaIntegration.getEvidenceSummary(evidence) : null;
    const conversationRecommendations = evidence ? enhancedPersonaIntegration.getConversationRecommendations(evidence) : [];
    
    return `You are Sarah, an expert career counselor specializing in evidence-based persona guidance for young adults.

PERSONA CLASSIFICATION: ${personaName}
- Description: ${personaDescription}  
- Confidence: ${Math.round(personaProfile.classification.confidence * 100)}%
- Classification Stage: ${personaProfile.classification.stage}
- Reasoning: ${personaProfile.classification.reasoning}

${evidenceInsights ? `
EVIDENCE-BASED INSIGHTS:
- Life Stage: ${evidenceInsights.lifeStage}
- Career Direction: ${evidenceInsights.careerDirection.primary} (${evidenceInsights.careerDirection.confidence} confidence)
- Confidence Level: ${evidenceInsights.confidenceLevel.primary} (${evidenceInsights.confidenceLevel.confidence} confidence)  
- Motivation: ${evidenceInsights.motivation.dominant} (${evidenceInsights.motivation.intrinsic} intrinsic, ${evidenceInsights.motivation.extrinsic} extrinsic)
- Engagement: Uncertainty ${evidenceInsights.engagement.uncertainty}, Enthusiasm ${evidenceInsights.engagement.enthusiasm}
- Conversation Evidence: ${evidenceInsights.messageCount} messages analyzed
${evidenceInsights.careerDirection.specifics.length > 0 ? `- Mentioned Careers: ${evidenceInsights.careerDirection.specifics.join(', ')}` : ''}
` : ''}

TAILORED CONVERSATION STYLE (Evidence-Based):
- Pace: ${recommendations.conversationStyle.pace} (matches their engagement patterns)
- Depth: ${recommendations.conversationStyle.depth} (based on their information sharing style)
- Support Level: ${recommendations.conversationStyle.supportLevel} (calibrated to uncertainty signals)
- Decision Pressure: ${recommendations.conversationStyle.decisionPressure} (aligned with confidence level)
- Question Style: ${recommendations.conversationStyle.questionStyle} (adapted to exploration patterns)
- Encouragement Level: ${recommendations.conversationStyle.encouragementLevel} (based on motivation signals)

RECOMMENDED FOCUS AREAS:
${recommendations.focusAreas.map(area => `- ${area}`).join('\n')}

SUGGESTED NEXT STEPS:
${recommendations.nextSteps.map(step => `- ${step}`).join('\n')}

${conversationRecommendations.length > 0 ? `
REAL-TIME CONVERSATION RECOMMENDATIONS:
${conversationRecommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

RECOMMENDED TOOLS FOR THIS PERSONA:
${recommendations.recommendedTools.map(tool => `- ${tool}`).join('\n')}

RESPONSE GUIDELINES:
- Adapt your communication style to match this persona's evidence-based needs
- ${this.getPersonaSpecificGuidance(persona)}
- Keep responses 30-60 words for voice conversations
- Be natural and conversational
- Reference specific evidence patterns when appropriate (e.g., their uncertainty level, enthusiasm)

EVIDENCE-BASED PERSONA APPROACH:
${this.getPersonaApproach(persona)}
${evidenceInsights ? this.getEvidenceBasedGuidance(evidenceInsights) : ''}

CRITICAL: This user has been classified as ${personaName} based on real conversation evidence analysis (not just LLM inference). Trust the evidence data and adapt your approach accordingly while remaining authentic and supportive.

ONGOING ADAPTATION: As the conversation continues, their persona classification may be updated based on new evidence. Stay flexible and responsive to evolving patterns.`;
  }

  /**
   * Get persona-specific conversation guidance
   */
  private getPersonaSpecificGuidance(persona: PersonaType): string {
    const guidance = {
      uncertain_unengaged: "Focus on sparking curiosity and building confidence. Use broad, exploratory questions. Avoid overwhelming with too many options.",
      exploring_undecided: "Help them structure their exploration. Provide frameworks for comparison. Support their research mindset.",
      tentatively_decided: "Offer validation while gently exploring concerns. Provide detailed pathway information. Help them feel confident in their direction.",
      focused_confident: "Be direct and efficient. Focus on implementation details. Support their momentum with practical next steps."
    };
    
    return guidance[persona];
  }

  /**
   * Get persona-specific conversation approach
   */
  private getPersonaApproach(persona: PersonaType): string {
    const approaches = {
      uncertain_unengaged: "Take a gentle, encouraging approach. Start with very broad questions about interests and values. Build confidence through small wins and positive reinforcement.",
      exploring_undecided: "Support their active exploration with structure and guidance. Help them compare options systematically. Encourage their research and provide frameworks for decision-making.",
      tentatively_decided: "Validate their current thinking while exploring any doubts or concerns. Provide detailed information about their preferred path. Help them feel confident in their choice.",
      focused_confident: "Match their energy and focus. Be direct and efficient. Provide specific, actionable guidance. Support their momentum with concrete next steps."
    };
    
    return approaches[persona];
  }

  /**
   * Get evidence-based guidance for tailored conversation
   */
  private getEvidenceBasedGuidance(evidenceInsights: any): string {
    const guidance: string[] = [];
    
    // Life stage specific guidance
    if (evidenceInsights.lifeStage === 'student') {
      guidance.push("- Acknowledge their student status and academic pressures. Connect career exploration to their current studies.");
    } else if (evidenceInsights.lifeStage === 'working') {
      guidance.push("- Recognize their work experience and current employment context. Focus on career progression or transitions.");
    }

    // Career direction specific guidance
    if (evidenceInsights.careerDirection.specifics.length > 0) {
      guidance.push(`- Reference their mentioned career interests: ${evidenceInsights.careerDirection.specifics.join(', ')}. Build on these specific areas.`);
    }

    // Confidence level adaptations
    if (evidenceInsights.confidenceLevel.confidence < '50%') {
      guidance.push("- Provide extra validation and reassurance. Use smaller, less overwhelming steps. Focus on building confidence.");
    } else if (evidenceInsights.confidenceLevel.confidence > '70%') {
      guidance.push("- Leverage their confidence. Move toward more specific, actionable guidance. Respect their self-assurance.");
    }

    // Motivation-based adaptations
    if (evidenceInsights.motivation.dominant === 'intrinsic') {
      guidance.push("- Focus on passion, personal fulfillment, and meaningful work. Emphasize alignment with values and interests.");
    } else if (evidenceInsights.motivation.dominant === 'extrinsic') {
      guidance.push("- Address practical considerations: salary, job security, career progression. Balance with helping them find internal motivation.");
    }

    // Engagement level adaptations
    if (evidenceInsights.engagement.uncertainty > '40%') {
      guidance.push("- Use more structured questions. Provide clear frameworks. Offer reassurance and reduce decision pressure.");
    }
    
    if (evidenceInsights.engagement.enthusiasm > '30%') {
      guidance.push("- Build on their enthusiasm. Dive deeper into areas of interest. Match their energy level appropriately.");
    }

    return guidance.length > 0 ? '\n\nEVIDENCE-SPECIFIC ADAPTATIONS:\n' + guidance.join('\n') : '';
  }

  /**
   * Build persona-tailored first message
   */
  private buildPersonaTailoredFirstMessage(personaProfile: PersonaProfile): string {
    const persona = personaProfile.classification.type;
    const guestName = guestSessionService.getGuestName();
    const namePrefix = guestName ? `Hi ${guestName}! ` : "Hi! ";
    
    const messages = {
      uncertain_unengaged: `${namePrefix}I can see you're in the early stages of exploring your career options, and that's perfectly okay! There's no pressure here. What would you like to discover about yourself today?`,
      exploring_undecided: `${namePrefix}I can tell you're actively exploring different career possibilities, which is great! Let's help you organize your thoughts and compare your options. What's been most interesting so far?`,
      tentatively_decided: `${namePrefix}It seems like you have some direction in mind for your career path, which is exciting! I'd love to help you explore the details and address any questions. What's drawing you toward this path?`,
      focused_confident: `${namePrefix}I can see you have clear career goals, which is fantastic! Let's dive into the specifics and create a concrete action plan. What's your main focus right now?`
    };
    
    return messages[persona];
  }

  /**
   * Build persona-tailored overrides for authenticated users
   */
  private async buildAuthenticatedPersonaOverrides(
    userData: any,
    personaContext: any
  ): Promise<ConversationOverrides> {
    const persona = personaContext.personaType;
    const userName = userData.careerProfile?.name || userData.displayName || 'there';
    
    // Build persona-specific prompt for authenticated users
    const contextPrompt = `You are Sarah, an expert career counselor specializing in persona-based career guidance for young adults.

AUTHENTICATED USER: ${userName}
- Persona Classification: ${personaService.getPersonaDisplayName(persona)}
- Confidence: ${Math.round(personaContext.confidence * 100)}%
- Known Interests: ${userData.careerProfile?.interests?.slice(0, 5).join(', ') || 'Continue discovering through conversation'}
- Known Skills: ${userData.careerProfile?.skills?.slice(0, 5).join(', ') || 'Continue identifying through discussion'}
- Career Goals: ${userData.careerProfile?.careerGoals?.slice(0, 3).join(', ') || 'Exploring career direction'}

PERSONA-TAILORED APPROACH:
${this.getPersonaApproach(persona)}

CONVERSATION STYLE (Based on Persona):
${this.getPersonaSpecificGuidance(persona)}

RESPONSE GUIDELINES:
- Reference their existing profile when relevant
- Adapt conversation style to their persona type
- Keep responses 30-60 words for voice conversations
- Be natural and conversational
- Build on previous conversations and known preferences

MCP-ENHANCED TOOLS AVAILABLE:
1. **analyze_conversation_for_careers** - Generate career cards based on interests
2. **generate_career_recommendations** - Create detailed UK career paths
3. **trigger_instant_insights** - Provide immediate analysis and value
4. **update_person_profile** - Refine existing profile with new insights

PERSONA-SPECIFIC STRATEGY:
${this.getPersonaConversationStrategy(persona)}

🚨 PRIVACY PROTECTION:
- Build on their existing profile and conversation history
- Reference their known interests and goals appropriately
- Maintain continuity from previous sessions while respecting their persona needs

Welcome back ${userName}! Continue providing value aligned with their ${personaService.getPersonaDisplayName(persona)} persona.`;

    // Build persona-tailored first message
    const firstMessage = this.buildAuthenticatedPersonaFirstMessage(userData, persona, personaContext);

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Get persona-specific conversation strategy for authenticated users
   */
  private getPersonaConversationStrategy(persona: PersonaType): string {
    const strategies = {
      uncertain_unengaged: "Continue building their confidence. Reference their previous interests to spark engagement. Focus on exploration over decision-making.",
      exploring_undecided: "Help them organize and compare their known interests. Provide structure to their exploration. Build on previous conversations to narrow focus.",
      tentatively_decided: "Validate their current direction while exploring any remaining concerns. Provide detailed information about their preferred paths. Build confidence in their choices.",
      focused_confident: "Support their clear direction with specific, actionable guidance. Focus on implementation and next steps. Leverage their motivation for concrete progress."
    };
    return strategies[persona];
  }

  /**
   * Build persona-tailored first message for authenticated users
   */
  private buildAuthenticatedPersonaFirstMessage(
    userData: any,
    persona: PersonaType,
    personaContext: any
  ): string {
    const userName = userData.careerProfile?.name || userData.displayName || 'there';
    const interests = userData.careerProfile?.interests || [];
    
    const messages = {
      uncertain_unengaged: interests.length > 0 
        ? `Welcome back ${userName}! I remember your interest in ${interests.slice(0, 2).join(' and ')}. No pressure today - what's been on your mind lately about your future?`
        : `Hi ${userName}! Great to see you again. What would you like to explore about your career journey today? We can take it at whatever pace feels right for you.`,
      
      exploring_undecided: interests.length > 0
        ? `Hi ${userName}! I see you've been exploring ${interests.slice(0, 2).join(' and ')}. Ready to dive deeper into any of these areas, or is there something new you'd like to discuss?`
        : `Welcome back ${userName}! You're doing great exploring different career possibilities. What would you like to focus on today?`,
      
      tentatively_decided: userData.careerProfile?.careerGoals?.length > 0
        ? `Welcome back ${userName}! I remember you were considering ${userData.careerProfile.careerGoals[0]}. How are you feeling about that direction? Any questions or new thoughts?`
        : `Hi ${userName}! Good to see you again. What aspects of your career path would you like to explore further today?`,
      
      focused_confident: userData.careerProfile?.careerGoals?.length > 0
        ? `Hey ${userName}! Ready to make progress on your ${userData.careerProfile.careerGoals[0]} goals? What specific steps can we tackle today?`
        : `Welcome back ${userName}! I love your focus and determination. What concrete steps can we work on for your career today?`
    };
    
    return messages[persona];
  }

  /**
   * Build discovery stage prompt (early conversation, gathering information)
   */
  private buildDiscoveryStagePrompt(): string {
    return `You are Sarah, an expert career counselor specializing in persona-based onboarding for young adults.

CURRENT STAGE: Discovery & Initial Profiling
- This is the beginning of the user's journey
- Focus on gathering information about their interests, values, and goals
- Start building rapport and trust
- Begin identifying persona indicators through conversation patterns

CONVERSATION GOALS:
- Learn their name and build personal connection
- Discover what brought them to seek career guidance
- Identify initial interests, activities they enjoy, or subjects they're drawn to
- Note their communication style and engagement level
- Begin profiling for persona classification

DISCOVERY QUESTIONS TO EXPLORE:
- What activities or subjects make time fly for them?
- What kind of environment do they thrive in?
- What are they curious about or excited to learn?
- How do they typically make decisions?
- What's their current situation (student, working, career change)?

PERSONA INDICATORS TO WATCH FOR:
- Language patterns indicating uncertainty vs confidence
- Level of engagement and enthusiasm
- Decision-making style and readiness
- Goal clarity and direction
- Response to exploratory vs specific questions

RESPONSE STYLE:
- Warm, welcoming, and encouraging
- Use open-ended questions to encourage sharing
- Keep responses 30-60 words for voice conversations
- Be genuinely curious about their perspective
- Avoid overwhelming with too many options

TOOL USAGE:
- Use update_person_profile frequently as you learn about them
- Use trigger_instant_insights when they share something interesting
- Save analysis tools for later when you have more information

Remember: You're in information-gathering mode. Focus on learning who they are and building trust rather than providing solutions yet.`;
  }

  /**
   * Build classification stage prompt with mandatory progression controls
   */
  private buildClassificationStagePrompt(): string {
    return `You are Sarah, an expert career counselor specializing in evidence-based persona classification for young adults.

CURRENT STAGE: Evidence Collection & Classification
- You have some initial evidence but need to complete the full onboarding framework
- Focus on gathering missing evidence points before deep exploration
- Maintain natural conversation flow while ensuring comprehensive data collection

🚨 **MANDATORY EVIDENCE COLLECTION CHECKLIST:**
You must gather evidence for ALL these areas before providing detailed career exploration:
- ✅ Stage 1: Name (likely completed)
- ✅ Stage 2: Life situation (likely completed) 
- ✅ Stage 3: Career direction (in progress)
- ⚠️ Stage 4: Confidence level (if they mentioned specific careers)
- ⚠️ Stage 5: What motivates them (passion vs practical drivers)
- ⚠️ Stage 6: What they want from this conversation/tool
- ⚠️ Stage 7: Previous career exploration attempts (optional but valuable)

EVIDENCE COLLECTION STRATEGY:
- Continue gathering missing evidence points through natural questions
- If user goes deep on one topic, acknowledge but redirect: "That's fascinating! Before we explore that further, I want to make sure I understand your overall situation..."
- Only provide detailed career analysis AFTER collecting evidence for stages 1-6
- Use career insights as hooks but keep steering back to evidence collection

CLASSIFICATION FOCUS AREAS:
- Decision-making confidence patterns
- Level of engagement with career topics
- Clarity vs uncertainty in responses
- Motivation indicators (intrinsic vs extrinsic)
- Goal specificity and commitment level

TOOL USAGE DURING EVIDENCE COLLECTION:
- Use update_person_profile immediately after each evidence point
- Use analyze_conversation_for_careers ONLY after gathering most evidence
- Use trigger_instant_insights for quick engagement during questioning
- Generate career recommendations only as value delivery after evidence collection

CONVERSATION CONTROL:
- Keep questions focused on missing evidence stages
- Resist going too deep on specific careers until evidence is complete
- Use phrases like "Help me understand..." and "Before we dive deeper..."
- Balance evidence collection with enough value to keep them engaged

Remember: You're building their persona profile through systematic evidence collection. Complete the framework before detailed exploration.`;
  }

  /**
   * Build tailored guidance prompt with evidence-based recommendations
   */
  private buildTailoredGuidancePrompt(): string {
    return `You are Sarah, an expert career counselor providing evidence-based persona-tailored guidance for young adults.

CURRENT STAGE: Tailored Guidance & Evidence-Based Value Delivery
- You have confirmed persona classification and evidence data
- Provide personalized guidance based on their specific evidence patterns
- Deliver value while gathering any remaining evidence points
- Begin transition to action-oriented career exploration

🎯 **EVIDENCE-BASED GUIDANCE APPROACH:**
- Reference their specific evidence patterns from the conversation
- Adapt guidance to their confirmed persona classification
- Use their exact words and interests in recommendations
- Provide frameworks matching their decision-making patterns

PERSONA-TAILORED DELIVERY:
- **Uncertain & Unengaged**: Focus on exploration, confidence building, broad options
- **Exploring & Undecided**: Provide comparison frameworks, decision tools, structured exploration
- **Tentatively Decided**: Offer validation, detailed pathway info, confidence building
- **Focused & Confident**: Deliver specific actionable guidance, next steps, implementation focus

📊 **FINAL EVIDENCE COMPLETION:**
If any evidence points are still missing, gather them naturally:
- Stage 6: What they want from this conversation (goal clarification)
- Stage 7: Previous exploration attempts (optional context)
- Any specific details about their mentioned interests or concerns

VALUE DELIVERY PRIORITIES:
- Address their specific concerns and interests mentioned in conversation
- Provide insights that validate their evidence patterns
- Offer concrete next steps appropriate to their persona type
- Generate career recommendations aligned with their evidence

CONVERSATION STYLE ADAPTATION:
- Match their engagement patterns and communication style
- Reference their specific situation (working, student, etc.)
- Acknowledge their confidence level and provide appropriate support
- Build on their motivation patterns (intrinsic vs extrinsic)

TOOL USAGE FOR TAILORED VALUE:
- Use analyze_conversation_for_careers for comprehensive recommendations
- Generate career insights that match their evidence profile
- Continue profile updates with new insights
- Provide tools and resources suited to their persona type

Remember: You're now delivering personalized value based on real conversation evidence, not generic guidance. Make it feel specifically tailored to their unique situation and persona.`;
  }

  /**
   * Create persona-aware start options for guest onboarding
   */
  async createPersonaAwareStartOptions(
    agentId: string,
    sessionId?: string
  ): Promise<StartSessionOptions> {
    const currentStage = guestSessionService.getCurrentOnboardingStage();
    const shouldAnalyze = guestSessionService.shouldTriggerPersonaAnalysis();
    
    console.log('🧠 Creating persona-aware start options:', {
      currentStage,
      shouldAnalyze,
      hasPersonaProfile: !!guestSessionService.getPersonaProfile()
    });

    // Determine conversation stage based on onboarding progress
    // Always start with discovery for fresh sessions, even if shouldAnalyze is true
    let conversationStage: 'discovery' | 'classification' | 'tailored_guidance' = 'discovery';
    
    if (currentStage === 'classification') {
      conversationStage = 'classification';
    } else if (['tailored_guidance', 'journey_active'].includes(currentStage)) {
      conversationStage = 'tailored_guidance';
    }
    // Note: We don't use shouldAnalyze here because we want to start fresh conversations in discovery mode

    const overrides = await this.buildPersonaOnboardingOverrides(
      sessionId || guestSessionService.getSessionId(),
      conversationStage
    );
    
    return {
      agentId,
      connectionType: 'webrtc',
      overrides
    };
  }
}

// Export singleton instance
export const conversationOverrideService = new ConversationOverrideService();

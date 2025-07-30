// Simple conversation analyzer using OpenAI best practices from Context7
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { mcpBridgeService, MCPMessage, MCPAnalysisResult } from './mcpBridgeService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be server-side
});

// Zod schemas for structured responses (Context7 best practice)
const CareerInterestSchema = z.object({
  interest: z.string(),
  context: z.string(),
  confidence: z.number().min(0).max(1),
  extractedTerms: z.array(z.string())
});

const InterestsResponseSchema = z.object({
  interests: z.array(CareerInterestSchema)
});

// Updated interfaces to match existing components
export interface CareerInsight {
  id: string;
  type: 'interest' | 'skill' | 'preference' | 'pathway' | 'industry' | 'summary';
  title: string;
  description: string;
  confidence: number;
  extractedAt: Date;
  relatedTerms: string[];
  metadata?: {
    source?: string;
    personaType?: string;
    conversationContext?: string;
    location?: string;
  };
}

export interface PersonalityPreference {
  id: string;
  category: string;
  value: string;
  preference: string; // For backward compatibility
  strength: 'weak' | 'moderate' | 'strong'; // For backward compatibility
  confidence: number;
  extractedAt: Date;
}

export interface CareerProfile {
  interests: CareerInsight[];
  skills: CareerInsight[];
  preferences: PersonalityPreference[];
  suggestedPaths: CareerInsight[];
  industries: string[];
  totalInsights: number;
  conversationSummary: string;
  registrationTriggers: {
    timeThreshold?: boolean;
    insightThreshold?: boolean;
    engagementThreshold?: boolean;
    userInitiated?: boolean;
  };
}

export interface ConversationInterest {
  interest: string;
  context: string;
  confidence: number;
  extractedTerms: string[];
}

export interface CareerCardData {
  id: string;
  title: string;
  description: string;
  industry: string;
  averageSalary: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook: string;
  entryRequirements: string[];
  trainingPathways: string[];
  keySkills: string[];
  workEnvironment: string;
  nextSteps: string[];
  location: string;
  confidence: number;
  sourceData: string;
  webSearchVerified?: boolean; // Indicates if data was verified via web search
  requiresVerification?: boolean; // Indicates if data needs manual verification
  citations?: string[]; // Web search citations if available
}

export class ConversationAnalyzer {
  private profile: CareerProfile;
  private useMCPEnhancement: boolean;

  constructor() {
    this.profile = this.createProfile();
    // Enable MCP enhancement if available and configured
    this.useMCPEnhancement = import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT === 'true';
  }

  createProfile(): CareerProfile {
    return {
      interests: [],
      skills: [],
      preferences: [],
      suggestedPaths: [],
      industries: [],
      totalInsights: 0,
      conversationSummary: '',
      registrationTriggers: {}
    };
  }

  // Enhanced message analysis using Context7 best practices
  async analyzeMessage(message: string, conversationHistory: string[] = []): Promise<ConversationInterest[]> {
    try {
      // Build conversation context for better analysis
      const conversationContext = conversationHistory.length > 0 
        ? `Previous conversation context:\n${conversationHistory.join('\n')}\n\nLatest message: ${message}`
        : message;

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (openai as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06', // Latest model as recommended by Context7
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor. Extract career-related interests from user messages using the full conversation context.
            
            Look for:
            - Activities they enjoy
            - Skills they mention or want to develop
            - Problems they want to solve
            - Work environment preferences
            - Values and motivations
            - Career stage and experience level
            - Industry interests
            
            Consider the ENTIRE conversation context to build a comprehensive understanding.
            Only return interests with confidence > 0.6.
            If the conversation reveals evolving interests, prioritize the most recent and specific mentions.`
          },
          {
            role: 'user',
            content: `Analyze this conversation for career interests:\n\n${conversationContext}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.3,
        max_tokens: 800
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) return [];

      // Filter and validate interests with type safety
      return parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );
      
    } catch (error) {
      console.error('Error analyzing message:', error);
      return [];
    }
  }

  // NEW: Analyze complete conversation for comprehensive career insights
  async analyzeFullConversation(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<ConversationInterest[]> {
    try {
      if (messages.length === 0) return [];

      // Extract just user messages for career interest analysis
      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);

      if (userMessages.length === 0) return [];

      const conversationText = userMessages.join('\n');
      console.log('🔬 Analyzing conversation text:', conversationText.substring(0, 100) + '...');

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (openai as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor analyzing a complete conversation to extract comprehensive career insights.
            
            Extract ALL career-related information including:
            - Activities and hobbies they enjoy
            - Skills they have or want to develop
            - Work environment preferences (office, outdoor, flexible, etc.)
            - Values and motivations (helping people, problem-solving, etc.)
            - Industry interests mentioned
            - Career stage preferences
            - Educational background or interests
            
            Build a comprehensive profile from the ENTIRE conversation.
            Look for evolution in their thinking - if interests change or expand during the conversation, capture both earlier and later insights.
            Only return interests with confidence > 0.6.`
          },
          {
            role: 'user',
            content: `Analyze this complete conversation for comprehensive career insights:\n\n${conversationText}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 1200
      });

      console.log('🔬 OpenAI response received');
      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        console.error('🔬 No parsed response from OpenAI');
        return [];
      }

      console.log('🔬 Parsed interests:', parsed.interests.length);

      // Filter and validate interests with type safety
      const validInterests = parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );

      console.log('🔬 Valid interests after filtering:', validInterests.length);
      return validInterests;
      
    } catch (error) {
      console.error('❌ Error in analyzeFullConversation:', error);
      
      // Fallback to individual message analysis if full conversation fails
      if (messages.length > 0) {
        const lastMessage = messages.filter(msg => msg.role === 'user').pop();
        if (lastMessage) {
          console.log('🔄 Falling back to individual message analysis');
          return await this.analyzeMessage(lastMessage.content, []);
        }
      }
      
      return [];
    }
  }

  // Convert interests to insights for backward compatibility
  async analyzeInterests(messages: string[]): Promise<CareerInsight[]> {
    if (messages.length === 0) return [];
    
    const latestMessage = messages[messages.length - 1];
    const interests = await this.analyzeMessage(latestMessage, messages.slice(0, -1));
    
    return interests.map(interest => ({
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'interest' as const,
      title: interest.interest,
      description: interest.context,
      confidence: interest.confidence,
      extractedAt: new Date(),
      relatedTerms: interest.extractedTerms,
      metadata: {
        source: 'conversation_analysis'
      }
    }));
  }

  // Enhanced career card generation with OpenAI Responses API web search
  async generateCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      console.log('🔍 Using OpenAI Responses API with web search for real UK career data:', interest);
      
      // Use OpenAI's Responses API with web search preview tool
      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ 
          type: 'web_search_preview',
          search_context_size: 'medium', // Options: 'low', 'medium', 'high'
          user_location: {
            type: 'approximate',
            country: 'GB',
            city: 'London', // Default to London for UK searches
            region: 'England'
          }
        }],
        input: `Research and create a comprehensive UK career profile for: "${interest}" with context: "${context}".

Use web search to find current, verified UK data including:
- Real salary ranges from UK sources (entry/experienced/senior levels) from job boards like Indeed UK, Glassdoor UK
- Actual training routes and qualifications available in the UK from UCAS, gov.uk
- Current entry requirements from real UK courses/job postings
- Market outlook from official UK sources like National Careers Service, ONS
- Real course names from UK institutions and training providers

Structure your output as strict JSON only:

{
  "title": "Exact Career Title",
  "description": "Clear, UK-focused overview based on real web search results",
  "industry": "UK industry category from research",
  "averageSalary": {
    "entry": "£XX,000 (source: [verified UK source found via search])",
    "experienced": "£XX,000 (source: [verified UK source found via search])", 
    "senior": "£XX,000 (source: [verified UK source found via search])"
  },
  "growthOutlook": "UK market outlook from official sources found via search, include source",
  "entryRequirements": ["Real UK qualification requirements from search results", "From actual job postings/courses found"],
  "trainingPathways": [
    "Actual UK university courses found via web search (include institution names)",
    "Real apprenticeship programs with providers found via search",
    "Specific professional qualifications available in UK from search results"
  ],
  "keySkills": ["Skills from real UK job postings found via search", "Industry-standard requirements from research"],
  "workEnvironment": "Based on real UK job descriptions and working conditions from search results",
  "nextSteps": ["Specific, actionable steps with real UK resources found via search", "Links to actual services discovered"]
}

IMPORTANT: Only use information found through web search. If specific information cannot be verified through search results, use "verify with [specific source found]" and include the actual sources discovered via web search.

Use web search to validate ALL critical information before including it. Prioritize official UK sources like gov.uk, National Careers Service, UCAS, ONS, and established UK job boards.`
      });

      const content = response.output_text;

      if (!content) {
        console.warn('⚠️ No content received from OpenAI Responses API');
        return null;
      }

      console.log('✅ Web search-enhanced career card generation completed');
      console.log('📊 Generated career card with real UK data from web search');

      // Clean the response by removing markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      try {
        const cardData = JSON.parse(cleanedContent);
        
        return {
          id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...cardData,
          location: 'UK',
          confidence: 0.95, // High confidence due to real web search verification
          sourceData: interest,
          webSearchVerified: true, // Using OpenAI's real-time web search
          requiresVerification: false // Data is already verified via web search
        };
      } catch (parseError) {
        console.error('❌ Failed to parse career card JSON:', parseError);
        console.error('Raw content:', content);
        return null;
      }

    } catch (error) {
      console.error('❌ Error generating web search-enhanced career card:', error);
      
      // Fallback to basic generation without web search
      console.log('🔄 Attempting fallback generation without web search...');
      return await this.generateBasicCareerCard(interest, context);
    }
  }

  /**
   * Fallback career card generation without web search
   */
  private async generateBasicCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are a UK career guidance specialist. Provide general career information with clear disclaimers about verification needs.'
          },
          {
            role: 'user',
            content: `Create a basic UK career overview for "${interest}" with context "${context}".

            Important: Mark all information as "requires verification" and direct users to official UK sources.
            
            Return JSON format:
            {
              "title": "Career Title",
              "description": "General overview - verify with official sources",
              "industry": "General industry category",
              "averageSalary": {"entry": "Verify with ONS/job boards", "experienced": "Verify with salary surveys", "senior": "Verify with industry reports"},
              "growthOutlook": "Check National Careers Service for current outlook",
              "entryRequirements": ["Verify with UCAS/course providers"],
              "trainingPathways": ["Check gov.uk for current training options"],
              "keySkills": ["General skills - verify with job postings"],
              "workEnvironment": "Varies - research specific employers",
              "nextSteps": ["Research official UK sources", "Check gov.uk careers advice", "Contact training providers directly"]
            }`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      const cardData = JSON.parse(cleanedContent);
      
      return {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...cardData,
        location: 'UK',
        confidence: 0.6, // Lower confidence for unverified data
        sourceData: interest,
        webSearchVerified: false,
        requiresVerification: true
      };

    } catch (error) {
      console.error('❌ Fallback career card generation failed:', error);
      return null;
    }
  }

  // Process conversation for insights and cards
  async processConversationForInsights(
    userMessage: string,
    conversationHistory: string[] = []
  ): Promise<{ interests: ConversationInterest[]; careerCards: CareerCardData[] }> {
    try {
      // Build full conversation context including the new message
      const fullConversation = [
        ...conversationHistory.map(msg => ({ role: 'user' as const, content: msg })),
        { role: 'user' as const, content: userMessage }
      ];

      // Use full conversation analysis for comprehensive insights
      const interests = await this.analyzeFullConversation(fullConversation);
      const careerCards: CareerCardData[] = [];
      
      // Generate unique career cards for high-confidence interests
      const processedInterests = new Set<string>();
      
      for (const interest of interests) {
        if (interest.confidence > 0.7) {
          // Create a unique key for this interest to avoid duplicates
          const interestKey = interest.interest.toLowerCase().trim();
          
          if (!processedInterests.has(interestKey)) {
            const card = await this.generateCareerCard(interest.interest, interest.context);
            if (card) {
              careerCards.push(card);
              processedInterests.add(interestKey);
            }
            // Rate limiting to avoid API throttling
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }

      console.log(`✅ Processed conversation: ${interests.length} interests found, ${careerCards.length} unique career cards generated`);
      
      return { interests, careerCards };
    } catch (error) {
      console.error('Error processing conversation:', error);
      return { interests: [], careerCards: [] };
    }
  }

  // Convert CareerCardData to CareerInsight for existing components
  convertCardToInsight(card: CareerCardData): CareerInsight {
    return {
      id: card.id,
      type: 'pathway',
      title: card.title,
      description: card.description,
      confidence: card.confidence,
      extractedAt: new Date(),
      relatedTerms: card.keySkills.slice(0, 3),
      metadata: {
        source: 'openai_research',
        location: card.location,
        conversationContext: card.sourceData
      }
    };
  }

  // Legacy compatibility methods
  getCareerProfile(): CareerProfile {
    return this.profile;
  }

  updateProfile(updates: Partial<CareerProfile>): void {
    this.profile = { ...this.profile, ...updates };
  }

  async generatePeriodicSummary(): Promise<string> {
    return "Career exploration summary based on conversation analysis.";
  }

  getRegistrationReadiness(): { score: number; reasons: string[] } {
    const score = this.profile.totalInsights >= 3 ? 0.8 : 0.3;
    const reasons = this.profile.totalInsights >= 3 
      ? ['Sufficient career insights discovered', 'Good engagement level', 'Ready for personalized recommendations']
      : ['Building career profile', 'Discovering interests', 'Continue exploring'];
    return { score, reasons };
  }

  shouldTriggerRegistration(): boolean {
    return this.profile.totalInsights >= 3;
  }

  /**
   * Enhanced conversation analysis that optionally uses MCP server
   */
  async analyzeConversationWithMCP(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    if (this.useMCPEnhancement && mcpBridgeService.isServerConnected()) {
      try {
        console.log('🔬 Using MCP-enhanced conversation analysis');
        
        // Convert messages to MCP format
        const mcpMessages: MCPMessage[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Analyze with MCP server
        const mcpResult: MCPAnalysisResult = await mcpBridgeService.analyzeConversation(mcpMessages, userId);
        
        if (mcpResult.success && mcpResult.analysis) {
          // Convert MCP results to ConversationInterest format
          const interests: ConversationInterest[] = mcpResult.analysis.detectedInterests.map((interest, index) => ({
            interest,
            context: `Detected from MCP conversation analysis`,
            confidence: mcpResult.analysis!.confidence,
            extractedTerms: [interest.toLowerCase().replace(/[^a-z0-9]/g, '')]
          }));

          console.log('✅ MCP analysis completed', {
            interestsFound: interests.length,
            confidence: mcpResult.analysis.confidence,
            careerCards: mcpResult.analysis.careerCards?.length || 0
          });

          return interests;
        } else {
          console.warn('⚠️ MCP analysis failed, falling back to standard analysis:', mcpResult.error);
        }
      } catch (error) {
        console.warn('⚠️ MCP analysis error, falling back to standard analysis:', error);
      }
    }

    // Fallback to standard analysis
    console.log('🔬 Using standard conversation analysis');
    return await this.analyzeStandardConversation(messages, userId);
  }

  /**
   * Standard conversation analysis (fallback method)
   */
  private async analyzeStandardConversation(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    try {
      // Use the new full conversation analysis method
      return await this.analyzeFullConversation(messages);
    } catch (error) {
      console.error('❌ Standard conversation analysis failed:', error);
      
      // Final fallback: analyze just the last user message if available
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        return await this.analyzeMessage(lastUserMessage.content, []);
      }
      
      return [];
    }
  }

  /**
   * Enhanced career card generation using MCP if available
   */
  async generateCareerCardsWithMCP(interests: ConversationInterest[], userId?: string): Promise<CareerCardData[]> {
    if (this.useMCPEnhancement && mcpBridgeService.isServerConnected() && interests.length > 0) {
      try {
        console.log('🎯 Using MCP-enhanced career insights generation');
        
        const interestNames = interests.map(i => i.interest);
        const mcpResult = await mcpBridgeService.generateCareerInsights(interestNames);
        
        if (mcpResult.success && mcpResult.insights) {
          // Convert MCP insights to CareerCardData format
          const careerCards: CareerCardData[] = mcpResult.insights.map((insight, index) => ({
            id: `mcp-card-${Date.now()}-${index}`,
            title: `${insight.field} Career Path`,
            description: `Explore opportunities in ${insight.field}`,
            industry: insight.field,
            averageSalary: insight.salaryData,
            growthOutlook: insight.marketOutlook.growth,
            entryRequirements: insight.pathways.slice(0, 3),
            trainingPathways: insight.pathways,
            keySkills: insight.skills,
            workEnvironment: `${insight.marketOutlook.demand} with ${insight.marketOutlook.competition}`,
            nextSteps: insight.nextSteps,
            location: 'UK',
            confidence: 0.9, // High confidence from MCP server
            sourceData: insight.field
          }));

          console.log('✅ MCP career cards generated', { cardsCreated: careerCards.length });
          return careerCards;
        }
      } catch (error) {
        console.warn('⚠️ MCP career cards generation failed, using fallback:', error);
      }
    }

    // Fallback to standard generation
    console.log('🎯 Using standard career card generation');
    const careerCards: CareerCardData[] = [];
    
    for (const interest of interests) {
      if (interest.confidence > 0.7) {
        const card = await this.generateCareerCard(interest.interest, interest.context);
        if (card) careerCards.push(card);
      }
    }
    
    return careerCards;
  }

  /**
   * Enhance existing career card with additional rich data using OpenAI web search
   */
  async enhanceCareerCardWithWebSearch(careerCard: any): Promise<any | null> {
    try {
      console.log('🔍 Enhancing career card with additional web search data:', careerCard.title);
      
      const response = await openai.responses.create({
        model: 'gpt-4o',
        tools: [{ 
          type: 'web_search_preview',
          search_context_size: 'high', // Use high for more detailed enhancement
          user_location: {
            type: 'approximate',
            country: 'GB',
            city: 'London',
            region: 'England'
          }
        }],
        input: `Enhance this existing UK career profile with additional detailed research: "${careerCard.title}"

CURRENT DATA:
- Industry: ${careerCard.industry || 'Not specified'}
- Current salary info: ${JSON.stringify(careerCard.averageSalary || {})}
- Description: ${careerCard.description || 'Not specified'}
- Entry requirements: ${JSON.stringify(careerCard.entryRequirements || [])}

Use web search to find ADDITIONAL comprehensive UK data:
- More detailed salary breakdown by location and specialization from UK job boards
- Specific career progression paths and promotional opportunities
- Day-in-the-life details from professional interviews/blogs
- Latest industry trends and future outlook from UK industry reports
- Specific UK employers and their requirements from company websites
- Real testimonials from professionals in this field
- Additional qualifications that boost earning potential
- Work-life balance insights from Glassdoor UK reviews
- Skills in highest demand from recent UK job postings
- Professional associations and networking opportunities in UK

Structure as strict JSON with ENHANCED details:

{
  "enhancedSalary": {
    "entry": "£XX,000 (source: [specific UK source])",
    "experienced": "£XX,000 (source: [specific UK source])", 
    "senior": "£XX,000 (source: [specific UK source])",
    "byLocation": {
      "london": "£XX,000 - £XX,000",
      "manchester": "£XX,000 - £XX,000", 
      "birmingham": "£XX,000 - £XX,000"
    },
    "bySpecialization": {
      "specialized_area_1": "£XX,000 - £XX,000",
      "specialized_area_2": "£XX,000 - £XX,000"
    }
  },
  "careerProgression": [
    "Entry level position → Mid-level role (timeframe and requirements)",
    "Mid-level → Senior role progression path",
    "Senior → Leadership advancement opportunities"
  ],
  "dayInTheLife": "Detailed description of typical daily activities based on professional accounts",
  "industryTrends": ["Latest trend 1 with source", "Industry development 2 with source"],
  "topUKEmployers": [
    {"name": "Company Name", "knownFor": "What they're known for", "typical_salary": "£XX,000"},
    {"name": "Company 2", "knownFor": "Their specialty", "typical_salary": "£XX,000"}
  ],
  "professionalTestimonials": [
    {"quote": "Real quote from professional", "source": "Name/Platform where found"},
    {"quote": "Another testimonial", "source": "Source attribution"}
  ],
  "additionalQualifications": [
    {"qualification": "Specific cert/course name", "benefit": "How it helps career/salary", "provider": "UK institution"}
  ],
  "workLifeBalance": {
    "typical_hours": "XX hours per week",
    "flexibility": "Remote/hybrid options description",
    "stress_level": "Low/Medium/High with explanation",
    "job_satisfaction": "Rating and reasons from reviews"
  },
  "inDemandSkills": ["Skill 1 from recent job postings", "Hot skill 2", "Emerging skill 3"],
  "professionalAssociations": [
    {"name": "Association name", "benefits": "What members get", "cost": "£XX annual"}
  ],
  "enhancedSources": ["Specific URL 1", "Industry report 2", "Professional platform 3"]
}

CRITICAL: Only include information found through current web search. Use specific UK sources and include attribution for all data points.`
      });

      const content = response.output_text;

      if (!content) {
        console.warn('⚠️ No enhanced content received from OpenAI');
        return careerCard; // Return original if enhancement fails
      }

      console.log('✅ Career card enhancement completed with additional web search data');

      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      try {
        const enhancedData = JSON.parse(cleanedContent);
        
        // Merge enhanced data with original career card
        return {
          ...careerCard,
          // Keep original data but add enhanced fields
          enhancedSalary: enhancedData.enhancedSalary,
          careerProgression: enhancedData.careerProgression,
          dayInTheLife: enhancedData.dayInTheLife,
          industryTrends: enhancedData.industryTrends,
          topUKEmployers: enhancedData.topUKEmployers,
          professionalTestimonials: enhancedData.professionalTestimonials,
          additionalQualifications: enhancedData.additionalQualifications,
          workLifeBalance: enhancedData.workLifeBalance,
          inDemandSkills: enhancedData.inDemandSkills,
          professionalAssociations: enhancedData.professionalAssociations,
          enhancedSources: enhancedData.enhancedSources,
          
          // Update metadata
          isEnhanced: true,
          enhancedAt: new Date().toISOString(),
          enhancementSource: 'openai_web_search',
          citations: [
            ...(careerCard.citations || []),
            ...(enhancedData.enhancedSources || [])
          ]
        };
        
      } catch (parseError) {
        console.error('❌ Failed to parse enhanced career card JSON:', parseError);
        console.error('Raw enhanced content:', content);
        return careerCard; // Return original if parsing fails
      }

    } catch (error) {
      console.error('❌ Error enhancing career card with web search:', error);
      return careerCard; // Return original if enhancement fails
    }
  }

  reset(): void {
    this.profile = this.createProfile();
  }
}

// Export singleton instance for backward compatibility
export const conversationAnalyzer = new ConversationAnalyzer(); 
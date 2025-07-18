import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useAuth } from '../../context/AuthContext';

// Helper function to get environment variables from both sources (dev + production)
const getEnvVar = (key: string): string | undefined => {
  // Try import.meta.env first (development)
  const devValue = import.meta.env[key];
  if (devValue) return devValue;
  
  // Fallback to window.ENV (production runtime injection)
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV[key];
  }
  
  return undefined;
};

interface CareerCard {
  id: string;
  title: string;
  description: string;
  salaryRange: string;
  skillsRequired: string[];
  trainingPathway: string;
  nextSteps: string;
  confidence: number;
}

interface PersonProfile {
  interests: string[];
  goals: string[];
  skills: string[];
  values: string[];
  careerStage: string;
  workStyle: string[];
  lastUpdated: string;
}

interface ElevenLabsWidgetProps {
  onCareerCardsGenerated?: (cards: any[]) => void;
  onPersonProfileGenerated?: (profile: PersonProfile) => void;
  className?: string;
}

export const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
  onCareerCardsGenerated,
  onPersonProfileGenerated,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Use ref to access current conversation history in tool closures
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  // Update ref whenever state changes
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Use the helper function to get environment variables
  const agentId = getEnvVar('VITE_ELEVENLABS_AGENT_ID');
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');
  const mcpEndpoint = 'https://off-script-mcp-elevenlabs.onrender.com/mcp';

  // Helper function to update conversation history and persist to Firebase
  const updateConversationHistory = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!content || content.trim().length === 0) {
      console.log('⚠️ Empty content, skipping history update');
      return;
    }

    setConversationHistory(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === role && lastMessage?.content === content.trim()) {
        console.log('⚠️ Skipping duplicate message:', role, content.substring(0, 30) + '...');
        return prev; // Skip duplicate
      }
      
      const updated = [...prev, { role, content: content.trim() }];
      console.log(`✅ Added ${role} message. New history length:`, updated.length);
      
      // TODO: Persist to Firebase for user's conversation history
      if (currentUser?.uid) {
        console.log('📝 TODO: Save conversation to Firebase for user:', currentUser.uid);
        // Future implementation:
        // await saveConversationToFirebase(currentUser.uid, { 
        //   role, 
        //   content: content.trim(), 
        //   timestamp: new Date(),
        //   conversationId: conversation?.getConversationId?.() || 'unknown'
        // });
      }
      
      return updated;
    });
  }, [currentUser?.uid]);

  // Helper function to generate career cards locally when MCP analysis is insufficient
  const generateLocalCareerCards = (conversationText: string, hasCareInterest: boolean) => {
    const lowerText = conversationText.toLowerCase();
    const cards = [];
    
    // AI/Tech roles - strong indicators in conversation
    if (lowerText.includes('ai software development') || lowerText.includes('working with ai') || lowerText.includes('building') && lowerText.includes('ai')) {
      cards.push({
        id: `local-ai-developer-${Date.now()}`,
        title: 'AI Software Developer',
        industry: 'Technology',
        description: 'Develop AI-powered applications and tools, implementing machine learning models into real-world products.',
        matchPercentage: 95,
        salaryRange: { min: 45000, max: 80000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Python/JavaScript', 'Machine Learning', 'Problem Solving', 'Software Development'],
        educationLevel: 'Degree/Self-taught',
        workArrangement: 'Remote/Hybrid',
        careerProgression: 'Junior Developer → Senior Developer → Technical Lead',
        nextSteps: ['Build AI projects portfolio', 'Learn Python/ML frameworks', 'Contribute to open source'],
        salaryProgression: '£45k → £80k → £120k+',
        source: 'local_analysis',
        requirements: ['Programming skills', 'AI/ML knowledge', 'Problem-solving ability']
      });
    }
    
    // Product management roles - mentioned productization and take to market
    if (lowerText.includes('productization') || lowerText.includes('take it to market') || lowerText.includes('ai product manager')) {
      cards.push({
        id: `local-ai-product-manager-${Date.now()}`,
        title: 'AI Product Manager',
        industry: 'Technology',
        description: 'Lead development of AI products from concept to market, bridging technical teams and business needs.',
        matchPercentage: 90,
        salaryRange: { min: 50000, max: 90000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Product Strategy', 'AI Understanding', 'Communication', 'Market Analysis'],
        educationLevel: 'Degree preferred',
        workArrangement: 'Hybrid',
        careerProgression: 'Associate PM → Senior PM → VP Product',
        nextSteps: ['Learn product management', 'Understand AI landscape', 'Build portfolio of projects'],
        salaryProgression: '£50k → £90k → £150k+',
        source: 'local_analysis',
        requirements: ['Strategic thinking', 'Technical understanding', 'Communication skills']
      });
    }
    
    // Solutions architect - mentioned in conversation
    if (lowerText.includes('ai solutions architect') || lowerText.includes('bigger picture') || lowerText.includes('architect')) {
      cards.push({
        id: `local-ai-solutions-architect-${Date.now()}`,
        title: 'AI Solutions Architect',
        industry: 'Technology',
        description: 'Design comprehensive AI solutions for businesses, seeing the bigger picture of how AI fits into organizations.',
        matchPercentage: 88,
        salaryRange: { min: 60000, max: 100000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['System Design', 'AI Technologies', 'Business Analysis', 'Technical Leadership'],
        educationLevel: 'Degree + Experience',
        workArrangement: 'Hybrid/Remote',
        careerProgression: 'Solutions Engineer → Senior Architect → Enterprise Architect',
        nextSteps: ['Gain technical experience', 'Learn enterprise systems', 'Develop consulting skills'],
        salaryProgression: '£60k → £100k → £140k+',
        source: 'local_analysis',
        requirements: ['Technical expertise', 'Systems thinking', 'Client communication']
      });
    }
    
    // Entrepreneurship - mentioned wanting to start own business
    if (lowerText.includes('entrepreneur') || (lowerText.includes('build something') && lowerText.includes('market')) || lowerText.includes('own business')) {
      cards.push({
        id: `local-tech-entrepreneur-${Date.now()}`,
        title: 'Tech Entrepreneur',
        industry: 'Entrepreneurship',
        description: 'Start and scale technology businesses, bringing innovative AI solutions to market.',
        matchPercentage: 85,
        salaryRange: { min: 0, max: 200000, currency: 'GBP' },
        location: 'Flexible',
        keySkills: ['Innovation', 'Business Development', 'Risk Management', 'Leadership'],
        educationLevel: 'Varies',
        workArrangement: 'Self-employed',
        careerProgression: 'Founder → CEO → Serial Entrepreneur',
        nextSteps: ['Validate business ideas', 'Build MVP', 'Network with investors', 'Learn business skills'],
        salaryProgression: 'Variable → £200k+ potential',
        source: 'local_analysis',
        requirements: ['Risk tolerance', 'Business acumen', 'Technical skills']
      });
    }
    
    // Machine Learning Engineer - directly mentioned in conversation
    if (lowerText.includes('machine learning') || lowerText.includes('data scientist') || lowerText.includes('ml engineer')) {
      cards.push({
        id: `local-ml-engineer-${Date.now()}`,
        title: 'Machine Learning Engineer',
        industry: 'Technology',
        description: 'Build and deploy machine learning models, focusing on the technical implementation of AI systems.',
        matchPercentage: 87,
        salaryRange: { min: 50000, max: 85000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Machine Learning', 'Python/R', 'Data Engineering', 'MLOps'],
        educationLevel: 'Degree in STEM',
        workArrangement: 'Remote/Hybrid',
        careerProgression: 'Junior ML Engineer → Senior ML Engineer → ML Architect',
        nextSteps: ['Master ML frameworks', 'Build ML projects', 'Learn cloud platforms'],
        salaryProgression: '£50k → £85k → £120k+',
        source: 'local_analysis',
        requirements: ['Strong math/stats', 'Programming skills', 'ML frameworks knowledge']
      });
    }
    
    // Care/Healthcare roles - for conversations mentioning care
    if (hasCareInterest || lowerText.includes('care home') || lowerText.includes('helping') || lowerText.includes('empathy')) {
      cards.push({
        id: `local-care-worker-${Date.now()}`,
        title: 'Care Support Worker',
        industry: 'Healthcare & Social Care',
        description: 'Support individuals in care homes and community settings, helping with daily activities and providing emotional support.',
        matchPercentage: 95,
        salaryRange: { min: 18000, max: 24000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Empathy', 'Communication', 'Problem Solving', 'Patience'],
        educationLevel: 'Secondary/Apprenticeship',
        workArrangement: 'On-site',
        careerProgression: 'Senior Care Worker → Team Leader → Care Manager',
        nextSteps: ['Apply for care apprenticeships', 'Gain care certificate', 'Develop communication skills'],
        salaryProgression: '£18k → £24k → £30k+',
        source: 'local_analysis',
        requirements: ['DBS check', 'Care training', 'Good communication skills']
      });
    }
    
    // Problem-solving roles for general problem-solving mentions
    if (lowerText.includes('problem solving') || lowerText.includes('problem-solving')) {
      cards.push({
        id: `local-tech-support-${Date.now()}`,
        title: 'IT Support Technician',
        industry: 'Technology',
        description: 'Help solve technical problems for users, troubleshoot systems, and provide technical support.',
        matchPercentage: 75,
        salaryRange: { min: 20000, max: 28000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Problem Solving', 'Technical Skills', 'Communication', 'Patience'],
        educationLevel: 'Apprenticeship/Certification',
        workArrangement: 'Hybrid',
        careerProgression: 'IT Support → Systems Administrator → IT Manager',
        nextSteps: ['Learn basic IT skills', 'Consider IT apprenticeship', 'Gain relevant certifications'],
        salaryProgression: '£20k → £28k → £40k+',
        source: 'local_analysis',
        requirements: ['Basic computer skills', 'Problem-solving ability', 'Good communication']
      });
    }
    
    return cards.slice(0, 6); // Increased limit for more comprehensive recommendations
  };

  // Helper function to extract profile data locally from conversation when MCP analysis is insufficient
  const extractProfileFromConversation = (conversationText: string): PersonProfile => {
    const lowerText = conversationText.toLowerCase();
    
    // Minimal local extraction - only for complete MCP failures
    // Trust OpenAI/MCP for intelligent analysis, only extract basics as emergency fallback
    const interests: string[] = [];
    const skills: string[] = [];
    const goals: string[] = [];
    const values: string[] = [];
    
    // Only extract if explicitly mentioned with high confidence patterns
    if (lowerText.includes('i enjoy') || lowerText.includes('i love')) {
      // Let OpenAI handle this - avoid hardcoded extraction
    }
    
    if (lowerText.includes('good at') || lowerText.includes('skilled at')) {
      // Let OpenAI handle this - avoid hardcoded extraction  
    }
    
    if (lowerText.includes('want to') || lowerText.includes('goal is')) {
      // Let OpenAI handle this - avoid hardcoded extraction
    }
    
    // Return minimal profile - rely on MCP/OpenAI for real analysis
    return {
      interests: [],
      goals: [],
      skills: [],
      values: [],
      careerStage: "exploring",
      workStyle: [],
      lastUpdated: new Date().toLocaleDateString()
    };
  };

  // Enhanced conversation analysis with care sector detection
  const analyzeConversationForCareerInsights = useCallback(async (triggerReason: string) => {
    // Use ref to get current conversation history (fixes closure issue)
    const currentHistory = conversationHistoryRef.current;
    
    // Allow analysis with cached conversation data even when disconnected
    if (!isConnected && currentHistory.length === 0) {
      console.log('🚫 Analysis blocked - No conversation history available');
      return 'Please start a conversation first to generate career insights';
    }
    
    if (!isConnected) {
      console.log('🔄 Analysis proceeding with cached conversation data (ElevenLabs disconnected)');
    }
    
    try {
      console.log('🎯 ANALYSIS TRIGGERED:', { 
        triggerReason, 
        historyLength: currentHistory.length,
        contentLength: currentHistory.map(m => m.content).join(' ').length 
      });

      // Skip sample cards - real conversation analysis is working
      console.log('🔍 Conversation analysis in progress...', {
        historyLength: currentHistory.length,
        contentLength: currentHistory.map(m => m.content).join(' ').length
      });
      
      const conversationText = currentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Enhanced analysis with care sector keywords
      const careKeywords = ['nursing home', 'care home', 'elderly care', 'grandma', 'grandpa', 'helping others', 'care work', 'healthcare', 'caring for'];
      const hasCareInterest = careKeywords.some(keyword => 
        conversationText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log('🔍 Enhanced analysis:', {
        historyLength: currentHistory.length,
        contentLength: conversationText.length,
        hasCareInterest,
        triggerReason
      });
      
      // Create enhanced context for better MCP analysis
      const enhancedContext = {
        conversationHistory: conversationText,
        analysisRequest: {
          extractGoals: "Extract career goals, aspirations, and what the user wants to achieve professionally. Look for phrases about wanting fulfilling work, work-life balance, financial goals, impact goals.",
          extractSkills: "Extract both mentioned skills (like physics, maths, problem-solving) and implied skills from activities and interests. Include academic subjects, hobbies, and demonstrated abilities.",
          extractValues: "Extract what matters to the user in work and life. Look for mentions of helping others, conservation, teamwork, avoiding certain environments (like military), work preferences.",
          extractInterests: "Extract specific interests, subjects, activities, and areas of curiosity mentioned by the user.",
          careerPreferences: "Note preferences about work environment, team vs individual work, specific sectors of interest or avoidance."
        },
        conversationSummary: {
          totalMessages: currentHistory.length,
          userMessages: currentHistory.filter(m => m.role === 'user').length,
          keyTopics: triggerReason,
          careInterestDetected: hasCareInterest
        }
      };
      
      const response = await fetch(`${mcpEndpoint}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...enhancedContext,
          userId: currentUser?.uid || `guest_${Date.now()}`,
          triggerReason: triggerReason,
          careInterestDetected: hasCareInterest
        }),
      });

      if (!response.ok) {
        console.error('❌ MCP request failed:', response.status, response.statusText);
        return 'Career analysis temporarily unavailable';
      }

      const result = await response.json();
      console.log('✅ Enhanced MCP Analysis result:', result);
      
      const analysisData = result.analysis || result;
      let careerCards = analysisData.careerCards || [];
      
      // Generate user profile automatically when analyzing conversation (only if we have meaningful data)
      if (currentHistory.length >= 2 && onPersonProfileGenerated) {
        try {
          const profileData = analysisData.userProfile || {};
          
          // More comprehensive check for real data - check if we have substantial content
          const mcpInterests = analysisData.detectedInterests || [];
          const mcpSkills = analysisData.detectedSkills || [];
          const mcpGoals = analysisData.detectedGoals || [];
          const mcpValues = analysisData.detectedValues || [];
          
          const hasRealData = mcpInterests.length > 0 || mcpSkills.length > 0 || mcpGoals.length > 0;
          
          // Always try local extraction for comparison and enhancement
          const localProfile = extractProfileFromConversation(conversationText);
          const localHasContent = localProfile.interests.length > 0 || localProfile.skills.length > 0 || localProfile.goals.length > 0;
          
          // Filter career titles from MCP interests
          const careerTitleKeywords = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'consultant', 'architect', 'scientist', 'technician', 'director', 'coordinator'];
          const filteredMcpInterests = mcpInterests.filter(interest => 
            !careerTitleKeywords.some(keyword => interest.toLowerCase().includes(keyword))
          );
          
          // Debug logging to understand MCP categorization issues
          if (mcpInterests.length > 0) {
            console.log('🔍 MCP Analysis Debug:', {
              originalInterests: mcpInterests,
              filteredInterests: filteredMcpInterests,
              removedCareerTitles: mcpInterests.filter(interest => 
                careerTitleKeywords.some(keyword => interest.toLowerCase().includes(keyword))
              ),
              skills: mcpSkills,
              goals: mcpGoals
            });
          }
          
          if (hasRealData && (filteredMcpInterests.length + mcpSkills.length + mcpGoals.length + mcpValues.length) >= 2) {
            // MCP has substantial data, use it (with filtered interests)
            const autoProfile: PersonProfile = {
              interests: filteredMcpInterests,
              goals: mcpGoals,
              skills: mcpSkills,
              values: mcpValues,
              careerStage: profileData.careerStage || analysisData.careerStage || "exploring",
              workStyle: profileData.workStyle || analysisData.workStyle || [],
              lastUpdated: new Date().toLocaleDateString()
            };
            
            console.log('👤 Auto-generated user profile from MCP analysis (filtered):', autoProfile);
            onPersonProfileGenerated(autoProfile);
          } else {
            // Only use local fallback if MCP completely fails
            console.log('⚠️ MCP analysis insufficient, checking local fallback need');
            console.log('📊 MCP Data Quality:', {
              hasRealData,
              totalDataPoints: filteredMcpInterests.length + mcpSkills.length + mcpGoals.length + mcpValues.length,
              threshold: 2
            });
            
            // Minimal local fallback - only create profile if conversation is very rich
            if (currentHistory.length >= 10) {
              const minimalProfile: PersonProfile = {
                interests: ['Career exploration'], // Generic fallback
                goals: ['Explore career options'],
                skills: [],
                values: [],
                careerStage: "exploring",
                workStyle: [],
                lastUpdated: new Date().toLocaleDateString()
              };
              console.log('👤 Generated minimal fallback profile:', minimalProfile);
              onPersonProfileGenerated(minimalProfile);
            } else {
              console.log('⚠️ Insufficient conversation depth for profile generation');
            }
          }
        } catch (error) {
          console.error('❌ Error auto-generating profile:', error);
        }
      }
      
      // If care interest detected but no care cards generated, add care sector cards
      if (hasCareInterest && !careerCards.some(card => 
        card.title.toLowerCase().includes('care') || 
        card.title.toLowerCase().includes('health') ||
        card.industry?.toLowerCase().includes('care') ||
        card.industry?.toLowerCase().includes('health')
      )) {
        console.log('🏥 Adding care sector career cards based on detected interest');
        
        const careSectorCards = [
          {
            id: "care-assistant",
            title: "Care Assistant",
            description: "Provide essential support and care to elderly residents in care homes and nursing facilities",
            industry: "Healthcare & Care",
            averageSalary: {
              entry: "£18,000",
              experienced: "£22,000",
              senior: "£26,000"
            },
            growthOutlook: "High demand - aging population driving 15% growth",
            entryRequirements: ["Compassion and empathy", "Good communication skills", "Physical fitness"],
            trainingPathways: ["Care Certificate Level 2", "Health & Social Care diploma", "On-the-job training"],
            keySkills: ["Patient Care", "Communication", "Empathy", "First Aid", "Record Keeping"],
            workEnvironment: "Care homes, nursing homes, community care",
            nextSteps: ["Complete Care Certificate", "Apply for care assistant roles", "Gain first aid certification"],
            location: "UK",
            confidence: 0.89,
            sourceData: "care sector interest detected"
          },
          {
            id: "activities-coordinator",
            title: "Activities Coordinator",
            description: "Plan and organize engaging activities and entertainment for care home residents",
            industry: "Healthcare & Care",
            averageSalary: {
              entry: "£19,000",
              experienced: "£24,000",
              senior: "£28,000"
            },
            growthOutlook: "Growing field focused on quality of life improvements",
            entryRequirements: ["Creativity and organization", "People skills", "Activity planning experience"],
            trainingPathways: ["Activities coordination courses", "Recreation therapy qualification", "Volunteer experience"],
            keySkills: ["Activity Planning", "Creative Arts", "Social Skills", "Event Management", "Wellbeing"],
            workEnvironment: "Care homes, day centers, community programs",
            nextSteps: ["Volunteer at local care homes", "Learn about dementia care", "Develop activity planning skills"],
            location: "UK",
            confidence: 0.87,
            sourceData: "care sector interest detected"
          }
        ];
        
        careerCards = [...careerCards, ...careSectorCards];
      }
      
      // Enhanced career card generation
      if (careerCards.length > 0) {
        console.log('🎯 Generated career recommendations:', {
          total: careerCards.length,
          unique: careerCards.length,
          duplicatesRemoved: 0
        });
        onCareerCardsGenerated(careerCards);
      } else {
        console.log('⚠️ MCP did not generate career cards, creating local recommendations...');
        const localCards = generateLocalCareerCards(conversationText, hasCareInterest);
        if (localCards.length > 0) {
          console.log('🎯 Generated local career recommendations:', {
            total: localCards.length,
            source: 'local_analysis'
          });
          onCareerCardsGenerated(localCards);
        }
      }
      
      // If MCP generated few cards but conversation is rich, supplement with local cards
      if (careerCards.length > 0 && careerCards.length < 3 && currentHistory.length >= 8) {
        console.log('🔍 Supplementing MCP cards with local analysis for richer recommendations...');
        const supplementalCards = generateLocalCareerCards(conversationText, hasCareInterest);
        const combinedCards = [...careerCards, ...supplementalCards];
        
        // Remove duplicates by title
        const uniqueCards = combinedCards.filter((card, index, arr) => 
          arr.findIndex(c => c.title.toLowerCase() === card.title.toLowerCase()) === index
        );
        
        if (uniqueCards.length > careerCards.length) {
          console.log('🎯 Enhanced career recommendations with local supplement:', {
            original: careerCards.length,
            supplemented: uniqueCards.length,
            added: uniqueCards.length - careerCards.length
          });
          onCareerCardsGenerated(uniqueCards);
        }
      }
      
      // For AI/tech conversations, supplement even with 3+ cards if conversation is very rich
      const isAiTechConversation = conversationText.toLowerCase().includes('ai') || 
                                  conversationText.toLowerCase().includes('software development') ||
                                  conversationText.toLowerCase().includes('machine learning') ||
                                  conversationText.toLowerCase().includes('entrepreneur');
      
      if (careerCards.length >= 3 && careerCards.length < 6 && currentHistory.length >= 12 && isAiTechConversation) {
        console.log('🔍 Rich AI/tech conversation detected, supplementing with specialized local cards...');
        const supplementalCards = generateLocalCareerCards(conversationText, hasCareInterest);
        const combinedCards = [...careerCards, ...supplementalCards];
        
        // Remove duplicates by title (case-insensitive)
        const uniqueCards = combinedCards.filter((card, index, arr) => 
          arr.findIndex(c => c.title.toLowerCase() === card.title.toLowerCase()) === index
        );
        
        if (uniqueCards.length > careerCards.length) {
          console.log('🎯 Enhanced AI/tech career recommendations:', {
            original: careerCards.length,
            supplemented: uniqueCards.length,
            added: uniqueCards.length - careerCards.length
          });
          onCareerCardsGenerated(uniqueCards);
        }
      }
      
      // Return specific career titles so the agent can reference them accurately
      const cardTitles = careerCards.map(card => card.title).join(', ');
      return `I've generated ${careerCards.length} career recommendations: ${cardTitles}. You can reference these specific careers in our conversation.`;
      
    } catch (error) {
      console.error('❌ Error in enhanced career analysis:', error);
      return 'Career analysis temporarily unavailable';
    }
  }, [isConnected, currentUser?.uid, onCareerCardsGenerated]); // Removed conversationHistory dependency since using ref

  // Validate configuration on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 ElevenLabs config check:', {
        hasAgentId: !!agentId,
        hasApiKey: !!apiKey,
        user: currentUser ? 'logged in' : 'guest'
      });
    }
  }, [agentId, apiKey, currentUser]);

  // Initialize conversation with forward-declared client tools
  const conversation = useConversation({
    clientTools: (() => {
      // Forward declaration - actual tools defined below
      const tools = {
        analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
          console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - AGENT IS CALLING TOOLS!');
          console.log('🔍 Tool parameters:', parameters);
          
          const result = await analyzeConversationForCareerInsights(parameters.trigger_reason || 'agent_request');
          
          // Auto-trigger profile update after career analysis if we have enough conversation
          const currentHistory = conversationHistoryRef.current;
          if (currentHistory.length >= 4 && onPersonProfileGenerated) {
            console.log('👤 Auto-triggering profile update after career analysis');
            setTimeout(async () => {
              try {
                const conversationText = currentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
                const response = await fetch(`${mcpEndpoint}/analyze`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    conversationHistory: conversationText,
                    userId: currentUser?.uid || `guest_${Date.now()}`,
                    triggerReason: 'auto_profile_update',
                    generatePersona: true
                  })
                });
                
                if (response.ok) {
                  const profileResult = await response.json();
                  const analysisData = profileResult.analysis || profileResult;
                  
                  if (analysisData.detectedInterests?.length > 0 || analysisData.detectedSkills?.length > 0) {
                    const profileUpdate: PersonProfile = {
                      interests: analysisData.detectedInterests || [],
                      goals: analysisData.detectedGoals || [],
                      skills: analysisData.detectedSkills || [],
                      values: analysisData.detectedValues || [],
                      careerStage: analysisData.careerStage || "exploring",
                      workStyle: analysisData.workStyle || [],
                      lastUpdated: new Date().toLocaleDateString()
                    };
                    
                    console.log('👤 Auto-generated profile update:', profileUpdate);
                    onPersonProfileGenerated(profileUpdate);
                  }
                }
              } catch (error) {
                console.error('❌ Error in auto profile update:', error);
              }
            }, 1000); // Small delay to avoid overwhelming
          }
          
          return result;
        },

        update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
          console.log('🚨 TOOL CALLED: update_person_profile - AGENT IS CALLING TOOLS!');
          console.log('👤 Updating person profile based on conversation...');
          console.log('👤 Profile parameters:', parameters);
          
          if (onPersonProfileGenerated) {
            try {
              // Use conversation history and parameters to generate detailed profile
              const conversationText = conversationHistoryRef.current.map(msg => `${msg.role}: ${msg.content}`).join('\n');
              
              if (conversationText.length > 20) { // If we have real conversation content
                const response = await fetch(`${mcpEndpoint}/analyze`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    conversationHistory: conversationText,
                    userId: currentUser?.uid || `guest_${Date.now()}`,
                    triggerReason: 'persona_update',
                    generatePersona: true,
                    profileParams: parameters
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  
                  // Helper function to normalize data to arrays
                  const normalizeToArray = (data: any): string[] => {
                    if (Array.isArray(data)) return data;
                    if (typeof data === 'string') {
                      // Split by comma, semicolon, or newline and clean up
                      return data.split(/[,;\n]/).map(item => item.trim()).filter(item => item.length > 0);
                    }
                    return [];
                  };
                  
                  // Generate enhanced profile from analysis with proper data types
                  const updatedProfile: PersonProfile = {
                    interests: normalizeToArray(parameters.interests || result.detectedInterests) || ["Technology", "Problem Solving", "Innovation"],
                    goals: normalizeToArray(parameters.goals || result.detectedGoals) || ["Career development", "Skill building"],
                    skills: normalizeToArray(parameters.skills || result.detectedSkills) || ["Communication", "Analytical thinking"],
                    values: normalizeToArray(result.detectedValues) || ["Making a difference", "Innovation", "Growth"],
                    careerStage: result.careerStage || "exploring",
                    workStyle: normalizeToArray(result.workStyle) || ["Collaborative", "Flexible"],
                    lastUpdated: new Date().toLocaleDateString()
                  };
                  
                  console.log('🎯 Generated enhanced persona profile:', updatedProfile);
                  onPersonProfileGenerated(updatedProfile);
                  return `I've analyzed our conversation and updated your profile with insights about your interests in ${updatedProfile.interests.join(', ')}!`;
                }
              }
            } catch (error) {
              console.error('❌ Error generating persona from conversation:', error);
            }
            
            // Fallback to basic profile
            const updatedProfile: PersonProfile = {
              interests: Array.isArray(parameters.interests) ? parameters.interests : ["Technology", "Problem Solving", "Innovation"],
              goals: Array.isArray(parameters.goals) ? parameters.goals : ["Career development", "Skill building"],
              skills: Array.isArray(parameters.skills) ? parameters.skills : ["Communication", "Analytical thinking"],
              values: ["Making a difference", "Innovation", "Growth"],
              careerStage: "exploring",
              workStyle: ["Collaborative", "Flexible"],
              lastUpdated: new Date().toLocaleDateString()
            };
            
            onPersonProfileGenerated(updatedProfile);
            return "I've updated your profile based on our conversation!";
          }
          
          return "Profile updated successfully!";
        }
      };
      

        console.log('🔧 Client tools configured:', Object.keys(tools));
        return tools;
    })(),
    onConnect: () => {
      console.log('🟢 ElevenLabs connected');
      setConnectionStatus('connected');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('🔴 ElevenLabs disconnected');
      setConnectionStatus('disconnected');
      setIsConnected(false);
      
      // Note: We deliberately preserve conversation history, career cards, and profile data
      // when disconnecting to maintain user's progress and insights
      console.log('💾 Preserving conversation data and generated insights after disconnect');
      
      // Optional: Auto-reconnect after brief delay (uncomment if desired)
      // setTimeout(() => {
      //   console.log('🔄 Attempting auto-reconnect...');
      //   startConversation();
      // }, 3000);
    },
    onMessage: (message: any) => {
      console.log('📦 Raw message received:', message);
      
      // Handle agent_response events with proper structure
      if (message && typeof message === 'object' && message.type === 'agent_response') {
        if (message.agent_response_event && message.agent_response_event.agent_response) {
          const { agent_response } = message.agent_response_event;
          console.log('🎯 Agent response from structured event:', agent_response);
          updateConversationHistory('assistant', agent_response);
          return;
        }
      }
      
      // Fallback to existing parsing for compatibility
      let content: string | null = null;
      let role: 'user' | 'assistant' = 'assistant';
      
      if (typeof message === 'string') {
        content = message;
      } else if (message && typeof message === 'object') {
        if (message.text) {
          content = message.text;
        } else if (message.content) {
          content = message.content;
        } else if (message.message) {
          content = message.message;
        }
        
        if (message.role) {
          role = message.role;
        } else if (message.source) {
          role = message.source === 'user' ? 'user' : 'assistant';
        }
      }
      
      if (content && typeof content === 'string' && content.trim().length > 0) {
        console.log('🎯 Fallback agent response parsing:', content.substring(0, 50) + '...');
        updateConversationHistory(role, content);
      } else {
        console.log('⚠️ Could not parse message content:', message);
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
      console.error('❌ Error context:', {
        timestamp: new Date().toISOString(),
        connectionStatus: connectionStatus,
        conversationHistory: conversationHistory.length,
        userAgent: navigator.userAgent
      });
    },
    onUserTranscriptReceived: (transcript: string | any) => {
      console.log('📝 Raw transcript received:', transcript);
      
      let userTranscript: string | null = null;
      
      // Handle structured user_transcript events
      if (transcript && typeof transcript === 'object' && transcript.type === 'user_transcript') {
        if (transcript.user_transcription_event && transcript.user_transcription_event.user_transcript) {
          userTranscript = transcript.user_transcription_event.user_transcript;
          console.log('🎯 User transcript from structured event:', userTranscript);
        }
      } 
      // Handle direct string transcripts (fallback)
      else if (typeof transcript === 'string') {
        userTranscript = transcript;
        console.log('🎯 User transcript from string:', userTranscript);
      }
      
      if (userTranscript && userTranscript.trim().length > 0) {
        updateConversationHistory('user', userTranscript);
      } else {
        console.log('⚠️ Could not extract transcript content:', transcript);
      }
    },
    onStatusChange: (status: string) => {
      console.log('🔄 Status:', status);
    },
    onModeChange: (mode: string) => {
      console.log('🎯 Mode:', mode);
    }
  });

  // Monitor conversation state for UI updates
  useEffect(() => {
    // Only log important state changes in development
    if (process.env.NODE_ENV === 'development' && conversation?.status) {
      console.log('📊 Conversation status:', conversation.status);
    }
  }, [conversation?.status]);

  // Remove the polling mechanism - we're now using real-time WebSocket events!
  // The onUserTranscriptReceived and onMessage handlers above handle the real-time data

  // Backup analysis removed - ElevenLabs agent tools now handle career analysis automatically
  useEffect(() => {
    console.log('🔄 Conversation history updated:', {
      length: conversationHistory.length,
      messages: conversationHistory.map(m => `${m.role}: ${m.content.substring(0, 30)}...`)
    });
  }, [conversationHistory.length, conversationHistory]);

  // Client tools that call our MCP server
  // Note: These are now handled by the conversation clientTools above to prevent duplicates
  
  const startConversation = useCallback(async () => {
    console.log('🚀 Starting ElevenLabs conversation...');

    if (!agentId || !apiKey) {
      console.error('❌ Missing ElevenLabs configuration:', { agentId: !!agentId, apiKey: !!apiKey });
      return;
    }

    if (!conversation || !conversation.startSession) {
      console.error('❌ Conversation object not available or missing startSession method');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      const result = await conversation.startSession({
        agentId
      });
      
      console.log('✅ Conversation started successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setConnectionStatus('disconnected');
    }
  }, [conversation, agentId, apiKey]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }, [conversation]);

  // Configuration check
  const isConfigured = agentId && apiKey && 
    agentId !== 'your_elevenlabs_agent_id_here' && 
    apiKey !== 'your_elevenlabs_api_key_here';

  if (!isConfigured) {
    return (
      <div className={`p-6 border-2 border-dashed border-gray-300 rounded-lg text-center ${className}`}>
        <div className="text-gray-500">
          <p className="text-lg font-medium">ElevenLabs Configuration Required</p>
          <p className="text-sm mt-2">Please configure VITE_ELEVENLABS_AGENT_ID and VITE_ELEVENLABS_API_KEY</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 p-6 ${className}`}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">AI Career Guide</h3>
        <p className="text-gray-600 text-sm">
          Voice-first career guidance with real-time insights
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {connectionStatus === 'disconnected' && (
          <button
            onClick={startConversation}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🎙️ Start Conversation
          </button>
        )}

        {connectionStatus === 'connecting' && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span>Connecting...</span>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Connected - Speak naturally!</span>
            </div>
            
            <button
              onClick={endConversation}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              End Conversation
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 max-w-md text-center">
        <p>✨ Career cards will appear automatically as you discuss your interests</p>
        <p>🔍 Analysis happens every few messages to generate personalized recommendations</p>
      </div>
    </div>
  );
}; 
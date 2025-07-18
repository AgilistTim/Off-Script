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
    
    // Care/Healthcare roles - strong indicators in conversation
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
    
    // Problem-solving roles
    if (lowerText.includes('problem solving') || lowerText.includes('problem-solving')) {
      cards.push({
        id: `local-tech-support-${Date.now()}`,
        title: 'IT Support Technician',
        industry: 'Technology',
        description: 'Help solve technical problems for users, troubleshoot systems, and provide technical support.',
        matchPercentage: 85,
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
    
    // Communication/interpersonal roles
    if (lowerText.includes('communication') || lowerText.includes('empathy') || lowerText.includes('helping')) {
      cards.push({
        id: `local-customer-service-${Date.now()}`,
        title: 'Customer Service Representative',
        industry: 'Business Services',
        description: 'Help customers resolve issues, provide information, and ensure positive customer experiences.',
        matchPercentage: 80,
        salaryRange: { min: 18000, max: 25000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Communication', 'Problem Solving', 'Empathy', 'Patience'],
        educationLevel: 'Secondary/On-the-job training',
        workArrangement: 'Office/Remote',
        careerProgression: 'Customer Service → Team Leader → Customer Success Manager',
        nextSteps: ['Develop communication skills', 'Look for entry-level positions', 'Consider customer service training'],
        salaryProgression: '£18k → £25k → £35k+',
        source: 'local_analysis',
        requirements: ['Strong communication skills', 'Patience', 'Problem-solving ability']
      });
    }
    
    // Apprenticeship opportunities if mentioned
    if (lowerText.includes('apprentice') || lowerText.includes('hands-on') || lowerText.includes('practical') || lowerText.includes("don't want") && lowerText.includes('university')) {
      cards.push({
        id: `local-healthcare-apprentice-${Date.now()}`,
        title: 'Healthcare Support Apprentice',
        industry: 'Healthcare & Social Care',
        description: 'Learn while working in healthcare settings, gaining practical experience and qualifications.',
        matchPercentage: 90,
        salaryRange: { min: 15000, max: 20000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Willingness to Learn', 'Communication', 'Empathy', 'Reliability'],
        educationLevel: 'Apprenticeship Program',
        workArrangement: 'On-site with training',
        careerProgression: 'Apprentice → Qualified Healthcare Assistant → Senior Roles',
        nextSteps: ['Research apprenticeship programs', 'Apply to local healthcare providers', 'Prepare for interviews'],
        salaryProgression: '£15k → £20k → £25k+',
        source: 'local_analysis',
        requirements: ['Interest in healthcare', 'Good communication', 'Commitment to learning']
      });
    }
    
    // Community/social work roles
    if (lowerText.includes('helping others') || lowerText.includes('helping people') || (lowerText.includes('helping') && lowerText.includes('communication'))) {
      cards.push({
        id: `local-community-support-${Date.now()}`,
        title: 'Community Support Worker',
        industry: 'Community Services',
        description: 'Support individuals and families in the community, helping them access services and develop independence.',
        matchPercentage: 85,
        salaryRange: { min: 19000, max: 26000, currency: 'GBP' },
        location: 'UK Wide',
        keySkills: ['Communication', 'Empathy', 'Problem Solving', 'Advocacy'],
        educationLevel: 'Secondary/Relevant training',
        workArrangement: 'Community-based',
        careerProgression: 'Support Worker → Senior Support Worker → Team Coordinator',
        nextSteps: ['Gain relevant qualifications', 'Volunteer in community settings', 'Develop interpersonal skills'],
        salaryProgression: '£19k → £26k → £32k+',
        source: 'local_analysis',
        requirements: ['Strong interpersonal skills', 'Empathy', 'Reliable transport']
      });
    }
    
    return cards.slice(0, 5); // Limit to top 5 most relevant cards
  };

  // Helper function to extract profile data locally from conversation when MCP analysis is insufficient
  const extractProfileFromConversation = (conversationText: string): PersonProfile => {
    const lowerText = conversationText.toLowerCase();
    
    // Extract interests from conversation
    const interests: string[] = [];
    if (lowerText.includes('physics')) interests.push('Physics');
    if (lowerText.includes('maths') || lowerText.includes('math')) interests.push('Mathematics');
    if (lowerText.includes('ai') || lowerText.includes('artificial intelligence')) interests.push('Artificial Intelligence');
    if (lowerText.includes('problem solving') || lowerText.includes('problem-solving')) interests.push('Problem Solving');
    if (lowerText.includes('environmental') || lowerText.includes('conservation')) interests.push('Environmental Conservation');
    if (lowerText.includes('care home') || lowerText.includes('caring for') || lowerText.includes('helping others')) interests.push('Healthcare & Care');
    
    // Extract skills from conversation
    const skills: string[] = [];
    if (lowerText.includes('physics')) skills.push('Physics knowledge');
    if (lowerText.includes('maths') || lowerText.includes('math')) skills.push('Mathematical analysis');
    if (lowerText.includes('problem solving') || lowerText.includes('problem-solving')) skills.push('Problem solving');
    if (lowerText.includes('team') && lowerText.includes('like working')) skills.push('Teamwork');
    if (lowerText.includes('ai') || lowerText.includes('looking at ai')) skills.push('AI literacy');
    if (lowerText.includes('care') || lowerText.includes('looking after')) skills.push('Caregiving');
    
    // Better skill extraction for explicit mentions
    if (lowerText.includes('good at problem solving') || lowerText.includes('quite good at problem solving')) skills.push('Problem solving');
    if (lowerText.includes('good at communication') || lowerText.includes('really good at communication')) skills.push('Communication');
    if (lowerText.includes('empathy') || lowerText.includes('empathetic')) skills.push('Empathy');
    if (lowerText.includes('helping') && (lowerText.includes('grandma') || lowerText.includes('others'))) skills.push('Interpersonal support');
    if (lowerText.includes('patience') || lowerText.includes('patient')) skills.push('Patience');
    
    // Extract goals from conversation
    const goals: string[] = [];
    if (lowerText.includes('fulfilling') || lowerText.includes('meaningful')) goals.push('Find meaningful work');
    if (lowerText.includes('money') && lowerText.includes('important')) goals.push('Financial stability');
    if (lowerText.includes("don't know what") || lowerText.includes('unsure about career')) goals.push('Explore career options');
    if (lowerText.includes('balance') || (lowerText.includes('money') && lowerText.includes('fulfilling'))) goals.push('Work-life balance');
    if (lowerText.includes('help people') || lowerText.includes('make a difference')) goals.push('Help others');
    
    // Better goal extraction
    if (lowerText.includes('fulfilling career without') && lowerText.includes('degree')) goals.push('Find fulfilling career without degree');
    if (lowerText.includes('apprentice') && lowerText.includes('up for that')) goals.push('Pursue apprenticeship opportunities');
    if (lowerText.includes("don't") && lowerText.includes('university') && lowerText.includes('moment')) goals.push('Avoid university for now');
    if (lowerText.includes('career') && lowerText.includes('options')) goals.push('Explore different career paths');
    
    // Extract values from conversation
    const values: string[] = [];
    if (lowerText.includes('problem solving') && lowerText.includes('important value')) values.push('Problem solving');
    if (lowerText.includes('conservation') && lowerText.includes('important')) values.push('Conservation');
    if (lowerText.includes('team') && lowerText.includes('like')) values.push('Collaboration');
    if (lowerText.includes('helping') || lowerText.includes('care')) values.push('Helping others');
    if (lowerText.includes("don't want") && lowerText.includes('military')) values.push('Non-military environment');
    if (lowerText.includes('fulfilling') || lowerText.includes('meaningful')) values.push('Meaningful work');
    
    // Extract work style
    const workStyle: string[] = [];
    if (lowerText.includes('team') && lowerText.includes('like working')) workStyle.push('Collaborative');
    if (lowerText.includes('problem solving')) workStyle.push('Analytical');
    
    return {
      interests: [...new Set(interests)], // Remove duplicates
      goals: [...new Set(goals)],
      skills: [...new Set(skills)],
      values: [...new Set(values)],
      careerStage: "exploring",
      workStyle: [...new Set(workStyle)],
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
          
          if (hasRealData && (mcpInterests.length + mcpSkills.length + mcpGoals.length + mcpValues.length) >= 3) {
            // MCP has substantial data, use it
            const autoProfile: PersonProfile = {
              interests: mcpInterests,
              goals: mcpGoals,
              skills: mcpSkills,
              values: mcpValues,
              careerStage: profileData.careerStage || analysisData.careerStage || "exploring",
              workStyle: profileData.workStyle || analysisData.workStyle || [],
              lastUpdated: new Date().toLocaleDateString()
            };
            
            console.log('👤 Auto-generated user profile from MCP analysis:', autoProfile);
            onPersonProfileGenerated(autoProfile);
          } else if (localHasContent) {
            // MCP analysis is insufficient, use enhanced local extraction
            console.log('⚠️ MCP analysis insufficient, using enhanced local extraction');
            console.log('👤 Generated enhanced local profile:', localProfile);
            onPersonProfileGenerated(localProfile);
          } else {
            console.log('⚠️ Both MCP and local analysis insufficient for profile generation');
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
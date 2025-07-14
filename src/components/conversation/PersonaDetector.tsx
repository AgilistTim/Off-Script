import React, { useEffect, useState } from 'react';

export interface UserPersona {
  type: 'overwhelmed_explorer' | 'skeptical_pragmatist' | 'curious_achiever' | 'unknown';
  confidence: number;
  traits: string[];
  adaptations: ConversationAdaptations;
}

export interface ConversationAdaptations {
  maxResponseLength: number;
  responseStyle: 'structured' | 'direct' | 'encouraging';
  valueDeliveryTimeout: number;
  preferredActions: string[];
  conversationPace: 'fast' | 'moderate' | 'patient';
}

export interface PersonaDetectorProps {
  userMessages: Array<{
    content: string;
    timestamp: number;
    timeToRespond?: number;
    wordCount?: number;
  }>;
  engagementMetrics: {
    timeOnPage: number;
    clicksPerMinute: number;
    scrollBehavior: 'fast' | 'moderate' | 'slow';
    abandonmentRisk: number;
  };
  onPersonaDetected: (persona: UserPersona) => void;
}

const PERSONA_INDICATORS = {
  overwhelmed_explorer: {
    keywords: ['confused', 'overwhelmed', 'too many', 'don\'t know', 'anxious', 'stressed', 'help me decide'],
    responsePatterns: {
      timeToRespond: [3000, 8000], // 3-8 seconds
      messageLength: [10, 50], // shorter messages
      uncertaintyWords: ['maybe', 'i think', 'not sure', 'confused']
    },
    engagementBehavior: {
      scrollBehavior: 'moderate',
      clicksPerMinute: [2, 5],
      attentionSpan: [8000, 12000] // 8-12 seconds
    }
  },
  skeptical_pragmatist: {
    keywords: ['prove it', 'generic', 'scam', 'real', 'actually works', 'tired of', 'been there'],
    responsePatterns: {
      timeToRespond: [1000, 4000], // quick, direct responses
      messageLength: [5, 30], // very concise
      challengingWords: ['but', 'however', 'really?', 'doubt', 'show me']
    },
    engagementBehavior: {
      scrollBehavior: 'fast',
      clicksPerMinute: [1, 3],
      attentionSpan: [5000, 8000] // 5-8 seconds
    }
  },
  curious_achiever: {
    keywords: ['want to learn', 'excited', 'opportunity', 'grow', 'mentor', 'possible', 'future'],
    responsePatterns: {
      timeToRespond: [2000, 6000], // thoughtful responses
      messageLength: [20, 100], // longer, detailed messages
      growthWords: ['learn', 'develop', 'improve', 'achieve', 'opportunity']
    },
    engagementBehavior: {
      scrollBehavior: 'slow',
      clicksPerMinute: [3, 8],
      attentionSpan: [10000, 15000] // 10-15 seconds
    }
  }
};

const PERSONA_ADAPTATIONS: Record<string, ConversationAdaptations> = {
  overwhelmed_explorer: {
    maxResponseLength: 40,
    responseStyle: 'structured',
    valueDeliveryTimeout: 8000,
    preferredActions: ['Simplify choices', 'Provide structure', 'Reduce anxiety'],
    conversationPace: 'moderate'
  },
  skeptical_pragmatist: {
    maxResponseLength: 30,
    responseStyle: 'direct',
    valueDeliveryTimeout: 5000,
    preferredActions: ['Show proof', 'Be transparent', 'Provide concrete examples'],
    conversationPace: 'fast'
  },
  curious_achiever: {
    maxResponseLength: 60,
    responseStyle: 'encouraging',
    valueDeliveryTimeout: 10000,
    preferredActions: ['Encourage exploration', 'Share opportunities', 'Provide mentorship'],
    conversationPace: 'patient'
  },
  unknown: {
    maxResponseLength: 45,
    responseStyle: 'structured',
    valueDeliveryTimeout: 8000,
    preferredActions: ['Assess needs', 'Provide options'],
    conversationPace: 'moderate'
  }
};

export const PersonaDetector: React.FC<PersonaDetectorProps> = ({
  userMessages,
  engagementMetrics,
  onPersonaDetected
}) => {
  const [currentPersona, setCurrentPersona] = useState<UserPersona>({
    type: 'unknown',
    confidence: 0,
    traits: [],
    adaptations: PERSONA_ADAPTATIONS.unknown
  });

  const analyzePersona = () => {
    if (userMessages.length === 0) return;

    const scores = {
      overwhelmed_explorer: 0,
      skeptical_pragmatist: 0,
      curious_achiever: 0
    };

    // Analyze message content
    userMessages.forEach(message => {
      const content = message.content.toLowerCase();
      
      Object.entries(PERSONA_INDICATORS).forEach(([persona, indicators]) => {
        // Keyword matching
        indicators.keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            scores[persona as keyof typeof scores] += 2;
          }
        });

        // Response pattern analysis
        const responseTime = message.timeToRespond || 0;
        const wordCount = message.wordCount || message.content.split(' ').length;

        // Time to respond scoring
        const [minTime, maxTime] = indicators.responsePatterns.timeToRespond;
        if (responseTime >= minTime && responseTime <= maxTime) {
          scores[persona as keyof typeof scores] += 1;
        }

        // Message length scoring
        const [minLength, maxLength] = indicators.responsePatterns.messageLength;
        if (wordCount >= minLength && wordCount <= maxLength) {
          scores[persona as keyof typeof scores] += 1;
        }

        // Pattern words scoring
        if (persona === 'overwhelmed_explorer' && 'uncertaintyWords' in indicators.responsePatterns) {
          indicators.responsePatterns.uncertaintyWords.forEach(word => {
            if (content.includes(word)) scores.overwhelmed_explorer += 1;
          });
        } else if (persona === 'skeptical_pragmatist' && 'challengingWords' in indicators.responsePatterns) {
          indicators.responsePatterns.challengingWords.forEach(word => {
            if (content.includes(word)) scores.skeptical_pragmatist += 1;
          });
        } else if (persona === 'curious_achiever' && 'growthWords' in indicators.responsePatterns) {
          indicators.responsePatterns.growthWords.forEach(word => {
            if (content.includes(word)) scores.curious_achiever += 1;
          });
        }
      });
    });

    // Analyze engagement behavior
    Object.entries(PERSONA_INDICATORS).forEach(([persona, indicators]) => {
      // Attention span matching
      const [minAttention, maxAttention] = indicators.engagementBehavior.attentionSpan;
      if (engagementMetrics.timeOnPage >= minAttention && engagementMetrics.timeOnPage <= maxAttention) {
        scores[persona as keyof typeof scores] += 1;
      }

      // Click behavior matching
      const [minClicks, maxClicks] = indicators.engagementBehavior.clicksPerMinute;
      if (engagementMetrics.clicksPerMinute >= minClicks && engagementMetrics.clicksPerMinute <= maxClicks) {
        scores[persona as keyof typeof scores] += 1;
      }

      // Scroll behavior matching
      if (engagementMetrics.scrollBehavior === indicators.engagementBehavior.scrollBehavior) {
        scores[persona as keyof typeof scores] += 1;
      }
    });

    // Determine dominant persona
    const maxScore = Math.max(...Object.values(scores));
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    if (maxScore === 0) return; // No clear indicators yet

    const dominantPersona = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as keyof typeof scores;
    const confidence = totalScore > 0 ? (maxScore / totalScore) * 100 : 0;

    if (confidence >= 60 && dominantPersona !== currentPersona.type) {
      const newPersona: UserPersona = {
        type: dominantPersona,
        confidence,
        traits: extractTraits(dominantPersona, userMessages),
        adaptations: PERSONA_ADAPTATIONS[dominantPersona]
      };

      setCurrentPersona(newPersona);
      onPersonaDetected(newPersona);
    }
  };

  const extractTraits = (persona: string, messages: Array<{ content: string }>) => {
    const traits: string[] = [];
    const allContent = messages.map(m => m.content.toLowerCase()).join(' ');

    switch (persona) {
      case 'overwhelmed_explorer':
        if (allContent.includes('anxious') || allContent.includes('stressed')) traits.push('High anxiety');
        if (allContent.includes('too many') || allContent.includes('options')) traits.push('Choice paralysis');
        if (allContent.includes('don\'t know')) traits.push('Uncertain');
        break;
      case 'skeptical_pragmatist':
        if (allContent.includes('scam') || allContent.includes('generic')) traits.push('Highly skeptical');
        if (allContent.includes('real') || allContent.includes('actually')) traits.push('Seeks authenticity');
        if (allContent.includes('tired') || allContent.includes('been there')) traits.push('Experienced disappointment');
        break;
      case 'curious_achiever':
        if (allContent.includes('learn') || allContent.includes('grow')) traits.push('Growth-oriented');
        if (allContent.includes('excited') || allContent.includes('opportunity')) traits.push('Optimistic');
        if (allContent.includes('mentor') || allContent.includes('guidance')) traits.push('Seeks mentorship');
        break;
    }

    return traits;
  };

  useEffect(() => {
    analyzePersona();
  }, [userMessages, engagementMetrics]);

  return null; // This is a logic-only component
};

export default PersonaDetector; 
import React from 'react';
import { UserPersona } from './PersonaDetector';

export interface AIResponseTemplate {
  greeting: string;
  valueDelivery: string;
  followUp: string;
  actionPrompts: string[];
  tone: 'professional' | 'casual' | 'encouraging' | 'direct';
}

export interface AdaptiveAIResponseProps {
  userMessage: string;
  persona: UserPersona;
  conversationPhase: 'greeting' | 'exploring' | 'deepening' | 'converting';
  previousInsights: string[];
  onResponseGenerated: (response: string, confidence: number) => void;
}

// Persona-specific response templates based on research
const PERSONA_TEMPLATES: Record<string, Record<string, AIResponseTemplate>> = {
  overwhelmed_explorer: {
    greeting: {
      greeting: "Hey! I totally get that career stuff can feel overwhelming. Let's break it down together.",
      valueDelivery: "Here's something that might help right now:",
      followUp: "What feels most confusing to you about your career path?",
      actionPrompts: ["Simplify my options", "Find my strengths", "Reduce anxiety"],
      tone: 'encouraging'
    },
    exploring: {
      greeting: "I hear you - that's a common feeling.",
      valueDelivery: "Based on what you shared, here's a structured approach:",
      followUp: "Which of these resonates with you most?",
      actionPrompts: ["Step-by-step plan", "Focus on one area", "Talk to someone"],
      tone: 'professional'
    },
    deepening: {
      greeting: "Great progress! Let's dive deeper into this.",
      valueDelivery: "Here's what this could look like for you:",
      followUp: "How does this feel as a next step?",
      actionPrompts: ["Create action plan", "Find resources", "Set timeline"],
      tone: 'encouraging'
    },
    converting: {
      greeting: "You've made real progress in this conversation!",
      valueDelivery: "I can help you create a personalized career roadmap:",
      followUp: "Ready to take the next step?",
      actionPrompts: ["Get my roadmap", "Save progress", "Connect with mentor"],
      tone: 'professional'
    }
  },
  skeptical_pragmatist: {
    greeting: {
      greeting: "Look, I get it - you've probably heard promises before.",
      valueDelivery: "Here's something concrete you can use today:",
      followUp: "Want to see if this actually works for your situation?",
      actionPrompts: ["Show me proof", "Real examples", "Skip the fluff"],
      tone: 'direct'
    },
    exploring: {
      greeting: "Fair point. Let me be straight with you:",
      valueDelivery: "Here's what's actually happening in your field:",
      followUp: "This match your experience?",
      actionPrompts: ["Real job data", "Actual salaries", "No BS advice"],
      tone: 'direct'
    },
    deepening: {
      greeting: "Alright, you're still here - good sign.",
      valueDelivery: "Here's the practical stuff that matters:",
      followUp: "This the kind of real help you need?",
      actionPrompts: ["Actionable steps", "Real timeline", "Honest assessment"],
      tone: 'direct'
    },
    converting: {
      greeting: "You've seen this actually works.",
      valueDelivery: "I can give you the unfiltered career guidance you need:",
      followUp: "Ready for the real deal?",
      actionPrompts: ["Get real guidance", "No fluff plan", "Honest feedback"],
      tone: 'direct'
    }
  },
  curious_achiever: {
    greeting: {
      greeting: "Amazing that you're thinking about your future! That's already putting you ahead.",
      valueDelivery: "Here's an opportunity most people don't know about:",
      followUp: "What excites you most about exploring new possibilities?",
      actionPrompts: ["Explore opportunities", "Learn more", "Find mentors"],
      tone: 'encouraging'
    },
    exploring: {
      greeting: "I love your curiosity! Let's explore this together.",
      valueDelivery: "Based on your interests, here are some exciting paths:",
      followUp: "Which of these sparks your interest most?",
      actionPrompts: ["Deep dive", "Meet professionals", "Skill roadmap"],
      tone: 'encouraging'
    },
    deepening: {
      greeting: "Your growth mindset is fantastic - keep that energy!",
      valueDelivery: "Here's how you can accelerate your development:",
      followUp: "What feels like the most exciting challenge for you?",
      actionPrompts: ["Growth plan", "Skill development", "Networking"],
      tone: 'encouraging'
    },
    converting: {
      greeting: "You've got such great potential and the right mindset!",
      valueDelivery: "I can help you unlock amazing opportunities:",
      followUp: "Ready to turn that potential into action?",
      actionPrompts: ["Unlock opportunities", "Accelerate growth", "Find mentors"],
      tone: 'encouraging'
    }
  },
  unknown: {
    greeting: {
      greeting: "Hi there! I'm here to help you explore career paths that fit who you are.",
      valueDelivery: "Let me share something valuable based on what you've told me:",
      followUp: "What's most important to you in your career?",
      actionPrompts: ["Explore options", "Find direction", "Get guidance"],
      tone: 'professional'
    },
    exploring: {
      greeting: "That's helpful to know.",
      valueDelivery: "Here's what I can tell you about that:",
      followUp: "Does this resonate with your experience?",
      actionPrompts: ["Learn more", "Explore paths", "Get specific"],
      tone: 'professional'
    },
    deepening: {
      greeting: "Great, we're making progress!",
      valueDelivery: "Here's a more detailed look at your options:",
      followUp: "What would you like to explore further?",
      actionPrompts: ["Dive deeper", "Compare options", "Next steps"],
      tone: 'professional'
    },
    converting: {
      greeting: "You've shared some great insights with me!",
      valueDelivery: "I can provide personalized guidance for your journey:",
      followUp: "Would you like to continue with a more detailed exploration?",
      actionPrompts: ["Get guidance", "Personalized plan", "Continue exploring"],
      tone: 'professional'
    }
  }
};

const CAREER_INSIGHTS_BANK = {
  quick_wins: [
    "92% of people in your field say networking was crucial to their success",
    "The average salary in this area has increased 23% in the last 2 years",
    "Most professionals recommend starting with these 3 specific skills",
    "Remote work options in this field have grown 340% since 2020"
  ],
  practical_advice: [
    "Here's the exact certification most employers look for",
    "These 5 companies are actively hiring entry-level positions",
    "This free course gets you 80% of the way to job-ready",
    "Real talk: expect 6-8 weeks of job searching in this market"
  ],
  growth_opportunities: [
    "This emerging specialization could triple your earning potential",
    "Here's how to transition from where you are to where you want to be",
    "These mentorship programs have a 94% success rate",
    "This skill gap represents a huge opportunity for newcomers"
  ]
};

export const AdaptiveAIResponse: React.FC<AdaptiveAIResponseProps> = ({
  userMessage,
  persona,
  conversationPhase,
  previousInsights,
  onResponseGenerated
}) => {
  
  const generateResponse = () => {
    const template = PERSONA_TEMPLATES[persona.type]?.[conversationPhase] || 
                    PERSONA_TEMPLATES.unknown[conversationPhase];
    
    // Select appropriate insight based on persona
    let insight = "";
    
    if (persona.type === 'skeptical_pragmatist') {
      insight = CAREER_INSIGHTS_BANK.practical_advice[
        Math.floor(Math.random() * CAREER_INSIGHTS_BANK.practical_advice.length)
      ];
    } else if (persona.type === 'curious_achiever') {
      insight = CAREER_INSIGHTS_BANK.growth_opportunities[
        Math.floor(Math.random() * CAREER_INSIGHTS_BANK.growth_opportunities.length)
      ];
    } else {
      insight = CAREER_INSIGHTS_BANK.quick_wins[
        Math.floor(Math.random() * CAREER_INSIGHTS_BANK.quick_wins.length)
      ];
    }

    // Avoid repeating insights
    if (previousInsights.includes(insight)) {
      insight = "Based on what you've shared, I can see some clear patterns in your interests.";
    }

    // Craft response based on persona adaptations
    const maxLength = persona.adaptations.maxResponseLength;
    let response = "";

    if (conversationPhase === 'greeting') {
      response = `${template.greeting} ${template.valueDelivery} ${insight}`;
    } else {
      response = `${template.greeting} ${template.valueDelivery} ${insight} ${template.followUp}`;
    }

    // Truncate if necessary for persona
    if (response.length > maxLength * 7) { // Roughly 7 chars per word
      const words = response.split(' ');
      response = words.slice(0, maxLength).join(' ') + '...';
    }

    // Calculate confidence based on persona match
    const confidence = Math.min(95, persona.confidence + 15);

    onResponseGenerated(response, confidence);
    
    return {
      response,
      actionPrompts: template.actionPrompts,
      tone: template.tone,
      confidence
    };
  };

  React.useEffect(() => {
    // Only generate responses when there's actual user input
    if (userMessage && userMessage.trim().length > 0) {
      generateResponse();
    }
  }, [userMessage, persona, conversationPhase]);

  return null; // This is a logic-only component
};

export default AdaptiveAIResponse; 
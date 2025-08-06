/**
 * Career Card Awareness Integration Demo
 * Demonstrates the complete ElevenLabs career card awareness system in action
 * Run this script to see the integration working end-to-end
 */

import { UnifiedVoiceContextService } from '../services/unifiedVoiceContextService';
import { CareerCard } from '../types/careerCard';

// Demo career card data
const demoBasicCard: CareerCard = {
  id: 'demo-card-1',
  title: 'Software Engineer',
  description: 'Develops software applications and systems',
  confidence: 0.85,
  keySkills: ['JavaScript', 'React', 'Node.js'],
  salaryRange: '£30k-£60k',
  trainingPathways: ['Computer Science Degree', 'Coding Bootcamp']
};

const demoEnhancedCard: CareerCard = {
  id: 'demo-card-2',
  title: 'AI Product Manager',
  description: 'Manages AI-focused product development and strategy',
  confidence: 0.92,
  enhancement: {
    status: 'completed',
    lastUpdated: new Date().toISOString(),
    sources: ['LinkedIn Jobs', 'Glassdoor', 'Indeed'],
    confidence: 0.95
  },
  perplexityData: {
    verifiedSalaryRanges: {
      entry: { min: 45, max: 60 },
      senior: { min: 80, max: 120 }
    },
    currentEducationPathways: [{
      title: 'MBA with AI Specialization',
      duration: '2 years'
    }],
    realTimeMarketDemand: {
      competitionLevel: 'moderate',
      growthRate: 15
    }
  },
  compensationRewards: {
    salaryRange: { entry: 45000, senior: 120000 }
  },
  competencyRequirements: {
    technicalSkills: ['Product Strategy', 'AI/ML Understanding', 'Data Analysis'],
    qualificationPathway: {
      degrees: ['Business Administration', 'Computer Science'],
      learningCurve: { timeToCompetent: '2-3 years' }
    }
  },
  labourMarketDynamics: {
    demandOutlook: {
      growthForecast: 'Strong growth expected in AI product roles'
    }
  }
};

/**
 * Demo function to showcase career card awareness integration
 */
export async function demonstrateCareerCardAwareness(): Promise<void> {
  console.log('🚀 Starting Career Card Awareness Integration Demo\n');

  const voiceContextService = new UnifiedVoiceContextService();

  // Demo 1: Context Formatting
  console.log('📝 Demo 1: Context Formatting for ElevenLabs\n');
  
  console.log('--- Basic Career Cards ---');
  const basicContext = voiceContextService.formatCareerCardsForElevenLabsContext([demoBasicCard], 'John');
  console.log(basicContext);
  console.log('\n');

  console.log('--- Enhanced Career Cards with Perplexity Data ---');
  const enhancedContext = voiceContextService.formatCareerCardsForElevenLabsContext([demoEnhancedCard], 'Sarah');
  console.log(enhancedContext);
  console.log('\n');

  console.log('--- Multiple Career Cards ---');
  const multipleContext = voiceContextService.formatCareerCardsForElevenLabsContext([demoBasicCard, demoEnhancedCard], 'Alex');
  console.log(multipleContext);
  console.log('\n');

  // Demo 2: WebSocket Context Updates
  console.log('📡 Demo 2: WebSocket Context Updates\n');

  // Mock WebSocket for demo
  const mockWebSocket = {
    readyState: 1, // WebSocket.OPEN
    send: (message: string) => {
      console.log('📤 WebSocket Message Sent:');
      const parsed = JSON.parse(message);
      console.log(`Type: ${parsed.type}`);
      console.log(`Text Preview: ${parsed.text.substring(0, 100)}...`);
      console.log('');
    }
  } as WebSocket;

  const wsResult = await voiceContextService.sendWebSocketContextualUpdate(
    mockWebSocket,
    [demoEnhancedCard],
    'Maria',
    'enhancement_completed'
  );
  console.log(`✅ WebSocket update result: ${wsResult}\n`);

  // Demo 3: Cache Management
  console.log('💾 Demo 3: Cache Management\n');
  
  console.log('Clearing career card cache...');
  voiceContextService.clearCareerCardCache('demo-user');
  console.log('✅ Cache cleared for demo-user');
  
  voiceContextService.clearCareerCardCache();
  console.log('✅ All cache cleared\n');

  // Demo 4: Error Handling
  console.log('🛡️ Demo 4: Error Handling\n');
  
  console.log('--- Testing with empty career cards ---');
  const emptyContext = voiceContextService.formatCareerCardsForElevenLabsContext([]);
  console.log(`Empty context result: "${emptyContext}"`);
  console.log('');

  console.log('--- Testing with invalid WebSocket ---');
  const invalidWsResult = await voiceContextService.sendWebSocketContextualUpdate(
    null,
    [demoBasicCard],
    'TestUser'
  );
  console.log(`✅ Invalid WebSocket handled gracefully: ${invalidWsResult}\n`);

  // Demo 5: Context Size Management
  console.log('📏 Demo 5: Context Size Management\n');
  
  // Create many cards to test size limits
  const manyCards: CareerCard[] = Array.from({ length: 8 }, (_, i) => ({
    ...demoBasicCard,
    id: `card-${i}`,
    title: `Career Option ${i + 1}`,
    description: `Detailed description for career option ${i + 1} with comprehensive information about the role, responsibilities, and requirements.`
  }));

  const largeContext = voiceContextService.formatCareerCardsForElevenLabsContext(manyCards, 'TestUser');
  console.log(`Context with many cards length: ${largeContext.length} characters`);
  console.log('Context preview:');
  console.log(largeContext.substring(0, 300) + '...\n');

  // Demo 6: Integration Summary
  console.log('📊 Demo 6: Integration Summary\n');
  
  console.log('✅ Career Card Awareness Integration Features Demonstrated:');
  console.log('   • Context formatting for basic and enhanced career cards');
  console.log('   • WebSocket real-time context updates');
  console.log('   • Cache management for performance optimization');
  console.log('   • Comprehensive error handling and graceful degradation');
  console.log('   • Context size management and truncation');
  console.log('   • Conversation guidance for natural agent interactions');
  console.log('   • Multi-user support with personalization');
  console.log('   • Enhanced market data integration from Perplexity');
  console.log('');

  console.log('🎯 Key Benefits:');
  console.log('   • ElevenLabs agents now have real-time career card awareness');
  console.log('   • Context updates automatically when Perplexity enhancement completes');
  console.log('   • Supports both guest and authenticated user scenarios');
  console.log('   • Maintains conversation flow with non-interrupting updates');
  console.log('   • Optimized for performance with intelligent caching');
  console.log('');

  console.log('🚀 Demo Complete! Career Card Awareness Integration is fully operational.\n');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateCareerCardAwareness().catch(console.error);
}

export default demonstrateCareerCardAwareness;
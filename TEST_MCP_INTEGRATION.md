# 🧪 MCP + ElevenLabs Integration Testing Guide

## Overview

This guide helps you test the complete MCP (Model Context Protocol) integration with ElevenLabs voice AI to ensure career insights are generated correctly during conversations.

## Prerequisites

Before testing, ensure you have:

1. ✅ **ElevenLabs configured** (API key and Agent ID in `.env`)
2. ✅ **MCP environment variables set**:
   ```bash
   VITE_ENABLE_MCP_ENHANCEMENT=true
   VITE_ENABLE_MCP_SERVER=true
   VITE_MCP_FALLBACK_MODE=false  # Set to true for testing without MCP server
   ```
3. ✅ **OpenAI API key configured** (for MCP server)
4. ✅ **Development server running**: `npm run dev`
5. ✅ **MCP server running** (optional): `npm run start:mcp`

## Testing Scenarios

### 1. Basic Voice + MCP Flow Test

**Objective**: Verify that voice conversation triggers MCP analysis and generates career cards.

**Steps**:
1. Open the application in your browser
2. Navigate to the home page
3. Click "Start Conversation"
4. Wait for ElevenLabs to connect (should speak first)
5. Have this test conversation:

```
YOU: "Hi, I'm interested in technology and love solving problems with code"
AI: [Should respond and may trigger analysis]
YOU: "I enjoy building websites and mobile apps"
AI: [Should trigger MCP analysis after 2-3 exchanges]
```

**Expected Results**:
- ✅ Voice conversation works smoothly
- ✅ Career cards appear automatically (e.g., "Software Developer", "Web Developer")
- ✅ Cards show UK salary ranges and next steps
- ✅ Browser console shows MCP analysis logs

**Console Logs to Look For**:
```
🔬 Using MCP-enhanced conversation analysis
✅ MCP analysis completed { interestsFound: 2, confidence: 0.85 }
🎯 Generated MCP career cards: 3
```

### 2. MCP Fallback Mode Test

**Objective**: Verify system works when MCP server is unavailable.

**Steps**:
1. Set `VITE_MCP_FALLBACK_MODE=true` in `.env`
2. Restart development server
3. Stop MCP server if running
4. Repeat voice conversation test

**Expected Results**:
- ✅ Conversation still works
- ✅ Career cards still generate (using fallback analysis)
- ✅ Console shows fallback logs: `🔄 Using fallback conversation analysis`

### 3. Different Interest Categories Test

**Objective**: Test MCP analysis across different career fields.

**Test Conversations**:

**Design Interest**:
```
YOU: "I love creating beautiful user interfaces and visual designs"
Expected: Cards for "UX Designer", "Graphic Designer", "Product Designer"
```

**Business Interest**:
```
YOU: "I want to start my own company and lead teams"
Expected: Cards for "Entrepreneurship", "Business Development", "Innovation Manager"
```

**Healthcare Interest**:
```
YOU: "I'm passionate about helping people and healthcare"
Expected: Cards for healthcare-related careers
```

### 4. Real-time Card Generation Test

**Objective**: Verify cards appear during conversation without page refresh.

**Steps**:
1. Start conversation
2. Mention one interest (e.g., "I like art")
3. Wait for potential cards
4. Add another interest (e.g., "and I'm good with computers")
5. Watch for additional cards

**Expected Results**:
- ✅ Cards appear progressively
- ✅ New cards add to existing ones
- ✅ No page refresh required
- ✅ Smooth animations when cards appear

### 5. Tool Integration Test

**Objective**: Verify ElevenLabs agent tools trigger MCP analysis.

**Console Commands** (open browser dev tools):
```javascript
// Manually test MCP bridge service
import { mcpBridgeService } from './src/services/mcpBridgeService.js';

// Test conversation analysis
const testMessages = [
  { role: 'user', content: 'I love programming and solving complex problems' },
  { role: 'assistant', content: 'That sounds exciting! What kind of programming interests you most?' },
  { role: 'user', content: 'I really enjoy web development and creating user interfaces' }
];

mcpBridgeService.analyzeConversation(testMessages, 'test-user').then(result => {
  console.log('MCP Test Result:', result);
});
```

**Expected Console Output**:
```javascript
{
  success: true,
  analysis: {
    detectedInterests: ["Web Development", "Programming"],
    confidence: 0.85,
    careerCards: [...],
    timestamp: "2024-01-XX..."
  }
}
```

### 6. Error Handling Test

**Objective**: Verify graceful error handling when things go wrong.

**Test Scenarios**:

**Invalid API Key**:
1. Temporarily change OpenAI API key to invalid value
2. Start conversation
3. Verify fallback mode activates

**Network Issues**:
1. Disconnect internet briefly during conversation
2. Verify conversation continues with fallback

**MCP Server Down**:
1. Stop MCP server
2. Verify fallback analysis works

### 7. Performance Test

**Objective**: Ensure MCP integration doesn't slow down conversation.

**Metrics to Monitor**:
- ✅ Voice response time < 3 seconds
- ✅ Career card generation < 5 seconds after analysis trigger
- ✅ UI remains responsive during analysis
- ✅ Memory usage stable over 10+ exchanges

## Debugging Common Issues

### Issue: No Career Cards Appearing

**Checklist**:
1. Check `VITE_ENABLE_MCP_ENHANCEMENT=true`
2. Verify conversation has 2+ user messages
3. Check browser console for errors
4. Ensure interests are clearly stated

**Console Debug**:
```javascript
// Check if MCP is enabled
console.log('MCP Enhanced:', import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT);

// Check conversation history
console.log('Conversation History:', conversationHistory);
```

### Issue: MCP Server Connection Failed

**Checklist**:
1. Verify MCP server is running: `npm run start:mcp`
2. Check OpenAI API key is valid
3. Verify port 3001 is not blocked
4. Check MCP server logs for errors

**Test MCP Server**:
```bash
# Test MCP server directly
curl -X POST http://localhost:3001/health
```

### Issue: ElevenLabs Tools Not Working

**Checklist**:
1. Verify ElevenLabs agent has correct tool definitions
2. Check agent configuration in ElevenLabs dashboard
3. Ensure tools are enabled in agent settings
4. Verify client tool implementation matches agent config

## Success Criteria

A successful MCP + ElevenLabs integration should demonstrate:

1. ✅ **Seamless Voice Interaction**: Natural conversation with ElevenLabs AI
2. ✅ **Automatic Analysis**: MCP triggers without user action
3. ✅ **Real-time Career Cards**: Visual insights appear during conversation
4. ✅ **Accurate Career Matching**: Relevant career suggestions based on interests
5. ✅ **UK-Specific Data**: Salary ranges and pathways relevant to UK market
6. ✅ **Fallback Reliability**: System works even when MCP server unavailable
7. ✅ **Performance**: No noticeable delays or UI freezing
8. ✅ **Error Recovery**: Graceful handling of network or API issues

## Advanced Testing

### A/B Testing Setup

Test with and without MCP enhancement:

```bash
# Terminal 1: With MCP
VITE_ENABLE_MCP_ENHANCEMENT=true npm run dev

# Terminal 2: Without MCP  
VITE_ENABLE_MCP_ENHANCEMENT=false npm run dev
```

Compare:
- Career card accuracy
- Response relevance
- User engagement
- System performance

### Load Testing

For production readiness:

1. **Multiple Concurrent Conversations**: Test 5+ simultaneous voice sessions
2. **Extended Conversations**: 20+ message exchanges
3. **Rapid Interest Changes**: Quick topic switching
4. **Memory Monitoring**: Watch for memory leaks over time

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass in staging environment
- [ ] MCP server deployed and accessible
- [ ] Environment variables configured correctly
- [ ] ElevenLabs agent optimized for production
- [ ] Error monitoring and logging in place
- [ ] Performance benchmarks met
- [ ] Fallback modes tested and verified

## Troubleshooting Resources

**Console Logs Location**: Browser Developer Tools > Console
**MCP Server Logs**: Terminal running `npm run start:mcp`
**ElevenLabs Logs**: Browser Network tab for API calls
**Firebase Logs**: Firebase Console > Functions > Logs

**Support Channels**:
- ElevenLabs Documentation: https://docs.elevenlabs.io
- MCP Protocol Docs: Model Context Protocol specification
- OpenAI API Docs: https://platform.openai.com/docs

This comprehensive testing ensures your MCP + ElevenLabs integration provides a robust, real-time career guidance experience! 🚀 
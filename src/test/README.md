# Career Card Awareness Integration Tests

This directory contains comprehensive tests and demos for the ElevenLabs Career Card Awareness integration.

## Files

### `careerCardAwarenessIntegration.test.ts`
Comprehensive test suite covering:
- ✅ Career card retrieval for guest and authenticated users
- ✅ Context formatting with various data configurations  
- ✅ Context injection with career card data
- ✅ Real-time updates during enhancement completion
- ✅ Error handling for edge cases
- ✅ Conversation flow integration
- ✅ Context size limits and performance

### `careerCardAwarenessDemo.ts`
Interactive demonstration script showing:
- 🎯 Context formatting examples
- 📡 WebSocket context updates
- 💾 Cache management
- 🛡️ Error handling
- 📏 Context size management
- 📊 Integration summary

## Running the Tests

### Run All Tests
```bash
npm run test
```

### Run Career Card Awareness Tests Only
```bash
npm run test careerCardAwarenessIntegration
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Interactive Demo
```bash
npm run ts-node src/test/careerCardAwarenessDemo.ts
```

## Test Scenarios Covered

### 1. Data Retrieval Testing
- ✅ Guest user career card retrieval from localStorage
- ✅ Authenticated user career card retrieval from Firebase
- ✅ Empty data handling
- ✅ Caching behavior validation
- ✅ Error handling for missing data

### 2. Context Formatting Testing
- ✅ Basic career card formatting
- ✅ Enhanced career card formatting with Perplexity data
- ✅ Multiple career cards formatting
- ✅ Context size optimization and truncation
- ✅ Missing data graceful handling

### 3. Context Injection Testing
- ✅ Authenticated user context with career cards
- ✅ Guest user context with career cards
- ✅ Context injection without career cards
- ✅ Context structure validation

### 4. Dynamic Updates Testing
- ✅ Agent context updates via REST API
- ✅ WebSocket contextual updates for active conversations
- ✅ Rate limiting validation
- ✅ Batch updates with success/failure tracking
- ✅ Error handling for failed updates

### 5. Integration Validation
- ✅ End-to-end workflow testing
- ✅ Conversation guidance generation
- ✅ Performance optimization validation
- ✅ Cache management testing

## Mock Data

The tests use realistic mock data representing:

### Basic Career Card
```typescript
{
  id: 'test-card-1',
  title: 'Software Engineer',
  confidence: 0.85,
  keySkills: ['JavaScript', 'React', 'Node.js'],
  salaryRange: '£30k-£60k'
}
```

### Enhanced Career Card (with Perplexity data)
```typescript
{
  id: 'test-card-2',
  title: 'AI Product Manager',
  confidence: 0.92,
  perplexityData: {
    verifiedSalaryRanges: { entry: { min: 45, max: 60 }, senior: { min: 80, max: 120 } },
    currentEducationPathways: [{ title: 'MBA with AI Specialization', duration: '2 years' }],
    realTimeMarketDemand: { competitionLevel: 'moderate', growthRate: 15 }
  }
}
```

## Expected Test Results

All tests should pass with the following validations:

### ✅ Functional Requirements
- Career card data retrieval works for both user types
- Context formatting produces proper ElevenLabs-compatible output
- Context injection includes career card data in agent prompts
- Dynamic updates trigger correctly and maintain conversation flow

### ✅ Performance Requirements
- Caching reduces repeated data retrieval
- Context size stays within ElevenLabs limits (≤1000 characters)
- Rate limiting prevents API abuse
- Background updates don't block user experience

### ✅ Error Handling Requirements
- Missing data handled gracefully
- Network failures don't break functionality
- Invalid data doesn't crash the system
- Context update failures don't break enhancement process

## Integration Points Validated

1. **UnifiedVoiceContextService** - Core service for career card awareness
2. **Guest Session Integration** - localStorage-based guest user support
3. **Firebase Integration** - Authenticated user data retrieval
4. **ElevenLabs API Integration** - Context updates and WebSocket communication
5. **Perplexity Enhancement Integration** - Real-time market data handling

## Test Configuration

Tests use Vitest with:
- JSdom environment for browser API simulation
- Vi mocking for external services
- React Testing Library for component testing
- Custom mocks for Firebase and ElevenLabs APIs

## Troubleshooting

### Common Issues

1. **Mock Import Errors**
   - Ensure all external services are properly mocked
   - Check vitest.config.ts for correct setup

2. **WebSocket Mock Issues**
   - Verify WebSocket mock implements required interface
   - Check readyState and send method mocks

3. **Cache Testing Issues**
   - Clear cache between tests if needed
   - Use fresh service instances for isolation

### Debug Mode

Add `--reporter=verbose` to see detailed test output:
```bash
npm run test careerCardAwarenessIntegration -- --reporter=verbose
```

## Success Criteria

✅ All tests pass  
✅ Coverage > 90% for career card awareness features  
✅ Demo script runs without errors  
✅ Integration validates end-to-end workflow  
✅ Performance tests validate caching and optimization  
✅ Error handling tests validate graceful degradation  

The Career Card Awareness integration is validated and ready for production deployment!
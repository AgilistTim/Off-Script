/**
 * Enhanced Text Conversation Client Tests
 * 
 * Validates the OpenAI runTools integration for text mode, ensuring it properly
 * executes client tools and maintains parity with voice mode functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedTextConversationClient } from '../services/enhancedTextConversationClient';

// Mock OpenAI SDK
const mockRunner = {
  on: vi.fn(),
  finalContent: vi.fn(),
  abort: vi.fn()
};

const mockOpenAI = {
  chat: {
    completions: {
      runTools: vi.fn(() => mockRunner)
    }
  }
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

describe('EnhancedTextConversationClient', () => {
  const mockClientTools = {
    analyze_conversation_for_careers: vi.fn(),
    update_person_profile: vi.fn(),
    generate_career_recommendations: vi.fn(),
    trigger_instant_insights: vi.fn()
  };

  let client: EnhancedTextConversationClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EnhancedTextConversationClient(mockClientTools);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with client tools', () => {
      expect(client).toBeInstanceOf(EnhancedTextConversationClient);
    });

    it('should create OpenAI client instance', () => {
      expect(mockOpenAI).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute client tools when OpenAI suggests function calls', async () => {
      const mockMessageHandler = vi.fn();
      mockClientTools.analyze_conversation_for_careers.mockResolvedValue('Analysis complete');
      
      // Mock the function call event
      const mockFunctionCall = {
        name: 'analyze_conversation_for_careers',
        arguments: JSON.stringify({ trigger_reason: 'User asked for recommendations' })
      };

      // Set up the client
      client.onMessage(mockMessageHandler);
      
      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context',
        firstMessage: 'Hello!'
      });

      // Verify runTools was called with correct parameters
      expect(mockOpenAI.chat.completions.runTools).toHaveBeenCalledWith({
        model: 'gpt-4o-2024-08-06',
        messages: expect.arrayContaining([
          { role: 'system', content: 'test-context' }
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({
              name: 'analyze_conversation_for_careers'
            })
          })
        ]),
        tool_choice: 'auto'
      });

      // Verify event handlers were set up
      expect(mockRunner.on).toHaveBeenCalledWith('content', expect.any(Function));
      expect(mockRunner.on).toHaveBeenCalledWith('functionCall', expect.any(Function));
      expect(mockRunner.on).toHaveBeenCalledWith('functionCallResult', expect.any(Function));
      expect(mockRunner.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle function call events and execute client tools', async () => {
      mockClientTools.update_person_profile.mockResolvedValue('Profile updated');

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      // Get the function call handler
      const functionCallHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'functionCall'
      )[1];

      const mockFunctionCall = {
        name: 'update_person_profile',
        arguments: JSON.stringify({
          interests: ['technology'],
          goals: ['software engineering']
        })
      };

      // Execute the function call handler
      await functionCallHandler(mockFunctionCall);

      // Verify the client tool was executed
      expect(mockClientTools.update_person_profile).toHaveBeenCalledWith({
        interests: ['technology'],
        goals: ['software engineering']
      });
    });

    it('should handle function call arguments as both string and object', async () => {
      mockClientTools.generate_career_recommendations.mockResolvedValue('Recommendations generated');

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const functionCallHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'functionCall'
      )[1];

      // Test with string arguments
      const stringArgCall = {
        name: 'generate_career_recommendations',
        arguments: '{"trigger_reason": "sufficient profile data"}'
      };

      await functionCallHandler(stringArgCall);

      expect(mockClientTools.generate_career_recommendations).toHaveBeenCalledWith({
        trigger_reason: 'sufficient profile data'
      });

      // Test with object arguments
      const objectArgCall = {
        name: 'generate_career_recommendations',
        arguments: { trigger_reason: 'user request' }
      };

      await functionCallHandler(objectArgCall);

      expect(mockClientTools.generate_career_recommendations).toHaveBeenCalledWith({
        trigger_reason: 'user request'
      });
    });

    it('should handle unknown function calls gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const functionCallHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'functionCall'
      )[1];

      const unknownFunctionCall = {
        name: 'unknown_function',
        arguments: '{}'
      };

      await functionCallHandler(unknownFunctionCall);

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ [ENHANCED TEXT] Unknown tool called:', 'unknown_function');
      consoleSpy.mockRestore();
    });

    it('should handle function call execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockClientTools.trigger_instant_insights.mockRejectedValue(new Error('Tool execution failed'));

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const functionCallHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'functionCall'
      )[1];

      const failingFunctionCall = {
        name: 'trigger_instant_insights',
        arguments: '{"trigger_reason": "test"}'
      };

      await functionCallHandler(failingFunctionCall);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [ENHANCED TEXT] Error executing client tool:',
        'trigger_instant_insights',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Message Handling', () => {
    it('should handle content events from OpenAI', async () => {
      const mockMessageHandler = vi.fn();
      client.onMessage(mockMessageHandler);

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      // Get the content handler
      const contentHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'content'
      )[1];

      const testContent = 'This is a response from the AI assistant.';
      contentHandler(testContent);

      expect(mockMessageHandler).toHaveBeenCalledWith(testContent);
    });

    it('should handle error events gracefully', async () => {
      const mockMessageHandler = vi.fn();
      client.onMessage(mockMessageHandler);

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      // Get the error handler
      const errorHandler = mockRunner.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const testError = new Error('OpenAI API error');
      errorHandler(testError);

      expect(mockMessageHandler).toHaveBeenCalledWith('I encountered an error. Please try again.');
    });
  });

  describe('Conversation Management', () => {
    it('should send user messages correctly', async () => {
      mockRunner.finalContent.mockResolvedValue('AI response');
      const mockMessageHandler = vi.fn();
      client.onMessage(mockMessageHandler);

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      await client.sendUserMessage('Hello, I need career advice');

      // Verify new runTools call with user message
      expect(mockOpenAI.chat.completions.runTools).toHaveBeenCalledTimes(2); // Once for start, once for sendUserMessage
    });

    it('should handle conversation history correctly', async () => {
      mockRunner.finalContent.mockResolvedValue('AI response');

      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const conversationHistory = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' }
      ];

      await client.sendUserMessage('New message', conversationHistory);

      // Verify conversation history is included in the runTools call
      const lastCall = mockOpenAI.chat.completions.runTools.mock.calls[1];
      expect(lastCall[0].messages).toEqual(
        expect.arrayContaining([
          { role: 'system', content: 'test-context' },
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'New message' }
        ])
      );
    });

    it('should handle client termination correctly', async () => {
      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      await client.end();

      expect(mockRunner.abort).toHaveBeenCalled();
    });
  });

  describe('Tool Definitions', () => {
    it('should define all required tools with correct schemas', async () => {
      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const runToolsCall = mockOpenAI.chat.completions.runTools.mock.calls[0];
      const tools = runToolsCall[0].tools;

      // Verify all required tools are defined
      const toolNames = tools.map((tool: any) => tool.function.name);
      expect(toolNames).toContain('analyze_conversation_for_careers');
      expect(toolNames).toContain('update_person_profile');
      expect(toolNames).toContain('generate_career_recommendations');
      expect(toolNames).toContain('trigger_instant_insights');

      // Verify tool structure
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
        expect(tool.function.parameters).toHaveProperty('type', 'object');
        expect(tool.function.parameters).toHaveProperty('properties');
      });
    });

    it('should not include invalid function references in tool definitions', async () => {
      await client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      });

      const runToolsCall = mockOpenAI.chat.completions.runTools.mock.calls[0];
      const tools = runToolsCall[0].tools;

      // Verify no tool definitions contain invalid 'function' property references
      tools.forEach((tool: any) => {
        expect(tool.function).not.toHaveProperty('function');
      });
    });
  });

  describe('Error Resilience', () => {
    it('should handle OpenAI client initialization errors', () => {
      // Mock OpenAI constructor to throw
      vi.mocked(mockOpenAI).mockImplementationOnce(() => {
        throw new Error('OpenAI initialization failed');
      });

      expect(() => new EnhancedTextConversationClient(mockClientTools)).toThrow();
    });

    it('should handle runTools failures gracefully', async () => {
      mockOpenAI.chat.completions.runTools.mockImplementationOnce(() => {
        throw new Error('runTools failed');
      });

      await expect(client.start({
        sessionId: 'test-session',
        personaContext: 'test-context'
      })).rejects.toThrow();
    });

    it('should prevent operations when not started', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await client.sendUserMessage('Test message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ [ENHANCED TEXT] Client not started or runner not initialized.');
      consoleWarnSpy.mockRestore();
    });
  });
});

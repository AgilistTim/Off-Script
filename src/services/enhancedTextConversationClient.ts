import OpenAI from 'openai';
import environmentConfig from '../config/environment';
import { 
  TextMessageHandler, 
  TextConversationStartOptions, 
  ConversationHistoryItem, 
  ITextConversationClient 
} from './textConversationClient';

export interface ClientTools {
  analyze_conversation_for_careers: (parameters: { trigger_reason: string }) => Promise<string>;
  update_person_profile: (parameters: { 
    interests?: string[] | string; 
    goals?: string[] | string; 
    skills?: string[] | string; 
    personalQualities?: string[] | string; 
    [key: string]: any 
  }) => Promise<string>;
  generate_career_recommendations: (parameters: any) => Promise<string>;
  trigger_instant_insights: (parameters: any) => Promise<string>;
}

/**
 * Enhanced text conversation client using OpenAI function calling for tool execution
 * Provides same capabilities as voice mode while maintaining compatibility with existing interface
 */
export class EnhancedTextConversationClient implements ITextConversationClient {
  private openaiClient: OpenAI;
  private messageHandler: TextMessageHandler | null = null;
  private started = false;
  private sessionId: string | undefined;
  private personaContext: string | undefined;
  private clientTools: ClientTools;
  private conversationHistory: ConversationHistoryItem[] = [];


  constructor(clientTools: ClientTools) {
    this.clientTools = clientTools;
    
    // Initialize OpenAI client
    const apiKey = environmentConfig.apiKeys.openai;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured for enhanced text client');
    }
    
    this.openaiClient = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }

  async start(options: TextConversationStartOptions): Promise<void> {
    this.sessionId = options.sessionId;
    this.personaContext = options.personaContext;
    this.started = true;
    this.conversationHistory = [];

    console.log('🟢 [ENHANCED TEXT START] Enhanced client starting session:', {
      sessionId: this.sessionId,
      personaContextPresent: !!this.personaContext,
      personaContextLength: this.personaContext?.length || 0,
      hasClientTools: !!this.clientTools
    });

    // If a firstMessage is provided, emit it immediately to mirror agent behavior
    // The caller should ensure this is only called for new conversations
    if (options.firstMessage && this.messageHandler) {
      this.messageHandler(options.firstMessage);
      // Add first message to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: options.firstMessage
      });
    }
  }

  onMessage(handler: TextMessageHandler) {
    this.messageHandler = handler;
  }

  async sendUserMessage(text: string, history?: ConversationHistoryItem[]): Promise<void> {
    if (!this.started) return;

    console.log('💬 [ENHANCED TEXT MSG] Enhanced client sending:', {
      sessionId: this.sessionId,
      textPreview: text.substring(0, 120) + '...',
      personaContextPresent: !!this.personaContext,
      historyCount: Array.isArray(history) ? history.length : 0,
      toolsAvailable: Object.keys(this.clientTools).length
    });

    // Add user message to conversation history
    const userMessage: ConversationHistoryItem = { role: 'user', content: text };
    this.conversationHistory.push(userMessage);

    try {
      // Build messages array for OpenAI
      const messages = this.buildMessagesArray();

      // Create completion with function calling
      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages,
        tools: this.buildToolDefinitions(),
        tool_choice: 'auto'
      });

      const message = completion.choices[0]?.message;
      if (!message) return;

      // Handle tool calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log('🔧 [ENHANCED TEXT] Processing tool calls:', message.tool_calls.length);
        
        // First, add the assistant message with tool_calls to history
        this.conversationHistory.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // Then execute each tool call and add their responses
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            await this.executeToolCall(toolCall);
          }
        }

        // Get final response after tool execution
        const finalMessages = this.buildMessagesArray();
        const finalCompletion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          messages: finalMessages
        });

        const finalMessage = finalCompletion.choices[0]?.message;
        if (finalMessage?.content && this.messageHandler) {
          this.messageHandler(finalMessage.content);
          this.conversationHistory.push({
            role: 'assistant',
            content: finalMessage.content
          });
        }
      } else {
        // No tool calls, just return the message
        if (message.content && this.messageHandler) {
          this.messageHandler(message.content);
          this.conversationHistory.push({
            role: 'assistant',
            content: message.content
          });
        }
      }

    } catch (error) {
      console.error('❌ Enhanced text client error:', error);
      if (this.messageHandler) {
        this.messageHandler('I encountered an error processing your message. Please try again.');
      }
    }
  }

  private async executeToolCall(toolCall: any): Promise<void> {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    console.log('🔧 [ENHANCED TEXT] Executing tool:', functionName, functionArgs);

    if (this.clientTools[functionName]) {
      try {
        const result = await this.clientTools[functionName](functionArgs);
        console.log('✅ [ENHANCED TEXT] Tool executed successfully:', functionName);
        
        // Add tool result to conversation history (ensure content is a string)
        this.conversationHistory.push({
          role: 'tool',
          content: typeof result === 'string' ? result : JSON.stringify(result),
          tool_call_id: toolCall.id
        });
      } catch (error) {
        console.error('❌ [ENHANCED TEXT] Tool execution error:', functionName, error);
        this.conversationHistory.push({
          role: 'tool',
          content: 'Tool execution failed',
          tool_call_id: toolCall.id
        });
      }
    } else {
      console.warn('⚠️ [ENHANCED TEXT] Unknown tool:', functionName);
    }
  }

  async end(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    console.log('🔴 [ENHANCED TEXT END] Enhanced client ended session');
  }

  /**
   * Build messages array including system prompt and conversation history
   */
  private buildMessagesArray(): any[] {
    const messages: any[] = [];

    // Add system prompt if persona context exists
    if (this.personaContext) {
      console.log('🔧 [ENHANCED TEXT CLIENT] Using system prompt:', {
        promptLength: this.personaContext.length,
        sessionId: this.sessionId,
        promptPreview: this.personaContext.substring(0, 300) + '...',
        containsMandatoryAction: this.personaContext.includes('MANDATORY NEXT ACTION'),
        containsStageProgression: this.personaContext.includes('STAGE PROGRESSION CONTROL')
      });
      
      messages.push({
        role: 'system',
        content: this.personaContext
      });
    }

    // Add conversation history
    messages.push(...this.conversationHistory);

    return messages;
  }

  /**
   * Build tool definitions for OpenAI function calling
   */
  private buildToolDefinitions(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'analyze_conversation_for_careers',
          description: 'Analyze conversation to generate personalized career cards and insights',
          parameters: {
            type: 'object',
            properties: {
              trigger_reason: {
                type: 'string',
                description: 'Reason for triggering career analysis'
              }
            },
            required: ['trigger_reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_person_profile',
          description: 'Extract and update user profile insights from conversation',

          parameters: {
            type: 'object',
            properties: {
              interests: {
                type: 'array',
                items: { type: 'string' },
                description: 'User interests and activities'
              },
              goals: {
                type: 'array', 
                items: { type: 'string' },
                description: 'Career goals and aspirations'
              },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description: 'Skills and abilities'
              },
              personalQualities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Personal qualities and traits'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_career_recommendations',
          description: 'Generate detailed career recommendations based on user profile',

          parameters: {
            type: 'object',
            properties: {
              trigger_reason: {
                type: 'string',
                description: 'Reason for generating recommendations'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'trigger_instant_insights',
          description: 'Provide immediate career insights based on latest user message',

          parameters: {
            type: 'object',
            properties: {
              user_message: {
                type: 'string',
                description: 'Latest user message to analyze'
              }
            }
          }
        }
      }
    ];
  }


}

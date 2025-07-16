// Simple chat service using OpenAI directly (Context7 best practices)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, move to server-side
});

export interface SimpleChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

class SimpleChatService {
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  async sendMessage(userMessage: string): Promise<SimpleChatMessage> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Get response from OpenAI using Context7 best practices
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06', // Latest model as recommended
        messages: [
          {
            role: 'system',
            content: `You are an expert career coach specializing in UK career guidance. 
            
            You help young people and career changers explore opportunities that fit their interests, skills, and goals.
            
            - Ask engaging questions to understand their interests
            - Provide practical, actionable advice
            - Focus on UK job market and opportunities
            - Be encouraging and supportive
            - Keep responses conversational and helpful`
          },
          ...this.conversationHistory
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const assistantMessage = completion.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error('No response from OpenAI');
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      // Keep conversation history manageable (last 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return {
        id: `assistant-${Date.now()}`,
        content: assistantMessage,
        role: 'assistant',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error in simple chat service:', error);
      
      // Return a helpful fallback message
      return {
        id: `fallback-${Date.now()}`,
        content: "I'm having trouble connecting right now. Could you try rephrasing your question? I'm here to help you explore career opportunities!",
        role: 'assistant',
        timestamp: new Date()
      };
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [...this.conversationHistory];
  }
}

export const simpleChatService = new SimpleChatService(); 
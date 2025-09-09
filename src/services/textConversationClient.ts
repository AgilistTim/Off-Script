export type TextMessageHandler = (message: string) => void;

export interface TextConversationStartOptions {
  personaContext?: string;
  firstMessage?: string;
  sessionId?: string;
}

export type ConversationHistoryItem = { 
  role: 'user' | 'assistant' | 'tool'; 
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
};

export interface ITextConversationClient {
  start(options: TextConversationStartOptions): Promise<void>;
  sendUserMessage(text: string, history?: ConversationHistoryItem[]): Promise<void>;
  onMessage(handler: TextMessageHandler): void;
  end(): Promise<void>;
}

/**
 * Minimal OpenAI-based text conversation client that talks to a server proxy.
 * This stub is intentionally simple; it avoids any audio/media APIs.
 */
export class TextConversationClient implements ITextConversationClient {
  private messageHandler: TextMessageHandler | null = null;
  private started = false;
  private sessionId: string | undefined;
  private personaContext: string | undefined;

  constructor(private proxyUrl: string) {}

  async start(options: TextConversationStartOptions): Promise<void> {
    this.sessionId = options.sessionId;
    this.personaContext = options.personaContext;
    this.started = true;

    // If a firstMessage is provided, emit it immediately to mirror agent behavior
    if (options.firstMessage && this.messageHandler) {
      this.messageHandler(options.firstMessage);
    }

    // Optional: inform server that session started (non-blocking)
    try {
      console.log('🟢 [TEXT START] Client starting session:', {
        proxyUrl: this.proxyUrl,
        sessionId: this.sessionId,
        personaContextPresent: !!this.personaContext,
        personaContextLength: this.personaContext?.length || 0
      });
      await fetch(this.proxyUrl + '/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          personaContext: this.personaContext,
        }),
      });
    } catch {
      // best-effort
    }
  }

  onMessage(handler: TextMessageHandler) {
    this.messageHandler = handler;
  }

  async sendUserMessage(text: string, history?: ConversationHistoryItem[]): Promise<void> {
    if (!this.started) return;

    // Basic non-streaming call; can be upgraded to SSE/stream later
    console.log('💬 [TEXT MSG] Client sending:', {
      proxyUrl: this.proxyUrl,
      sessionId: this.sessionId,
      textPreview: text.substring(0, 120) + '...',
      personaContextPresent: !!this.personaContext,
      historyCount: Array.isArray(history) ? history.length : 0
    });
    const res = await fetch(this.proxyUrl + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, text, personaContext: this.personaContext, conversation_history: history })
    });
    if (!res.ok) throw new Error('Proxy message failed');
    const data = await res.json();
    const reply: string = data?.reply ?? '';
    if (reply && this.messageHandler) this.messageHandler(reply);
  }

  async end(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    try {
      await fetch(this.proxyUrl + '/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch {
      // ignore
    }
  }
}



# 🎙️ ElevenLabs Voice AI Setup Guide

## Overview

OffScript uses ElevenLabs' Conversational AI for natural voice conversations with:
- **AI speaks first** - Immediate personalized greetings
- **Natural turn management** - No buttons, just talk naturally  
- **Real AI responses** - Intelligent career guidance conversations
- **Persona-aware interactions** - Adapts to user personality in real-time

## ⚠️ Current Status

Your ElevenLabs integration is **not configured**. The app will show a setup screen until you complete the configuration below.

## Required Configuration

### 1. Get Your ElevenLabs API Key

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Sign up or log in to your account
3. Navigate to your **Profile Settings**
4. Generate an **API key**
5. Copy the API key

### 2. Replace Placeholder in .env

Open your `.env` file and replace:
```bash
# Current placeholder:
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Replace with your actual key:
VITE_ELEVENLABS_API_KEY=sk_your_actual_elevenlabs_api_key_here
```

### 3. Create Your Conversational AI Agent

1. In your ElevenLabs dashboard, navigate to **"Conversational AI"**
2. Click **"Create Agent"**
3. Configure your agent:

#### Basic Settings:
- **Name**: `OffScript Career Guide`
- **Voice**: Choose a warm, encouraging voice (e.g., Rachel, Sarah, or Josh)
- **Response Length**: Medium (30-60 words)

#### System Prompt:
```
You are an expert career counselor specializing in Gen Z career guidance.

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value
- Acknowledge user concerns genuinely

USER PERSONAS (adapt your communication style):
- overwhelmed_explorer: Provide structure, reassurance, break into simple steps
- skeptical_pragmatist: Be direct with proof and examples, focus on practical outcomes  
- curious_achiever: Offer growth opportunities, expand possibilities, provide mentorship

TOOLS AVAILABLE:
Use the client tools actively to detect user personas and adapt your responses in real-time.

Always start with understanding what makes time fly for them to identify natural interests and career strengths.
```

#### First Message:
```
Hey there! I'm your personal career guide. I'm here to help you explore what truly excites you about your future. What's been on your mind about your career lately?
```

4. **Save your agent** and copy the **Agent ID**

### 4. Add Agent ID to .env

Replace the placeholder in your `.env` file:
```bash
# Current placeholder:
VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here

# Replace with your actual agent ID:
VITE_ELEVENLABS_AGENT_ID=agent_1234567890abcdef
```

### 5. Restart Development Server

After updating your `.env` file:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

The app will now connect to your ElevenLabs agent and enable full voice AI features!

### 6. Features Enabled

✅ **AI Speaks First**: Agent automatically greets users with persona-specific messages  
✅ **Natural Turn Management**: Uses ElevenLabs VAD - no manual recording buttons  
✅ **Real AI Responses**: Native ElevenLabs conversational AI with streaming  
✅ **Persona Adaptation**: Dynamic conversation style based on user type detection  
✅ **Voice Activity Detection**: Automatic speech detection and interruption handling  
✅ **Client Tools**: Real-time persona updates and conversation flow control  

### 7. Testing the Integration

1. Start the development server: `npm run dev`
2. Navigate to the home page
3. Click "Start Conversation" 
4. The AI should speak first with a greeting
5. Start speaking naturally - no need to press any buttons
6. The system will detect your persona and adapt the conversation style

### 5. Troubleshooting

**"Agent ID not found"**: Verify your `VITE_ELEVENLABS_AGENT_ID` is correct and the agent exists in your ElevenLabs dashboard.

**"API Key invalid"**: Check that `VITE_ELEVENLABS_API_KEY` is set correctly in your `.env` file.

**"Microphone permission denied"**: Grant microphone access when prompted by the browser.

**"No audio output"**: Check browser audio settings and ensure ElevenLabs voice synthesis is working.

### 6. Persona Detection

The system detects three user personas automatically:

- **Overwhelmed Explorer** (20): Anxious about career choices, needs structured approach
- **Skeptical Pragmatist** (23): Demands proof and authenticity, wants concrete evidence  
- **Curious Achiever** (19): Eager to learn and grow, seeks advanced opportunities

Each persona gets adapted conversation styles, response lengths, and quick action suggestions.

## Implementation Details

- Uses `@elevenlabs/react` for conversation management
- Implements automatic microphone access and VAD
- Provides real-time status indicators (listening/speaking/thinking)
- Integrates with existing persona detection system
- Supports dynamic conversation variables and client tools
- Handles errors gracefully with fallback states 
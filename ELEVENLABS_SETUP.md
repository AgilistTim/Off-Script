# 🎙️ ElevenLabs Voice AI Setup Guide with MCP Integration

## Overview

OffScript uses ElevenLabs' Conversational AI for natural voice conversations with **MCP-enhanced career insights**:
- **AI speaks first** - Immediate personalized greetings
- **Natural turn management** - No buttons, just talk naturally  
- **Real AI responses** - Intelligent career guidance conversations
- **Persona-aware interactions** - Adapts to user personality in real-time
- **🚀 MCP-Enhanced Career Analysis** - Real-time career insight generation
- **Automated Career Cards** - Instant career recommendations during conversation

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

### 3. Create Your Enhanced Conversational AI Agent

1. In your ElevenLabs dashboard, navigate to **"Conversational AI"**
2. Click **"Create Agent"**
3. Configure your agent with MCP integration:

#### Basic Settings:
- **Name**: `OffScript Career Guide with MCP`
- **Voice**: Choose a warm, encouraging voice (e.g., Rachel, Sarah, or Josh)
- **Response Length**: Medium (30-60 words)

#### Enhanced System Prompt with MCP Tools:
```
You are an expert career counselor specializing in Gen Z career guidance with AI-powered insight generation.

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

MCP-ENHANCED TOOLS AVAILABLE:
Use these tools strategically during conversation to provide real-time career insights:

1. **analyze_conversation_for_careers** - Trigger when user mentions interests, activities, or career thoughts
   - Use after 2-3 exchanges to generate personalized career cards
   - Example: "Let me analyze what you've shared to find some personalized opportunities..."

2. **generate_career_recommendations** - Use when user expresses specific interests
   - Generates detailed UK career paths with salary data
   - Example: "Based on your interest in [field], let me create some targeted recommendations..."

3. **trigger_instant_insights** - Use for immediate analysis of user messages
   - Provides instant career matching based on latest response
   - Use when user shows excitement about specific topics

CONVERSATION FLOW:
1. Start with understanding what makes time fly for them
2. After 2-3 meaningful exchanges, use "analyze_conversation_for_careers"
3. When specific interests emerge, use "generate_career_recommendations"
4. Use "trigger_instant_insights" for real-time analysis of exciting topics

TIMING:
- Trigger analysis tools after gathering enough context
- Don't over-analyze - let conversation flow naturally
- Use tools when they add genuine value to the conversation

Remember: The tools generate visual career cards that appear automatically in the UI. Reference these when they're created!
```

#### First Message:
```
Hey there! I'm your AI career guide with real-time insights. I can analyze our conversation and instantly create personalized career cards for you. What's been on your mind about your future lately?
```

4. **Configure Client Tools** - Add these tool definitions in your agent's tool configuration:

```json
{
  "analyze_conversation_for_careers": {
    "description": "Analyzes conversation history to detect career interests and generate personalized career cards",
    "parameters": {
      "trigger_reason": {
        "type": "string",
        "description": "Reason for triggering analysis"
      }
    }
  },
  "generate_career_recommendations": {
    "description": "Generates detailed career recommendations with UK salary data and pathways",
    "parameters": {
      "interests": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Detected career interests"
      },
      "experience_level": {
        "type": "string",
        "description": "User experience level (beginner, intermediate, advanced)"
      }
    }
  },
  "trigger_instant_insights": {
    "description": "Provides instant career analysis for the current message",
    "parameters": {
      "user_message": {
        "type": "string",
        "description": "Current user message to analyze"
      }
    }
  }
}
```

5. **Save your agent** and copy the **Agent ID**

### 4. Add Agent ID to .env

Replace the placeholder in your `.env` file:
```bash
# Current placeholder:
VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here

# Replace with your actual agent ID:
VITE_ELEVENLABS_AGENT_ID=agent_1234567890abcdef
```

### 5. Enable MCP Enhancement

Add these to your `.env` file:
```bash
# Enable MCP-enhanced conversation analysis
VITE_ENABLE_MCP_ENHANCEMENT=true

# Enable MCP server (if running locally)
VITE_ENABLE_MCP_SERVER=true

# Force fallback mode (set to false to use real MCP server)
VITE_MCP_FALLBACK_MODE=false
```

### 6. Restart Development Server

After updating your `.env` file:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 7. Optional: Start MCP Server

For full MCP functionality (enhanced analysis):
```bash
# In a separate terminal
npm run start:mcp
```

The app will now connect to your ElevenLabs agent with MCP-enhanced career insights!

### 8. Enhanced Features Enabled

✅ **AI Speaks First**: Agent automatically greets users with persona-specific messages  
✅ **Natural Turn Management**: Uses ElevenLabs VAD - no manual recording buttons  
✅ **Real AI Responses**: Native ElevenLabs conversational AI with streaming  
✅ **Persona Adaptation**: Dynamic conversation style based on user type detection  
✅ **🚀 MCP-Enhanced Analysis**: Real-time career interest detection and card generation  
✅ **Automated Career Cards**: Visual career recommendations appear during conversation  
✅ **Smart Tool Usage**: AI automatically triggers analysis at optimal moments  
✅ **UK-Specific Data**: Salary ranges, pathways, and market insights for UK careers  

### 9. Testing the MCP Integration

1. Start the development server: `npm run dev`
2. Optionally start MCP server: `npm run start:mcp`
3. Navigate to the home page
4. Click "Start Conversation" 
5. The AI should speak first with a greeting
6. Start discussing your interests naturally
7. **Watch for career cards** to appear automatically as you talk
8. Career insights should generate after 2-3 meaningful exchanges

### 10. Expected Conversation Flow

```
AI: "Hey there! I'm your AI career guide with real-time insights..."
User: "I love working with computers and solving problems"
AI: "That's exciting! Programming and tech can be really rewarding..."
[Career cards automatically appear: Software Developer, Data Analyst, etc.]
AI: "I've just created some personalized career cards for you based on what you shared!"
```

### 11. Troubleshooting

**"Agent ID not found"**: Verify your `VITE_ELEVENLABS_AGENT_ID` is correct and the agent exists.

**"API Key invalid"**: Check that `VITE_ELEVENLABS_API_KEY` is set correctly in your `.env` file.

**"No career cards appearing"**: Ensure `VITE_ENABLE_MCP_ENHANCEMENT=true` in your `.env` file.

**"MCP analysis failing"**: Check browser console for errors and ensure MCP server is running if `VITE_MCP_FALLBACK_MODE=false`.

**"Tools not working"**: Verify tool definitions are correctly added to your ElevenLabs agent configuration.

## MCP Architecture

The enhanced system works as follows:

1. **User speaks** → ElevenLabs captures transcript
2. **AI responds** → ElevenLabs generates response using agent prompt
3. **AI triggers tools** → Client tools interface with MCP server
4. **MCP analyzes** → Real-time career interest detection and card generation
5. **UI updates** → Career cards appear automatically in the interface
6. **Conversation continues** → AI references generated insights in future responses

This creates a seamless voice + visual career guidance experience!

## Production Deployment

For production deployment, ensure:
- MCP server is deployed and accessible
- Environment variables are properly configured
- ElevenLabs agent is optimized for production usage
- Tool configurations are tested and validated 
# Off Script - AI Career Coaching Platform

A React application for discovering alternative UK career pathways without university debt.

## Key Features

- **🎙️ Voice AI Conversations**: Natural voice interactions with ElevenLabs Conversational AI
- **🧠 Real-time Career Analysis**: MCP-enhanced conversation analysis for instant insights
- **🎯 Smart Career Cards**: Automated generation of personalized UK career recommendations
- **📊 Comprehensive Data**: Salary ranges, pathways, and market insights
- **🔄 Intelligent Fallbacks**: Robust system that works even when advanced features are unavailable

## Architecture Overview

### Voice + AI Integration

- **ElevenLabs Conversational AI**: Natural voice conversations with persona-aware responses
- **MCP (Model Context Protocol)**: Advanced career analysis and insight generation
- **Real-time UI Updates**: Career cards appear automatically during conversations
- **Fallback Systems**: Multiple layers of reliability for consistent user experience

### Core Components

1. **Conversation Interface**: Unified chat supporting text, voice, and ElevenLabs AI
2. **MCP Server**: Standalone server providing enhanced career analysis tools
3. **Bridge Service**: Browser-compatible service connecting UI to MCP server
4. **Career Card System**: Real-time generation and display of career insights

## Quick Start

### 1. Basic Setup
```bash
git clone <repository-url>
cd off-script
npm install
cp env.example .env
```

### 2. Configure APIs
Edit `.env` with your API keys:
```bash
# Firebase (required)
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_PROJECT_ID=your-project-id

# OpenAI (required for MCP)
VITE_OPENAI_API_KEY=your-openai-key

# ElevenLabs (for voice AI)
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
VITE_ELEVENLABS_AGENT_ID=your-agent-id
```

### 3. Start Development
```bash
# Start main application
npm run dev

# Start MCP server (optional but recommended)
npm run start:mcp
```

### 4. Test Voice + AI Integration
1. Navigate to `http://localhost:5173`
2. Click "Start Conversation"
3. Talk about your career interests
4. Watch career cards appear automatically!

## ElevenLabs + MCP Integration

### Features

- **🚀 Enhanced Analysis**: AI-powered conversation analysis using OpenAI and MCP
- **🎯 Smart Career Matching**: Real-time career recommendations based on voice input
- **📊 UK-Specific Data**: Accurate salary ranges and pathways for UK careers
- **🔄 Automatic Triggers**: Career analysis happens naturally during conversation
- **🛡️ Fallback Support**: Works even without MCP server or with API failures

### How It Works

1. **User speaks** → ElevenLabs captures and transcribes
2. **AI responds** → ElevenLabs agent generates contextual responses
3. **Analysis triggers** → MCP server analyzes conversation for career interests
4. **Cards generate** → UK-specific career recommendations appear in UI
5. **Conversation continues** → AI references generated insights naturally

### Setup Guides

- **[ElevenLabs Setup Guide](ELEVENLABS_SETUP.md)**: Complete configuration with MCP tools
- **[MCP Testing Guide](TEST_MCP_INTEGRATION.md)**: Comprehensive testing instructions

## MCP (Model Context Protocol) Integration

This project includes an optional MCP server integration for enhanced conversation analysis and career insights generation.

### Features

- **Enhanced Conversation Analysis**: Advanced AI-powered analysis of user conversations to detect career interests with higher accuracy
- **Intelligent Career Card Generation**: Generates detailed, UK-specific career guidance cards with salary data, pathways, and next steps
- **Fallback Support**: Automatically falls back to standard analysis if MCP server is unavailable
- **Browser Compatible**: Works in browser environment with fallback modes for reliability

### MCP Server

The MCP server (`mcp-server/`) provides four main tools:

1. **analyze_conversation** - Analyzes conversation messages for career interests
2. **generate_career_insights** - Generates detailed career recommendations  
3. **update_user_profile** - Updates user profile with career insights
4. **get_user_preferences** - Retrieves user preferences for personalized responses

### Configuration

Add these environment variables to enable MCP features:

```env
# Enable MCP-enhanced conversation analysis (development feature)
VITE_ENABLE_MCP_ENHANCEMENT=true

# MCP Server URL for HTTP API mode
VITE_MCP_SERVER_URL=http://localhost:3001/mcp

# Force fallback mode for MCP bridge service
VITE_MCP_FALLBACK_MODE=false

# Enable MCP server auto-connection in development
VITE_ENABLE_MCP_SERVER=true
```

### Running the MCP Server

```bash
# Install MCP server dependencies
cd mcp-server && npm install

# Start the MCP server
npm start

# Or run in development mode with auto-restart
npm run dev
```

### Integration

The main application can optionally use MCP-enhanced analysis:

```typescript
// Example usage in conversation analysis
if (import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT === 'true') {
  const mcpInterests = await conversationAnalyzer.analyzeConversationWithMCP(
    messages, 
    userId
  );
  
  const mcpCareerCards = await conversationAnalyzer.generateCareerCardsWithMCP(
    mcpInterests, 
    userId
  );
}
```

The system automatically falls back to standard analysis if MCP is not available.

## User Experience Flow

### Standard Voice Conversation
```
1. User clicks "Start Conversation"
2. ElevenLabs AI speaks first with personalized greeting
3. User responds naturally via voice
4. AI provides career guidance and asks follow-up questions
5. Career cards appear automatically based on detected interests
6. Conversation continues with AI referencing generated insights
```

### Example Conversation
```
AI: "Hey there! I'm your AI career guide with real-time insights..."
User: "I love working with computers and solving problems"
AI: "That's exciting! Programming and tech can be really rewarding..."
[Career cards appear: Software Developer, Data Analyst, Web Developer]
AI: "I've just created some personalized career cards for you!"
```

## Development

### Project Structure
```
off-script/
├── src/                          # Main React application
│   ├── components/conversation/   # Voice and chat components
│   ├── services/                 # MCP bridge and analysis services
│   └── ...
├── mcp-server/                   # Standalone MCP server
│   ├── index.js                 # MCP server implementation
│   └── package.json            # Server dependencies
└── ELEVENLABS_SETUP.md         # Setup instructions
```

### Key Services
- **mcpBridgeService**: Browser-compatible interface to MCP server
- **conversationAnalyzer**: Enhanced with MCP integration
- **ElevenLabsConversation**: Voice AI component with MCP tools

### Testing
Run the comprehensive test suite:
```bash
# Follow the testing guide
cat TEST_MCP_INTEGRATION.md

# Test different scenarios
npm run test
```

## Production Deployment

### Standard Deployment
Follow the existing deployment process for the main application.

### MCP Server Deployment
For full MCP functionality in production:

1. Deploy MCP server to your hosting platform
2. Update `VITE_MCP_SERVER_URL` to point to deployed server
3. Ensure OpenAI API key is configured
4. Set `VITE_MCP_FALLBACK_MODE=false` for production

### Environment Variables Checklist
- [ ] Firebase configuration complete
- [ ] OpenAI API key configured
- [ ] ElevenLabs API key and Agent ID set
- [ ] MCP enhancement enabled (`VITE_ENABLE_MCP_ENHANCEMENT=true`)
- [ ] MCP server URL configured for production
- [ ] All fallback modes tested and verified

## Troubleshooting

### Common Issues

**No career cards appearing**:
- Verify `VITE_ENABLE_MCP_ENHANCEMENT=true`
- Check browser console for errors
- Ensure conversation has 2+ meaningful exchanges

**ElevenLabs not connecting**:
- Verify API key and Agent ID in `.env`
- Check microphone permissions
- Review ElevenLabs dashboard for agent status

**MCP server issues**:
- Ensure OpenAI API key is valid
- Check MCP server logs: `npm run start:mcp`
- Verify port 3001 is available

### Debug Mode
Enable detailed logging:
```bash
VITE_DEBUG=true npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test both standard and MCP-enhanced flows
4. Submit a pull request with testing notes

---

**Built with**: React, TypeScript, ElevenLabs, OpenAI, Firebase, Model Context Protocol

**For support**: Check the troubleshooting guides or review the comprehensive setup documentation. 
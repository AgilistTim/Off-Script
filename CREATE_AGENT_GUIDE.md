# 🤖 Programmatic ElevenLabs Agent Creation

This guide shows you how to programmatically create an ElevenLabs Conversational AI agent with MCP tools integration instead of manual configuration.

## Quick Start

### 1. Prerequisites

- ElevenLabs API key in your `.env` file
- Node.js 18+ installed
- Conversational AI access in your ElevenLabs account

### 2. Run the Script

```bash
# Create a new agent (or update existing)
npm run create-agent

# Replace existing agent with new one
npm run create-agent:replace

# View help and options
node scripts/createElevenLabsAgent.js --help
```

### 3. What the Script Does

The script automatically:

1. ✅ **Creates MCP Client Tools**:
   - `analyze_conversation_for_careers` - Triggers career analysis
   - `generate_career_recommendations` - Creates detailed career cards
   - `trigger_instant_insights` - Provides instant career matching

2. ✅ **Creates Enhanced Agent** with:
   - Optimized system prompt for career guidance
   - MCP tools integration for real-time insights
   - Persona-aware conversation flow
   - UK-specific career focus

3. ✅ **Updates Your Environment**:
   - Automatically updates `.env` with new agent ID
   - No manual copy-paste required

### 4. Agent Configuration

The created agent includes:

**Voice Settings:**
- Voice: Adam (9BWtsMINqrJLrRacOk9x)
- Language: English
- Response length: 30-60 words
- Interruptions: Enabled

**MCP Integration:**
- 3 client tools for career analysis
- Automatic tool triggering based on conversation flow
- Real-time career card generation

**Conversation Flow:**
1. AI greets user and asks about career interests
2. After 2-3 exchanges, triggers conversation analysis
3. Generates career cards based on detected interests
4. Continues conversation referencing generated insights

### 5. Example Output

```
🚀 Creating ElevenLabs Agent with MCP Integration

🔧 Creating MCP client tools...
Creating tool: analyze_conversation_for_careers
✅ Created tool: analyze_conversation_for_careers (ID: tool_abc123)
Creating tool: generate_career_recommendations
✅ Created tool: generate_career_recommendations (ID: tool_def456)
Creating tool: trigger_instant_insights
✅ Created tool: trigger_instant_insights (ID: tool_ghi789)

🤖 Creating ElevenLabs agent...
✅ Created agent: agent_xyz123
🔗 Agent URL: https://elevenlabs.io/app/conversational-ai/agents/agent_xyz123

📝 Updating .env file with new agent ID...
✅ Updated .env file with new agent ID

🎉 Agent creation completed successfully!

📋 Next steps:
1. Restart your development server: npm run dev
2. Start MCP server (optional): npm run start:mcp
3. Test the integration by clicking "Start Conversation"
4. Talk about your career interests and watch for career cards!

🔧 Agent Configuration:
Agent ID: agent_xyz123
Tools created: 3

🛠️  Created Tools:
  - analyze_conversation_for_careers (tool_abc123)
  - generate_career_recommendations (tool_def456)
  - trigger_instant_insights (tool_ghi789)
```

### 6. Testing the Integration

After running the script:

1. **Restart your dev server**: `npm run dev`
2. **Start MCP server** (optional): `npm run start:mcp`
3. **Navigate to your app** and click "Start Conversation"
4. **Test the flow**:
   ```
   YOU: "I love working with computers and solving problems"
   AI: "That's exciting! Programming and tech can be really rewarding..."
   [Career cards appear automatically]
   AI: "I've just created some personalized career cards for you!"
   ```

### 7. Troubleshooting

**API Key Issues:**
```bash
❌ Missing or invalid VITE_ELEVENLABS_API_KEY in .env file
```
- Verify your API key is correct in `.env`
- Ensure it's not the placeholder value

**Permission Issues:**
```bash
❌ API request failed: 403 - Forbidden
```
- Check your ElevenLabs account has Conversational AI access
- Verify sufficient credits in your account

**Tool Creation Fails:**
```bash
❌ Failed to create tool analyze_conversation_for_careers: ...
```
- Agent creation will continue without tools
- Tools can be added manually in ElevenLabs dashboard

### 8. Manual Verification

You can verify the agent was created correctly by:

1. **Visiting the ElevenLabs Dashboard**:
   - Go to Conversational AI > Agents
   - Find your "OffScript Career Guide with MCP" agent

2. **Checking Agent Settings**:
   - System prompt includes MCP tool instructions
   - Tools are listed in the agent configuration
   - First message is set correctly

3. **Testing in ElevenLabs**:
   - Use the test feature in ElevenLabs dashboard
   - Verify the agent responds appropriately
   - Check if tools are triggered during conversation

### 9. Customization

To customize the agent, edit `scripts/createElevenLabsAgent.js`:

- **Change voice**: Update `voice_id` in `agentConfig`
- **Modify system prompt**: Edit the `system_prompt` field
- **Adjust settings**: Update temperature, max_tokens, etc.
- **Add/remove tools**: Modify the `mcpTools` array

### 10. Production Deployment

For production:

1. Run the script in your production environment
2. Ensure the agent ID is correctly set in production `.env`
3. Deploy your MCP server if using enhanced analysis
4. Test the full integration in production

---

**Benefits of Programmatic Creation:**
- ✅ Consistent agent configuration
- ✅ Version controlled setup
- ✅ Easy replication across environments
- ✅ Automated tool integration
- ✅ No manual dashboard configuration needed

This approach ensures your ElevenLabs agent is always configured correctly and integrates seamlessly with your MCP-enhanced career guidance system! 
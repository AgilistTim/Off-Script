#!/usr/bin/env node

/**
 * ElevenLabs Agent Creation Script with MCP Integration
 * 
 * This script creates a new ElevenLabs Conversational AI agent with:
 * - MCP server integration for career analysis
 * - Client tools for real-time career insights
 * - Optimized prompts for career guidance
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io';
const API_KEY = process.env.VITE_ELEVENLABS_API_KEY;

// Helper function to make API requests
async function makeAPIRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Accept': 'application/json',
    'xi-api-key': API_KEY,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  return response.json();
}

// Enhanced agent configuration with MCP tools using proper conversationConfig structure
const agentConfig = {
  name: "OffScript Career Guide with MCP",
  
  // Proper conversationConfig structure per ElevenLabs API
  conversationConfig: {
    agent: {
      prompt: {
        prompt: `You are an expert career counselor specializing in Gen Z career guidance with AI-powered insight generation.

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

Remember: The tools generate visual career cards that appear automatically in the UI. Reference these when they're created!`
      },
      firstMessage: "Hey there! I'm your AI career guide with real-time insights. I can analyze our conversation and instantly create personalized career cards for you. What's been on your mind about your future lately?",
      language: "en"
    },
    tts: {
      voiceId: "9BWtsMINqrJLrRacOk9x" // Default to Adam voice
    },
    llm: {
      maxTokens: 150,
      temperature: 0.7
    },
    turnDetection: {
      type: "server_vad"
    },
    interruptions: true
  }
};

// MCP tools configuration for the agent
const mcpTools = [
  {
    name: "analyze_conversation_for_careers",
    description: "Analyzes conversation history to detect career interests and generate personalized career cards",
    type: "client",
    parameters: {
      type: "object",
      properties: {
        trigger_reason: {
          type: "string",
          description: "Reason for triggering analysis (e.g., 'user mentioned interests', 'detected career discussion')"
        }
      },
      required: ["trigger_reason"]
    },
    expects_response: false
  },
  {
    name: "generate_career_recommendations",
    description: "Generates detailed career recommendations with UK salary data and pathways",
    type: "client", 
    parameters: {
      type: "object",
      properties: {
        interests: {
          type: "array",
          items: { 
            type: "string",
            description: "Career interest or field mentioned by user"
          },
          description: "Detected career interests from conversation"
        },
        experience_level: {
          type: "string", 
          enum: ["beginner", "intermediate", "advanced"],
          description: "User's experience level"
        }
      },
      required: ["interests"]
    },
    expects_response: false
  },
  {
    name: "trigger_instant_insights",
    description: "Provides instant career analysis for the current message",
    type: "client",
    parameters: {
      type: "object", 
      properties: {
        user_message: {
          type: "string",
          description: "Current user message to analyze for career insights"
        }
      },
      required: ["user_message"]
    },
    expects_response: false
  }
];

async function createMCPTools() {
  console.log('🔧 Creating MCP client tools...');
  
  const createdTools = [];
  
  for (const tool of mcpTools) {
    try {
      console.log(`Creating tool: ${tool.name}`);
      
      const response = await makeAPIRequest('/v1/convai/tools', 'POST', {
        tool_config: {
          type: tool.type,
          name: tool.name,
          description: tool.description,
          expects_response: tool.expects_response,
          parameters: tool.parameters
        }
      });
      
      console.log(`✅ Created tool: ${tool.name} (ID: ${response.tool_id || response.id})`);
      createdTools.push(response);
      
    } catch (error) {
      console.error(`❌ Failed to create tool ${tool.name}:`, error.message);
    }
  }
  
  return createdTools;
}

async function createAgent(toolIds = []) {
  console.log('🤖 Creating ElevenLabs agent...');
  
  // Create the complete agent request structure
  const agentRequest = {
    name: agentConfig.name,
    conversation_config: agentConfig.conversationConfig,
    // Add tool references if tools were created
    ...(toolIds.length > 0 && { tool_ids: toolIds })
  };
  
  try {
    const response = await makeAPIRequest('/v1/convai/agents/create', 'POST', agentRequest);
    
    console.log(`✅ Created agent: ${response.agent_id || response.id}`);
    console.log(`🔗 Agent URL: https://elevenlabs.io/app/conversational-ai/agents/${response.agent_id || response.id}`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Failed to create agent:', error.message);
    throw error;
  }
}

async function updateEnvironmentFile(agentId) {
  console.log('📝 Updating .env file with new agent ID...');
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add VITE_ELEVENLABS_AGENT_ID
    const agentIdRegex = /^VITE_ELEVENLABS_AGENT_ID=.*$/m;
    const newAgentIdLine = `VITE_ELEVENLABS_AGENT_ID=${agentId}`;
    
    if (agentIdRegex.test(envContent)) {
      envContent = envContent.replace(agentIdRegex, newAgentIdLine);
    } else {
      envContent += `\n${newAgentIdLine}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with new agent ID');
    
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    console.log(`📋 Please manually add this to your .env file:\nVITE_ELEVENLABS_AGENT_ID=${agentId}`);
  }
}

async function deleteExistingAgent() {
  const existingAgentId = process.env.VITE_ELEVENLABS_AGENT_ID;
  
  if (!existingAgentId || existingAgentId === 'your_elevenlabs_agent_id_here') {
    console.log('ℹ️  No existing agent to delete');
    return;
  }
  
  try {
    console.log(`🗑️  Attempting to delete existing agent: ${existingAgentId}`);
    await makeAPIRequest(`/v1/convai/agents/${existingAgentId}`, 'DELETE');
    console.log('✅ Deleted existing agent');
  } catch (error) {
    console.log(`⚠️  Could not delete existing agent: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Creating ElevenLabs Agent with MCP Integration\n');
  
  // Validate API key
  if (!API_KEY || API_KEY === 'your_elevenlabs_api_key_here') {
    console.error('❌ Missing or invalid VITE_ELEVENLABS_API_KEY in .env file');
    console.log('Please add your ElevenLabs API key to .env:');
    console.log('VITE_ELEVENLABS_API_KEY=your_actual_api_key_here');
    process.exit(1);
  }
  
  try {
    // Step 1: Delete existing agent if requested
    if (process.argv.includes('--replace')) {
      await deleteExistingAgent();
    }
    
    // Step 2: Create MCP tools
    const tools = await createMCPTools();
    const toolIds = tools.map(tool => tool.tool_id || tool.id).filter(Boolean);
    
    // Step 3: Create the agent
    const agent = await createAgent(toolIds);
    
    // Step 4: Update environment file
    await updateEnvironmentFile(agent.agent_id || agent.id);
    
    console.log('\n🎉 Agent creation completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Start MCP server (optional): npm run start:mcp');
    console.log('3. Test the integration by clicking "Start Conversation"');
    console.log('4. Talk about your career interests and watch for career cards!');
    
    console.log('\n🔧 Agent Configuration:');
    console.log(`Agent ID: ${agent.agent_id || agent.id}`);
    console.log(`Tools created: ${toolIds.length}`);
    
    if (toolIds.length > 0) {
      console.log('\n🛠️  Created Tools:');
      tools.forEach(tool => {
        console.log(`  - ${tool.tool_name || tool.name || 'Unknown'} (${tool.tool_id || tool.id})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Agent creation failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check your API key is valid');
    console.log('2. Ensure you have sufficient ElevenLabs credits');
    console.log('3. Verify your account has Conversational AI access');
    console.log('4. Make sure Conversational AI features are enabled in your account');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node scripts/createElevenLabsAgent.js [options]

Options:
  --replace    Delete existing agent before creating new one
  --help       Show this help message

Environment Variables:
  VITE_ELEVENLABS_API_KEY     Your ElevenLabs API key (required)

Example:
  node scripts/createElevenLabsAgent.js --replace
`);
  process.exit(0);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createAgent, createMCPTools, mcpTools, agentConfig }; 
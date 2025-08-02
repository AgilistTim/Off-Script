#!/usr/bin/env node

/**
 * Add Tools to Existing ElevenLabs Agent
 * 
 * This script adds the necessary MCP tools to an existing agent
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io';
const API_KEY = process.env.VITE_ELEVENLABS_API_KEY;
const AGENT_ID = process.env.VITE_ELEVENLABS_AGENT_ID;

// Latest tool IDs (from most recent creation)
const TOOL_IDS = [
  'tool_1201k1nmz5tyeav9h3rejbs6xds1', // analyze_conversation_for_careers
  'tool_6401k1nmz60te5cbmnvytjtdqmgv', // generate_career_recommendations  
  'tool_5401k1nmz66eevwswve1q0rqxmwj', // trigger_instant_insights
  'tool_8501k1nmz6bves9syexedj36520r'  // update_person_profile (KEY for personal qualities)
];

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

async function addToolsToAgent() {
  console.log('🔧 Adding Tools to ElevenLabs Agent\n');
  
  // Validate inputs
  if (!API_KEY || API_KEY === 'your_elevenlabs_api_key_here') {
    console.error('❌ Missing or invalid VITE_ELEVENLABS_API_KEY in .env file');
    process.exit(1);
  }
  
  if (!AGENT_ID) {
    console.error('❌ Missing VITE_ELEVENLABS_AGENT_ID in .env file');
    process.exit(1);
  }

  try {
    // First, get current agent configuration
    console.log(`📋 Getting current agent configuration: ${AGENT_ID}`);
    const agent = await makeAPIRequest(`/v1/convai/agents/${AGENT_ID}`);
    console.log(`✅ Agent found: ${agent.name || 'Unknown'}`);
    
    // Add tools to agent
    console.log('🔧 Adding tools to agent...');
    const updateBody = {
      ...agent,
      tool_ids: TOOL_IDS
    };
    
    const updatedAgent = await makeAPIRequest(`/v1/convai/agents/${AGENT_ID}`, 'PATCH', updateBody);
    console.log('✅ Tools successfully added to agent!');
    
    console.log('\n🛠️  Added Tools:');
    TOOL_IDS.forEach((toolId, index) => {
      const toolNames = [
        'analyze_conversation_for_careers',
        'generate_career_recommendations',
        'trigger_instant_insights', 
        'update_person_profile (Personal Qualities) ⭐'
      ];
      console.log(`  - ${toolNames[index]}: ${toolId}`);
    });
    
    console.log('\n🎉 Agent is now ready with personal qualities extraction!');
    console.log('🚀 Test the integration by starting a voice conversation');
    
  } catch (error) {
    console.error('\n❌ Failed to add tools to agent:', error.message);
    console.log('\n📋 Manual Alternative:');
    console.log('1. Go to https://elevenlabs.io/app/conversational-ai/agents');
    console.log(`2. Find and edit agent: ${AGENT_ID}`);
    console.log('3. Add these tool IDs to the agent:');
    TOOL_IDS.forEach((toolId, index) => {
      const toolNames = [
        'analyze_conversation_for_careers',
        'generate_career_recommendations', 
        'trigger_instant_insights',
        'update_person_profile'
      ];
      console.log(`   - ${toolNames[index]}: ${toolId}`);
    });
    console.log('4. Save the agent configuration');
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  addToolsToAgent().catch(console.error);
}

export { addToolsToAgent };
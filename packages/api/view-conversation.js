#!/usr/bin/env node
// View a specific conversation in detail

import { db } from './database/supabase.js';

const sessionId = process.argv[2];

if (!sessionId) {
  console.log('\nUsage: node view-conversation.js <session-id>\n');
  console.log('Get session IDs by running: node view-database.js\n');
  process.exit(1);
}

try {
  console.log(`\n💬 Loading conversation for session: ${sessionId}\n`);
  console.log('='.repeat(80));

  const session = await db.getSession(sessionId);

  if (!session) {
    console.log('\n❌ Session not found\n');
    process.exit(1);
  }

  const simulation = session.simulations;

  console.log(`\n📋 SIMULATION: ${simulation.name}`);
  console.log(`\n📝 SCENARIO:`);
  console.log(`${simulation.scenario_text}\n`);

  console.log(`📊 SESSION INFO:`);
  console.log(`  State: ${session.state}`);
  console.log(`  Started: ${new Date(session.started_at).toLocaleString()}`);
  console.log(`  Messages: ${session.conversation_history.length}`);
  console.log(`  AI Mode: ${simulation.parameters.ai_mode}\n`);

  console.log('='.repeat(80));
  console.log('\n💬 CONVERSATION\n');

  session.conversation_history.forEach((msg, index) => {
    const role = msg.role === 'student' ? '👤 Student' : '🤖 AI Advisor';
    const time = new Date(msg.timestamp).toLocaleTimeString();

    console.log(`${role} [${time}]:`);
    console.log(`  ${msg.content}\n`);
  });

  console.log('='.repeat(80));
  console.log('');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.log('');
  process.exit(1);
}

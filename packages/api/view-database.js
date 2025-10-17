#!/usr/bin/env node
// View Database Contents - Quick inspection tool

import { db } from './database/supabase.js';

console.log('\n📊 Windo Database Contents\n');
console.log('='.repeat(60));

try {
  // Get all simulations
  const simulations = await db.listSimulations();

  console.log(`\n🎯 SIMULATIONS (${simulations.length} total)\n`);

  if (simulations.length === 0) {
    console.log('  (No simulations yet)');
  } else {
    for (const sim of simulations) {
      console.log(`  • ${sim.name}`);
      console.log(`    ID: ${sim.id}`);
      console.log(`    Created: ${new Date(sim.created_at).toLocaleString()}`);
      console.log(`    Actors: ${sim.actors.length}`);
      console.log(`    Objectives: ${sim.objectives.length}`);
      console.log(`    AI Mode: ${sim.parameters.ai_mode || 'challenger'}`);

      // Get sessions for this simulation
      const sessions = await db.listSessionsForSimulation(sim.id);
      console.log(`    Sessions: ${sessions.length}`);

      if (sessions.length > 0) {
        sessions.forEach(session => {
          console.log(`      - Session ${session.id.substring(0, 8)}...`);
          console.log(`        State: ${session.state}`);
          console.log(`        Messages: ${session.conversation_history.length}`);
          console.log(`        Started: ${new Date(session.started_at).toLocaleString()}`);
        });
      }

      console.log('');
    }
  }

  // Get total session count across all simulations
  let totalSessions = 0;
  let totalMessages = 0;

  for (const sim of simulations) {
    const sessions = await db.listSessionsForSimulation(sim.id);
    totalSessions += sessions.length;
    sessions.forEach(s => {
      totalMessages += s.conversation_history.length;
    });
  }

  console.log('='.repeat(60));
  console.log('\n📈 SUMMARY\n');
  console.log(`  Total Simulations: ${simulations.length}`);
  console.log(`  Total Sessions: ${totalSessions}`);
  console.log(`  Total Messages: ${totalMessages}`);
  console.log('');

} catch (error) {
  console.error('\n❌ Error accessing database:');
  console.error(error.message);
  console.log('\nMake sure the API server environment is properly configured.\n');
  process.exit(1);
}

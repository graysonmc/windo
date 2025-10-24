import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getFullSession() {
  // Get all Director logs for this session
  const { data: logs, error: logsError } = await supabase
    .from('director_logs')
    .select('*')
    .eq('session_id', '4c28943d-a106-47e5-86a1-70f0dddf8fa9')
    .order('message_number', { ascending: true });

  if (logsError) {
    console.error('Error:', logsError);
    return;
  }

  console.log('\n=== DIRECTOR ANALYSIS PROGRESSION ===\n');

  logs.forEach(log => {
    console.log(`Message #${log.message_number}:`);
    console.log(`  Phase: ${log.analysis.current_phase}`);
    console.log(`  State: ${log.analysis.student_state}`);
    console.log(`  Confidence: ${log.analysis.confidence}`);
    console.log(`  Suggestion: ${log.analysis.suggestion}`);
    console.log(`  Reasoning: ${log.analysis.reasoning}`);
    console.log(`  Cost: $${log.analysis.cost} | Latency: ${log.analysis.latency_ms}ms\n`);
  });

  // Calculate totals
  const totalCost = logs.reduce((sum, log) => sum + log.analysis.cost, 0);
  const avgLatency = logs.reduce((sum, log) => sum + log.analysis.latency_ms, 0) / logs.length;

  console.log('=== METRICS SUMMARY ===');
  console.log(`Total Director calls: ${logs.length}`);
  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Average latency: ${Math.round(avgLatency)}ms`);
  console.log(`Cost per message: $${(totalCost / logs.length).toFixed(6)}`);

  // Also get session conversation for context
  const { data: session, error: sessionError } = await supabase
    .from('simulation_sessions')
    .select('conversation_history')
    .eq('id', '4c28943d-a106-47e5-86a1-70f0dddf8fa9')
    .single();

  if (!sessionError && session) {
    console.log('\n=== CONVERSATION CONTEXT ===');
    const messages = session.conversation_history.messages || [];
    messages.slice(-6).forEach((msg, i) => {
      const role = msg.role === 'student' ? 'STUDENT' : 'AI';
      console.log(`\n${i+1}. ${role}: ${msg.content.substring(0, 150)}...`);
    });
  }
}

getFullSession();
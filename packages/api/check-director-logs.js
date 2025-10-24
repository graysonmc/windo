import { supabase } from './database/supabase.js';

async function checkDirectorLogs() {
  const { data, error } = await supabase
    .from('director_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching director logs:', error);
    return;
  }

  console.log(`\nFound ${data.length} director log(s):\n`);
  data.forEach((log, i) => {
    console.log(`Log #${i + 1}:`);
    console.log(`  Session: ${log.session_id}`);
    console.log(`  Message #: ${log.message_number}`);
    console.log(`  Phase: ${log.analysis.current_phase}`);
    console.log(`  State: ${log.analysis.student_state}`);
    console.log(`  Suggestion: ${log.analysis.suggestion}`);
    console.log(`  Confidence: ${log.analysis.confidence}`);
    console.log(`  Cost: $${log.analysis.cost}`);
    console.log(`  Latency: ${log.analysis.latency_ms}ms`);
    console.log(`  Created: ${log.created_at}\n`);
  });
}

checkDirectorLogs();

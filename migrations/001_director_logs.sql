-- Migration: Add director_logs table for Director Prototype
-- Purpose: Store Director AI analysis and suggestions during prototype validation
-- Created: 2025-10-23
-- Sprint: Director Prototype Sprint

-- Create director_logs table
CREATE TABLE IF NOT EXISTS director_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  message_number INTEGER NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_director_logs_session
  ON director_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_director_logs_simulation
  ON director_logs(simulation_id);

CREATE INDEX IF NOT EXISTS idx_director_logs_created
  ON director_logs(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE director_logs IS 'Stores Director AI analysis and intervention suggestions during prototype phase';
COMMENT ON COLUMN director_logs.session_id IS 'Reference to the simulation session being analyzed';
COMMENT ON COLUMN director_logs.message_number IS 'The message number in the conversation when this analysis was performed';
COMMENT ON COLUMN director_logs.analysis IS 'JSONB containing: phase, studentState, suggestion, confidence, reasoning, cost, latency_ms';

-- Sample query to view Director logs for a session:
-- SELECT
--   message_number,
--   analysis->>'current_phase' as phase,
--   analysis->>'student_state' as state,
--   analysis->>'suggestion' as suggestion,
--   analysis->>'confidence' as confidence,
--   created_at
-- FROM director_logs
-- WHERE session_id = 'your-session-id'
-- ORDER BY message_number;

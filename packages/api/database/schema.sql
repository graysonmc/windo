-- Windo Database Schema
-- This file contains the complete database structure for the Windo platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SIMULATIONS TABLE
-- Stores the reusable simulation configurations created by professors
-- ============================================================================
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scenario content
    scenario_text TEXT NOT NULL,

    -- Structured configuration (JSONB for flexibility)
    actors JSONB NOT NULL DEFAULT '[]',
    -- Format: [{ id, name, role, is_student_role, personality_mode, knowledge_level }]

    objectives JSONB NOT NULL DEFAULT '[]',
    -- Format: ["Strategic Thinking", "Ethical Reasoning", ...]

    parameters JSONB NOT NULL DEFAULT '{}',
    -- Format: { duration, ai_mode, complexity, narrative_freedom }

    -- Metadata
    created_by VARCHAR(255), -- Future: FK to users table
    is_template BOOLEAN DEFAULT FALSE,
    template_category VARCHAR(100),
    usage_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SIMULATION_SESSIONS TABLE
-- Stores individual student conversation sessions
-- ============================================================================
CREATE TABLE simulation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,

    -- Session data
    conversation_history JSONB NOT NULL DEFAULT '[]',
    -- Format: [{ role, content, timestamp }]

    -- State tracking
    state VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Values: 'active', 'completed', 'abandoned'

    -- Metadata
    student_id VARCHAR(255), -- Future: FK to users table

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_simulations_created_by ON simulations(created_by);
CREATE INDEX idx_simulations_is_template ON simulations(is_template);
CREATE INDEX idx_simulations_created_at ON simulations(created_at DESC);

CREATE INDEX idx_sessions_simulation_id ON simulation_sessions(simulation_id);
CREATE INDEX idx_sessions_student_id ON simulation_sessions(student_id);
CREATE INDEX idx_sessions_state ON simulation_sessions(state);
CREATE INDEX idx_sessions_started_at ON simulation_sessions(started_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_simulations_updated_at
    BEFORE UPDATE ON simulations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update last_activity_at on session updates
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_last_activity
    BEFORE UPDATE ON simulation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE simulations IS 'Reusable simulation configurations created by professors';
COMMENT ON TABLE simulation_sessions IS 'Individual student conversation sessions';

COMMENT ON COLUMN simulations.actors IS 'Array of actor configurations with roles, personalities, and knowledge levels';
COMMENT ON COLUMN simulations.objectives IS 'Array of learning objective names';
COMMENT ON COLUMN simulations.parameters IS 'Simulation behavior parameters (duration, ai_mode, complexity)';

COMMENT ON COLUMN simulation_sessions.conversation_history IS 'Complete conversation log between student and AI';
COMMENT ON COLUMN simulation_sessions.state IS 'Session state: active, completed, or abandoned';

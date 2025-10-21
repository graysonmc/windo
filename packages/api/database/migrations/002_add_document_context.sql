-- ============================================================================
-- ADD DOCUMENT CONTEXT TO SIMULATIONS
-- Enables using document content and instructions during simulation runtime
-- ============================================================================

-- Add document context fields to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS document_context JSONB DEFAULT '{}';

COMMENT ON COLUMN simulations.document_context IS 'Cached document data for runtime context including raw text, analysis, and instructions';

-- Structure of document_context:
-- {
--   "raw_text": "Full extracted text from the document",
--   "summary": "AI-generated summary",
--   "key_points": ["key point 1", "key point 2"],
--   "instructions": "Processing instructions used",
--   "metadata": {
--     "file_name": "original_file.pdf",
--     "file_type": "pdf",
--     "uploaded_at": "timestamp",
--     "uploaded_by": "user"
--   }
-- }

-- Add index for simulations with document context
CREATE INDEX IF NOT EXISTS idx_simulations_has_document_context
ON simulations ((document_context IS NOT NULL));

-- ============================================================================
-- ADD SETUP CONTEXT TO SIMULATIONS
-- Store the complete setup configuration used to create the simulation
-- ============================================================================

ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS setup_context JSONB DEFAULT '{}';

COMMENT ON COLUMN simulations.setup_context IS 'Complete setup configuration including AI mode, triggers, personality settings, and custom instructions';

-- Structure of setup_context:
-- {
--   "ai_mode": "custom",
--   "personality": {
--     "tone": "professional",
--     "challenge_level": "high",
--     "empathy": 0.3,
--     "formality": 0.8
--   },
--   "triggers": [
--     {
--       "condition": "student mentions X",
--       "action": "introduce concept Y"
--     }
--   ],
--   "custom_instructions": "Additional behavior instructions",
--   "document_instructions": "How to use the document context"
-- }

-- ============================================================================
-- UPDATE SIMULATION SESSIONS TO TRACK DOCUMENT USAGE
-- ============================================================================

ALTER TABLE simulation_sessions
ADD COLUMN IF NOT EXISTS document_context_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS context_references JSONB DEFAULT '[]';

COMMENT ON COLUMN simulation_sessions.document_context_used IS 'Whether document context was provided to the AI during this session';
COMMENT ON COLUMN simulation_sessions.context_references IS 'Array tracking when and how document context was referenced in responses';

-- ============================================================================
-- CREATE FUNCTION TO POPULATE DOCUMENT CONTEXT
-- Automatically populate document context when linking document to simulation
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_document_context()
RETURNS TRIGGER AS $$
DECLARE
    doc_record RECORD;
    context_data JSONB;
BEGIN
    -- Only populate if source_document_id is set and document_context is empty
    IF NEW.source_document_id IS NOT NULL AND
       (NEW.document_context IS NULL OR NEW.document_context = '{}') THEN

        -- Fetch document data
        SELECT * INTO doc_record
        FROM documents
        WHERE id = NEW.source_document_id;

        IF FOUND THEN
            -- Build context data
            -- IMPORTANT: Only include raw_text for runtime context
            -- AI analysis (summary, keyPoints, etc) is ONLY for setup/configuration
            context_data := jsonb_build_object(
                'raw_text', doc_record.raw_text,  -- PRIMARY: The actual document text
                'instructions', COALESCE(doc_record.processing_instructions, ''),
                'metadata', jsonb_build_object(
                    'file_name', doc_record.file_name,
                    'file_type', doc_record.file_type,
                    'uploaded_at', doc_record.uploaded_at,
                    'uploaded_by', doc_record.uploaded_by
                )
                -- NOTE: We intentionally exclude AI analysis fields here
                -- (summary, key_points, actors, objectives, decisions)
                -- These are only used for setup configuration, not runtime
            );

            -- Update the document_context
            NEW.document_context := context_data;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate document context
CREATE TRIGGER populate_document_context_trigger
    BEFORE INSERT OR UPDATE OF source_document_id ON simulations
    FOR EACH ROW
    EXECUTE FUNCTION populate_document_context();

-- ============================================================================
-- HELPER FUNCTIONS FOR DOCUMENT CONTEXT
-- ============================================================================

-- Function to update document context for existing simulation
CREATE OR REPLACE FUNCTION update_simulation_document_context(
    sim_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    doc_id UUID;
    doc_record RECORD;
    context_data JSONB;
BEGIN
    -- Get the source document ID
    SELECT source_document_id INTO doc_id
    FROM simulations
    WHERE id = sim_id;

    IF doc_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fetch document data
    SELECT * INTO doc_record
    FROM documents
    WHERE id = doc_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Build context data
    context_data := jsonb_build_object(
        'raw_text', doc_record.raw_text,
        'summary', COALESCE(doc_record.analysis->>'summary', ''),
        'key_points', COALESCE(doc_record.analysis->'keyPoints', '[]'::jsonb),
        'actors', COALESCE(doc_record.analysis->'actors', '[]'::jsonb),
        'objectives', COALESCE(doc_record.analysis->'objectives', '[]'::jsonb),
        'decisions', COALESCE(doc_record.analysis->'decisions', '[]'::jsonb),
        'instructions', COALESCE(doc_record.processing_instructions, ''),
        'metadata', jsonb_build_object(
            'file_name', doc_record.file_name,
            'file_type', doc_record.file_type,
            'uploaded_at', doc_record.uploaded_at,
            'uploaded_by', doc_record.uploaded_by
        )
    );

    -- Update the simulation
    UPDATE simulations
    SET document_context = context_data
    WHERE id = sim_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get relevant document excerpts for a query
CREATE OR REPLACE FUNCTION get_document_excerpts(
    sim_id UUID,
    query_text TEXT,
    max_excerpts INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
    doc_context JSONB;
    raw_text TEXT;
    excerpts JSONB[];
    sentences TEXT[];
    sentence TEXT;
    i INTEGER;
BEGIN
    -- Get document context
    SELECT document_context INTO doc_context
    FROM simulations
    WHERE id = sim_id;

    IF doc_context IS NULL OR doc_context = '{}' THEN
        RETURN '[]'::jsonb;
    END IF;

    raw_text := doc_context->>'raw_text';

    IF raw_text IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Split into sentences (simple approach)
    sentences := string_to_array(raw_text, '. ');

    -- Find sentences containing query terms (simple matching)
    i := 0;
    FOREACH sentence IN ARRAY sentences
    LOOP
        IF i >= max_excerpts THEN
            EXIT;
        END IF;

        IF position(lower(query_text) IN lower(sentence)) > 0 THEN
            excerpts := array_append(excerpts, to_jsonb(sentence || '.'));
            i := i + 1;
        END IF;
    END LOOP;

    IF array_length(excerpts, 1) IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN to_jsonb(excerpts);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION populate_document_context() IS 'Automatically populates document_context field when a document is linked to a simulation';
COMMENT ON FUNCTION update_simulation_document_context(UUID) IS 'Manually update document context for a simulation from its source document';
COMMENT ON FUNCTION get_document_excerpts(UUID, TEXT, INTEGER) IS 'Get relevant excerpts from document context based on a query';
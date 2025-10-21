-- ============================================================================
-- WINDO DOCUMENT SYSTEM MIGRATION
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: DOCUMENTS TABLE
-- Stores uploaded documents and their processed content
-- ============================================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, docx, txt
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL, -- size in bytes

    -- Storage options (we store processed data, not raw file)
    raw_text TEXT, -- Extracted text from the document

    -- OpenAI analysis results
    analysis JSONB NOT NULL DEFAULT '{}',
    -- Format: {
    --   summary: string,
    --   keyPoints: string[],
    --   suggestedScenario: string,
    --   actors: string[],
    --   objectives: string[],
    --   decisions: string[]
    -- }

    -- Processing metadata
    processing_instructions TEXT, -- Custom instructions provided during upload
    processing_status VARCHAR(50) DEFAULT 'completed',
    -- Values: 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT, -- Error message if processing failed

    -- Relationships
    simulation_id UUID REFERENCES simulations(id) ON DELETE SET NULL,
    -- Link to simulation if document was used to create one

    -- User tracking
    uploaded_by VARCHAR(255), -- Future: FK to users table

    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- DOCUMENT_VERSIONS TABLE (Optional - for tracking document edits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Version data
    raw_text TEXT,
    analysis JSONB DEFAULT '{}',
    processing_instructions TEXT,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint on document and version
    UNIQUE(document_id, version_number)
);

-- ============================================================================
-- Add document_id to simulations table to track source document
-- ============================================================================
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN simulations.source_document_id IS 'Reference to the source document used to create this simulation';

-- ============================================================================
-- INDEXES FOR DOCUMENTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_simulation_id ON documents(simulation_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- ============================================================================
-- PART 2: DOCUMENT CONTEXT FOR SIMULATIONS
-- ============================================================================

-- Add document context fields to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS document_context JSONB DEFAULT '{}';

COMMENT ON COLUMN simulations.document_context IS 'Cached document data for runtime context including raw text, analysis, and instructions';

-- Add setup context to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS setup_context JSONB DEFAULT '{}';

COMMENT ON COLUMN simulations.setup_context IS 'Complete setup configuration including AI mode, triggers, personality settings, and custom instructions';

-- Add index for simulations with document context
CREATE INDEX IF NOT EXISTS idx_simulations_has_document_context
ON simulations ((document_context IS NOT NULL));

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

            -- Update the document_context
            NEW.document_context := context_data;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate document context
DROP TRIGGER IF EXISTS populate_document_context_trigger ON simulations;
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE documents IS 'Stores uploaded documents and their AI-processed analysis';
COMMENT ON TABLE document_versions IS 'Tracks version history of document processing';

COMMENT ON COLUMN documents.raw_text IS 'Extracted text content from the uploaded document';
COMMENT ON COLUMN documents.analysis IS 'OpenAI GPT-4 analysis results including summary, key points, and suggested scenario';
COMMENT ON COLUMN documents.processing_instructions IS 'Custom instructions provided by user for AI processing';
COMMENT ON COLUMN documents.simulation_id IS 'Link to simulation created from this document';

COMMENT ON FUNCTION populate_document_context() IS 'Automatically populates document_context field when a document is linked to a simulation';
COMMENT ON FUNCTION update_simulation_document_context(UUID) IS 'Manually update document context for a simulation from its source document';

-- ============================================================================
-- GRANT PERMISSIONS (Important for Supabase)
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_versions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (if needed for public access)
GRANT SELECT ON documents TO anon;
GRANT SELECT ON document_versions TO anon;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - uncomment if you want to enable RLS)
-- ============================================================================

-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- -- Example RLS policies (customize as needed)
-- CREATE POLICY "Users can view their own documents" ON documents
--     FOR SELECT USING (uploaded_by = auth.uid()::text OR uploaded_by = 'anonymous');

-- CREATE POLICY "Users can insert their own documents" ON documents
--     FOR INSERT WITH CHECK (uploaded_by = auth.uid()::text OR uploaded_by = 'anonymous');

-- CREATE POLICY "Users can update their own documents" ON documents
--     FOR UPDATE USING (uploaded_by = auth.uid()::text OR uploaded_by = 'anonymous');

-- CREATE POLICY "Users can delete their own documents" ON documents
--     FOR DELETE USING (uploaded_by = auth.uid()::text OR uploaded_by = 'anonymous');

-- ============================================================================
-- VERIFICATION QUERY - Run this after migration to check everything worked
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  ✓ documents';
    RAISE NOTICE '  ✓ document_versions';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated tables:';
    RAISE NOTICE '  ✓ simulations (added document_context, setup_context, source_document_id)';
    RAISE NOTICE '  ✓ simulation_sessions (added document_context_used, context_references)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '  ✓ populate_document_context()';
    RAISE NOTICE '  ✓ update_simulation_document_context()';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the document upload system!';
    RAISE NOTICE '===========================================';
END $$;
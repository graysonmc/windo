-- ============================================================================
-- DOCUMENTS TABLE MIGRATION
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
    -- Rationale: Processed data is more useful for AI analysis and reduces storage
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
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_simulation_id ON documents(simulation_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to auto-increment version number
CREATE OR REPLACE FUNCTION get_next_document_version(doc_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM document_versions
    WHERE document_id = doc_id;

    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_accessed_at when document is read
CREATE OR REPLACE FUNCTION update_document_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE documents
    SET last_accessed_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would need to be activated by application logic
-- when documents are accessed

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE documents IS 'Stores uploaded documents and their AI-processed analysis';
COMMENT ON TABLE document_versions IS 'Tracks version history of document processing';

COMMENT ON COLUMN documents.raw_text IS 'Extracted text content from the uploaded document';
COMMENT ON COLUMN documents.analysis IS 'OpenAI GPT-4 analysis results including summary, key points, and suggested scenario';
COMMENT ON COLUMN documents.processing_instructions IS 'Custom instructions provided by user for AI processing';
COMMENT ON COLUMN documents.simulation_id IS 'Link to simulation created from this document';
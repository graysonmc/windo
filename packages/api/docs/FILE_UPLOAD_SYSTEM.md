# File Upload and Document Storage System

## Overview

The Windo platform now includes a comprehensive file upload and document storage system that allows professors to upload case study documents (PDF, DOCX, TXT) and automatically extract relevant information for creating simulations.

## Key Features

- **Multiple file format support**: PDF, DOCX/DOC, and TXT files
- **AI-powered content extraction**: Uses OpenAI GPT-4 to analyze documents and extract key information
- **Database persistence**: Documents and their analysis are stored in the database for future reference
- **Automatic simulation creation**: Create simulations directly from uploaded documents
- **Version tracking**: Support for document versioning (future feature)

## Database Schema

### Documents Table
```sql
documents
├── id (UUID, primary key)
├── file_name (VARCHAR)
├── file_type (VARCHAR) - pdf, docx, txt
├── mime_type (VARCHAR)
├── file_size (INTEGER) - in bytes
├── raw_text (TEXT) - extracted text
├── analysis (JSONB) - AI analysis results
│   ├── summary
│   ├── keyPoints[]
│   ├── suggestedScenario
│   ├── actors[]
│   ├── objectives[]
│   └── decisions[]
├── processing_instructions (TEXT)
├── processing_status (VARCHAR) - pending, processing, completed, failed
├── processing_error (TEXT)
├── simulation_id (UUID, foreign key)
├── uploaded_by (VARCHAR)
├── uploaded_at (TIMESTAMP)
├── processed_at (TIMESTAMP)
└── last_accessed_at (TIMESTAMP)
```

## API Endpoints

### 1. Parse File (with optional save)
**POST** `/api/setup/parse-file`

Upload and process a document, optionally saving to database.

**Request:**
- Form Data:
  - `file`: The document file (required)
  - `document_instructions`: Instructions for AI processing (optional)
  - `save_to_database`: "true" to persist document (optional)
  - `uploaded_by`: User identifier (optional)

**Response:**
```json
{
  "success": true,
  "parsed": { /* scenario parsing results */ },
  "document": {
    "id": "uuid-here",
    "fileName": "case-study.pdf",
    "fileType": "application/pdf",
    "extractedLength": 5000,
    "saved": true,
    "analysis": { /* AI analysis results */ }
  }
}
```

### 2. List Documents
**GET** `/api/documents`

Retrieve all documents with optional filtering.

**Query Parameters:**
- `uploaded_by`: Filter by uploader
- `file_type`: Filter by file type (pdf, docx, txt)
- `processing_status`: Filter by status
- `simulation_id`: Filter by linked simulation

**Response:**
```json
{
  "success": true,
  "count": 10,
  "documents": [/* array of document objects */]
}
```

### 3. Get Document
**GET** `/api/documents/:id`

Retrieve a specific document by ID.

**Response:**
```json
{
  "success": true,
  "document": { /* full document object */ }
}
```

### 4. Delete Document
**DELETE** `/api/documents/:id`

Delete a document from the database.

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 5. Create Simulation from Document
**POST** `/api/documents/:id/create-simulation`

Create a new simulation using a stored document.

**Request Body:**
```json
{
  "name": "Simulation Name",
  "instructions": "AI behavior instructions",
  "actors": [/* optional custom actors */],
  "objectives": [/* optional custom objectives */],
  "parameters": {
    "duration": 25,
    "ai_mode": "socratic",
    "complexity": "adaptive"
  }
}
```

**Response:**
```json
{
  "success": true,
  "simulationId": "uuid-here",
  "simulation": { /* simulation object */ },
  "document": {
    "id": "doc-uuid",
    "name": "document.pdf"
  }
}
```

### 6. Upload and Create Simulation (All-in-One)
**POST** `/api/setup/upload-and-create-simulation`

Upload a document, process it, save to database, and create a simulation in one request.

**Request:**
- Form Data:
  - `file`: The document file (required)
  - `document_instructions`: Instructions for document processing
  - `simulation_name`: Name for the simulation
  - `simulation_instructions`: AI behavior instructions
  - `uploaded_by`: User identifier
  - `actors`: JSON string of actors array
  - `objectives`: JSON string of objectives array
  - `parameters`: JSON string of parameters object

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded and simulation created successfully",
  "document": {
    "id": "doc-uuid",
    "fileName": "case-study.pdf",
    "analysis": { /* AI analysis */ }
  },
  "simulation": {
    "id": "sim-uuid",
    "name": "Simulation Name",
    "actors": [],
    "objectives": []
  }
}
```

## File Processing Flow

1. **Upload**: File is received via multipart form data
2. **Validation**: File type and size are validated (max 10MB)
3. **Text Extraction**:
   - TXT: Direct UTF-8 conversion
   - PDF: Extracted using `pdf-parse` library
   - DOCX: Extracted using `mammoth` library
4. **AI Analysis**: OpenAI GPT-4 analyzes the text to extract:
   - Summary
   - Key points and themes
   - Suggested scenario description
   - Identified stakeholders/actors
   - Learning objectives
   - Key decisions or dilemmas
5. **Database Storage**: Document and analysis are stored
6. **Simulation Creation** (optional): Simulation is created from the analysis

## Storage Strategy

**What We Store:**
- Processed/extracted text (not raw file bytes)
- AI analysis results
- File metadata (name, type, size)
- Processing status and errors

**Why This Approach:**
1. **Efficiency**: Storing processed text is more useful for AI operations
2. **Storage savings**: Text is smaller than binary files
3. **Query capability**: Can search and index text content
4. **Reprocessing**: Can re-analyze stored text with different instructions

## Testing

Run the test suite to verify functionality:

```bash
cd packages/api
node test/test-document-upload.js
```

The test suite covers:
- Basic file upload without database save
- Upload with database persistence
- Document retrieval
- Document listing with filters
- Creating simulations from documents
- All-in-one upload and simulation creation

## Implementation Files

- **API Routes**: `/packages/api/server.js:99-436`
- **Document Processor**: `/packages/api/services/document-processor.js`
- **Database Functions**: `/packages/api/database/supabase.js:218-381`
- **Database Schema**: `/packages/api/database/migrations/001_add_documents_table.sql`
- **Test Suite**: `/packages/api/test/test-document-upload.js`

## Future Enhancements

1. **Binary File Storage**: Option to store original files in cloud storage (S3, etc.)
2. **Advanced Versioning**: Track changes and allow rollbacks
3. **Batch Processing**: Upload multiple files at once
4. **Background Processing**: Queue system for large files
5. **Full-Text Search**: Elasticsearch integration for document search
6. **File Preview**: Generate thumbnails and previews
7. **Export Formats**: Download documents in various formats

## Security Considerations

- File type validation prevents arbitrary file uploads
- Size limits (10MB) prevent DoS attacks
- Text extraction happens server-side (no client-side processing)
- Processed content is sanitized before storage
- Database queries use parameterized statements

## Error Handling

The system handles various error scenarios:
- Invalid file types return 400 error
- Processing failures are logged and stored
- Database errors don't crash the application
- Failed documents can still be saved with error status
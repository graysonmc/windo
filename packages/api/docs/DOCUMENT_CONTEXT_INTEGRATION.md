# Document Context Integration for Simulations

## Overview

The Windo platform now fully integrates uploaded documents into the simulation runtime, allowing the AI advisor to reference specific details from case studies and provide more grounded, contextual responses. Documents and their processing instructions are used both for auto-populating setup configurations and as live context during simulations.

## Key Features

### 1. Setup Auto-Population from Documents
When uploading a document, the system can automatically:
- Extract stakeholders and map them to simulation actors
- Identify learning objectives
- Suggest AI behavior modes based on content
- Generate contextual triggers based on key decisions
- Pre-fill scenario descriptions with document summaries

### 2. Runtime Document Context
During simulation sessions, the AI:
- Has access to the full document text
- Can reference specific names, numbers, and situations
- Finds relevant excerpts based on student questions
- Uses document instructions to guide behavior
- Tracks when document context influences responses

### 3. Intelligent Context Retrieval
The system implements smart excerpt matching:
- Analyzes student questions for key terms
- Searches document for relevant passages
- Provides top 3 most relevant excerpts to AI
- Weights matches by term frequency and uniqueness

## Database Schema Updates

### Simulations Table
```sql
-- New columns added
document_context JSONB    -- Cached document data for runtime
setup_context JSONB        -- Complete setup configuration
source_document_id UUID    -- Link to source document
```

### Document Context Structure
```json
{
  "raw_text": "Full document text",
  "summary": "AI-generated summary",
  "key_points": ["point1", "point2"],
  "actors": ["stakeholder1", "stakeholder2"],
  "objectives": ["objective1", "objective2"],
  "decisions": ["decision1", "decision2"],
  "instructions": "Processing instructions",
  "metadata": {
    "file_name": "case-study.pdf",
    "file_type": "pdf",
    "uploaded_at": "2024-01-20T10:00:00Z",
    "uploaded_by": "professor123"
  }
}
```

### Simulation Sessions Table
```sql
-- New columns added
document_context_used BOOLEAN     -- Track if document was used
context_references JSONB          -- Log of context usage
```

## API Endpoints

### 1. Parse Document for Setup
**POST** `/api/setup/parse-document-for-setup`

Analyzes a document specifically for setup auto-population.

**Request:**
- Form Data:
  - `file`: Document file
  - `custom_instructions`: Optional processing instructions

**Response:**
```json
{
  "success": true,
  "setup": {
    "name": "Suggested simulation name",
    "scenario": "Extracted scenario text",
    "actors": [/* Auto-detected actors */],
    "objectives": [/* Extracted objectives */],
    "parameters": {
      "ai_mode": "adaptive",
      "custom_instructions": "Use document as source"
    },
    "suggestedTriggers": [/* Context-based triggers */],
    "decisions": [/* Key decision points */]
  }
}
```

### 2. Student Respond (Enhanced)
**POST** `/api/student/respond`

Now includes document context in AI processing.

**Response includes:**
```json
{
  "response": "AI response text",
  "documentContextUsed": true,
  "triggersActivated": [
    {"actor": "Sarah Martinez", "action": "Express concern"}
  ]
}
```

## Implementation Details

### SimulationEngine Updates

The `SimulationEngine` class now:

1. **Accepts document context** in `processMessage()`:
```javascript
async processMessage(simulation, history, message, documentContext)
```

2. **Finds relevant excerpts** from documents:
```javascript
_findRelevantExcerpts(documentText, query, maxExcerpts)
```

3. **Includes context in prompts**:
- Adds document summary to system prompt
- Includes key points and decisions
- Injects relevant excerpts for specific questions
- References document metadata

### Context Flow

```
Student Question
    ↓
Extract Key Terms
    ↓
Search Document for Relevant Excerpts
    ↓
Build AI Prompt with:
  - System prompt with document summary
  - Conversation history
  - Relevant document excerpts
  - Current question
    ↓
AI generates contextual response
    ↓
Track context usage in metadata
```

## Usage Examples

### Example 1: Financial Case Study

**Document Content:**
```
GreenTech Energy has $8.2M in cash reserves with $5.5M outstanding debt.
TechCorp offers a $120M contract requiring 80% resource dedication.
```

**Student Question:** "What's our financial position?"

**AI Response with Context:**
"Looking at GreenTech's current financial position, you have $8.2 million in cash reserves against $5.5 million in outstanding debt, giving you a net positive position of $2.7 million. This is important to consider when evaluating the TechCorp contract, which would require significant upfront investment despite its $120 million value. How do you think this liquidity position affects your ability to scale up operations?"

### Example 2: Stakeholder Analysis

**Document Content:**
```
Sarah Martinez (CEO) prioritizes company culture and employee welfare.
David Chen (CTO) focuses on technological innovation.
```

**Student Question:** "What does Sarah think about this decision?"

**AI Response with Context:**
"Sarah Martinez, as CEO and co-founder, has consistently prioritized maintaining GreenTech's company culture and ensuring employee welfare throughout this decision process. She's particularly concerned about how rapid scaling for the TechCorp contract might affect the close-knit team environment you've built over the past 9 years. What aspects of company culture do you think are most at risk if you accept this contract?"

## Benefits

1. **Grounded Responses**: AI references specific facts from documents
2. **Consistency**: All sessions use the same source material
3. **Efficiency**: Professors don't need to manually input all details
4. **Flexibility**: Documents can be processed with custom instructions
5. **Traceability**: System tracks when document context influences responses

## Testing

Two test scripts verify functionality:

1. **test-document-upload.js**: Tests document storage and retrieval
2. **test-document-context.js**: Tests context integration in simulations

Run tests:
```bash
cd packages/api
node test/test-document-upload.js
node test/test-document-context.js
```

## Migration Guide

To enable document context for existing simulations:

1. Upload the source document:
```bash
POST /api/setup/parse-file
```

2. Link document to simulation:
```bash
POST /api/documents/:id/create-simulation
```

3. Or create new simulation with document:
```bash
POST /api/setup/upload-and-create-simulation
```

## Performance Considerations

- Document text is cached in `document_context` column
- Excerpt searching happens in-memory for speed
- Maximum 3 excerpts per query to avoid token limits
- Documents over 10MB are rejected at upload
- Context is loaded once per session and reused

## Security & Privacy

- Documents are stored in database, not file system
- Access controlled via simulation permissions
- Processing happens server-side only
- No client-side document parsing
- Sensitive data should be marked in processing instructions

## Future Enhancements

1. **Semantic Search**: Use embeddings for better excerpt matching
2. **Document Versioning**: Track changes over time
3. **Multi-Document Support**: Reference multiple sources
4. **Citation Tracking**: Show which parts of document informed responses
5. **Dynamic Context Loading**: Load only relevant sections for large documents
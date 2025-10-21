import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

/**
 * DocumentProcessor - Extract and understand document content using OpenAI
 *
 * Uses OpenAI to read and extract key information from uploaded documents
 */
class DocumentProcessor {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Process a document and extract content using OpenAI
   *
   * @param {Buffer} fileBuffer - The document file buffer
   * @param {string} fileName - Original filename
   * @param {string} mimeType - MIME type of the file
   * @param {string} instructions - How the AI should process the document
   * @returns {Promise<Object>} Processed document data ready for database storage
   */
  async processDocument(fileBuffer, fileName, mimeType, instructions = '') {
    try {
      // Determine file type
      let fileType = 'txt';
      if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        fileType = 'pdf';
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        fileType = 'docx';
      } else if (fileName.endsWith('.doc')) {
        fileType = 'doc';
      }

      // Convert buffer to text based on file type
      let documentText = '';

      if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
        // Plain text - just convert buffer to string
        documentText = fileBuffer.toString('utf-8');
      } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // For PDF, we'll use OpenAI to extract content
        // Convert buffer to base64 and use vision/file capabilities
        documentText = await this._extractFromPDF(fileBuffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')
      ) {
        // For DOCX/DOC, use OpenAI to extract
        documentText = await this._extractFromDOCX(fileBuffer);
      } else {
        throw new Error(`Unsupported file type: ${mimeType || fileName}`);
      }

      // Use OpenAI to understand and extract key information
      const analysis = await this._analyzeDocument(documentText, instructions);

      // Structure the data for database storage
      const documentData = {
        // File metadata
        file_name: fileName,
        file_type: fileType,
        mime_type: mimeType || this._getMimeType(fileName),
        file_size: fileBuffer.length,

        // Extracted content
        raw_text: documentText,

        // Analysis results structured for JSONB storage
        analysis: {
          summary: analysis.summary || '',
          keyPoints: this._parseListSection(analysis.keyPoints),
          suggestedScenario: analysis.suggestedScenario || '',
          actors: this._parseListSection(analysis.actors),
          objectives: this._parseListSection(analysis.objectives),
          decisions: this._parseListSection(analysis.decisions)
        },

        // Processing metadata
        processing_instructions: instructions || null,
        processing_status: 'completed',
        processed_at: new Date().toISOString()
      };

      return {
        success: true,
        documentData: documentData, // Ready for database insertion
        // Legacy response format for backward compatibility
        fileName: fileName,
        fileType: mimeType,
        rawText: documentText,
        analysis: analysis,
        extractedInfo: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          suggestedScenario: analysis.suggestedScenario
        }
      };

    } catch (error) {
      console.error('Error processing document:', error);

      // Return error data structure for database
      return {
        success: false,
        documentData: {
          file_name: fileName,
          file_type: this._getFileType(fileName),
          mime_type: mimeType || this._getMimeType(fileName),
          file_size: fileBuffer.length,
          raw_text: null,
          analysis: {},
          processing_instructions: instructions || null,
          processing_status: 'failed',
          processing_error: error.message,
          processed_at: new Date().toISOString()
        },
        error: error.message
      };
    }
  }

  /**
   * Helper to determine file type from filename
   */
  _getFileType(fileName) {
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.docx')) return 'docx';
    if (fileName.endsWith('.doc')) return 'doc';
    if (fileName.endsWith('.txt')) return 'txt';
    return 'unknown';
  }

  /**
   * Helper to determine MIME type from filename
   */
  _getMimeType(fileName) {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (fileName.endsWith('.doc')) return 'application/msword';
    if (fileName.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  }

  /**
   * Helper to parse list-like sections into arrays
   */
  _parseListSection(text) {
    if (!text) return [];

    // Split by common delimiters (newlines, bullets, numbers)
    const items = text
      .split(/[\n•\-\d\.]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item.length < 500); // Filter out empty or overly long items

    return items;
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  async _extractFromPDF(fileBuffer) {
    try {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw new Error(`Failed to extract PDF content: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  async _extractFromDOCX(fileBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting DOCX:', error);
      throw new Error(`Failed to extract DOCX content: ${error.message}`);
    }
  }

  /**
   * Analyze document content using OpenAI to extract key information
   *
   * @param {string} documentText - The raw document text
   * @param {string} instructions - Custom instructions for how to process
   * @returns {Promise<Object>} Analyzed document data
   */
  async _analyzeDocument(documentText, instructions) {
    const systemPrompt = `You are analyzing a case study document for an educational simulation.
Your goal is to extract key information that will help create an engaging learning experience.

${instructions ? `Additional instructions: ${instructions}` : ''}

Please analyze the document and provide:
1. A concise summary (2-3 sentences)
2. Key points and themes
3. A suggested scenario description for the simulation
4. Identified stakeholders/actors
5. Potential learning objectives
6. Key decisions or dilemmas presented`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this case study:\n\n${documentText.substring(0, 8000)}` // Limit to avoid token limits
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisText = response.choices[0].message.content;

    // Parse the analysis (in production, use structured output)
    // For now, return the raw analysis
    return {
      rawAnalysis: analysisText,
      summary: this._extractSection(analysisText, 'summary'),
      keyPoints: this._extractSection(analysisText, 'key points'),
      suggestedScenario: this._extractSection(analysisText, 'scenario'),
      actors: this._extractSection(analysisText, 'stakeholders'),
      objectives: this._extractSection(analysisText, 'objectives'),
      decisions: this._extractSection(analysisText, 'decisions')
    };
  }

  /**
   * Helper to extract sections from analysis text
   */
  _extractSection(text, sectionName) {
    // Simple extraction - in production use more robust parsing
    const lines = text.split('\n');
    const sectionStart = lines.findIndex(line =>
      line.toLowerCase().includes(sectionName.toLowerCase())
    );

    if (sectionStart === -1) return text.substring(0, 200) + '...';

    // Get next few lines as the section content
    const sectionLines = lines.slice(sectionStart + 1, sectionStart + 5);
    return sectionLines.join('\n').trim();
  }
}

export default DocumentProcessor;

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
   * @returns {Promise<Object>} Processed document data
   */
  async processDocument(fileBuffer, fileName, mimeType, instructions = '') {
    try {
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

      return {
        success: true,
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
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF using OpenAI
   * Note: For MVP, we'll ask user to copy-paste. Full PDF extraction requires additional libraries.
   */
  async _extractFromPDF(fileBuffer) {
    // For now, return a message asking for text extraction
    // In production, you'd use pdf-parse or similar library
    throw new Error('PDF support coming soon. Please convert to text or paste content directly.');
  }

  /**
   * Extract text from DOCX using OpenAI
   * Note: For MVP, we'll ask user to copy-paste. Full DOCX extraction requires additional libraries.
   */
  async _extractFromDOCX(fileBuffer) {
    // For now, return a message asking for text extraction
    // In production, you'd use mammoth or similar library
    throw new Error('DOCX support coming soon. Please convert to text or paste content directly.');
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

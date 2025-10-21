import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import multer from 'multer';
import SimulationEngine from '../core/simulation-engine.js';
import { db } from './database/supabase.js';
import ScenarioParser from './services/scenario-parser.js';
import DocumentProcessor from './services/document-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(txt|pdf|docx|doc)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only TXT, PDF, and DOCX files are allowed.'));
    }
  }
});

// Create a single instance of the simulation engine (stateless)
const engine = new SimulationEngine();

// Create a single instance of the scenario parser
const parser = new ScenarioParser();

// Create a single instance of the document processor
const documentProcessor = new DocumentProcessor();

// ============================================================================
// SETUP ENDPOINTS - Parse and configure simulations
// ============================================================================

/**
 * POST /api/setup/parse
 * Parse scenario text using AI to extract actors, objectives, and configuration
 * Body: { scenario_text }
 */
app.post('/api/setup/parse', async (req, res) => {
  try {
    const { scenario_text } = req.body;

    if (!scenario_text || typeof scenario_text !== 'string' || scenario_text.trim() === '') {
      return res.status(400).json({
        error: 'scenario_text is required and must be a non-empty string'
      });
    }

    // Use AI to parse the scenario
    const parseResult = await parser.parseScenario(scenario_text);

    // Validate actors
    const actorValidation = parser.validateActors(parseResult.parsed.actors);

    res.status(200).json({
      success: true,
      ...parseResult,
      actor_validation: actorValidation
    });

  } catch (error) {
    console.error('Error parsing scenario:', error);
    res.status(500).json({
      error: 'Failed to parse scenario',
      details: error.message
    });
  }
});

/**
 * POST /api/setup/parse-file
 * Parse uploaded file (PDF, DOCX, TXT) and extract scenario information
 * Form data: { file, document_instructions }
 */
app.post('/api/setup/parse-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const { document_instructions, save_to_database, uploaded_by } = req.body;

    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    // Process the document using DocumentProcessor
    const processedDoc = await documentProcessor.processDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      document_instructions || ''
    );

    // Check if processing was successful
    if (!processedDoc.success) {
      // Still save to database if requested, even if processing failed
      if (save_to_database === 'true' || save_to_database === true) {
        try {
          const savedDoc = await db.createDocument({
            ...processedDoc.documentData,
            uploaded_by: uploaded_by || 'anonymous'
          });
          console.log('Failed document saved to database with ID:', savedDoc.id);
        } catch (dbError) {
          console.error('Failed to save failed document to database:', dbError);
        }
      }

      return res.status(500).json({
        error: 'Failed to process document',
        details: processedDoc.error
      });
    }

    // Use the extracted text to parse the scenario
    const parseResult = await parser.parseScenario(processedDoc.rawText);

    // Validate actors
    const actorValidation = parser.validateActors(parseResult.parsed.actors);

    // Save to database if requested
    let savedDocument = null;
    if (save_to_database === 'true' || save_to_database === true) {
      try {
        // Add uploaded_by field to document data
        const documentToSave = {
          ...processedDoc.documentData,
          uploaded_by: uploaded_by || 'anonymous'
        };

        savedDocument = await db.createDocument(documentToSave);
        console.log('Document saved to database with ID:', savedDocument.id);
      } catch (dbError) {
        console.error('Failed to save document to database:', dbError);
        // Continue with response even if save fails
      }
    }

    res.status(200).json({
      success: true,
      ...parseResult,
      actor_validation: actorValidation,
      document: {
        id: savedDocument ? savedDocument.id : null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        extractedLength: processedDoc.rawText.length,
        saved: savedDocument !== null,
        analysis: processedDoc.documentData.analysis
      }
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      error: 'Failed to process file',
      details: error.message
    });
  }
});

// ============================================================================
// DOCUMENT ENDPOINTS - Manage uploaded documents
// ============================================================================

/**
 * GET /api/documents
 * List all documents with optional filters
 * Query params: uploaded_by, file_type, processing_status, simulation_id
 */
app.get('/api/documents', async (req, res) => {
  try {
    const filters = {
      uploaded_by: req.query.uploaded_by,
      file_type: req.query.file_type,
      processing_status: req.query.processing_status,
      simulation_id: req.query.simulation_id
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const documents = await db.listDocuments(filters);

    res.status(200).json({
      success: true,
      count: documents.length,
      documents: documents
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      error: 'Failed to list documents',
      details: error.message
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document by ID
 */
app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await db.getDocument(req.params.id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      document: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      error: 'Failed to fetch document',
      details: error.message
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document by ID
 */
app.delete('/api/documents/:id', async (req, res) => {
  try {
    await db.deleteDocument(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      details: error.message
    });
  }
});

/**
 * POST /api/documents/:id/create-simulation
 * Create a simulation from a document
 */
app.post('/api/documents/:id/create-simulation', async (req, res) => {
  try {
    const documentId = req.params.id;
    const { name, instructions, actors, objectives, parameters } = req.body;

    // Get the document
    const document = await db.getDocument(documentId);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Use the document's suggested scenario or raw text
    const scenarioText = document.analysis?.suggestedScenario || document.raw_text;

    // Use document's analyzed actors/objectives if not provided
    const simulationActors = actors || document.analysis?.actors || [];
    const simulationObjectives = objectives || document.analysis?.objectives || [];

    // Create the simulation
    const simulation = await db.createSimulation({
      name: name || `Simulation from ${document.file_name}`,
      description: document.analysis?.summary || null,
      scenario_text: scenarioText,
      actors: simulationActors,
      objectives: simulationObjectives,
      parameters: {
        duration: parameters?.duration || 20,
        ai_mode: parameters?.ai_mode || 'challenger',
        complexity: parameters?.complexity || 'escalating',
        narrative_freedom: parameters?.narrative_freedom || 0.7,
        ...parameters,
        instructions: instructions || document.processing_instructions || ''
      },
      source_document_id: documentId
    });

    // Link document to simulation
    await db.linkDocumentToSimulation(documentId, simulation.id);

    res.status(201).json({
      success: true,
      message: 'Simulation created from document',
      simulationId: simulation.id,
      simulation: simulation,
      document: {
        id: document.id,
        name: document.file_name
      }
    });
  } catch (error) {
    console.error('Error creating simulation from document:', error);
    res.status(500).json({
      error: 'Failed to create simulation from document',
      details: error.message
    });
  }
});

/**
 * POST /api/setup/upload-and-create-simulation
 * Upload a document, process it, save to database, and create a simulation - all in one
 */
app.post('/api/setup/upload-and-create-simulation', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const {
      document_instructions,
      simulation_name,
      simulation_instructions,
      uploaded_by,
      actors,
      objectives,
      parameters
    } = req.body;

    console.log(`Processing and creating simulation from: ${req.file.originalname}`);

    // Process the document
    const processedDoc = await documentProcessor.processDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      document_instructions || ''
    );

    if (!processedDoc.success) {
      return res.status(500).json({
        error: 'Failed to process document',
        details: processedDoc.error
      });
    }

    // Save document to database
    const savedDocument = await db.createDocument({
      ...processedDoc.documentData,
      uploaded_by: uploaded_by || 'anonymous'
    });

    // Parse the scenario for additional structure
    const parseResult = await parser.parseScenario(processedDoc.rawText);

    // Merge parsed actors with document's analyzed actors
    const mergedActors = actors || parseResult.parsed.actors || processedDoc.documentData.analysis.actors || [];
    const mergedObjectives = objectives || parseResult.parsed.objectives || processedDoc.documentData.analysis.objectives || [];

    // Create simulation from the document
    const simulation = await db.createSimulation({
      name: simulation_name || `Simulation from ${req.file.originalname}`,
      description: processedDoc.documentData.analysis.summary || null,
      scenario_text: processedDoc.documentData.analysis.suggestedScenario || processedDoc.rawText,
      actors: mergedActors,
      objectives: mergedObjectives,
      parameters: {
        duration: parameters?.duration || 20,
        ai_mode: parameters?.ai_mode || 'challenger',
        complexity: parameters?.complexity || 'escalating',
        narrative_freedom: parameters?.narrative_freedom || 0.7,
        ...parameters,
        instructions: simulation_instructions || document_instructions || ''
      },
      source_document_id: savedDocument.id
    });

    // Link document to simulation
    await db.linkDocumentToSimulation(savedDocument.id, simulation.id);

    res.status(201).json({
      success: true,
      message: 'Document uploaded and simulation created successfully',
      document: {
        id: savedDocument.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        analysis: savedDocument.analysis
      },
      simulation: {
        id: simulation.id,
        name: simulation.name,
        actors: simulation.actors,
        objectives: simulation.objectives
      }
    });

  } catch (error) {
    console.error('Error in upload-and-create-simulation:', error);
    res.status(500).json({
      error: 'Failed to upload document and create simulation',
      details: error.message
    });
  }
});

/**
 * POST /api/setup/parse-document-for-setup
 * Parse a document specifically for setup configuration auto-population
 *
 * IMPORTANT: This endpoint uses AI ANALYSIS for setup/configuration ONLY
 * The AI analysis helps auto-populate settings but is NOT used during simulation runtime
 * During runtime, the simulation uses the RAW DOCUMENT TEXT directly
 */
app.post('/api/setup/parse-document-for-setup', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const { custom_instructions } = req.body;

    console.log(`Processing document for setup: ${req.file.originalname}`);

    // AI analysis ONLY for setup configuration suggestions
    // This helps professors configure the simulation but won't affect runtime
    const setupInstructions = custom_instructions ||
      'Analyze this document to suggest simulation setup parameters. Extract actors with their roles and personalities, learning objectives, and suggest appropriate AI behavior modes.';

    const processedDoc = await documentProcessor.processDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      setupInstructions
    );

    if (!processedDoc.success) {
      return res.status(500).json({
        error: 'Failed to process document',
        details: processedDoc.error
      });
    }

    // Parse for more detailed structure
    const parseResult = await parser.parseScenario(processedDoc.rawText);

    // Build suggested setup configuration
    const suggestedSetup = {
      // Basic Information
      name: `${req.file.originalname.replace(/\.[^/.]+$/, '')} Simulation`,
      description: processedDoc.documentData.analysis.summary,

      // Scenario
      scenario: processedDoc.documentData.analysis.suggestedScenario || processedDoc.rawText.substring(0, 2000),

      // Actors with FULL details extracted from document
      actors: (parseResult.parsed.actors || processedDoc.documentData.analysis.actors || []).map((actor, index) => {
        // Handle both string actors and object actors from parser
        if (typeof actor === 'string') {
          // Simple string actor - create basic structure
          const isStudentRole =
            actor.toLowerCase().includes('student') ||
            actor.toLowerCase().includes('you') ||
            actor.toLowerCase().includes('analyst') ||
            actor.toLowerCase().includes('consultant');

          // For student role, only include basic fields
          if (isStudentRole) {
            return {
              name: actor,
              role: actor,
              is_student_role: true,
              knowledge_level: 'intermediate' // Student starts at intermediate
            };
          }

          // For AI actors, include all fields
          return {
            name: actor,
            role: actor,
            is_student_role: false,
            personality_mode: 'professional',
            knowledge_level: 'expert',
            goals: [],
            hidden_info: [],
            triggers: [],
            loyalties: { supports: [], opposes: [] },
            priorities: []
          };
        } else {
          // Full actor object from parser - use all extracted fields
          // For student role, only include basic fields
          if (actor.is_student_role) {
            return {
              name: actor.name,
              role: actor.role || actor.name,
              is_student_role: true,
              knowledge_level: actor.knowledge_level || 'intermediate'
            };
          }

          // For AI actors, include all advanced fields
          return {
            name: actor.name,
            role: actor.role || actor.name,
            is_student_role: false,
            personality_mode: actor.personality_mode || 'professional',
            knowledge_level: actor.knowledge_level || 'expert',
            goals: actor.goals || [],
            hidden_info: actor.hidden_info || [],
            triggers: actor.triggers || [],
            loyalties: actor.loyalties || { supports: [], opposes: [] },
            priorities: actor.priorities || [],
            description: actor.description || ''
          };
        }
      }),

      // Validate only one student role
      actorValidation: (() => {
        const processedActors = (parseResult.parsed.actors || processedDoc.documentData.analysis.actors || []);
        const studentRoles = processedActors.filter(a => a.is_student_role);

        if (studentRoles.length === 0) {
          return {
            valid: false,
            warning: 'No student role identified. Please specify which role the student should play.',
            suggestion: 'The primary decision-maker should typically be the student role.'
          };
        }

        if (studentRoles.length > 1) {
          return {
            valid: false,
            warning: `Multiple student roles identified (${studentRoles.length}). Only one role should be assigned to the student.`,
            suggestion: 'Choose the main protagonist or decision-maker as the student role.',
            studentRoles: studentRoles.map(s => s.name || s)
          };
        }

        return { valid: true };
      })(),

      // Learning Objectives - use specific ones from document
      objectives: parseResult.parsed.learning_objectives ||
                  processedDoc.documentData.analysis.objectives ||
                  [
                    'Critical thinking and problem solving',
                    'Strategic decision making',
                    'Stakeholder management',
                    'Ethical considerations'
                  ],

      // AI Parameters
      parameters: {
        ai_mode: parseResult.parsed.suggested_ai_mode || 'adaptive', // Use AI's suggestion or default
        custom_ai_mode_description: parseResult.parsed.custom_ai_mode_description || null,
        complexity: 'escalating',
        duration: 25,
        narrative_freedom: 0.7,
        custom_instructions: `Use the document "${req.file.originalname}" as the primary source of truth for this simulation. Reference specific details, numbers, and situations from the document.`
      },

      // Document Context
      document: {
        id: null, // Not saved yet
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        analysis: processedDoc.documentData.analysis,
        rawText: processedDoc.rawText,
        shouldSave: true // Suggest saving the document
      },

      // Key Decisions from document
      decisions: processedDoc.documentData.analysis.decisions || parseResult.parsed.key_decision_points || [],

      // Suggested triggers - combine from parser and generated ones
      suggestedTriggers: [
        ...(parseResult.parsed.suggested_triggers || []),
        ...generateSuggestedTriggers(processedDoc.documentData.analysis)
      ]
    };

    res.status(200).json({
      success: true,
      message: 'Document analyzed for setup configuration',
      setup: suggestedSetup
    });

  } catch (error) {
    console.error('Error parsing document for setup:', error);
    res.status(500).json({
      error: 'Failed to parse document for setup',
      details: error.message
    });
  }
});

// Helper function to generate suggested triggers based on document analysis
function generateSuggestedTriggers(analysis) {
  const triggers = [];

  // Generate triggers based on key decisions
  if (analysis.decisions && analysis.decisions.length > 0) {
    analysis.decisions.forEach(decision => {
      if (typeof decision === 'string' && decision.length > 10) {
        triggers.push({
          condition: `mentions "${decision.substring(0, 30)}..."`,
          action: `Challenge the student to consider all implications of this decision`
        });
      }
    });
  }

  // Generate triggers based on key points
  if (analysis.keyPoints && analysis.keyPoints.length > 0) {
    analysis.keyPoints.slice(0, 2).forEach(point => {
      if (typeof point === 'string' && point.length > 10) {
        triggers.push({
          condition: `discusses ${point.substring(0, 20)}...`,
          action: `Probe deeper into this aspect with follow-up questions`
        });
      }
    });
  }

  return triggers;
}

// ============================================================================
// PROFESSOR ENDPOINTS - Create and manage simulations
// ============================================================================

/**
 * POST /api/professor/setup
 * Create a new simulation configuration
 */
app.post('/api/professor/setup', async (req, res) => {
  try {
    const { scenario, instructions, name, actors, objectives, parameters } = req.body;

    if (!scenario || !instructions) {
      return res.status(400).json({
        error: 'Both scenario and instructions are required',
        received: { scenario: !!scenario, instructions: !!instructions }
      });
    }

    // Create simulation in database with data from setup system
    const simulation = await db.createSimulation({
      name: name || 'Untitled Simulation',
      scenario_text: scenario,
      actors: actors || [],
      objectives: objectives || [],
      parameters: {
        duration: parameters?.duration || 20,
        ai_mode: parameters?.ai_mode || 'challenger',
        complexity: parameters?.complexity || 'escalating',
        narrative_freedom: parameters?.narrative_freedom || 0.7,
        ...parameters,
        // Legacy: store instructions for backwards compatibility
        instructions: instructions
      }
    });

    res.status(201).json({
      message: 'Simulation created successfully',
      simulationId: simulation.id,
      simulation: simulation
    });
  } catch (error) {
    console.error('Error creating simulation:', error);
    res.status(500).json({
      error: 'Failed to create simulation',
      details: error.message
    });
  }
});

// ============================================================================
// STUDENT ENDPOINTS - Interact with simulations
// ============================================================================

/**
 * POST /api/student/respond
 * Send a message in a simulation session
 * Body: { simulationId, sessionId (optional), studentInput }
 */
app.post('/api/student/respond', async (req, res) => {
  try {
    const { simulationId, sessionId, studentInput } = req.body;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId is required'
      });
    }

    if (!studentInput || typeof studentInput !== 'string' || studentInput.trim() === '') {
      return res.status(400).json({
        error: 'Student input is required and must be a non-empty string'
      });
    }

    // Get simulation configuration
    const simulation = await db.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        error: 'Simulation not found',
        simulationId
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await db.getSession(sessionId);
      if (!session || session.simulation_id !== simulationId) {
        return res.status(404).json({
          error: 'Session not found or does not belong to this simulation'
        });
      }
    } else {
      // Create new session
      session = await db.createSession(simulationId);
    }

    // Get document context if available
    // IMPORTANT: Document context uses RAW TEXT for simulation runtime
    // AI analysis is ONLY for setup/configuration, NOT runtime context
    let documentContext = null;
    if (simulation.document_context && Object.keys(simulation.document_context).length > 0) {
      documentContext = simulation.document_context;
    } else if (simulation.source_document_id) {
      // Fetch document if not in context
      try {
        const document = await db.getDocument(simulation.source_document_id);
        if (document) {
          // Structure for RUNTIME context - prioritizes RAW TEXT
          documentContext = {
            // PRIMARY: Raw OCR/extracted text - this is what the AI uses
            raw_text: document.raw_text,

            // METADATA ONLY: For reference, not for AI decisions
            instructions: document.processing_instructions,
            metadata: {
              file_name: document.file_name,
              file_type: document.file_type,
              uploaded_at: document.uploaded_at,
              uploaded_by: document.uploaded_by
            }

            // NOTE: We do NOT include AI analysis (summary, key_points, etc)
            // Those are ONLY for setup/configuration, not runtime
          };

          // Cache document context in simulation for future use
          await db.updateSimulation(simulationId, {
            document_context: documentContext
          });
        }
      } catch (docError) {
        console.error('Error fetching document context:', docError);
        // Continue without document context
      }
    }

    // Process the message with AI including document context
    const aiResult = await engine.processMessage(
      simulation,
      session.conversation_history,
      studentInput,
      documentContext
    );

    // Extract response and metadata
    const aiResponse = typeof aiResult === 'string' ? aiResult : aiResult.message;
    const metadata = typeof aiResult === 'object' ? aiResult.metadata : {};

    // Add student message to history
    await db.addMessageToSession(session.id, {
      role: 'student',
      content: studentInput,
      timestamp: new Date().toISOString()
    });

    // Add AI response to history
    const updatedSession = await db.addMessageToSession(session.id, {
      role: 'ai_advisor',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      metadata: metadata
    });

    // Update session metadata if document context was used
    if (metadata.document_context_used) {
      await db.updateSession(session.id, {
        document_context_used: true
      });
    }

    res.status(200).json({
      success: true,
      response: aiResponse,
      sessionId: session.id,
      simulationId: simulation.id,
      messageCount: updatedSession.conversation_history.length,
      documentContextUsed: metadata.document_context_used || false,
      triggersActivated: metadata.triggers_activated || []
    });

  } catch (error) {
    console.error('Error processing student response:', error);
    res.status(500).json({
      error: 'Failed to process student input',
      details: error.message
    });
  }
});

// ============================================================================
// CONFIGURATION ENDPOINTS - Edit simulations
// ============================================================================

/**
 * PATCH /api/professor/edit
 * Update simulation configuration
 * Body: { simulationId, name?, scenario?, instructions?, actors?, objectives?, parameters? }
 */
app.patch('/api/professor/edit', async (req, res) => {
  try {
    const { simulationId, name, scenario, instructions, actors, objectives, parameters } = req.body;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId is required'
      });
    }

    // Build update object
    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (scenario) {
      updates.scenario_text = scenario;
    }

    if (actors) {
      updates.actors = actors;
    }

    if (objectives) {
      updates.objectives = objectives;
    }

    if (parameters || instructions) {
      // Get current simulation to merge parameters
      const current = await db.getSimulation(simulationId);
      updates.parameters = {
        ...current.parameters,
        ...parameters
      };

      // Legacy: support instructions field
      if (instructions) {
        updates.parameters.instructions = instructions;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'At least one field must be provided to update'
      });
    }

    const updatedSimulation = await db.updateSimulation(simulationId, updates);

    res.status(200).json({
      message: 'Simulation updated successfully',
      simulation: updatedSimulation
    });

  } catch (error) {
    console.error('Error editing simulation:', error);
    res.status(500).json({
      error: 'Failed to edit simulation',
      details: error.message
    });
  }
});

// ============================================================================
// STATE & EXPORT ENDPOINTS
// ============================================================================

/**
 * GET /api/simulation/state
 * Get current state of a simulation or session
 * Query: simulationId (required), sessionId (optional)
 */
app.get('/api/simulation/state', async (req, res) => {
  try {
    const { simulationId, sessionId } = req.query;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId query parameter is required'
      });
    }

    const simulation = await db.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        error: 'Simulation not found'
      });
    }

    // If sessionId provided, include session data
    if (sessionId) {
      const session = await db.getSession(sessionId);

      if (!session || session.simulation_id !== simulationId) {
        return res.status(404).json({
          error: 'Session not found or does not belong to this simulation'
        });
      }

      res.status(200).json({
        simulation: simulation,
        session: {
          id: session.id,
          state: session.state,
          conversationHistory: session.conversation_history,
          messageCount: session.conversation_history.length,
          startedAt: session.started_at,
          lastActivityAt: session.last_activity_at
        }
      });
    } else {
      // Just return simulation configuration
      res.status(200).json({
        simulation: simulation
      });
    }

  } catch (error) {
    console.error('Error getting simulation state:', error);
    res.status(500).json({
      error: 'Failed to retrieve simulation state',
      details: error.message
    });
  }
});

/**
 * GET /api/simulation/export
 * Export a simulation session
 * Query: sessionId (required), format (optional: 'json' or 'text')
 */
app.get('/api/simulation/export', async (req, res) => {
  try {
    const { sessionId, format } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId query parameter is required'
      });
    }

    const session = await db.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const simulation = session.simulations; // Joined from database query

    const exportData = {
      sessionId: session.id,
      simulationId: simulation.id,
      simulationName: simulation.name,
      scenario: simulation.scenario_text,
      conversation: session.conversation_history,
      metadata: {
        startedAt: session.started_at,
        completedAt: session.completed_at,
        totalMessages: session.conversation_history.length,
        exportedAt: new Date().toISOString()
      }
    };

    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="session-${session.id}.txt"`);

      let textExport = `Simulation Session Export\n`;
      textExport += `Session ID: ${session.id}\n`;
      textExport += `Simulation: ${simulation.name}\n`;
      textExport += `Started: ${new Date(session.started_at).toLocaleString()}\n`;
      textExport += `Exported: ${new Date().toLocaleString()}\n`;
      textExport += `\n=== SCENARIO ===\n${simulation.scenario_text}\n`;
      textExport += `\n=== CONVERSATION ===\n`;
      textExport += engine.formatConversationForExport(simulation, session.conversation_history);

      res.status(200).send(textExport);
    } else {
      res.status(200).json(exportData);
    }

  } catch (error) {
    console.error('Error exporting simulation:', error);
    res.status(500).json({
      error: 'Failed to export simulation',
      details: error.message
    });
  }
});

/**
 * DELETE /api/simulation/clear
 * Clear or delete simulation/session
 * Query: sessionId (to clear session) OR simulationId (to delete simulation)
 */
app.delete('/api/simulation/clear', async (req, res) => {
  try {
    const { sessionId, simulationId } = req.query;

    if (!sessionId && !simulationId) {
      return res.status(400).json({
        error: 'Either sessionId or simulationId query parameter is required'
      });
    }

    if (sessionId) {
      // Delete specific session
      await db.deleteSession(sessionId);
      res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
      });
    } else if (simulationId) {
      // Delete simulation (cascades to sessions)
      await db.deleteSimulation(simulationId);
      res.status(200).json({
        success: true,
        message: 'Simulation and all associated sessions deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error clearing simulation:', error);
    res.status(500).json({
      error: 'Failed to clear simulation',
      details: error.message
    });
  }
});

/**
 * GET /api/simulations
 * List all simulations (optionally filtered)
 * Query: is_template (optional boolean)
 */
app.get('/api/simulations', async (req, res) => {
  try {
    const filters = {};

    if (req.query.is_template !== undefined) {
      filters.is_template = req.query.is_template === 'true';
    }

    const simulations = await db.listSimulations(filters);

    res.status(200).json({
      simulations: simulations,
      count: simulations.length
    });

  } catch (error) {
    console.error('Error listing simulations:', error);
    res.status(500).json({
      error: 'Failed to list simulations',
      details: error.message
    });
  }
});

/**
 * GET /api/professor/simulations
 * Get simulations created by a professor
 * Query: created_by (optional - professor ID/username)
 */
app.get('/api/professor/simulations', async (req, res) => {
  try {
    const filters = { is_template: false };

    if (req.query.created_by) {
      filters.created_by = req.query.created_by;
    }

    const simulations = await db.listSimulations(filters);

    res.status(200).json({
      simulations: simulations,
      count: simulations.length
    });

  } catch (error) {
    console.error('Error listing professor simulations:', error);
    res.status(500).json({
      error: 'Failed to list simulations',
      details: error.message
    });
  }
});

/**
 * GET /api/student/sessions
 * Get simulation sessions for a student
 * Query: student_id (optional), state (optional)
 */
app.get('/api/student/sessions', async (req, res) => {
  try {
    const filters = {};

    if (req.query.student_id) {
      filters.student_id = req.query.student_id;
    }

    if (req.query.state) {
      filters.state = req.query.state;
    }

    const sessions = await db.listAllSessions(filters);

    res.status(200).json({
      sessions: sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error('Error listing student sessions:', error);
    res.status(500).json({
      error: 'Failed to list sessions',
      details: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    database: 'connected'
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Windo API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: Connected to Supabase\n`);
  console.log('Available endpoints:');
  console.log('  POST   /api/setup/parse           - Parse scenario with AI');
  console.log('  POST   /api/professor/setup       - Create simulation');
  console.log('  POST   /api/student/respond       - Send message in session');
  console.log('  PATCH  /api/professor/edit        - Update simulation');
  console.log('  GET    /api/simulation/state      - Get simulation/session state');
  console.log('  GET    /api/simulation/export     - Export session conversation');
  console.log('  DELETE /api/simulation/clear      - Delete session/simulation');
  console.log('  GET    /api/simulations           - List all simulations');
  console.log('  GET    /api/professor/simulations - List professor simulations');
  console.log('  GET    /api/student/sessions      - List student sessions');
  console.log('  GET    /api/health                - Health check\n');
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import multer from 'multer';
import SimulationEngine from '../core/simulation-engine.js';
import DirectorPrototype from '../core/director-prototype.js';
import { db, supabase } from './database/supabase.js';
import ScenarioParser from './services/scenario-parser.js';
import DocumentProcessor from './services/document-processor.js';
import TranslationService from './services/translation-service.js';

// Import router factories
import healthRouter from './routers/health-router.js';
import createTranslationRouter from './routers/translation-router.js';
import createStudentRouter from './routers/student-router.js';
import createProfessorRouter from './routers/professor-router.js';
import createSimulationRouter from './routers/simulation-router.js';

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

// Create Director prototype instance (observation mode only)
const director = new DirectorPrototype(engine.openai);

// Create a single instance of the document processor
const documentProcessor = new DocumentProcessor();

// Create translation service instance
const translationService = new TranslationService();

// ============================================================================
// DIRECTOR PROTOTYPE - Analysis and Logging
// ============================================================================

/**
 * Analyze conversation with Director prototype (async, non-blocking)
 * Logs suggestions to database for evaluation
 */
async function analyzeWithDirector(simulation, session, studentInput) {
  try {
    // Only run if enabled via environment variable
    if (process.env.DIRECTOR_PROTOTYPE_ENABLED !== 'true') {
      return;
    }

    console.log(`[Director] Analyzing session ${session.id}, message #${session.conversation_history.length}`);

    // Run Director analysis
    const analysis = await director.analyzeConversation(
      simulation,
      session.conversation_history,
      studentInput
    );

    console.log(`[Director] Phase: ${analysis.current_phase}, State: ${analysis.student_state}, Confidence: ${analysis.confidence}`);
    console.log(`[Director] Suggestion: ${analysis.suggestion}`);
    console.log(`[Director] Cost: $${analysis.cost}, Latency: ${analysis.latency_ms}ms`);

    // Save to database
    const { error } = await supabase
      .from('director_logs')
      .insert({
        session_id: session.id,
        simulation_id: simulation.id,
        message_number: session.conversation_history.length,
        analysis: analysis
      });

    if (error) {
      console.error('[Director] Failed to save log:', error);
    } else {
      console.log(`[Director] Analysis saved successfully`);
    }
  } catch (error) {
    console.error('[Director] Analysis failed:', error);
    // Don't throw - this is background analysis, shouldn't break main flow
  }
}

// ============================================================================
// MOUNT FEATURE ROUTERS
// ============================================================================

// Create router instances with dependencies
const translationRouter = createTranslationRouter(translationService);
const studentRouter = createStudentRouter({ db, engine, analyzeWithDirector });
const professorRouter = createProfessorRouter({ db });
const simulationRouter = createSimulationRouter({ db, engine });

// Mount routers on appropriate paths
app.use('/api/health', healthRouter);
app.use('/api/translation', translationRouter);
app.use('/api/student', studentRouter);
app.use('/api/professor', professorRouter);
app.use('/api/simulation', simulationRouter);

// Mount simulation list at /api/simulations (the router has /list, so we mount at parent)
// This makes GET /api/simulations/list work, but we also need GET /api/simulations to work
// We'll create a redirect or use a custom mounting approach
const simulationListRouter = express.Router();
simulationListRouter.get('/', async (req, res) => {
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
app.use('/api/simulations', simulationListRouter);

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

    // Generate a first message based on the parsed scenario
    let suggestedFirstMessage = '';
    if (parseResult.parsed.actors) {
      const studentRole = parseResult.parsed.actors.find(a => a.is_student_role);
      const roleName = studentRole ? (studentRole.name || studentRole.role || 'student') : 'decision-maker';
      const scenarioStart = scenario_text.substring(0, 200);

      suggestedFirstMessage = `Welcome to this simulation. You are the ${roleName}. ${scenarioStart.substring(0, 150)}... The situation requires your immediate attention. What would you like to know first?`;
    }

    res.status(200).json({
      success: true,
      ...parseResult,
      actor_validation: actorValidation,
      suggested_first_message: suggestedFirstMessage
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

    // Generate a first message based on the parsed scenario
    let suggestedFirstMessage = '';
    if (parseResult.parsed.actors) {
      const studentRole = parseResult.parsed.actors.find(a => a.is_student_role);
      const roleName = studentRole ? (studentRole.name || studentRole.role || 'student') : 'decision-maker';
      const context = processedDoc.documentData.analysis?.summary || processedDoc.rawText.substring(0, 200);

      suggestedFirstMessage = `Welcome to this simulation. You are the ${roleName}. ${context.substring(0, 150)}... The situation requires your immediate attention. What would you like to know first?`;
    }

    res.status(200).json({
      success: true,
      ...parseResult,
      actor_validation: actorValidation,
      suggested_first_message: suggestedFirstMessage,
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
        custom_instructions: `Use the document "${req.file.originalname}" as the primary source of truth for this simulation. Reference specific details, numbers, and situations from the document.`,
        // Generate first message based on the scenario and student role
        first_message: (() => {
          const studentRole = (parseResult.parsed.actors || processedDoc.documentData.analysis.actors || [])
            .find(a => a.is_student_role);
          const roleName = studentRole ? (studentRole.name || studentRole.role || 'student') : 'decision-maker';
          const context = processedDoc.documentData.analysis.summary || processedDoc.rawText.substring(0, 200);

          return `Welcome to this simulation. You are the ${roleName}. ${context.substring(0, 150)}... The situation requires your immediate attention. What would you like to know first?`;
        })(),
        time_horizon: 'immediate' // Default time horizon
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
// (Professor endpoints moved to professor-router.js)
// ============================================================================

// ============================================================================
// (Student endpoints moved to student-router.js)
// ============================================================================

// ============================================================================
// (Configuration endpoints moved to professor-router.js)
// ============================================================================

// ============================================================================
// (State & export endpoints moved to simulation-router.js)
// ============================================================================

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

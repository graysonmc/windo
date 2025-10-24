/**
 * Student Router
 * Handles student interactions with simulations
 */

import express from 'express';

const router = express.Router();

/**
 * Initialize router with dependencies
 */
export function createStudentRouter(dependencies) {
  const { db, engine, analyzeWithDirector } = dependencies;

  /**
   * POST /respond
   * Process student message in a simulation session
   * Body: { simulationId, sessionId?, studentInput }
   */
  router.post('/respond', async (req, res) => {
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

        // Check if simulation has a first message to auto-send
        if (simulation.parameters && simulation.parameters.first_message) {
          // Add the first message from AI to the session immediately
          await db.addMessageToSession(session.id, {
            role: 'ai_advisor',
            content: simulation.parameters.first_message,
            timestamp: new Date().toISOString(),
            metadata: { auto_generated: true, type: 'first_message' }
          });

          // Update session with the first message
          session = await db.getSession(session.id);
        }
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

      // DIRECTOR PROTOTYPE: Analyze conversation (async, non-blocking)
      // This runs in the background and logs suggestions for evaluation
      analyzeWithDirector(simulation, updatedSession, studentInput)
        .catch(err => console.error('[Director] Background analysis error:', err));

      // Check if this is a new session with a first message
      const isNewSession = !req.body.sessionId && simulation.parameters?.first_message;

      res.status(200).json({
        success: true,
        response: aiResponse,
        sessionId: session.id,
        simulationId: simulation.id,
        messageCount: updatedSession.conversation_history.length,
        documentContextUsed: metadata.document_context_used || false,
        triggersActivated: metadata.triggers_activated || [],
        firstMessage: isNewSession ? simulation.parameters.first_message : null
      });

    } catch (error) {
      console.error('Error processing student response:', error);
      res.status(500).json({
        error: 'Failed to process student input',
        details: error.message
      });
    }
  });

  /**
   * GET /sessions
   * List student sessions with optional filters
   * Query params: student_id?, state?
   */
  router.get('/sessions', async (req, res) => {
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

  return router;
}

export default createStudentRouter;

import ActorModule from './modules/actor-module.js';

/**
 * SimulationEngine - Orchestrator for NSM Architecture
 *
 * Coordinates between Actor and Director modules:
 * - Actor: Handles moment-to-moment student conversations (GPT-4)
 * - Director: Monitors progress and guides narrative (future Phase 1)
 *
 * Currently delegates all functionality to ActorModule for backwards compatibility.
 * In Phase 1, this will coordinate Director interventions with Actor responses.
 */
class SimulationEngine {
  constructor() {
    // Initialize Actor module for conversation processing
    this.actor = new ActorModule();

    // Expose OpenAI client for Director prototype and other services
    this.openai = this.actor.openai;

    // Director will be initialized in Phase 1
    this.director = null;
  }

  /**
   * Process a student's message in the context of a simulation
   *
   * Currently delegates to Actor module.
   * In Phase 1, this will:
   * 1. Check if Director intervention is needed
   * 2. If yes, get Director guidance and pass to Actor
   * 3. Process message with Actor (potentially with Director modifications)
   * 4. Return Actor response to student
   *
   * @param {Object} simulation - The simulation configuration from database
   * @param {Array} conversationHistory - Array of previous messages
   * @param {String} studentMessage - The new message from the student
   * @param {Object} documentContext - Optional document context for the simulation
   * @returns {Promise<Object>} The AI's response and metadata
   */
  async processMessage(simulation, conversationHistory, studentMessage, documentContext = null) {
    // Phase 0: Direct delegation to Actor
    // Phase 1: Add Director evaluation and intervention logic here
    return await this.actor.processMessage(simulation, conversationHistory, studentMessage, documentContext);
  }

  /**
   * Format conversation history for export
   * Delegates to Actor module
   */
  formatConversationForExport(simulation, conversationHistory) {
    return this.actor.formatConversationForExport(simulation, conversationHistory);
  }

  /**
   * Future Phase 1 Methods:
   *
   * async evaluateWithDirector(simulation, session, studentMessage) {
   *   // Check if Director intervention is needed
   *   // Return Director guidance for Actor
   * }
   *
   * async integrateDirectorGuidance(actorPrompt, directorGuidance) {
   *   // Modify Actor's behavior based on Director recommendations
   * }
   */
}

export default SimulationEngine;

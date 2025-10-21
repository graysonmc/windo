import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required in environment variables');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required in environment variables');
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Server-side, no session persistence needed
    },
  }
);

// Helper functions for common database operations
export const db = {
  // ============================================================================
  // SIMULATIONS
  // ============================================================================

  async createSimulation(simulationData) {
    const { data, error } = await supabase
      .from('simulations')
      .insert([simulationData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSimulation(simulationId) {
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('id', simulationId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateSimulation(simulationId, updates) {
    const { data, error } = await supabase
      .from('simulations')
      .update(updates)
      .eq('id', simulationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSimulation(simulationId) {
    const { error } = await supabase
      .from('simulations')
      .delete()
      .eq('id', simulationId);

    if (error) throw error;
    return { success: true };
  },

  async listSimulations(filters = {}) {
    let query = supabase.from('simulations').select('*');

    if (filters.is_template !== undefined) {
      query = query.eq('is_template', filters.is_template);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // ============================================================================
  // SIMULATION SESSIONS
  // ============================================================================

  async createSession(simulationId, studentId = null) {
    const { data, error } = await supabase
      .from('simulation_sessions')
      .insert([{
        simulation_id: simulationId,
        student_id: studentId,
        conversation_history: [],
        state: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSession(sessionId) {
    const { data, error } = await supabase
      .from('simulation_sessions')
      .select('*, simulations(*)')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateSession(sessionId, updates) {
    const { data, error } = await supabase
      .from('simulation_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addMessageToSession(sessionId, message) {
    // First get current conversation history
    const session = await this.getSession(sessionId);
    const updatedHistory = [...session.conversation_history, message];

    // Update with new message
    return await this.updateSession(sessionId, {
      conversation_history: updatedHistory
    });
  },

  async completeSession(sessionId) {
    return await this.updateSession(sessionId, {
      state: 'completed',
      completed_at: new Date().toISOString()
    });
  },

  async deleteSession(sessionId) {
    const { error } = await supabase
      .from('simulation_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return { success: true };
  },

  async listSessionsForSimulation(simulationId) {
    const { data, error } = await supabase
      .from('simulation_sessions')
      .select('*')
      .eq('simulation_id', simulationId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async listSessionsByStudent(studentId) {
    const { data, error } = await supabase
      .from('simulation_sessions')
      .select('*, simulations(*)')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async listAllSessions(filters = {}) {
    let query = supabase
      .from('simulation_sessions')
      .select('*, simulations(*)');

    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id);
    }

    if (filters.state) {
      query = query.eq('state', filters.state);
    }

    query = query.order('started_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  async createDocument(documentData) {
    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDocument(documentId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;

    // Update last accessed timestamp
    await supabase
      .from('documents')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', documentId);

    return data;
  },

  async updateDocument(documentId, updates) {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDocument(documentId) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return { success: true };
  },

  async listDocuments(filters = {}) {
    let query = supabase.from('documents').select('*');

    if (filters.uploaded_by) {
      query = query.eq('uploaded_by', filters.uploaded_by);
    }

    if (filters.file_type) {
      query = query.eq('file_type', filters.file_type);
    }

    if (filters.processing_status) {
      query = query.eq('processing_status', filters.processing_status);
    }

    if (filters.simulation_id) {
      query = query.eq('simulation_id', filters.simulation_id);
    }

    query = query.order('uploaded_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async linkDocumentToSimulation(documentId, simulationId) {
    // Update document with simulation reference
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .update({ simulation_id: simulationId })
      .eq('id', documentId)
      .select()
      .single();

    if (docError) throw docError;

    // Update simulation with document reference
    const { data: simData, error: simError } = await supabase
      .from('simulations')
      .update({ source_document_id: documentId })
      .eq('id', simulationId)
      .select()
      .single();

    if (simError) throw simError;

    return { document: docData, simulation: simData };
  },

  async getDocumentWithSimulation(documentId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*, simulations!simulation_id(*)')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data;
  },

  // Document version management
  async createDocumentVersion(documentId, versionData) {
    // Get next version number
    const { data: versions, error: versionError } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError && versionError.code !== 'PGRST116') throw versionError;

    const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    const { data, error } = await supabase
      .from('document_versions')
      .insert([{
        document_id: documentId,
        version_number: nextVersion,
        ...versionData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDocumentVersions(documentId) {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getLatestDocumentVersion(documentId) {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  }
};

export default supabase;

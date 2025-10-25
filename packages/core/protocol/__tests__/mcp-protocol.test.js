/**
 * @fileoverview MCP Protocol Unit Tests
 * Tests for MCPProtocolV1 implementation
 */

const { MCPProtocolV1, PHASES } = require('../mcp-v1-simple');

describe('MCPProtocolV1', () => {
  let protocol;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
  });

  // ===== Basic Operations =====

  describe('Basic CRUD Operations', () => {
    test('should write and read data', async () => {
      // Grant permissions for test
      await protocol.grantPermission('test_user', {
        reads: ['test_key'],
        writes: ['test_key'],
        preserves: []
      });

      await protocol.write('test_key', 'test_value', 'test_user');
      const value = await protocol.read('test_key');
      expect(value).toBe('test_value');
    });

    test('should check if data exists', async () => {
      await protocol.grantPermission('test_user', {
        reads: ['existing_key'],
        writes: ['existing_key'],
        preserves: []
      });

      await protocol.write('existing_key', 'value', 'test_user');
      expect(await protocol.exists('existing_key')).toBe(true);
      expect(await protocol.exists('nonexistent_key')).toBe(false);
    });

    test('should delete data', async () => {
      await protocol.grantPermission('test_user', {
        reads: ['deletable_key'],
        writes: ['deletable_key'],
        preserves: []
      });

      await protocol.write('deletable_key', 'value', 'test_user');
      await protocol.delete('deletable_key', 'test_user');
      expect(await protocol.exists('deletable_key')).toBe(false);
    });

    test('should return undefined for non-existent keys', async () => {
      const value = await protocol.read('nonexistent');
      expect(value).toBeUndefined();
    });
  });

  // ===== Phase Management =====

  describe('Phase Management', () => {
    test('should start in BUILDING phase', () => {
      expect(protocol.getCurrentPhase()).toBe(PHASES.BUILDING);
    });

    test('should transition from BUILDING to REVIEWING', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      expect(protocol.getCurrentPhase()).toBe(PHASES.REVIEWING);
    });

    test('should transition from REVIEWING to FINALIZED', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      await protocol.transitionPhase(PHASES.FINALIZED);
      expect(protocol.getCurrentPhase()).toBe(PHASES.FINALIZED);
    });

    test('should transition from FINALIZED to RUNTIME', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      await protocol.transitionPhase(PHASES.FINALIZED);
      await protocol.transitionPhase(PHASES.RUNTIME);
      expect(protocol.getCurrentPhase()).toBe(PHASES.RUNTIME);
    });

    test('should reject invalid phase transition (BUILDING -> FINALIZED)', async () => {
      await expect(
        protocol.transitionPhase(PHASES.FINALIZED)
      ).rejects.toThrow('Invalid phase transition');
    });

    test('should reject backwards phase transition (REVIEWING -> BUILDING)', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      await expect(
        protocol.transitionPhase(PHASES.BUILDING)
      ).rejects.toThrow('Invalid phase transition');
    });

    test('should reject transitions from terminal RUNTIME phase', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      await protocol.transitionPhase(PHASES.FINALIZED);
      await protocol.transitionPhase(PHASES.RUNTIME);

      await expect(
        protocol.transitionPhase(PHASES.BUILDING)
      ).rejects.toThrow('Invalid phase transition');
    });

    test('should log phase transitions in audit log', async () => {
      await protocol.transitionPhase(PHASES.REVIEWING);
      const auditLog = await protocol.getAuditLog();
      const phaseTransitions = auditLog.filter(e => e.action === 'phase_transition');

      expect(phaseTransitions).toHaveLength(1);
      expect(phaseTransitions[0]).toMatchObject({
        action: 'phase_transition',
        from: PHASES.BUILDING,
        to: PHASES.REVIEWING
      });
    });
  });

  // ===== Phase-Based Permissions =====

  describe('Phase-Based Permissions', () => {
    describe('BUILDING Phase', () => {
      test('should allow parser to write parsed_data', async () => {
        await protocol.write('raw_input', 'input data', 'user');
        await protocol.write('parsed_data', { test: 'data' }, 'parser');
        const data = await protocol.read('parsed_data');
        expect(data).toEqual({ test: 'data' });
      });

      test('should reject parser writing scenario_outline', async () => {
        await expect(
          protocol.write('scenario_outline', {}, 'parser')
        ).rejects.toThrow('Permission denied');
      });

      test('should allow SAG to write scenario_outline', async () => {
        await protocol.write('parsed_data', { test: 'data' }, 'parser');
        await protocol.write('scenario_outline', { goals: [] }, 'sag');
        const outline = await protocol.read('scenario_outline');
        expect(outline).toEqual({ goals: [] });
      });

      test('should allow validator to read all data', async () => {
        await protocol.write('raw_input', 'input', 'user');
        await protocol.write('parsed_data', { test: 'data' }, 'parser');

        const canRead = await protocol.checkPermission('validator', 'read', 'parsed_data');
        expect(canRead).toBe(true);
      });

      test('should allow validator to write validation warnings only', async () => {
        await protocol.write('validation_warnings', ['warning 1'], 'validator');
        const warnings = await protocol.read('validation_warnings');
        expect(warnings).toEqual(['warning 1']);
      });

      test('should reject validator modifying scenario data', async () => {
        await protocol.write('parsed_data', {}, 'parser');
        await expect(
          protocol.write('parsed_data', { modified: true }, 'validator')
        ).rejects.toThrow('Permission denied');
      });
    });

    describe('RUNTIME Phase', () => {
      beforeEach(async () => {
        // Write blueprint in finalized phase
        await protocol.transitionPhase(PHASES.REVIEWING);
        await protocol.transitionPhase(PHASES.FINALIZED);
        await protocol.write('simulation_blueprint', { test: 'blueprint' }, 'finalizer');

        // Then transition to runtime
        await protocol.transitionPhase(PHASES.RUNTIME);
      });

      test('should allow director to write director_state', async () => {
        await protocol.write('director_state', { phase: 'exploration' }, 'director');
        const state = await protocol.read('director_state');
        expect(state).toEqual({ phase: 'exploration' });
      });

      test('should allow actor to read director_state', async () => {
        await protocol.write('director_state', { phase: 'test' }, 'director');
        const canRead = await protocol.checkPermission('actor', 'read', 'director_state');
        expect(canRead).toBe(true);
      });

      test('should reject actor modifying blueprint', async () => {
        await expect(
          protocol.write('simulation_blueprint', { modified: true }, 'actor')
        ).rejects.toThrow('Permission denied');
      });
    });

    describe('Wildcard Permissions', () => {
      test('should allow validator to read all keys with wildcard', async () => {
        await protocol.write('raw_input', 'value', 'user');
        const canRead = await protocol.checkPermission('validator', 'read', 'raw_input');
        expect(canRead).toBe(true);
      });

      test('should deny unknown agent in current phase', async () => {
        const canWrite = await protocol.checkPermission('unknown_agent', 'write', 'any_key');
        expect(canWrite).toBe(false);
      });
    });
  });

  // ===== Progressive Enrichment (Versioning) =====

  describe('Progressive Enrichment', () => {
    test('should preserve previous values when writing preserved keys', async () => {
      // Parser writes raw_input (which parser preserves)
      await protocol.write('raw_input', 'first version', 'user');

      // Wait a millisecond to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      // Write again
      await protocol.write('raw_input', 'second version', 'user');

      // Both current and latest should exist (user preserves nothing, so no versioning)
      // Let's use parser preserving raw_input instead
      await protocol.write('parsed_data', { v: 1 }, 'parser');
      await new Promise(resolve => setTimeout(resolve, 2));
      await protocol.write('parsed_data', { v: 2 }, 'parser');

      // Parser preserves raw_input when writing, not parsed_data
      // So let's test with an agent that preserves what it writes
      // Grant permissions for an agent that preserves its own writes
      await protocol.grantPermission('versioning_agent', {
        reads: ['test_data'],
        writes: ['test_data'],
        preserves: ['test_data']
      });

      await protocol.write('test_data', { version: 1 }, 'versioning_agent');
      await new Promise(resolve => setTimeout(resolve, 2));
      await protocol.write('test_data', { version: 2 }, 'versioning_agent');

      // Check for versioned data
      const current = await protocol.read('test_data');
      const latest = await protocol.read('test_data_latest');

      expect(current).toEqual({ version: 2 });
      expect(latest).toEqual({ version: 2 });
    });

    test('should create versioned copies with timestamps', async () => {
      // Create agent that preserves its writes
      await protocol.grantPermission('versioning_agent', {
        reads: ['versioned_key'],
        writes: ['versioned_key'],
        preserves: ['versioned_key']
      });

      await protocol.write('versioned_key', { v: 1 }, 'versioning_agent');
      await new Promise(resolve => setTimeout(resolve, 2));
      await protocol.write('versioned_key', { v: 2 }, 'versioning_agent');

      // Check all data for versioned keys
      const allData = protocol.getAllData();
      const versionedKeys = Object.keys(allData).filter(k => k.startsWith('versioned_key_v'));

      expect(versionedKeys.length).toBeGreaterThanOrEqual(2);
    });

    test('should mark preservation in audit log', async () => {
      await protocol.grantPermission('versioning_agent', {
        reads: ['test_key'],
        writes: ['test_key'],
        preserves: ['test_key']
      });

      await protocol.write('test_key', { test: 'data' }, 'versioning_agent');

      const auditLog = await protocol.getAuditLog();
      const writeEntry = auditLog.find(e => e.key === 'test_key' && e.agent === 'versioning_agent');

      expect(writeEntry.preserved).toBe(true);
    });

    test('should not preserve keys that are not in preserves list', async () => {
      await protocol.write('raw_input', 'first', 'user');
      await protocol.write('raw_input', 'second', 'user');

      // Should only have one version (direct overwrite)
      const value = await protocol.read('raw_input');
      expect(value).toBe('second');

      // No versioned keys should exist
      const allData = protocol.getAllData();
      const versionedKeys = Object.keys(allData).filter(k => k.startsWith('raw_input_v'));
      expect(versionedKeys.length).toBe(0);
    });
  });

  // ===== Audit Log =====

  describe('Audit Log', () => {
    test('should log all write operations', async () => {
      // Use valid agents with permissions
      await protocol.write('raw_input', 'value1', 'user');
      await protocol.write('parsed_data', 'value2', 'parser');

      const auditLog = await protocol.getAuditLog();
      const writes = auditLog.filter(e => e.action === 'write');

      expect(writes.length).toBeGreaterThanOrEqual(2);
      expect(writes.some(w => w.agent === 'user')).toBe(true);
      expect(writes.some(w => w.agent === 'parser')).toBe(true);
      expect(writes[0]).toHaveProperty('timestamp');
      expect(writes[0]).toHaveProperty('value_hash');
    });

    test('should log delete operations', async () => {
      await protocol.write('raw_input', 'value', 'user');
      await protocol.delete('raw_input', 'user');

      const auditLog = await protocol.getAuditLog();
      const deletes = auditLog.filter(e => e.action === 'delete');

      expect(deletes.length).toBeGreaterThanOrEqual(1);
      expect(deletes.some(d => d.agent === 'user' && d.key === 'raw_input')).toBe(true);
    });

    test('should filter audit log by agent', async () => {
      await protocol.write('raw_input', 'value', 'user');
      await protocol.write('parsed_data', 'value', 'parser');

      const userLogs = await protocol.getAuditLog({ agent: 'user' });
      expect(userLogs.every(e => e.agent === 'user')).toBe(true);
      expect(userLogs.length).toBeGreaterThanOrEqual(1);
    });

    test('should filter audit log by action', async () => {
      await protocol.write('raw_input', 'value', 'user');
      await protocol.delete('raw_input', 'user');
      await protocol.transitionPhase(PHASES.REVIEWING);

      const writes = await protocol.getAuditLog({ action: 'write' });
      const deletes = await protocol.getAuditLog({ action: 'delete' });
      const transitions = await protocol.getAuditLog({ action: 'phase_transition' });

      expect(writes.every(e => e.action === 'write')).toBe(true);
      expect(deletes.every(e => e.action === 'delete')).toBe(true);
      expect(transitions.every(e => e.action === 'phase_transition')).toBe(true);
    });

    test('should filter audit log by timestamp', async () => {
      const beforeTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 5));

      await protocol.write('raw_input', 'value1', 'user');
      await protocol.write('simulation_settings', 'value2', 'user');

      const recentLogs = await protocol.getAuditLog({ since: beforeTime });
      expect(recentLogs.length).toBeGreaterThanOrEqual(2);

      const futureLogs = await protocol.getAuditLog({ since: Date.now() + 1000 });
      expect(futureLogs.length).toBe(0);
    });

    test('should include value hash in audit entries', async () => {
      await protocol.write('raw_input', { complex: 'object', nested: { data: 'value' } }, 'user');

      const auditLog = await protocol.getAuditLog();
      const writeEntry = auditLog.find(e => e.key === 'raw_input' && e.agent === 'user');

      expect(writeEntry.value_hash).toBeDefined();
      expect(typeof writeEntry.value_hash).toBe('string');
      expect(writeEntry.value_hash.length).toBe(16); // Truncated to 16 chars
    });
  });

  // ===== Agent Communication =====

  describe('Agent Communication', () => {
    test('should register and call agents', async () => {
      const mockAgent = {
        execute: jest.fn().mockResolvedValue({ result: 'success' })
      };

      protocol.registerAgent('test_agent', mockAgent);

      const result = await protocol.call('test_agent', 'execute', { param: 'value' });

      expect(result).toEqual({ result: 'success' });
      expect(mockAgent.execute).toHaveBeenCalledWith({ param: 'value' });
    });

    test('should throw error for unregistered agent', async () => {
      await expect(
        protocol.call('nonexistent_agent', 'execute', {})
      ).rejects.toThrow("Agent 'nonexistent_agent' not registered");
    });

    test('should throw error for unknown tool', async () => {
      const mockAgent = { execute: jest.fn() };
      protocol.registerAgent('test_agent', mockAgent);

      await expect(
        protocol.call('test_agent', 'unknown_tool', {})
      ).rejects.toThrow("Unknown tool 'unknown_tool'");
    });

    test('should log agent calls in audit log', async () => {
      const mockAgent = {
        execute: jest.fn().mockResolvedValue({ data: 'test' })
      };

      protocol.registerAgent('test_agent', mockAgent);
      await protocol.call('test_agent', 'execute', {});

      const auditLog = await protocol.getAuditLog();
      const callEntry = auditLog.find(e => e.action === 'agent_call');

      expect(callEntry).toMatchObject({
        action: 'agent_call',
        caller: 'protocol',
        target: 'test_agent',
        tool: 'execute'
      });
      expect(callEntry).toHaveProperty('result_hash');
    });

    test('should broadcast events', async () => {
      await protocol.broadcast('outline_ready', { id: '123' });

      const auditLog = await protocol.getAuditLog();
      const broadcastEntry = auditLog.find(e => e.action === 'broadcast');

      expect(broadcastEntry).toMatchObject({
        action: 'broadcast',
        event: 'outline_ready'
      });
      expect(broadcastEntry).toHaveProperty('data_hash');
    });
  });

  // ===== Dynamic Permissions =====

  describe('Dynamic Permissions', () => {
    test('should grant additional permissions to agent', async () => {
      await protocol.grantPermission('custom_agent', {
        reads: ['custom_data'],
        writes: ['custom_output'],
        preserves: []
      });

      const canRead = await protocol.checkPermission('custom_agent', 'read', 'custom_data');
      const canWrite = await protocol.checkPermission('custom_agent', 'write', 'custom_output');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
    });

    test('should log permission grants in audit log', async () => {
      await protocol.grantPermission('agent', {
        reads: ['data'],
        writes: ['output'],
        preserves: []
      });

      const auditLog = await protocol.getAuditLog();
      const grantEntry = auditLog.find(e => e.action === 'grant_permission');

      expect(grantEntry).toBeDefined();
      expect(grantEntry.agent).toBe('agent');
    });
  });

  // ===== Integration Tests =====

  describe('Full Pipeline Integration', () => {
    test('should support complete building phase workflow', async () => {
      // User provides input
      await protocol.write('raw_input', 'Business scenario...', 'user');

      // Parser processes
      await protocol.write('parsed_data', { actors: [], context: {} }, 'parser');

      // SAG generates outline
      await protocol.write('scenario_outline', { goals: [], rules: [] }, 'sag');

      // Validator reviews
      await protocol.write('validation_warnings', [], 'validator');

      // Verify all data exists
      expect(await protocol.exists('raw_input')).toBe(true);
      expect(await protocol.exists('parsed_data')).toBe(true);
      expect(await protocol.exists('scenario_outline')).toBe(true);
      expect(await protocol.exists('validation_warnings')).toBe(true);

      // Verify audit trail
      const auditLog = await protocol.getAuditLog();
      expect(auditLog.filter(e => e.action === 'write')).toHaveLength(4);
    });

    test('should maintain data integrity across phase transitions', async () => {
      // Building phase
      await protocol.write('parsed_data', { version: 1 }, 'parser');

      // Transition to reviewing
      await protocol.transitionPhase(PHASES.REVIEWING);

      // Data should still be accessible
      const data = await protocol.read('parsed_data');
      expect(data).toEqual({ version: 1 });

      // Should be in correct phase
      expect(protocol.getCurrentPhase()).toBe(PHASES.REVIEWING);
    });
  });
});

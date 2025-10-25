/**
 * @fileoverview Production Permission Tests
 * Verifies default permissions work without manual grants (catches production bugs)
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');
const { ParserAgent, SAGAgent, ValidatorAgent } = require('../../agents');

describe('Production Permissions (No Manual Grants)', () => {
  let protocol;
  let parser;
  let sag;
  let validator;

  beforeEach(() => {
    // Initialize protocol with DEFAULT permissions only (no manual grants)
    protocol = new MCPProtocolV1();

    // Initialize agents
    parser = new ParserAgent(protocol, { agentId: 'parser' });
    sag = new SAGAgent(protocol, { agentId: 'sag' });
    validator = new ValidatorAgent(protocol, { agentId: 'validator' });

    // Mock LLM responses
    parser.llmCompleteJSON = jest.fn().mockResolvedValue({
      scenario_type: 'crisis',
      industry: 'technology',
      context: {
        company_name: 'TestCorp',
        situation: 'Crisis',
        timeframe: '30 days',
        stakes: 'High'
      },
      actors: [],
      constraints: [],
      objectives: [],
      key_challenges: []
    });

    sag.llmCompleteJSON = jest.fn().mockResolvedValue({
      scenario_id: 'test-001',
      title: 'Test Scenario',
      description: 'Test description',
      actors: [],
      goals: [{
        id: 'goal_1',
        title: 'Test Goal',
        description: 'Test',
        learning_objective: 'Learn',
        success_criteria: ['Test'],
        required_evidence: ['Test'],
        dependencies: []
      }],
      rules: [],
      triggers: [],
      encounters: [],
      lessons: [],
      tests: []
    });
  });

  // ===== Bug #1: Validator Permission Verification =====

  describe('Bug #1: Validator Write Permission', () => {
    test('should allow validator to write validation_result with default permissions', async () => {
      // Setup: Write raw input as user (allowed by default)
      await protocol.write('raw_input', 'Test scenario', 'user');

      // Run pipeline with DEFAULT permissions (no manual grants)
      await parser.execute();
      await sag.execute();

      // Critical: Validator should be able to write validation_result
      // This would fail in production if permissions are wrong
      await expect(validator.execute()).resolves.toBeDefined();

      // Verify validation_result was written
      const validationResult = await protocol.read('validation_result');
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBeDefined();
    });

    test('should fail if validator tries to write non-permitted key', async () => {
      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();
      await sag.execute();

      // Validator should NOT be able to write arbitrary keys
      await expect(
        protocol.write('some_other_key', {}, 'validator')
      ).rejects.toThrow('Permission denied');
    });
  });

  // ===== Bug #2: Progressive Enrichment Verification =====

  describe('Bug #2: Progressive Enrichment Versioning', () => {
    test('should version parsed_data when parser writes it', async () => {
      await protocol.write('raw_input', 'Test', 'user');

      // Parser writes parsed_data - should be versioned
      await parser.execute();

      // Check for versioned keys
      const allKeys = Array.from(protocol.data.keys());
      const versionedKeys = allKeys.filter(k => k.startsWith('parsed_data_v'));

      expect(versionedKeys.length).toBeGreaterThan(0);
      expect(allKeys).toContain('parsed_data_latest');
    });

    test('should version scenario_outline when SAG writes it', async () => {
      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();

      // SAG writes scenario_outline - should be versioned
      await sag.execute();

      // Check for versioned keys
      const allKeys = Array.from(protocol.data.keys());
      const versionedKeys = allKeys.filter(k => k.startsWith('scenario_outline_v'));

      expect(versionedKeys.length).toBeGreaterThan(0);
      expect(allKeys).toContain('scenario_outline_latest');
    });

    test('should preserve history when data is written multiple times', async () => {
      // Mock different responses for each call
      let callCount = 0;
      parser.llmCompleteJSON = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          scenario_type: 'crisis',
          industry: 'technology',
          context: {
            company_name: `TestCorp${callCount}`, // Different data each time
            situation: `Crisis ${callCount}`,
            timeframe: '30 days',
            stakes: 'High'
          },
          actors: [],
          constraints: [],
          objectives: [],
          key_challenges: []
        });
      });

      await protocol.write('raw_input', 'Test 1', 'user');
      await parser.execute();

      // Get first version timestamp
      const allKeys1 = Array.from(protocol.data.keys());
      const version1 = allKeys1.find(k => k.startsWith('parsed_data_v'));

      // Wait 2ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      // Write again
      await protocol.write('raw_input', 'Test 2', 'user');
      await parser.execute();

      // Check for BOTH versions
      const allKeys2 = Array.from(protocol.data.keys());
      const versionedKeys = allKeys2.filter(k => k.startsWith('parsed_data_v'));

      expect(versionedKeys.length).toBe(2);
      expect(versionedKeys).toContain(version1);

      // Verify both versions are preserved
      const version1Data = await protocol.read(version1);
      const version2Key = versionedKeys.find(k => k !== version1);
      const version2Data = await protocol.read(version2Key);

      expect(version1Data).toBeDefined();
      expect(version2Data).toBeDefined();
      expect(version1Data.context.company_name).toBe('TestCorp1');
      expect(version2Data.context.company_name).toBe('TestCorp2');
    });

    test('should update _latest pointer to newest version', async () => {
      // Mock different responses for each call
      let callCount = 0;
      parser.llmCompleteJSON = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          scenario_type: 'crisis',
          industry: 'technology',
          context: {
            company_name: `VersionTest${callCount}`, // Different data each time
            situation: 'Crisis',
            timeframe: '30 days',
            stakes: 'High'
          },
          actors: [],
          constraints: [],
          objectives: [],
          key_challenges: []
        });
      });

      await protocol.write('raw_input', 'Test 1', 'user');
      await parser.execute();
      const latest1 = await protocol.read('parsed_data_latest');

      await new Promise(resolve => setTimeout(resolve, 2));

      await protocol.write('raw_input', 'Test 2', 'user');
      await parser.execute();
      const latest2 = await protocol.read('parsed_data_latest');

      expect(latest1.context.company_name).toBe('VersionTest1');
      expect(latest2.context.company_name).toBe('VersionTest2');
    });
  });

  // ===== Complete Pipeline with Default Permissions =====

  describe('Complete Pipeline (Production Simulation)', () => {
    test('should complete entire pipeline with only default permissions', async () => {
      // This test simulates EXACTLY what would happen in production
      // No manual permission grants - only what's in mcp-v1-simple.js

      await protocol.write('raw_input', 'Test scenario', 'user');

      // Run complete pipeline
      const parsedData = await parser.execute();
      expect(parsedData).toBeDefined();

      const outline = await sag.execute();
      expect(outline).toBeDefined();

      const validation = await validator.execute();
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);

      // Verify all data is accessible
      expect(await protocol.read('raw_input')).toBeDefined();
      expect(await protocol.read('parsed_data')).toBeDefined();
      expect(await protocol.read('scenario_outline')).toBeDefined();
      expect(await protocol.read('validation_result')).toBeDefined();

      // Verify versioning happened
      const allKeys = Array.from(protocol.data.keys());
      expect(allKeys.some(k => k.startsWith('parsed_data_v'))).toBe(true);
      expect(allKeys.some(k => k.startsWith('scenario_outline_v'))).toBe(true);
    });
  });

  // ===== Audit Log Verification =====

  describe('Audit Log with Default Permissions', () => {
    test('should log all agent writes correctly', async () => {
      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();
      await sag.execute();
      await validator.execute();

      const auditLog = await protocol.getAuditLog();

      // Verify parser wrote parsed_data
      const parserWrites = auditLog.filter(
        e => e.agent === 'parser' && e.action === 'write' && e.key === 'parsed_data'
      );
      expect(parserWrites.length).toBeGreaterThan(0);

      // Verify SAG wrote scenario_outline
      const sagWrites = auditLog.filter(
        e => e.agent === 'sag' && e.action === 'write' && e.key === 'scenario_outline'
      );
      expect(sagWrites.length).toBeGreaterThan(0);

      // Verify validator wrote validation_result
      const validatorWrites = auditLog.filter(
        e => e.agent === 'validator' && e.action === 'write' && e.key === 'validation_result'
      );
      expect(validatorWrites.length).toBeGreaterThan(0);
    });

    test('should mark versioned writes as preserved in audit log', async () => {
      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();

      const auditLog = await protocol.getAuditLog();
      const parserWrite = auditLog.find(
        e => e.agent === 'parser' && e.action === 'write' && e.key === 'parsed_data'
      );

      expect(parserWrite).toBeDefined();
      expect(parserWrite.preserved).toBe(true);
    });
  });
});

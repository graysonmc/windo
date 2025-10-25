/**
 * @fileoverview Parser Agent Unit Tests
 */

const ParserAgent = require('../parser-agent');
const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');

describe('ParserAgent', () => {
  let protocol;
  let parser;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    parser = new ParserAgent(protocol, { agentId: 'parser' });

    // Grant parser permissions
    protocol.grantPermission('parser', {
      reads: ['raw_input'],
      writes: ['parsed_data'],
      preserves: ['raw_input']
    });
  });

  // ===== Basic Functionality =====

  describe('Basic Parsing', () => {
    test('should parse simple business scenario', async () => {
      const rawInput = `
        TechCorp is facing a crisis. The CEO, Sarah Johnson, must decide whether to
        recall a faulty product that could cost $50M. The company has 30 days to decide
        before regulatory action. The VP of Operations, Mike Chen, is concerned about
        manufacturing capacity.
      `;

      await protocol.write('raw_input', rawInput, 'user');

      // Mock LLM response
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'crisis',
        industry: 'technology',
        context: {
          company_name: 'TechCorp',
          situation: 'Product recall decision',
          timeframe: '30 days',
          stakes: '$50M cost and regulatory action'
        },
        actors: [
          { role: 'CEO', name: 'Sarah Johnson', description: 'Decision maker' },
          { role: 'VP of Operations', name: 'Mike Chen', description: 'Manufacturing concerns' }
        ],
        constraints: ['$50M budget impact', '30 day deadline', 'Regulatory pressure'],
        objectives: ['Decide on product recall'],
        key_challenges: ['Cost vs safety tradeoff', 'Time pressure']
      });

      const result = await parser.execute();

      expect(result.scenario_type).toBe('crisis');
      expect(result.industry).toBe('technology');
      expect(result.actors).toHaveLength(2);
      expect(result.actors[0].name).toBe('Sarah Johnson');
      expect(result.constraints).toContain('$50M budget impact');
    });

    test('should write parsed data to protocol', async () => {
      await protocol.write('raw_input', 'Test scenario', 'user');

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { situation: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      await parser.execute();

      const parsedData = await protocol.read('parsed_data');
      expect(parsedData).toBeDefined();
      expect(parsedData.scenario_type).toBe('other');
    });

    test('should broadcast parsing_complete event', async () => {
      await protocol.write('raw_input', 'Test scenario', 'user');

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'strategy',
        industry: 'general',
        context: {},
        actors: [{ role: 'CEO' }, { role: 'CFO' }],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      await parser.execute();

      const auditLog = await protocol.getAuditLog();
      const broadcastEvent = auditLog.find(e => e.action === 'broadcast' && e.event === 'parsing_complete');

      expect(broadcastEvent).toBeDefined();
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should throw error if no raw_input exists', async () => {
      await expect(parser.execute()).rejects.toThrow('No raw_input found');
    });

    test('should handle LLM errors gracefully', async () => {
      await protocol.write('raw_input', 'Test scenario', 'user');

      parser.llmCompleteJSON = jest.fn().mockRejectedValue(
        new Error('OpenAI API error')
      );

      await expect(parser.execute()).rejects.toThrow('OpenAI API error');
    });
  });

  // ===== Validation =====

  describe('Data Validation', () => {
    test('should validate scenario type to allowed values', () => {
      expect(parser.validateScenarioType('crisis')).toBe('crisis');
      expect(parser.validateScenarioType('NEGOTIATION')).toBe('negotiation');
      expect(parser.validateScenarioType('invalid_type')).toBe('other');
      expect(parser.validateScenarioType(null)).toBe('other');
    });

    test('should validate and normalize actors', () => {
      const actors = parser.validateActors([
        { role: 'CEO', name: 'John Doe', description: 'Leader' },
        { role: 'CFO' }, // Missing name and description
        { name: 'Jane Smith' }, // Missing role
      ]);

      expect(actors).toHaveLength(3);
      expect(actors[0]).toEqual({
        role: 'CEO',
        name: 'John Doe',
        description: 'Leader'
      });
      expect(actors[1]).toEqual({
        role: 'CFO',
        name: 'CFO',
        description: 'No description'
      });
      expect(actors[2]).toEqual({
        role: 'Unknown role',
        name: 'Jane Smith',
        description: 'No description'
      });
    });

    test('should handle invalid actors gracefully', () => {
      expect(parser.validateActors(null)).toEqual([]);
      expect(parser.validateActors(undefined)).toEqual([]);
      expect(parser.validateActors('not an array')).toEqual([]);
    });

    test('should fill in missing context fields', () => {
      const data = {
        scenario_type: 'crisis',
        context: {
          company_name: 'TestCorp'
          // Missing other fields
        },
        actors: []
      };

      const validated = parser.validateParsedData(data);

      expect(validated.context.company_name).toBe('TestCorp');
      expect(validated.context.situation).toBe('No description provided');
      expect(validated.context.timeframe).toBe('Not specified');
      expect(validated.context.stakes).toBe('Not specified');
    });

    test('should ensure arrays for constraints/objectives/challenges', () => {
      const data = {
        scenario_type: 'strategy',
        context: {},
        actors: [],
        constraints: null,
        objectives: 'single objective', // Not an array
        key_challenges: undefined
      };

      const validated = parser.validateParsedData(data);

      expect(Array.isArray(validated.constraints)).toBe(true);
      expect(Array.isArray(validated.objectives)).toBe(true);
      expect(Array.isArray(validated.key_challenges)).toBe(true);
    });
  });

  // ===== Prompt Building =====

  describe('Prompt Building', () => {
    test('should build comprehensive parsing prompt', () => {
      const rawInput = 'TechCorp needs to decide on a merger';
      const prompt = parser.buildParserPrompt(rawInput);

      expect(prompt).toContain(rawInput);
      expect(prompt).toContain('scenario_type');
      expect(prompt).toContain('actors');
      expect(prompt).toContain('constraints');
      expect(prompt).toContain('JSON');
    });

    test('should include all required fields in prompt', () => {
      const prompt = parser.buildParserPrompt('Test');

      expect(prompt).toContain('scenario_type');
      expect(prompt).toContain('industry');
      expect(prompt).toContain('context');
      expect(prompt).toContain('actors');
      expect(prompt).toContain('constraints');
      expect(prompt).toContain('objectives');
      expect(prompt).toContain('key_challenges');
    });

    test('should specify valid scenario types in prompt', () => {
      const prompt = parser.buildParserPrompt('Test');

      expect(prompt).toContain('crisis');
      expect(prompt).toContain('negotiation');
      expect(prompt).toContain('strategy');
      expect(prompt).toContain('operations');
      expect(prompt).toContain('leadership');
    });
  });

  // ===== Summary Generation =====

  describe('Summary Generation', () => {
    test('should generate human-readable summary', () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'technology',
        actors: [{ role: 'CEO' }, { role: 'CFO' }],
        constraints: ['Budget', 'Time'],
        objectives: ['Survive', 'Grow'],
        key_challenges: ['Competition', 'Resources']
      };

      const summary = parser.getSummary(parsedData);

      expect(summary).toContain('Scenario Type: crisis');
      expect(summary).toContain('Industry: technology');
      expect(summary).toContain('Actors: 2');
      expect(summary).toContain('Constraints: 2');
      expect(summary).toContain('Objectives: 2');
      expect(summary).toContain('Key Challenges: 2');
    });
  });

  // ===== Integration with Protocol =====

  describe('Protocol Integration', () => {
    test('should respect phase-based permissions', async () => {
      await protocol.write('raw_input', 'Test', 'user');

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      // Parser should be able to write in BUILDING phase
      await expect(parser.execute()).resolves.toBeDefined();

      // Verify write was recorded in audit log
      const auditLog = await protocol.getAuditLog();
      const writeEntry = auditLog.find(
        e => e.action === 'write' && e.key === 'parsed_data' && e.agent === 'parser'
      );

      expect(writeEntry).toBeDefined();
    });

    test('should use gpt-3.5-turbo model', async () => {
      await protocol.write('raw_input', 'Test scenario', 'user');

      const llmCompleteSpy = jest.spyOn(parser, 'llmCompleteJSON');

      llmCompleteSpy.mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      await parser.execute();

      expect(llmCompleteSpy).toHaveBeenCalledWith(
        expect.any(Array),
        'gpt-3.5-turbo'
      );
    });
  });

  // ===== Real-world Scenarios =====

  describe('Real-world Parsing Scenarios', () => {
    test('should parse crisis scenario with multiple actors', async () => {
      const rawInput = `
        GlobalBank is experiencing a cybersecurity breach. Customer data may be compromised.
        The CTO, Alice Wong, discovered the breach. The CEO, Robert Martinez, must decide
        whether to publicly disclose. The Legal team led by David Kim advises caution.
        The company has $2B in assets at risk and faces potential regulatory fines of $500M.
        They have 24 hours to comply with disclosure laws.
      `;

      await protocol.write('raw_input', rawInput, 'user');

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'crisis',
        industry: 'banking',
        context: {
          company_name: 'GlobalBank',
          situation: 'Cybersecurity breach with customer data compromise',
          timeframe: '24 hours',
          stakes: '$2B in assets and $500M potential fines'
        },
        actors: [
          { role: 'CTO', name: 'Alice Wong', description: 'Discovered the breach' },
          { role: 'CEO', name: 'Robert Martinez', description: 'Final decision maker' },
          { role: 'Legal Lead', name: 'David Kim', description: 'Advising on disclosure' }
        ],
        constraints: [
          '24 hour disclosure deadline',
          '$500M potential regulatory fines',
          'Legal compliance requirements'
        ],
        objectives: [
          'Decide on public disclosure',
          'Protect customer data',
          'Comply with regulations'
        ],
        key_challenges: [
          'Time pressure',
          'Regulatory compliance',
          'Reputational risk',
          'Financial exposure'
        ]
      });

      const result = await parser.execute();

      expect(result.scenario_type).toBe('crisis');
      expect(result.industry).toBe('banking');
      expect(result.actors).toHaveLength(3);
      expect(result.constraints.length).toBeGreaterThan(0);
      expect(result.key_challenges).toContain('Time pressure');
    });
  });
});

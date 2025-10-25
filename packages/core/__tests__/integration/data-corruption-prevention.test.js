/**
 * @fileoverview Data Corruption Prevention Tests
 * Verifies fixes for timestamp collisions and object mutation bugs
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');

describe('Data Corruption Prevention', () => {
  let protocol;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
  });

  // ===== Bug #3: Timestamp Collision Tests =====

  describe('Bug #3: Timestamp Collision Prevention', () => {
    test('should handle rapid writes in same millisecond without collision', async () => {
      // Grant permissions for testing
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: ['parsed_data']
      });

      // Perform rapid writes (likely to hit same millisecond)
      const writes = [];
      for (let i = 0; i < 10; i++) {
        writes.push(protocol.write('parsed_data', { version: i }, 'parser'));
      }

      await Promise.all(writes);

      // Verify ALL 10 versions were saved (no collision overwrites)
      const allKeys = Array.from(protocol.data.keys());
      const versionKeys = allKeys.filter(k => k.startsWith('parsed_data_v'));

      expect(versionKeys.length).toBe(10);

      // Verify all versions are unique
      const uniqueKeys = new Set(versionKeys);
      expect(uniqueKeys.size).toBe(10);
    });

    test('should use UUID suffix for collision-proof version keys', async () => {
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: ['parsed_data']
      });

      await protocol.write('parsed_data', { test: 1 }, 'parser');

      const allKeys = Array.from(protocol.data.keys());
      const versionKey = allKeys.find(k => k.startsWith('parsed_data_v'));

      // Verify format: key_v{timestamp}_{uuid}
      expect(versionKey).toMatch(/^parsed_data_v\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('should preserve all versions in simultaneous write scenario', async () => {
      protocol.grantPermission('sag', {
        reads: [],
        writes: ['scenario_outline'],
        preserves: ['scenario_outline']
      });

      // Simulate 100 rapid writes (stress test)
      const rapidWrites = Array.from({ length: 100 }, (_, i) =>
        protocol.write('scenario_outline', { id: i }, 'sag')
      );

      await Promise.all(rapidWrites);

      const allKeys = Array.from(protocol.data.keys());
      const versionKeys = allKeys.filter(k => k.startsWith('scenario_outline_v'));

      // All 100 versions should be preserved
      expect(versionKeys.length).toBe(100);
    });
  });

  // ===== Bug #4: Object Mutation Tests =====

  describe('Bug #4: Object Mutation Prevention', () => {
    test('should prevent read mutations from affecting stored data', async () => {
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: []
      });

      protocol.grantPermission('sag', {
        reads: ['parsed_data'],
        writes: [],
        preserves: []
      });

      // Parser writes data
      const originalData = {
        actors: ['Alice', 'Bob'],
        context: { company: 'TestCorp' }
      };
      await protocol.write('parsed_data', originalData, 'parser');

      // SAG reads the data
      const readData = await protocol.read('parsed_data');

      // SAG mutates what it read
      readData.actors.push('Charlie');
      readData.context.company = 'ModifiedCorp';
      readData.newField = 'This should not appear in storage';

      // Verify stored data is unchanged
      const storedData = await protocol.read('parsed_data');
      expect(storedData.actors).toEqual(['Alice', 'Bob']);
      expect(storedData.context.company).toBe('TestCorp');
      expect(storedData.newField).toBeUndefined();
    });

    test('should prevent write input mutations from affecting stored data', async () => {
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: []
      });

      // Parser writes data
      const inputData = {
        actors: ['Alice'],
        metadata: { version: 1 }
      };
      await protocol.write('parsed_data', inputData, 'parser');

      // Parser mutates the input object after writing
      inputData.actors.push('Bob');
      inputData.metadata.version = 2;
      inputData.corrupted = true;

      // Verify stored data is unchanged
      const storedData = await protocol.read('parsed_data');
      expect(storedData.actors).toEqual(['Alice']);
      expect(storedData.metadata.version).toBe(1);
      expect(storedData.corrupted).toBeUndefined();
    });

    test('should preserve immutability across version history', async () => {
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: ['parsed_data']
      });

      // Write version 1
      const v1Data = { actors: ['Alice'], version: 1 };
      await protocol.write('parsed_data', v1Data, 'parser');

      // Get version 1 key
      let allKeys = Array.from(protocol.data.keys());
      const v1Key = allKeys.find(k => k.startsWith('parsed_data_v'));

      // Write version 2
      const v2Data = { actors: ['Alice', 'Bob'], version: 2 };
      await protocol.write('parsed_data', v2Data, 'parser');

      // Read version 1 and try to mutate it
      const v1Read = await protocol.read(v1Key);
      v1Read.actors.push('CORRUPTED');
      v1Read.version = 999;

      // Verify version 1 in storage is unchanged
      const v1Stored = await protocol.read(v1Key);
      expect(v1Stored.actors).toEqual(['Alice']);
      expect(v1Stored.version).toBe(1);

      // Verify version 2 is also unchanged
      const v2Stored = await protocol.read('parsed_data');
      expect(v2Stored.actors).toEqual(['Alice', 'Bob']);
      expect(v2Stored.version).toBe(2);
    });

    test('should handle nested object mutations', async () => {
      protocol.grantPermission('sag', {
        reads: [],
        writes: ['scenario_outline'],
        preserves: []
      });

      // Write deeply nested data
      const originalData = {
        goals: [
          {
            id: 'goal_1',
            success_criteria: {
              required_evidence: ['Evidence 1', 'Evidence 2'],
              nested: {
                deep: {
                  value: 'original'
                }
              }
            }
          }
        ]
      };

      await protocol.write('scenario_outline', originalData, 'sag');

      // Read and mutate deeply nested values
      const readData = await protocol.read('scenario_outline');
      readData.goals[0].success_criteria.required_evidence.push('CORRUPTED');
      readData.goals[0].success_criteria.nested.deep.value = 'CORRUPTED';
      readData.goals[0].id = 'CORRUPTED';

      // Verify stored data is unchanged
      const storedData = await protocol.read('scenario_outline');
      expect(storedData.goals[0].success_criteria.required_evidence).toEqual(['Evidence 1', 'Evidence 2']);
      expect(storedData.goals[0].success_criteria.nested.deep.value).toBe('original');
      expect(storedData.goals[0].id).toBe('goal_1');
    });

    test('should protect _latest pointer from mutations', async () => {
      protocol.grantPermission('parser', {
        reads: [],
        writes: ['parsed_data'],
        preserves: ['parsed_data']
      });

      const originalData = { actors: ['Alice'], version: 1 };
      await protocol.write('parsed_data', originalData, 'parser');

      // Read via _latest pointer
      const latestRead = await protocol.read('parsed_data_latest');
      latestRead.actors.push('CORRUPTED');

      // Verify _latest pointer still points to clean data
      const latestStored = await protocol.read('parsed_data_latest');
      expect(latestStored.actors).toEqual(['Alice']);
    });
  });

  // ===== Combined Corruption Scenarios =====

  describe('Combined Corruption Scenarios', () => {
    test('should handle rapid writes with mutations without data loss', async () => {
      protocol.grantPermission('parser', {
        reads: ['raw_input'],
        writes: ['parsed_data'],
        preserves: ['parsed_data']
      });

      // Perform rapid writes with attempted mutations
      const corruptionAttempts = [];
      for (let i = 0; i < 20; i++) {
        const data = { version: i, timestamp: Date.now() };

        // Write and immediately try to corrupt
        const writePromise = protocol.write('parsed_data', data, 'parser').then(async () => {
          const read = await protocol.read('parsed_data');
          read.version = 9999; // Try to corrupt
          read.corrupted = true;
        });

        corruptionAttempts.push(writePromise);
      }

      await Promise.all(corruptionAttempts);

      // Verify all 20 versions exist and are uncorrupted
      const allKeys = Array.from(protocol.data.keys());
      const versionKeys = allKeys.filter(k => k.startsWith('parsed_data_v'));

      expect(versionKeys.length).toBe(20);

      // Check each version is clean (no 'corrupted' field)
      for (const versionKey of versionKeys) {
        const versionData = await protocol.read(versionKey);
        expect(versionData.corrupted).toBeUndefined();
        expect(versionData.version).not.toBe(9999);
      }
    });

    test('should maintain immutability under concurrent read/write stress', async () => {
      protocol.grantPermission('test', {
        reads: ['test_data'],
        writes: ['test_data'],
        preserves: ['test_data']
      });

      const baseData = { value: 'clean', array: [1, 2, 3] };
      await protocol.write('test_data', baseData, 'test');

      // Concurrent reads with mutation attempts
      const reads = Array.from({ length: 50 }, () =>
        protocol.read('test_data').then(data => {
          data.value = 'CORRUPTED';
          data.array.push(999);
          return data;
        })
      );

      // Concurrent writes
      const writes = Array.from({ length: 10 }, (_, i) =>
        protocol.write('test_data', { value: 'clean', array: [1, 2, 3], writeNum: i }, 'test')
      );

      await Promise.all([...reads, ...writes]);

      // Verify latest data is clean
      const latestData = await protocol.read('test_data');
      expect(latestData.value).toBe('clean');
      expect(latestData.array).toEqual([1, 2, 3]);
      expect(latestData.writeNum).toBeDefined(); // From one of the writes

      // Verify all 11 versions (1 initial + 10 writes) exist and are clean
      const allKeys = Array.from(protocol.data.keys());
      const versionKeys = allKeys.filter(k => k.startsWith('test_data_v'));
      expect(versionKeys.length).toBe(11);
    });
  });
});

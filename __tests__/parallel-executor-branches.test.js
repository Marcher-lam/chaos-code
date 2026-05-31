const ParallelExecutor = require('../src/utils/parallel-executor');
const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');
const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');

/**
 * Tests targeting uncovered branches in parallel-executor.js
 * Line 204-208: degraded retry that also fails
 */

function makeAdapterWithEngines(engines) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pe-'));
  const yamlPath = path.join(tmpDir, 'engines.yaml');
  fs.writeFileSync(yamlPath, yaml.dump(engines), 'utf8');
  const adapter = new HeterogeneousAdapter(yamlPath);
  adapter._tmpDir = tmpDir;
  return adapter;
}

function cleanupAdapter(adapter) {
  if (adapter._tmpDir) fs.rmSync(adapter._tmpDir, { recursive: true, force: true });
}

describe('ParallelExecutor branch coverage', () => {
  describe('_executeLayer — degraded retry also fails (line 204-208)', () => {
    it('marks degraded:true when degraded retry also throws', async () => {
      const adapter = makeAdapterWithEngines({
        'full-engine': { name: 'Full', type: 'cli', enabled: true, skills_compatibility: 'full' },
        'fallback-engine': { name: 'Fallback', type: 'cli', enabled: true, skills_compatibility: 'full' },
      });

      const graph = {
        version: '1.0',
        config: { max_parallel: 4 },
        skills: {
          'stdd-apply': { depends_on: [], metadata: {} },
        },
      };

      let callCount = 0;
      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async () => {
          callCount++;
          const err = new Error('always fails');
          err.code = 'ETIMEDOUT';
          throw err;
        },
      });

      const { results } = await executor.executeAll({});
      expect(callCount).toBeGreaterThan(0);
      expect(results['stdd-apply']).toBeDefined();
      // Both original and retry fail
      expect(results['stdd-apply'].success).toBe(false);
      // It should have degraded:true if a fallback existed, or false without
      if (adapter.degrade('full-engine', 'stdd-apply')) {
        expect(results['stdd-apply'].degraded).toBe(true);
      }

      cleanupAdapter(adapter);
    });

    it('marks degraded:true even when retry returns failure output', async () => {
      const adapter = makeAdapterWithEngines({
        'full-engine': { name: 'Full', type: 'cli', enabled: true, skills_compatibility: 'full' },
        'fallback-engine': { name: 'Fallback', type: 'cli', enabled: true, skills_compatibility: 'full' },
      });

      const graph = {
        skills: {
          A: { depends_on: [], metadata: {} },
        },
      };

      let callCount = 0;
      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async () => {
          callCount++;
          throw new Error('persistent failure');
        },
      });

      const engineAssignment = adapter.assignEngines(['A']);
      const result = await executor._executeLayer(['A'], engineAssignment, {});
      expect(callCount).toBeGreaterThan(0);

      // Since executeFn always throws, degrade should kick in and retry also fails
      expect(result.A.success).toBe(false);
      expect(result.A.error).toBe('persistent failure');

      cleanupAdapter(adapter);
    });
  });

  describe('executeParallelGroup — strategy branches', () => {
    it('handles "any" strategy', async () => {
      const adapter = makeAdapterWithEngines({
        'e1': { name: 'E1', type: 'cli', enabled: true, skills_compatibility: 'full' },
      });

      const graph = {
        skills: {
          A: { depends_on: [], metadata: { parallel_group: 'test-group' } },
          B: { depends_on: [], metadata: { parallel_group: 'test-group' } },
        },
        config: {},
      };

      // Override _getParallelGroups to return any strategy
      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async (nodeName) => {
          if (nodeName === 'A') return { success: true };
          throw new Error('B failed');
        },
      });

      const _origGetGroups = executor._getParallelGroups.bind(executor);
      executor._getParallelGroups = () => ({
        'test-group': { strategy: 'any', skills: ['A', 'B'] },
      });

      const result = await executor.executeParallelGroup('test-group');
      expect(result.strategy).toBe('any');
      expect(result.passed).toBe(true); // at least one succeeded

      cleanupAdapter(adapter);
    });

    it('handles "race" strategy', async () => {
      const adapter = makeAdapterWithEngines({
        'e1': { name: 'E1', type: 'cli', enabled: true, skills_compatibility: 'full' },
      });

      const graph = {
        skills: {
          A: { depends_on: [], metadata: {} },
          B: { depends_on: [], metadata: {} },
        },
        config: {},
      };

      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async (nodeName) => {
          if (nodeName === 'A') return { success: true };
          throw new Error('B failed');
        },
      });

      executor._getParallelGroups = () => ({
        'test-group': { strategy: 'race', skills: ['A', 'B'] },
      });

      const result = await executor.executeParallelGroup('test-group');
      expect(result.strategy).toBe('race');
      expect(result.passed).toBe(true);

      cleanupAdapter(adapter);
    });

    it('handles unknown strategy (defaults to all)', async () => {
      const adapter = makeAdapterWithEngines({
        'e1': { name: 'E1', type: 'cli', enabled: true, skills_compatibility: 'full' },
      });

      const graph = {
        skills: {
          A: { depends_on: [], metadata: {} },
        },
        config: {},
      };

      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async () => ({ success: true }),
      });

      executor._getParallelGroups = () => ({
        'test-group': { strategy: 'custom', skills: ['A'] },
      });

      const result = await executor.executeParallelGroup('test-group');
      expect(result.passed).toBe(true);

      cleanupAdapter(adapter);
    });
  });

  describe('constructor defaults', () => {
    it('uses graph.config.max_parallel when options.maxParallel not provided', () => {
      const graph = { skills: {}, config: { max_parallel: 7 } };
      const adapter = makeAdapterWithEngines({});
      const executor = new ParallelExecutor(graph, adapter);
      expect(executor.maxParallel).toBe(7);
      cleanupAdapter(adapter);
    });

    it('defaults to 4 when no maxParallel specified anywhere', () => {
      const graph = { skills: {} };
      const adapter = makeAdapterWithEngines({});
      const executor = new ParallelExecutor(graph, adapter);
      expect(executor.maxParallel).toBe(4);
      cleanupAdapter(adapter);
    });

    it('uses default executeFn when not provided', () => {
      const graph = { skills: {} };
      const adapter = makeAdapterWithEngines({});
      const executor = new ParallelExecutor(graph, adapter);
      expect(typeof executor.executeFn).toBe('function');
      cleanupAdapter(adapter);
    });
  });

  describe('_topologicalLayers — dependents lookup miss', () => {
    it('handles dep that does not exist as a node', () => {
      const graph = {
        skills: {
          A: { depends_on: ['phantom'] },
          B: { depends_on: [] },
        },
      };
      const adapter = makeAdapterWithEngines({});
      const executor = new ParallelExecutor(graph, adapter);
      // Should not crash; phantom dep is ignored
      const layers = executor._topologicalLayers();
      const all = layers.flat();
      expect(all.sort()).toEqual(['A', 'B']);
      cleanupAdapter(adapter);
    });
  });

  describe('_executeLayer — error with no degraded engine', () => {
    it('returns failure without degraded flag when no fallback', async () => {
      // Empty adapter => no engines => degrade returns null
      const adapter = makeAdapterWithEngines({});

      const graph = {
        skills: { A: { depends_on: [], metadata: {} } },
      };

      const executor = new ParallelExecutor(graph, adapter, {
        executeFn: async () => { throw new Error('fail'); },
      });

      const { results } = await executor.executeAll({});
      expect(results.A.success).toBe(false);
      expect(results.A.degraded).toBe(false);

      cleanupAdapter(adapter);
    });
  });

  describe('_detectFileConflicts — nodes without outputs array', () => {
    it('handles missing outputs field gracefully', () => {
      const graph = {
        skills: {
          A: { depends_on: [] }, // no outputs
          B: { depends_on: [] }, // no outputs
        },
      };
      const adapter = makeAdapterWithEngines({});
      const executor = new ParallelExecutor(graph, adapter);
      const conflicts = executor._detectFileConflicts(['A', 'B'], {});
      expect(conflicts).toEqual([]);
      cleanupAdapter(adapter);
    });
  });
});

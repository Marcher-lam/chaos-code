const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { OutsideInCommand, _DEFAULT_REGISTRY } = require('../src/cli/commands/outside-in');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-outsidein-cov-'));
}

function setupStdd(tmp) {
  fs.mkdirSync(path.join(tmp, 'stdd', 'changes'), { recursive: true });
  return tmp;
}

describe('OutsideInCommand - uncovered branch coverage', () => {
  let tmp;
  let logSpy;

  beforeEach(() => {
    tmp = setupStdd(makeTmp());
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------
  // 1. safeName fallback (line 23)
  //    String(name || 'feature') => '' after regex => returns 'feature'
  // ---------------------------------------------------------------
  describe('safeName fallback via scaffold', () => {
    it('falls back to "feature" when all chars are stripped (e.g. "---")', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'my-change'), { recursive: true });
      // Pass a feature name that becomes empty after regex stripping
      const result = cmd.scaffold('my-change', { feature: '---' });
      expect(result.feature).toBe('feature');
    });

    it('falls back to "feature" when feature is "!!!"', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'my-change'), { recursive: true });
      const result = cmd.scaffold('my-change', { feature: '!!!' });
      expect(result.feature).toBe('feature');
    });

    it('handles safeName with null/undefined feature via scaffold', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'some-change'), { recursive: true });
      // feature is explicitly undefined, falls back to basename of changeDir
      const result = cmd.scaffold('some-change', { feature: undefined });
      expect(result.feature).toBe('some-change');
    });
  });

  // ---------------------------------------------------------------
  // 2. Unknown action throw (line 31)
  // ---------------------------------------------------------------
  describe('execute - unknown action', () => {
    it('throws for unknown action "bogus"', () => {
      const cmd = new OutsideInCommand(tmp);
      expect(() => cmd.execute('bogus')).toThrow("Unknown outside-in action 'bogus'");
    });

    it('throws for unknown action "random"', () => {
      const cmd = new OutsideInCommand(tmp);
      expect(() => cmd.execute('random')).toThrow(/Unknown outside-in action/);
    });
  });

  // ---------------------------------------------------------------
  // 3. printResult non-JSON branch (lines 51, 100-102)
  //    execute('status', ...) without json:true hits the else branch
  // ---------------------------------------------------------------
  describe('printResult non-JSON branch', () => {
    it('status without json:true prints title-prefixed output', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      const _result = cmd.execute('status');
      // printResult was called; check the last console.log call
      const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      // Non-JSON branch prepends the title
      expect(lastCall).toMatch(/^Outside-in registry status:/);
      // Should still contain the JSON structure after the title
      expect(lastCall).toContain('"layers"');
    });

    it('status with json:true prints raw JSON', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      cmd.execute('status', undefined, { json: true });
      const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      // JSON branch: parseable JSON without title prefix
      const parsed = JSON.parse(lastCall);
      expect(parsed.layers).toBeDefined();
      expect(lastCall).not.toMatch(/^Outside-in registry status:/);
    });

    it('init without json:true prints title-prefixed output', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      expect(lastCall).toMatch(/^Outside-in registry initialized:/);
    });
  });

  // ---------------------------------------------------------------
  // 4. registry.layers || [] fallback (line 71)
  //    YAML file without layers key => registry.layers is undefined
  // ---------------------------------------------------------------
  describe('registry.layers || [] fallback', () => {
    it('scaffold handles YAML with no layers key (produces empty skeletons)', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      // Overwrite registry with YAML that has no layers key
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      fs.writeFileSync(registryPath, yaml.dump({ version: 1, workflow: 'outside-in', rules: [] }), 'utf8');

      fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'no-layers'), { recursive: true });
      const result = cmd.scaffold('no-layers');
      expect(result.skeletons).toEqual([]);
    });

    it('status handles YAML with no layers key', () => {
      const cmd = new OutsideInCommand(tmp);
      // Write a registry without layers
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      fs.writeFileSync(registryPath, yaml.dump({ version: 1, rules: ['be careful'] }), 'utf8');
      const result = cmd.status();
      expect(result.layers).toEqual([]);
      expect(result.rules).toEqual(['be careful']);
    });
  });

  // ---------------------------------------------------------------
  // 5. Empty YAML and missing purpose (lines 85, 90-91)
  // ---------------------------------------------------------------
  describe('empty YAML and missing purpose', () => {
    it('readRegistry returns empty object for empty YAML file', () => {
      const cmd = new OutsideInCommand(tmp);
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      fs.writeFileSync(registryPath, '', 'utf8');
      const reg = cmd.readRegistry();
      expect(reg).toEqual({});
    });

    it('status handles empty YAML gracefully', () => {
      const cmd = new OutsideInCommand(tmp);
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      fs.writeFileSync(registryPath, '', 'utf8');
      const result = cmd.status();
      expect(result.layers).toEqual([]);
      expect(result.rules).toEqual([]);
    });

    it('buildPlan handles layer missing purpose field', () => {
      const cmd = new OutsideInCommand(tmp);
      const registry = {
        layers: [
          { name: 'e2e' },  // no purpose
          { name: 'unit', purpose: 'Unit tests' },
        ],
        rules: [],
      };
      const plan = cmd.buildPlan('my-change', 'my-feat', registry);
      expect(plan).toContain('1. e2e: No purpose documented');
      expect(plan).toContain('2. unit: Unit tests');
    });

    it('buildLayerSkeleton uses fallback when purpose is missing', () => {
      const cmd = new OutsideInCommand(tmp);
      const layer = { name: 'integration' }; // no purpose
      const skeleton = cmd.buildLayerSkeleton(layer, 'login');
      expect(skeleton).toContain('Purpose: Define this layer behavior.');
    });

    it('buildLayerSkeleton uses fallback for missing testPattern and testCommand', () => {
      const cmd = new OutsideInCommand(tmp);
      const layer = { name: 'custom', purpose: 'Custom layer' }; // no testPattern, no testCommand
      const skeleton = cmd.buildLayerSkeleton(layer, 'feat');
      expect(skeleton).toContain('<configure in stdd/tdd-registry.yaml>');
      // Appears twice: once for testPattern, once for testCommand
      const matches = skeleton.match(/<configure in stdd\/tdd-registry.yaml>/g);
      expect(matches).toHaveLength(2);
    });

    it('buildLayerSkeleton handles missing failureSignals gracefully', () => {
      const cmd = new OutsideInCommand(tmp);
      const layer = { name: 'e2e', purpose: 'E2E tests', testCommand: 'npm test', testPattern: 'tests/e2e/*.spec.ts' };
      const skeleton = cmd.buildLayerSkeleton(layer, 'feat');
      expect(skeleton).toContain('## Failure Routing Signals');
      // No signal lines should appear since failureSignals is missing
      const signalSection = skeleton.split('## Failure Routing Signals')[1].split('## Notes')[0];
      expect(signalSection.trim()).toBe('');
    });

    it('scaffold with empty YAML file creates plan but no skeletons', () => {
      const cmd = new OutsideInCommand(tmp);
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      fs.writeFileSync(registryPath, '', 'utf8');
      fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'empty-yaml'), { recursive: true });
      const result = cmd.scaffold('empty-yaml');
      expect(result.skeletons).toEqual([]);
      // Plan file should still be created
      expect(fs.existsSync(path.join(tmp, 'stdd', 'changes', 'empty-yaml', 'outside-in', 'plan.md'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // Additional edge cases for completeness
  // ---------------------------------------------------------------
  describe('readRegistry returns falsy YAML', () => {
    it('returns empty object when yaml.load returns null', () => {
      const cmd = new OutsideInCommand(tmp);
      const registryPath = path.join(tmp, 'stdd', 'tdd-registry.yaml');
      // yaml.load('') returns null, which triggers the || {} fallback
      fs.writeFileSync(registryPath, '', 'utf8');
      const reg = cmd.readRegistry();
      expect(reg).toEqual({});
    });
  });

  describe('execute default action', () => {
    it('defaults to status when called with no arguments', () => {
      const cmd = new OutsideInCommand(tmp);
      cmd.init();
      // execute() with no args: action defaults to 'status'
      const result = cmd.execute();
      expect(result.layers).toBeDefined();
    });
  });

  describe('buildPlan with no layers and no rules', () => {
    it('produces plan without layer entries', () => {
      const cmd = new OutsideInCommand(tmp);
      const plan = cmd.buildPlan('change', 'feat', {});
      expect(plan).toContain('# Outside-In Plan: change');
      expect(plan).toContain('Feature key: feat');
      expect(plan).toContain('## Layer Order');
      expect(plan).toContain('## Rules');
      expect(plan).toContain('## Execution Protocol');
      // No numbered layer entries
      expect(plan).not.toContain('1. ');
    });
  });
});

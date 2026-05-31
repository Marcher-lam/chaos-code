const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

let DynamicGraphRouter;

/**
 * Tests targeting uncovered branches in dynamic-router.js
 * Lines 20-28: loadGraph with valid YAML file
 * Lines 31-33: compile with skills in rawGraph
 */

describe('DynamicGraphRouter branch coverage', () => {
  let tmpDir;
  let yamlPath;

  beforeEach(() => {
    jest.isolateModules(() => {
      DynamicGraphRouter = require('../src/utils/dynamic-router');
    });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-dr-'));
    yamlPath = path.join(tmpDir, 'skills.yaml');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadGraph with valid YAML (line 20-26)', () => {
    it('loads skills from a valid YAML file', () => {
      const graphData = {
        version: '2.0',
        config: { max_parallel: 3 },
        skills: {
          'stdd-propose': { description: 'Propose a change', depends_on: [] },
          'stdd-spec': { description: 'Write spec', depends_on: ['stdd-propose'] },
        },
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      expect(router.rawGraph.version).toBe('2.0');
      expect(router.rawGraph.config.max_parallel).toBe(3);
      expect(router.rawGraph.skills['stdd-propose']).toBeDefined();
    });

    it('returns default when YAML file is empty', () => {
      fs.writeFileSync(yamlPath, '', 'utf8');
      const router = new DynamicGraphRouter(yamlPath);
      expect(router.rawGraph.skills).toEqual({});
    });

    it('returns default on YAML parse error', () => {
      fs.writeFileSync(yamlPath, '::invalid: [yaml', 'utf8');
      const router = new DynamicGraphRouter(yamlPath);
      expect(router.rawGraph.version).toBe('1.0');
      expect(router.rawGraph.skills).toEqual({});
    });
  });

  describe('compile with real skills in rawGraph (line 31-33)', () => {
    it('uses rawGraph skills when they match pathway', () => {
      const graphData = {
        version: '2.0',
        config: { max_parallel: 5 },
        skills: {
          'stdd-issue': { description: 'Issue tracking', phase: 'propose' },
          'stdd-apply': { description: 'Apply changes', phase: 'execute' },
          'stdd-verify': { description: 'Verify changes', phase: 'verify' },
          'stdd-archive': { description: 'Archive changes', phase: 'archive' },
        },
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('hotfix');

      expect(result.version).toBe('2.0');
      expect(result.config.max_parallel).toBe(5);
      expect(result.skills['stdd-issue'].phase).toBe('propose');
      expect(result.skills['stdd-issue'].depends_on).toEqual([]);
      expect(result.skills['stdd-apply'].depends_on).toEqual(['stdd-issue']);
      expect(result.skills['stdd-archive'].depends_on).toEqual(['stdd-verify']);
    });

    it('generates auto nodes for skills not in rawGraph', () => {
      const graphData = {
        version: '1.0',
        config: {},
        skills: {},
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('hotfix');

      // All skills should be auto-generated since rawGraph.skills is empty
      expect(result.skills['stdd-issue'].description).toContain('Auto-generated');
      expect(result.skills['stdd-apply'].description).toContain('Auto-generated');
    });

    it('handles feature intent pathway', () => {
      const graphData = {
        version: '1.0',
        config: {},
        skills: {
          'stdd-propose': { description: 'P', phase: 'propose' },
          'stdd-spec': { description: 'S', phase: 'spec' },
          'stdd-plan': { description: 'Pl', phase: 'plan' },
          'stdd-outside-in': { description: 'OI', phase: 'test' },
          'stdd-apply': { description: 'A', phase: 'exec' },
          'stdd-verify': { description: 'V', phase: 'verify' },
        },
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('feature');

      expect(Object.keys(result.skills)).toEqual([
        'stdd-propose', 'stdd-spec', 'stdd-plan',
        'stdd-outside-in', 'stdd-apply', 'stdd-verify',
      ]);
      // Verify dependency chain
      expect(result.skills['stdd-propose'].depends_on).toEqual([]);
      expect(result.skills['stdd-spec'].depends_on).toEqual(['stdd-propose']);
      expect(result.skills['stdd-verify'].depends_on).toEqual(['stdd-apply']);
    });

    it('handles brownfield intent pathway', () => {
      const graphData = {
        version: '1.0',
        config: {},
        skills: {},
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('brownfield');

      expect(Object.keys(result.skills)).toEqual([
        'stdd-explore', 'stdd-init', 'stdd-propose',
        'stdd-spec', 'stdd-plan', 'stdd-apply', 'stdd-verify',
      ]);
    });

    it('handles repair intent pathway', () => {
      const graphData = { version: '1.0', config: {}, skills: {} };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('repair');

      expect(Object.keys(result.skills)).toEqual([
        'stdd-fix-packet', 'stdd-apply', 'stdd-verify',
      ]);
    });

    it('handles research intent pathway', () => {
      const graphData = { version: '1.0', config: {}, skills: {} };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('research');

      expect(Object.keys(result.skills)).toEqual([
        'stdd-explore', 'stdd-brainstorm', 'stdd-final-doc',
      ]);
    });

    it('uses default config when rawGraph has no config', () => {
      const graphData = { version: '3.0', skills: {} };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('hotfix');

      expect(result.version).toBe('3.0');
      expect(result.config).toEqual({});
    });

    it('uses default version when rawGraph has no version', () => {
      const graphData = { config: {}, skills: {} };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile('hotfix');

      expect(result.version).toBe('1.0');
    });
  });

  describe('loadGraph with absolute path', () => {
    it('uses absolute path directly', () => {
      const graphData = {
        version: '5.0',
        config: {},
        skills: { 'stdd-propose': { description: 'test' } },
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      expect(router.rawGraph.version).toBe('5.0');
    });
  });

  describe('loadGraph with relative path that fails', () => {
    it('returns default graph for missing relative path', () => {
      const router = new DynamicGraphRouter('nonexistent-relative.yaml');
      expect(router.rawGraph.version).toBe('1.0');
      expect(router.rawGraph.config).toEqual({});
      expect(router.rawGraph.skills).toEqual({});
    });
  });

  describe('constructor with no arguments (line 7)', () => {
    it('uses default configPath and loads graph or fallback', () => {
      // Constructor with no args uses default 'stdd/graph/skills.yaml'
      const router = new DynamicGraphRouter();
      // Either loads the real file or falls back to defaults
      expect(router.rawGraph).toBeDefined();
      expect(router.rawGraph.skills).toBeDefined();
    });
  });

  describe('compile with no arguments (line 28)', () => {
    it('defaults to feature intent when called with no args', () => {
      const graphData = {
        version: '1.0',
        config: {},
        skills: {
          'stdd-propose': { description: 'P' },
          'stdd-spec': { description: 'S' },
          'stdd-plan': { description: 'Pl' },
          'stdd-outside-in': { description: 'OI' },
          'stdd-apply': { description: 'A' },
          'stdd-verify': { description: 'V' },
        },
      };
      fs.writeFileSync(yamlPath, yaml.dump(graphData), 'utf8');

      const router = new DynamicGraphRouter(yamlPath);
      const result = router.compile();
      expect(result.name).toContain('FEATURE');
      expect(Object.keys(result.skills)).toEqual([
        'stdd-propose', 'stdd-spec', 'stdd-plan',
        'stdd-outside-in', 'stdd-apply', 'stdd-verify',
      ]);
    });
  });

  describe('compileWithProfile and compileConditional (uncovered branches)', () => {
    it('returns unmodified graph for unknown profile', () => {
      const router = new DynamicGraphRouter();
      const base = router.compile('feature');
      const result = router.compileWithProfile('feature', 'non-existent-profile');
      expect(result.skills).toEqual(base.skills);
    });

    it('handles quick profile formatting', () => {
      const router = new DynamicGraphRouter();
      const result = router.compileWithProfile('feature', 'quick');
      expect(Object.keys(result.skills)).not.toContain('stdd-clarify');
      expect(Object.keys(result.skills)).not.toContain('stdd-mutation');
    });

    it('handles thorough profile insertions', () => {
      const router = new DynamicGraphRouter();
      const result = router.compileWithProfile('feature', 'thorough');
      expect(Object.keys(result.skills)).toContain('stdd-review');
      expect(Object.keys(result.skills)).toContain('stdd-mutation');
      // stdd-review should be after stdd-apply
      const keys = Object.keys(result.skills);
      expect(keys.indexOf('stdd-review')).toBeGreaterThan(keys.indexOf('stdd-apply'));
    });

    it('handles enterprise profile insertions', () => {
      const router = new DynamicGraphRouter();
      // Compile hotfix with enterprise profile to trigger the stdd-archive hook
      const result = router.compileWithProfile('hotfix', 'enterprise');
      const keys = Object.keys(result.skills);
      expect(keys).toContain('stdd-guard');
      expect(keys).toContain('stdd-constitution');
      expect(keys.indexOf('stdd-guard')).toBeGreaterThan(keys.indexOf('stdd-apply'));
      expect(keys.indexOf('stdd-constitution')).toBeLessThan(keys.indexOf('stdd-archive'));
    });

    it('handles compileConditional with various conditions and context', () => {
      const router = new DynamicGraphRouter();
      
      // Inject conditional phases into feature pathway so they are evaluated in compileConditional
      router.intentPathways['feature'].push('stdd-clarify');
      router.intentPathways['feature'].push('stdd-mutation');
      router.intentPathways['feature'].push('stdd-adr');
      router.intentPathways['feature'].push('stdd-security-audit');
      router.intentPathways['feature'].push('stdd-multi-role-review');

      // Call with no arguments to trigger default parameter coverage
      const defaultProfileGraph = router.compileWithProfile();
      expect(defaultProfileGraph.skills).toBeDefined();

      const defaultConditionalGraph = router.compileConditional();
      expect(defaultConditionalGraph.conditionalPhases).toBeDefined();

      // Thorough profile with high complexity should trigger mutation, ADR, clarify, etc.
      const thoroughCtx = { profileId: 'thorough', complexityScore: 90 };
      const resultThorough = router.compileConditional('feature', thoroughCtx);
      expect(resultThorough.conditionalPhases).toBeDefined();

      const clarifyPhase = resultThorough.conditionalPhases.find(p => p.phase === 'stdd-clarify');
      expect(clarifyPhase.status).toBe('execute');

      const mutationPhase = resultThorough.conditionalPhases.find(p => p.phase === 'stdd-mutation');
      expect(mutationPhase.status).toBe('execute');

      const adrPhase = resultThorough.conditionalPhases.find(p => p.phase === 'stdd-adr');
      expect(adrPhase.status).toBe('execute');

      const multiRolePhase = resultThorough.conditionalPhases.find(p => p.phase === 'stdd-multi-role-review');
      expect(multiRolePhase.status).toBe('execute');

      // Enterprise profile with high complexity should trigger security-audit (since it does not skip it)
      const enterpriseCtx = { profileId: 'enterprise', complexityScore: 90 };
      const resultEnterprise = router.compileConditional('feature', enterpriseCtx);
      const securityPhase = resultEnterprise.conditionalPhases.find(p => p.phase === 'stdd-security-audit');
      expect(securityPhase.status).toBe('execute');

      // Standard profile with low complexity should skip mutation and ADR
      const standardCtx = { profileId: 'standard', complexityScore: 10 };
      const resultStandard = router.compileConditional('feature', standardCtx);
      const skippedMutation = resultStandard.conditionalPhases.find(p => p.phase === 'stdd-mutation');
      expect(skippedMutation.status).toBe('skip');

      // Thorough profile with low complexity should skip mutation and ADR but keep clarify
      const thoroughLowCtx = { profileId: 'thorough', complexityScore: 10 };
      const resultThoroughLow = router.compileConditional('feature', thoroughLowCtx);
      const skippedThoroughMutation = resultThoroughLow.conditionalPhases.find(p => p.phase === 'stdd-mutation');
      expect(skippedThoroughMutation.status).toBe('skip');
      const keptClarify = resultThoroughLow.conditionalPhases.find(p => p.phase === 'stdd-clarify');
      expect(keptClarify.status).toBe('execute');
    });
  });
});

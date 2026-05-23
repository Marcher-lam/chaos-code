const DynamicGraphRouter = require('../src/utils/dynamic-router');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

/**
 * Tests targeting uncovered branches in dynamic-router.js
 * Lines 20-28: loadGraph with valid YAML file
 * Lines 31-33: compile with skills in rawGraph
 */

describe('DynamicGraphRouter branch coverage', () => {
  let tmpDir;
  let yamlPath;

  beforeEach(() => {
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
});

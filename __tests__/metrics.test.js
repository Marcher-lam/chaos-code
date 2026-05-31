const fs = require('fs');
const path = require('path');
const os = require('os');
const { MetricsCommand } = require('../src/cli/commands/metrics');

describe('MetricsCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-metrics-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    if (setupFn) setupFn(projectPath);
    return projectPath;
  }

  function parseJsonOutput() {
    const printed = logSpy.mock.calls.map(call => String(call[0]));
    const jsonLine = printed.find(line => line.trim().startsWith('{'));
    if (!jsonLine) {
      throw new Error(`No JSON output found. Printed lines:\n${printed.join('\n')}`);
    }
    return JSON.parse(jsonLine);
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('global metrics (no changeName)', () => {
    it('should report N/A when no src/ directory exists', async () => {
      const projectPath = createTempProject('no-src', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.message).toBe('No src/ directory found');
      expect(result.totalFiles).toBe(0);
    });

    it('should count source and test files and lines', async () => {
      const projectPath = createTempProject('basic-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'const x = 1;\nfunction add(a, b) {\n  return a + b;\n}\nmodule.exports = { add };\n');
        fs.writeFileSync(path.join(srcDir, 'utils.js'), 'function helper() {\n  return 42;\n}\nmodule.exports = { helper };\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'const { add } = require("../index");\ntest("adds 1 + 2", () => {\n  expect(add(1, 2)).toBe(3);\n});\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'const { helper } = require("../utils");\ntest("helper returns 42", () => {\n  expect(helper()).toBe(42);\n});\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.sourceFiles).toBe(2);
      expect(result.testFiles).toBe(2);
      expect(result.totalFiles).toBe(4);
      expect(result.sourceLines).toBeGreaterThan(0);
      expect(result.testLines).toBeGreaterThan(0);
    });

    it('should estimate complexity (functions/classes)', async () => {
      const projectPath = createTempProject('complex-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'app.js'), [
          'class App {',
          '  constructor() {}',
          '  init() {}',
          '}',
          'function start() {}',
          'const stop = () => {};',
          'module.exports = { App, start, stop };'
        ].join('\n'));
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.complexity.classes).toBeGreaterThanOrEqual(1);
      expect(result.complexity.functions).toBeGreaterThanOrEqual(2);
    });

    it('should report averageComplexity in JSON output', async () => {
      const projectPath = createTempProject('cyclomatic-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'simple.js'), 'const x = 1;\nmodule.exports = { x };\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result).toHaveProperty('averageComplexity');
      expect(typeof result.averageComplexity).toBe('number');
      expect(result.averageComplexity).toBeGreaterThan(0);
    });

    it('should accurately count cyclomatic complexity for highly complex files', async () => {
      const projectPath = createTempProject('very-complex', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const complexFile = [
          'function megaComplex(x, y, z) {',
          '  if (x > 0) {',
          '    if (y > 0) {',
          '      console.log("both positive");',
          '    } else if (y < 0) {',
          '      console.log("x pos, y neg");',
          '    }',
          '  } else if (x < 0) {',
          '    if (z) {',
          '      console.log("x neg with z");',
          '    }',
          '  }',
          '  for (let i = 0; i < x; i++) {',
          '    while (i > 0) {',
          '      i--;',
          '    }',
          '  }',
          '  try {',
          '    JSON.parse(x);',
          '  } catch (e) {',
          '    return e;',
          '  }',
          '  const result = x > y ? (y > z ? x : y) : z;',
          '  if (x && y || z) {',
          '    console.log("combo");',
          '  }',
          '  switch (result) {',
          '    case 1: break;',
          '    case 2: break;',
          '    case 3: break;',
          '  }',
          '  return result;',
          '}',
          'module.exports = { megaComplex };'
        ].join('\n');
        fs.writeFileSync(path.join(srcDir, 'complex.js'), complexFile);
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      const complexEntry = result.topComplexFiles.find((f) => f.file.includes('complex.js'));
      expect(complexEntry).toBeDefined();
      expect(complexEntry.complexity).toBeGreaterThan(10);
    });

    it('should report topComplexFiles in JSON output', async () => {
      const projectPath = createTempProject('top-files-test', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'a.js'), 'const a = 1;\nif (a) { console.log(a); }\nmodule.exports = a;\n');
        fs.writeFileSync(path.join(srcDir, 'b.js'), 'const b = 1;\nmodule.exports = b;\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result).toHaveProperty('topComplexFiles');
      expect(Array.isArray(result.topComplexFiles)).toBe(true);
      expect(result.topComplexFiles.length).toBeLessThanOrEqual(3);
    });

    it('should report test ratio correctly', async () => {
      const projectPath = createTempProject('ratio-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const sourceContent = Array(100).fill('// source line').join('\n') + '\n';
        const testContent = Array(50).fill('// test line').join('\n') + '\n';
        fs.writeFileSync(path.join(srcDir, 'big.js'), sourceContent);
        fs.writeFileSync(path.join(srcDir, 'big.test.js'), testContent);
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.sourceLines).toBeGreaterThanOrEqual(100);
      expect(result.testLines).toBeGreaterThanOrEqual(50);
      const ratio = (result.testLines / result.sourceLines) * 100;
      expect(ratio).toBeLessThanOrEqual(60);
      expect(ratio).toBeGreaterThanOrEqual(40);
    });

    it('should use real coverage summary when available', async () => {
      const projectPath = createTempProject('coverage-summary-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
        fs.mkdirSync(path.join(p, 'coverage'), { recursive: true });
        fs.writeFileSync(path.join(p, 'coverage', 'coverage-summary.json'), JSON.stringify({
          total: {
            lines: { total: 100, covered: 83, pct: 83 },
            functions: { total: 5, covered: 5, pct: 100 },
            branches: { total: 10, covered: 8, pct: 80 },
            statements: { total: 100, covered: 83, pct: 83 },
          },
        }));
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.coverageSource).toBe('report');
      expect(result.coveragePercent).toBe(83);
      expect(result.coverage.type).toBe('coverage-summary');
      expect(result.coverage.lines.pct).toBe(83);
    });

    it('should report constitution health as PASS when no violations', async () => {
      const projectPath = createTempProject('clean-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'exports.foo = () => 1;\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'mod.test.js'), 'test("ok", () => {});\n');
        fs.mkdirSync(path.join(p, '.github', 'workflows'), { recursive: true });
        fs.writeFileSync(path.join(p, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.constitutionHealth).toBe('PASS');
    });

    it('should include workspace source and test files in global metrics', async () => {
      const projectPath = createTempProject('workspace-project', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
        const apiSrcDir = path.join(p, 'packages', 'api', 'src');
        fs.mkdirSync(apiSrcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
        fs.writeFileSync(path.join(apiSrcDir, 'index.js'), 'function api() {\n  return 1;\n}\nmodule.exports = { api };\n');
        fs.writeFileSync(path.join(apiSrcDir, 'index.test.js'), 'test("api", () => {\n  expect(true).toBe(true);\n});\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true });

      expect(result.workspaceCount).toBe(1);
      expect(result.workspaces).toHaveLength(1);
      expect(result.sourceFiles).toBe(1);
      expect(result.testFiles).toBe(1);
      expect(result.sourceLines).toBeGreaterThanOrEqual(4);
      expect(result.workspaces[0].root).toBe(path.join('packages', 'api'));
    });

    it('should scope JSON metrics to a workspace', async () => {
      const projectPath = createTempProject('workspace-scope-json', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));

        const apiSrcDir = path.join(p, 'packages', 'api', 'src');
        fs.mkdirSync(apiSrcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
        fs.writeFileSync(path.join(apiSrcDir, 'index.ts'), 'export function api(value) {\n  if (value) return 1;\n  return 0;\n}\n');

        const webSrcDir = path.join(p, 'packages', 'web', 'src');
        fs.mkdirSync(webSrcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'web', 'package.json'), JSON.stringify({ name: 'web' }));
        fs.writeFileSync(path.join(webSrcDir, 'index.ts'), 'export function web() {\n  return 2;\n}\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true, workspace: 'packages/api' });

      expect(result.workspace).toMatchObject({ name: 'api', path: 'packages/api' });
      expect(result.sourceFiles).toBe(1);
      expect(result.topComplexFiles.map(f => f.file).join('\n')).toContain('packages/api/src/index.ts');
      expect(result.topComplexFiles.map(f => f.file).join('\n')).not.toContain('packages/web');
    });

    it('should parse coverage from the selected workspace', async () => {
      const projectPath = createTempProject('workspace-coverage-json', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));

        const apiDir = path.join(p, 'packages', 'api');
        const webDir = path.join(p, 'packages', 'web');
        fs.mkdirSync(path.join(apiDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(apiDir, 'coverage'), { recursive: true });
        fs.mkdirSync(path.join(webDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(webDir, 'coverage'), { recursive: true });
        fs.writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({ name: 'api' }));
        fs.writeFileSync(path.join(webDir, 'package.json'), JSON.stringify({ name: 'web' }));
        fs.writeFileSync(path.join(apiDir, 'src', 'index.js'), 'module.exports = {};\n');
        fs.writeFileSync(path.join(webDir, 'src', 'index.js'), 'module.exports = {};\n');
        fs.writeFileSync(path.join(apiDir, 'coverage', 'coverage-summary.json'), JSON.stringify({
          total: {
            lines: { total: 10, covered: 9, pct: 90 },
            functions: { total: 1, covered: 1, pct: 100 },
            branches: { total: 0, covered: 0, pct: 100 },
            statements: { total: 10, covered: 9, pct: 90 },
          },
        }));
        fs.writeFileSync(path.join(webDir, 'coverage', 'coverage-summary.json'), JSON.stringify({
          total: {
            lines: { total: 10, covered: 2, pct: 20 },
            functions: { total: 1, covered: 0, pct: 0 },
            branches: { total: 0, covered: 0, pct: 100 },
            statements: { total: 10, covered: 2, pct: 20 },
          },
        }));
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true, workspace: 'packages/api' });

      expect(result.coverageSource).toBe('report');
      expect(result.coveragePercent).toBe(90);
      expect(result.coverage.file).toContain(path.join('packages', 'api'));
    });

    it('should include workspace in human metrics output', async () => {
      const projectPath = createTempProject('workspace-scope-human', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
        const apiSrcDir = path.join(p, 'packages', 'api', 'src');
        fs.mkdirSync(apiSrcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
        fs.writeFileSync(path.join(apiSrcDir, 'index.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      await cmd.execute(undefined, { workspace: 'packages/api' });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Workspace: api (packages/api)');
    });

    it('should return JSON error for missing workspace', async () => {
      const projectPath = createTempProject('workspace-missing', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute(undefined, { json: true, workspace: 'packages/api' });

      expect(result.status).toBe('error');
      expect(result.error).toBe("Workspace 'packages/api' not found.");
      expect(result.workspace).toBeNull();
    });
  });

  describe('change dimension metrics', () => {
    it('should throw when change does not exist', async () => {
      const projectPath = createTempProject('no-change', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      await expect(cmd.execute('nonexistent', { json: true })).rejects.toThrow("Change 'nonexistent' not found");
    });

    it('should scan change specs and tasks', async () => {
      const projectPath = createTempProject('with-change', (p) => {
        const changeDir = path.join(p, 'stdd', 'changes', 'feature-x');
        fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
        fs.writeFileSync(path.join(changeDir, 'specs', 'auth.md'), '# Auth Spec\n');
        fs.writeFileSync(path.join(changeDir, 'specs', 'db.md'), '# DB Spec\n');
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute('feature-x', { json: true });

      expect(result.change).toBe('feature-x');
      expect(result.specCoverage.specs).toBe(2);
      expect(result.specCoverage.tasks).toBe(3);
    });

    it('should include constitution health in change metrics', async () => {
      const projectPath = createTempProject('change-health', (p) => {
        const changeDir = path.join(p, 'stdd', 'changes', 'safe-change');
        fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
        fs.writeFileSync(path.join(changeDir, 'specs', 'spec.md'), '# Spec\n');

        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'a.js'), 'exports.a = 1;\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'a.test.js'), 'test("ok", () => {});\n');
        fs.mkdirSync(path.join(p, '.github', 'workflows'), { recursive: true });
        fs.writeFileSync(path.join(p, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      const result = await cmd.execute('safe-change', { json: true });

      expect(result.constitutionHealth).toBe('PASS');
    });
  });

  describe('JSON output format', () => {
    it('should output valid JSON when --json is passed', async () => {
      const projectPath = createTempProject('json-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      await cmd.execute(undefined, { json: true });

      const output = parseJsonOutput();
      expect(output).toHaveProperty('totalFiles');
      expect(output).toHaveProperty('sourceFiles');
      expect(output).toHaveProperty('testFiles');
      expect(output).toHaveProperty('sourceLines');
      expect(output).toHaveProperty('testLines');
      expect(output).toHaveProperty('complexity');
      expect(output).toHaveProperty('constitutionHealth');
    });
  });

  describe('human-readable output', () => {
    it('should print colored output without --json', async () => {
      const projectPath = createTempProject('colored-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'exports.x = 1;\n');
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      await cmd.execute(undefined, {});

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Metrics Report');
      expect(printed).toContain('Total Files');
      expect(printed).toContain('Source Lines');
      expect(printed).toContain('Constitution Health');
    });

    it('should display Top Complex Files in human-readable output', async () => {
      const projectPath = createTempProject('complex-display', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir), { recursive: true });
        const complexContent = [
          'function complex(a, b, c) {',
          '  if (a > 0) {',
          '    if (b > 0) { return a; }',
          '    else if (b < 0) { return b; }',
          '  }',
          '  for (let i = 0; i < a; i++) {',
          '    while (i > 0) { i--; }',
          '  }',
          '  try { fail(); } catch (e) { return e; }',
          '  return a && b || c ? a : b;',
          '}',
          'module.exports = { complex };'
        ].join('\n');
        fs.writeFileSync(path.join(srcDir, 'complex.js'), complexContent);
      });
      process.chdir(projectPath);

      const cmd = new MetricsCommand(projectPath);
      await cmd.execute(undefined, {});

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Top Complex Files');
    });
  });

  describe('filterIssuesByWorkspace', () => {
    it('filters issues by workspace root', () => {
      const cmd = new MetricsCommand(process.cwd());
      const issues = {
        blocking: [
          { file: 'packages/api/src/index.js', message: 'error' },
          { file: 'packages/web/src/index.js', message: 'error' },
        ],
        warning: [
          { file: 'packages/api/src/util.js', message: 'warning' },
        ],
        skipped: [],
      };
      const workspace = { root: path.join(process.cwd(), 'packages', 'api') };

      const filtered = cmd.filterIssuesByWorkspace(issues, workspace);

      expect(filtered.blocking).toHaveLength(1);
      expect(filtered.blocking[0].file).toContain('api');
      expect(filtered.warning).toHaveLength(1);
      expect(filtered.skipped).toHaveLength(0);
    });

    it('returns all items when no workspace matches', () => {
      const cmd = new MetricsCommand(process.cwd());
      const issues = {
        blocking: [{ file: 'other/path.js' }],
        warning: [],
        skipped: [],
      };
      const workspace = { root: path.join(process.cwd(), 'packages', 'api') };

      const filtered = cmd.filterIssuesByWorkspace(issues, workspace);
      expect(filtered.blocking).toHaveLength(0);
    });

    it('handles null issue arrays gracefully', () => {
      const cmd = new MetricsCommand(process.cwd());
      const issues = { blocking: null, warning: undefined, skipped: [] };
      const workspace = { root: process.cwd() };

      const filtered = cmd.filterIssuesByWorkspace(issues, workspace);
      expect(filtered.blocking).toEqual([]);
      expect(filtered.warning).toEqual([]);
      expect(filtered.skipped).toEqual([]);
    });

    it('matches by various path properties', () => {
      const cmd = new MetricsCommand(process.cwd());
      const issues = {
        blocking: [
          { path: 'packages/api/feature.js' },
          { filepath: 'packages/api/other.js' },
          { filePath: 'packages/web/app.js' },
        ],
        warning: [],
        skipped: [],
      };
      const workspace = { root: path.join(process.cwd(), 'packages', 'api') };

      const filtered = cmd.filterIssuesByWorkspace(issues, workspace);
      expect(filtered.blocking).toHaveLength(2);
    });
  });

  describe('printChangeMetrics', () => {
    let metricsCmd;

    beforeEach(() => {
      metricsCmd = new MetricsCommand();
    });

    it('prints full change metrics', () => {
      logSpy.mockClear();
      metricsCmd.printChangeMetrics({
        change: 'feat-x',
        workspace: { name: 'main', path: 'packages/main' },
        specCoverage: { specs: 2, tasks: 5, coverage: 80 },
        sourceFiles: 10,
        testFiles: 8,
        sourceLines: 500,
        testLines: 300,
        constitutionHealth: 'PASS',
      });

      const rawOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const output = rawOutput.replace(/\x1b\[[0-9;]*m/g, '');
      expect(output).toContain('feat-x');
      expect(output).toContain('main');
      expect(output).toContain('80%');
      expect(output).toContain('500');
      expect(output).toContain('PASS');
    });

    it('prints without workspace', () => {
      logSpy.mockClear();
      metricsCmd.printChangeMetrics({
        change: 'feat-y',
        specCoverage: { specs: 0, tasks: 0, coverage: 0 },
        sourceFiles: 0,
        testFiles: 0,
        sourceLines: 0,
        testLines: 0,
        constitutionHealth: 'FAIL',
      });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('feat-y');
      expect(output).toContain('FAIL');
    });
  });
});

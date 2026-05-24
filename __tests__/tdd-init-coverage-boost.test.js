/**
 * Targeted branch-coverage tests for tdd-init.js
 * Covers: detectPythonFramework, findSourceFiles filtering,
 *         generateTestContent Python branches, findTestFileForSource Python paths,
 *         TddInitCommand execute with actual source files.
 */

const fs = require('fs');
const path = require('path');
const { TddInitCommand } = require('../src/cli/commands/tdd-init');

const TMP = path.join(__dirname, '__tdd_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('TddInitCommand coverage boost', () => {
  describe('execute with Python files', () => {
    it('detects pytest framework and generates pytest test', async () => {
      const srcDir = path.join(TMP, 'src');
      w(path.join(srcDir, 'calculator.py'), 'def add(a, b): return a + b');
      w(path.join(srcDir, 'pytest.ini'), '[pytest]');
      const cmd = new TddInitCommand();
      const result = await cmd.execute(TMP, { sourceDir: 'src' });
      // Check generated test file uses pytest format
      const testFiles = fs.readdirSync(path.join(srcDir, '__tests__'));
      expect(testFiles.length).toBeGreaterThan(0);
      const content = fs.readFileSync(path.join(srcDir, '__tests__', testFiles[0]), 'utf8');
      expect(content).toContain('def test_');
    });

    it('defaults to unittest when no pytest config found', async () => {
      const srcDir = path.join(TMP, 'src');
      w(path.join(srcDir, 'my_module.py'), 'def foo(): pass');
      const cmd = new TddInitCommand();
      const result = await cmd.execute(TMP, { sourceDir: 'src' });
      const testFiles = fs.readdirSync(path.join(srcDir, '__tests__'));
      const content = fs.readFileSync(path.join(srcDir, '__tests__', testFiles[0]), 'utf8');
      expect(content).toContain('unittest');
    });

    it('skips files that already have tests', async () => {
      const srcDir = path.join(TMP, 'src');
      w(path.join(srcDir, 'has_test.js'), 'module.exports = {}');
      w(path.join(srcDir, '__tests__', 'has_test.test.js'), 'describe("has_test", () => {});');
      const cmd = new TddInitCommand();
      const result = await cmd.execute(TMP, { sourceDir: 'src' });
      expect(result.created).toEqual([]);
    });
  });

  describe('execute — dry-run mode', () => {
    it('lists files without creating them', async () => {
      const srcDir = path.join(TMP, 'src');
      w(path.join(srcDir, 'app.js'), 'console.log("hi")');
      const cmd = new TddInitCommand();
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        const result = await cmd.execute(TMP, { sourceDir: 'src', dryRun: true });
        expect(result.dryRun).toBe(true);
      } finally {
        console.log = origLog;
      }
    });
  });

  describe('execute — no source files', () => {
    it('returns empty when no source files found', async () => {
      mkdirp(path.join(TMP, 'src'));
      const cmd = new TddInitCommand();
      const result = await cmd.execute(TMP, { sourceDir: 'src' });
      expect(result.created).toEqual([]);
    });
  });

  describe('execute — all source files already have tests', () => {
    it('returns empty created array', async () => {
      const srcDir = path.join(TMP, 'src');
      w(path.join(srcDir, 'mod.js'), 'module.exports = {}');
      w(path.join(srcDir, '__tests__', 'mod.test.js'), '// test');
      const cmd = new TddInitCommand();
      const result = await cmd.execute(TMP, { sourceDir: 'src' });
      expect(result.created).toEqual([]);
    });
  });
});

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  const defaultGitLog = { stdout: 'abc1234 feat: init project\ndef5678 fix: minor tweak', status: 0, stderr: '' };
  const mockFn = jest.fn();
  mockFn._defaultImpl = (cmd, args, opts) => {
    // Pass through eslint/version/node/npx checks to real implementation
    if (typeof cmd === 'string' && ['eslint', 'npx', 'node', 'npm'].includes(cmd)) {
      return actual.spawnSync(cmd, args, opts);
    }
    return defaultGitLog;
  };
  mockFn.mockImplementation(mockFn._defaultImpl);
  return {
    ...actual,
    spawnSync: mockFn,
  };
});

describe('ConstitutionChecker', () => {
  let tempDir;

  beforeEach(() => {
    childProcess.spawnSync.mockClear();
    childProcess.spawnSync.mockImplementation(childProcess.spawnSync._defaultImpl);
  });

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-const-check-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  afterAll(() => {
    teardown();
  });

  describe('Case 1: Perfect pass', () => {
    it('should pass when source files have tests and no secrets', () => {
      setup();

      // Create CI config
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      // Create src/index.js with test
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      expect(issues.blocking).toHaveLength(0);
      expect(issues.warning).toHaveLength(0);
      expect(issues.skipped.length).toBeGreaterThanOrEqual(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Case 2: TDD violation', () => {
    it('should block when source file has no test', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      expect(issues.blocking.length).toBeGreaterThanOrEqual(1);
      const tddIssues = issues.blocking.filter(i => i.article === 2);
      expect(tddIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should warn when coverage report is below the default Article 2 threshold', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => {});\n');

      fs.mkdirSync(path.join(tempDir, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'coverage', 'coverage-summary.json'), JSON.stringify({
        total: {
          lines: { total: 10, covered: 7, pct: 70 },
          functions: { total: 1, covered: 1, pct: 100 },
          branches: { total: 0, covered: 0, pct: 100 },
          statements: { total: 10, covered: 7, pct: 70 },
        },
      }));

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const coverageWarnings = issues.warning.filter(i => i.article === 2 && i.message.includes('Coverage below threshold'));
      expect(coverageWarnings).toHaveLength(1);
      expect(coverageWarnings[0].coverage.lines.pct).toBe(70);

      teardown();
      tempDir = null;
    });

    it('should pass Article 2 coverage gate when coverage is above threshold', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => {});\n');

      fs.mkdirSync(path.join(tempDir, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'coverage', 'coverage-summary.json'), JSON.stringify({
        total: {
          lines: { total: 10, covered: 9, pct: 90 },
          functions: { total: 1, covered: 1, pct: 100 },
          branches: { total: 0, covered: 0, pct: 100 },
          statements: { total: 10, covered: 9, pct: 90 },
        },
      }));

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const coverageWarnings = issues.warning.filter(i => i.article === 2 && i.message.includes('Coverage below threshold'));
      expect(coverageWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should honor configured Article 2 coverage threshold', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
      fs.mkdirSync(path.join(tempDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'stdd', 'config.yaml'), 'tdd:\n  coverage:\n    threshold: 95\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => {});\n');

      fs.mkdirSync(path.join(tempDir, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'coverage', 'coverage-summary.json'), JSON.stringify({
        total: {
          lines: { total: 10, covered: 9, pct: 90 },
          functions: { total: 1, covered: 1, pct: 100 },
          branches: { total: 0, covered: 0, pct: 100 },
          statements: { total: 10, covered: 9, pct: 90 },
        },
      }));

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const coverageWarnings = issues.warning.filter(i => i.article === 2 && i.message.includes('Coverage below threshold'));
      expect(coverageWarnings).toHaveLength(1);
      expect(coverageWarnings[0].message).toContain('90% < 95%');

      teardown();
      tempDir = null;
    });

    it('should warn when mutation evidence score is below threshold', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => { expect(1).toBe(1); });\n');

      const evidenceDir = path.join(tempDir, 'stdd', 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, 'mutation-1000.json'), JSON.stringify({
        type: 'mutation',
        unixTimestamp: 1000,
        mode: 'quick',
        mutationScore: 55,
        threshold: 80,
        status: 'fail',
      }));

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const mutationWarnings = issues.warning.filter(i => i.article === 2 && i.message.includes('Mutation score below threshold'));
      expect(mutationWarnings).toHaveLength(1);
      expect(mutationWarnings[0].mutation.score).toBe(55);
      expect(issues.blocking.filter(i => i.article === 2 && i.message.includes('Mutation score'))).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should block when mutation gate is configured as blocking', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
      fs.mkdirSync(path.join(tempDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'stdd', 'config.yaml'), 'tdd:\n  mutation:\n    threshold: 90\n    blocking: true\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => { expect(1).toBe(1); });\n');

      const evidenceDir = path.join(tempDir, 'stdd', 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, 'mutation-1000.json'), JSON.stringify({
        type: 'mutation',
        unixTimestamp: 1000,
        mode: 'quick',
        mutationScore: 85,
        threshold: 80,
        status: 'pass',
      }));

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const mutationBlocking = issues.blocking.filter(i => i.article === 2 && i.message.includes('Mutation score below threshold'));
      expect(mutationBlocking).toHaveLength(1);
      expect(mutationBlocking[0].message).toContain('85% < 90%');

      teardown();
      tempDir = null;
    });
  });

  describe('Case 3: Security violation', () => {
    it('should block when hardcoded secrets exist', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'config.js'),
        "const password = 'secret123';\nmodule.exports = {};\n"
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      expect(issues.blocking.length).toBeGreaterThanOrEqual(1);
      const secIssues = issues.blocking.filter(i => i.article === 7);
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should detect apiKey', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "const apiKey = 'abc-123';\n"
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7);
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should detect secret', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'auth.js'),
        'const secret = "mysecret";\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7);
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Case 4: Waiver exemption', () => {
    it('should skip TDD check when Article 2 is waived', () => {
      setup();

      // Create src file without tests
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'no-test.js'), 'exports.foo = () => 1;\n');

      // Create waiver for Article 2
      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 2\n    reason: "test waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      // Article 2 should be skipped, not blocking
      const tddBlocking = issues.blocking.filter(i => i.article === 2);
      expect(tddBlocking).toHaveLength(0);

      const tddSkipped = issues.skipped.filter(i => i.article === 2);
      expect(tddSkipped.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 3: Commits', () => {
    it('should warn when commit message does not follow Conventional Commits spec', () => {
      setup();

      childProcess.spawnSync.mockReturnValue({ stdout: 'abc1234 fix bug\ndef5678 update\nghi9012 feat: add login\njkl3456 docs: update README\nmno7890 test: add unit tests', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      expect(commitWarnings.length).toBeGreaterThanOrEqual(2);
      expect(commitWarnings[0].message).toContain('Conventional Commits spec');

      teardown();
      tempDir = null;
    });

    it('should pass when all commits follow Conventional Commits spec', () => {
      setup();

      childProcess.spawnSync.mockReturnValue({ stdout: 'abc1234 feat: add login\ndef5678 fix: resolve bug\nghi9012 docs: update README\njkl3456 test: add unit tests\nmno7890 refactor: clean up code', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      expect(commitWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should skip Article 3 when project is not a git repository', () => {
      setup();

      const err = new Error('fatal: not a git repository');
      err.code = 'ENOENT';
      childProcess.spawnSync.mockImplementation(() => { throw err; });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const skippedArticle3 = issues.skipped.filter(i => i.article === 3);
      expect(skippedArticle3.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should warn when commit subject line exceeds 72 characters', () => {
      setup();

      const longSubject = 'feat: this is a very long commit message that exceeds the seventy two character limit for subject lines';
      childProcess.spawnSync.mockReturnValue({ stdout: `abc1234 ${longSubject}\ndef5678 fix: short message`, status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      expect(commitWarnings.length).toBeGreaterThanOrEqual(1);
      const longWarnings = commitWarnings.filter(w => w.message.includes('too long'));
      expect(longWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should skip Article 3 when waived', () => {
      setup();

      childProcess.spawnSync.mockReturnValue({ stdout: 'abc1234 fix bug', status: 0 });

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 3\n    reason: "commit waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      expect(commitWarnings).toHaveLength(0);

      const skippedArticle3 = issues.skipped.filter(i => i.article === 3);
      expect(skippedArticle3.length).toBeGreaterThanOrEqual(1);
      expect(skippedArticle3[0].reason).toBe('Waived');

      teardown();
      tempDir = null;
    });
  });

  describe('Article 4: Style (file length)', () => {
    it('should warn when file exceeds 500 lines', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });

      // Create a file > 500 lines
      const longLines = Array(502).fill('// comment').join('\n');
      fs.writeFileSync(path.join(srcDir, 'long.js'), longLines);
      fs.writeFileSync(path.join(srcDir, '__tests__', 'long.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const styleWarnings = issues.warning.filter(i => i.article === 4);
      expect(styleWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should not warn for files under 500 lines', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });

      const shortLines = Array(100).fill('// comment').join('\n');
      fs.writeFileSync(path.join(srcDir, 'short.js'), shortLines);
      fs.writeFileSync(path.join(srcDir, '__tests__', 'short.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const styleWarnings = issues.warning.filter(i => i.article === 4);
      expect(styleWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 4: Style (Linter)', () => {
    it('should report blocking error when ESLint detects issues', () => {
      setup();

      // Create package.json with eslint
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ devDependencies: { eslint: '^8.0.0' } })
      );

      // Create mock eslint script that fails (simulates lint errors)
      fs.mkdirSync(path.join(tempDir, 'node_modules', '.bin'), { recursive: true });
      const isWin = process.platform === 'win32';
      if (isWin) {
        fs.writeFileSync(
          path.join(tempDir, 'node_modules', '.bin', 'eslint.cmd'),
          '@echo off\r\necho "  1:1  error  Use const or let instead of var"\r\nexit /b 1\r\n'
        );
      } else {
        fs.writeFileSync(
          path.join(tempDir, 'node_modules', '.bin', 'eslint'),
          '#!/bin/sh\necho "  1:1  error  Use const or let instead of var"\nexit 1\n'
        );
        fs.chmodSync(path.join(tempDir, 'node_modules', '.bin', 'eslint'), 0o755);
      }

      // Create src with JS file
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'var x = 1;\nmodule.exports = x;\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const styleBlocking = issues.blocking.filter(i => i.article === 4);
      expect(styleBlocking.length).toBeGreaterThanOrEqual(1);
      expect(styleBlocking[0].message).toContain('Lint errors');

      teardown();
      tempDir = null;
    });

    it('should not report error when linter passes', () => {
      setup();

      // Create package.json with eslint
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ devDependencies: { eslint: '^8.0.0' } })
      );

      // Create mock eslint script that passes
      fs.mkdirSync(path.join(tempDir, 'node_modules', '.bin'), { recursive: true });
      const isWin = process.platform === 'win32';
      if (isWin) {
        fs.writeFileSync(
          path.join(tempDir, 'node_modules', '.bin', 'eslint.cmd'),
          '@echo off\r\nexit /b 0\r\n'
        );
      } else {
        fs.writeFileSync(
          path.join(tempDir, 'node_modules', '.bin', 'eslint'),
          '#!/bin/sh\nexit 0\n'
        );
        fs.chmodSync(path.join(tempDir, 'node_modules', '.bin', 'eslint'), 0o755);
      }

      // Create src with JS file
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'var x = 1; // linter passes anyway\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const styleIssues = [...issues.blocking.filter(i => i.article === 4), ...issues.warning.filter(i => i.article === 4)];
      expect(styleIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should fallback to line check when project has no linter configured', () => {
      setup();

      // Create package.json WITHOUT any linter
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' })
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      const longLines = Array(502).fill('// comment').join('\n');
      fs.writeFileSync(path.join(srcDir, 'long.js'), longLines);
      fs.writeFileSync(path.join(srcDir, '__tests__', 'long.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      // Should fallback to line check -> warning (not blocking)
      const styleWarnings = issues.warning.filter(i => i.article === 4);
      expect(styleWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 6: Error Handling (empty catch blocks)', () => {
    it('should warn when empty catch block exists in JS', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try {\n  doSomething();\n} catch (e) {}\nmodule.exports = {};\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'handler.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const errorWarnings = issues.warning.filter(i => i.article === 6);
      expect(errorWarnings.length).toBeGreaterThanOrEqual(1);
      expect(errorWarnings[0].message).toContain('empty catch block');

      teardown();
      tempDir = null;
    });

    it('should warn when catch block has only comments', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.ts'),
        'try {\n  doSomething();\n} catch (e) {\n  // TODO: handle error\n}\nexport default {};\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'handler.test.ts'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const errorWarnings = issues.warning.filter(i => i.article === 6);
      expect(errorWarnings.length).toBeGreaterThanOrEqual(1);
      expect(errorWarnings[0].message).toContain('comments only');

      teardown();
      tempDir = null;
    });

    it('should not warn when catch block has actual handling', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try {\n  doSomething();\n} catch (e) {\n  logger.error(e);\n}\nmodule.exports = {};\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'handler.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const errorWarnings = issues.warning.filter(i => i.article === 6);
      expect(errorWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should warn when empty except block exists in Python', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.py'),
        'try:\n    do_something()\nexcept Exception:\n    pass\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'test_handler.py'), 'def test_ok(): pass\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const errorWarnings = issues.warning.filter(i => i.article === 6);
      expect(errorWarnings.length).toBeGreaterThanOrEqual(1);
      expect(errorWarnings[0].message).toContain('empty except block');

      teardown();
      tempDir = null;
    });
  });

  describe('Article 6: Production Logging (console usage)', () => {
    it('should warn when console.log is used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "console.log('hello');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings.length).toBeGreaterThanOrEqual(1);
      expect(logWarnings[0].message).toContain('console.log');
      expect(logWarnings[0].message).toContain('app.js:1');

      teardown();
      tempDir = null;
    });

    it('should warn when console.info is used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "console.info('info msg');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings.length).toBeGreaterThanOrEqual(1);
      expect(logWarnings[0].message).toContain('console.info');

      teardown();
      tempDir = null;
    });

    it('should warn when console.error is used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "console.error(err);\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings.length).toBeGreaterThanOrEqual(1);
      expect(logWarnings[0].message).toContain('console.error');

      teardown();
      tempDir = null;
    });

    it('should pass when using a logger library instead of console', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "const logger = require('winston');\nlogger.info('hello');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should not flag console usage in comment-only lines', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "// console.log('commented out');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should waive Article 6 logging check when waived', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "console.log('hello');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 6\n    reason: "logging waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const logWarnings = issues.warning.filter(i => i.article === 6 && i.message.includes('console usage'));
      expect(logWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 9: CI/CD', () => {
    it('should block when no CI configuration exists', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const ciBlocking = issues.blocking.filter(i => i.article === 9);
      expect(ciBlocking.length).toBeGreaterThanOrEqual(1);
      expect(ciBlocking[0].message).toContain('Missing CI Configuration');

      teardown();
      tempDir = null;
    });

    it('should warn when Node project has test script but no CI config', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0', scripts: { test: 'jest' } })
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const ciBlocking = issues.blocking.filter(i => i.article === 9);
      expect(ciBlocking.length).toBeGreaterThanOrEqual(1);

      const ciWarning = issues.warning.filter(i => i.article === 9);
      expect(ciWarning.length).toBeGreaterThanOrEqual(1);
      expect(ciWarning[0].message).toContain('test script');

      teardown();
      tempDir = null;
    });

    it('should pass when GitHub Actions workflow exists', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const ciBlocking = issues.blocking.filter(i => i.article === 9);
      expect(ciBlocking).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when .gitlab-ci.yml exists', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, '.gitlab-ci.yml'),
        'test:\n  script: npm test\n'
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const ciBlocking = issues.blocking.filter(i => i.article === 9);
      expect(ciBlocking).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should block when schemas/ directory has syntax errors', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'bad.json'),
        '{"broken": json}'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const schemaBlocking = issues.blocking.filter(i => i.article === 9 && i.message.includes('Schema Validity'));
      expect(schemaBlocking.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should pass Article 9 when schemas/ has valid files', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'valid.json'),
        '{"type": "object"}'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const schemaBlocking = issues.blocking.filter(i => i.article === 9 && i.message.includes('Schema Validity'));
      expect(schemaBlocking).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should block when schemas/ has invalid YAML', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'bad.yaml'),
        'type: object\n  bad indent: [unclosed\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const schemaBlocking = issues.blocking.filter(i => i.article === 9 && i.message.includes('Schema Validity'));
      expect(schemaBlocking.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 5: Documentation (JSDoc coverage)', () => {
    it('should warn when exported function has no JSDoc', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        'export function foo() {}\nexport default {};\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings.length).toBeGreaterThanOrEqual(1);
      expect(docWarnings[0].message).toContain('Missing JSDoc');
      expect(docWarnings[0].message).toContain('foo');

      teardown();
      tempDir = null;
    });

    it('should warn when exported class has no JSDoc', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.ts'),
        'export class UserService {\n  getName() { return "test"; }\n}\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'service.test.ts'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings.length).toBeGreaterThanOrEqual(1);
      expect(docWarnings[0].message).toContain('Missing JSDoc');
      expect(docWarnings[0].message).toContain('UserService');

      teardown();
      tempDir = null;
    });

    it('should pass when exported function has JSDoc', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        '/**\n * Computes something.\n * @returns result\n */\nexport function bar() { return 1; }\nmodule.exports = {};\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when JSDoc is on adjacent line above export', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'util.js'),
        '/** Helper function. */\nexport function helper() {}\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'util.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should ignore simple constant exports', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'consts.js'),
        'export const VERSION = 1;\nexport const NAME = "app";\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'consts.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should flag exported arrow function without JSDoc', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'fn.js'),
        'export const add = (a, b) => a + b;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'fn.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should not warn for mixed exports with JSDoc on complex ones', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'mixed.js'),
        'export const VERSION = "1.0";\n\n/** Adds two numbers */\nexport function add(a, b) { return a + b; }\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'mixed.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should waive Article 5 when waiver is present', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'undocumented.js'),
        'export function undocumentedFn() {}\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'undocumented.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 5\n    reason: "doc waiver for legacy code"\n    days: 14\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const docWarnings = issues.warning.filter(i => i.article === 5);
      expect(docWarnings).toHaveLength(0);

      const docSkipped = issues.skipped.filter(i => i.article === 5);
      expect(docSkipped.length).toBeGreaterThanOrEqual(1);
      expect(docSkipped[0].reason).toBe('Waived');

      teardown();
      tempDir = null;
    });
  });

  describe('Article 1: Library-First (wheel reinvention)', () => {
    it('should warn when file in src/utils/ exceeds 200 actual code lines', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      // Create a file > 200 actual code lines (~400 total with comments/blanks)
      const codeLines = [];
      for (let i = 0; i < 250; i++) {
        codeLines.push(`const val${i} = ${i} * 2;`);
      }
      fs.writeFileSync(path.join(utilsDir, 'big-tool.js'), codeLines.join('\n'));
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'big-tool.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const libWarnings = issues.warning.filter(i => i.article === 1);
      expect(libWarnings.length).toBeGreaterThanOrEqual(1);
      expect(libWarnings[0].message).toContain('Potential wheel reinvention');
      expect(libWarnings[0].message).toContain('big-tool.js');

      teardown();
      tempDir = null;
    });

    it('should not warn when file in src/utils/ is small', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      const codeLines = Array(50).fill('// helper code').join('\n');
      fs.writeFileSync(path.join(utilsDir, 'small-tool.js'), codeLines);
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'small-tool.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const libWarnings = issues.warning.filter(i => i.article === 1);
      expect(libWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should ignore index.js even when long', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      // Create a very long index.js (should be ignored)
      const codeLines = Array(400).fill('module.exports = {};').join('\n');
      fs.writeFileSync(path.join(utilsDir, 'index.js'), codeLines);
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const libWarnings = issues.warning.filter(i => i.article === 1);
      expect(libWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should warn for files in src/helpers/ and src/lib/', () => {
      setup();

      const helpersDir = path.join(tempDir, 'src', 'helpers');
      const libDir = path.join(tempDir, 'src', 'lib');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(helpersDir, { recursive: true });
      fs.mkdirSync(libDir, { recursive: true });

      const bigCode = Array(210).fill('exports.fn = function() { return 1; }').join('\n');
      fs.writeFileSync(path.join(helpersDir, 'big-helper.js'), bigCode);
      fs.writeFileSync(path.join(libDir, 'big-lib.js'), bigCode);
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'big-helper.test.js'), 'test("ok", () => {});\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'big-lib.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const libWarnings = issues.warning.filter(i => i.article === 1);
      expect(libWarnings.length).toBeGreaterThanOrEqual(2);

      teardown();
      tempDir = null;
    });

    it('should not fire when Article 1 is waived', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      const bigCode = Array(300).fill('exports.fn = function() { return 1; }').join('\n');
      fs.writeFileSync(path.join(utilsDir, 'big-tool.js'), bigCode);
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'big-tool.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 1\n    reason: "library-first waiver"\n    days: 14\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const libWarnings = issues.warning.filter(i => i.article === 1);
      expect(libWarnings).toHaveLength(0);

      const libSkipped = issues.skipped.filter(i => i.article === 1);
      expect(libSkipped.length).toBeGreaterThanOrEqual(1);
      expect(libSkipped[0].reason).toBe('Waived');

      teardown();
      tempDir = null;
    });

    it('should not suggest library when file matches pattern but library is already installed', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { axios: '^1.0.0' } })
      );

      fs.writeFileSync(path.join(utilsDir, 'request.js'), 'exports.get = () => {};\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'request.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should suggest date-fns when utils/date-helper.js exists without date-fns installed', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } })
      );

      fs.writeFileSync(path.join(utilsDir, 'date-helper.js'), 'exports.format = () => {};\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'date-helper.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings.length).toBeGreaterThanOrEqual(1);
      expect(wheelWarnings[0].message).toContain('date-helper.js');
      expect(wheelWarnings[0].message).toContain('date-fns');

      teardown();
      tempDir = null;
    });

    it('should not trigger library suggestion for filenames that do not match keywords', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      fs.writeFileSync(path.join(utilsDir, 'calculator.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'calculator.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should suggest axios for http-client.js when neither axios nor node-fetch is installed', () => {
      setup();

      const utilsDir = path.join(tempDir, 'src', 'utils');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(utilsDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      fs.writeFileSync(path.join(utilsDir, 'http-client.js'), 'exports.fetch = () => {};\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'http-client.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings.length).toBeGreaterThanOrEqual(1);
      expect(wheelWarnings[0].message).toContain('axios');

      teardown();
      tempDir = null;
    });

    it('should suggest lodash for string-utils.js when lodash is not installed', () => {
      setup();

      const helpersDir = path.join(tempDir, 'src', 'helpers');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(helpersDir, { recursive: true });

      fs.writeFileSync(path.join(helpersDir, 'string-utils.js'), 'exports.capitalize = (s) => s.toUpperCase();\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'string-utils.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings.length).toBeGreaterThanOrEqual(1);
      expect(wheelWarnings[0].message).toContain('lodash');

      teardown();
      tempDir = null;
    });

    it('should suggest lodash for deep-clone.js when neither lodash nor ramda is installed', () => {
      setup();

      const libDir = path.join(tempDir, 'src', 'lib');
      fs.mkdirSync(path.join(tempDir, 'src', '__tests__'), { recursive: true });
      fs.mkdirSync(libDir, { recursive: true });

      fs.writeFileSync(path.join(libDir, 'deep-clone.js'), 'exports.clone = (obj) => JSON.parse(JSON.stringify(obj));\n');
      fs.writeFileSync(path.join(tempDir, 'src', '__tests__', 'deep-clone.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const wheelWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Potential wheel reinvention in'));
      expect(wheelWarnings.length).toBeGreaterThanOrEqual(1);
      expect(wheelWarnings[0].message).toContain('lodash');

      teardown();
      tempDir = null;
    });

    it('should warn when unused dependencies are detected', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            express: '^4.0.0',
            'unused-pkg': '^1.0.0',
            axios: '^1.0.0',
          },
        })
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.js'),
        "const express = require('express');\nconst app = express();\nmodule.exports = app;\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'app.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const unusedWarnings = issues.warning.filter(i => i.article === 1 && i.message.includes('Unused dependencies'));
      expect(unusedWarnings.length).toBeGreaterThanOrEqual(1);
      expect(unusedWarnings[0].message).toContain('unused-pkg');
      expect(unusedWarnings[0].message).toContain('axios');

      teardown();
      tempDir = null;
    });
  });

  describe('Article 8: Performance', () => {
    it('should warn when useEffect has no dependency array', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'component.jsx'),
        'import { useEffect } from "react";\nfunction App() {\n  useEffect(() => { fetchData(); });\n  return <div/>;\n}\nexport default App;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'component.test.jsx'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const perfWarnings = issues.warning.filter(i => i.article === 8);
      expect(perfWarnings.length).toBeGreaterThanOrEqual(1);
      expect(perfWarnings[0].message).toContain('useEffect');
      expect(perfWarnings[0].message).toContain('dependency array');

      teardown();
      tempDir = null;
    });

    it('should warn when key={index} is used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'list.tsx'),
        'import React from "react";\nfunction List({ items }) {\n  return items.map((item, index) => <li key={index}>{item.name}</li>);\n}\nexport default List;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'list.test.tsx'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const perfWarnings = issues.warning.filter(i => i.article === 8);
      expect(perfWarnings.length).toBeGreaterThanOrEqual(1);
      expect(perfWarnings[0].message).toContain('index as key');

      teardown();
      tempDir = null;
    });

    it('should pass when useEffect has full dependency array', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'correct.jsx'),
        'import { useEffect, useState } from "react";\nfunction App() {\n  const [data, setData] = useState([]);\n  useEffect(() => { fetchData().then(setData); }, []);\n  return <div>{data}</div>;\n}\nexport default App;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'correct.test.jsx'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const perfWarnings = issues.warning.filter(i => i.article === 8);
      expect(perfWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when key={item.id} is used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'list-good.tsx'),
        'import React from "react";\nfunction List({ items }) {\n  return items.map((item) => <li key={item.id}>{item.name}</li>);\n}\nexport default List;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'list-good.test.tsx'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const perfWarnings = issues.warning.filter(i => i.article === 8);
      expect(perfWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when Article 8 is waived', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'perf-bad.jsx'),
        'function List({ items }) {\n  return items.map((item, index) => <li key={index}>{item.name}</li>);\n}\nexport default List;\n'
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'perf-bad.test.jsx'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 8\n    reason: "perf waiver for legacy"\n    days: 30\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const perfWarnings = issues.warning.filter(i => i.article === 8);
      expect(perfWarnings).toHaveLength(0);

      const perfSkipped = issues.skipped.filter(i => i.article === 8);
      expect(perfSkipped.length).toBeGreaterThanOrEqual(1);
      expect(perfSkipped[0].reason).toBe('Waived');

      teardown();
      tempDir = null;
    });
  });

  describe('Article 7: SQL/NoSQL Injection Detection', () => {
    it('should block when SQL query uses template string interpolation', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'query.js'),
        "function getUser(id) {\n  return db.query(`SELECT * FROM users WHERE id = ${id}`);\n}\nmodule.exports = { getUser };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'query.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('SQL/NoSQL Injection'));
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should block when SQL query uses string concatenation', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'query.js'),
        "function getUser(name) {\n  return db.query('SELECT * FROM users WHERE name = ' + name);\n}\nmodule.exports = { getUser };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'query.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('SQL'));
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should block when NoSQL find uses string concatenation', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'model.js'),
        "function findUser(name) {\n  return User.find({ name: '$or: [{name: ' + name + '}]' });\n}\nmodule.exports = { findUser };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'model.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('NoSQL Injection'));
      expect(secIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should pass when SQL query uses parameterized placeholders', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'safe-query.js'),
        "function getUser(id) {\n  return db.query('SELECT * FROM users WHERE id = $1', [id]);\n}\nmodule.exports = { getUser };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'safe-query.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const secIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('SQL'));
      expect(secIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should waive Article 7 SQL injection check when waived', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'query.js'),
        "function getUser(id) {\n  return db.query(`SELECT * FROM users WHERE id = ${id}`);\n}\nmodule.exports = { getUser };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'query.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 7\n    reason: "security waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const sqlIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('SQL'));
      expect(sqlIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 8: N+1 Query Detection', () => {
    it('should warn when database call is inside forEach loop', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.js'),
        "function processUsers(users) {\n  users.forEach(u => {\n    db.save(u);\n  });\n}\nmodule.exports = { processUsers };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'service.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const nPlusOneIssues = issues.warning.filter(i => i.article === 8 && i.message.includes('N+1'));
      expect(nPlusOneIssues.length).toBeGreaterThanOrEqual(1);
      expect(nPlusOneIssues[0].message).toContain('db.save');

      teardown();
      tempDir = null;
    });

    it('should warn when prisma find is inside for loop', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'repository.ts'),
        "async function getUsers(ids: number[]) {\n  const results = [];\n  for (const id of ids) {\n    const user = await prisma.user.findUnique({ where: { id } });\n    results.push(user);\n  }\n  return results;\n}\nexport { getUsers };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'repository.test.ts'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const nPlusOneIssues = issues.warning.filter(i => i.article === 8 && i.message.includes('N+1'));
      expect(nPlusOneIssues.length).toBeGreaterThanOrEqual(1);
      expect(nPlusOneIssues[0].message).toContain('findUnique');

      teardown();
      tempDir = null;
    });

    it('should not warn when database call is outside loop', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'safe-service.js'),
        "function processUsers(users) {\n  const data = users.map(u => u.name);\n  db.saveBatch(data);\n}\nmodule.exports = { processUsers };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'safe-service.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const nPlusOneIssues = issues.warning.filter(i => i.article === 8 && i.message.includes('N+1'));
      expect(nPlusOneIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should waive Article 8 N+1 check when waived', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.js'),
        "function processUsers(users) {\n  users.forEach(u => {\n    db.save(u);\n  });\n}\nmodule.exports = { processUsers };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'service.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 8\n    reason: "perf waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const nPlusOneIssues = issues.warning.filter(i => i.article === 8 && i.message.includes('N+1'));
      expect(nPlusOneIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 3: Staged Changes Size', () => {
    it('should warn when staged changes exceed 500 lines', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '300\t300\tfile1.js\n100\t0\tfile2.js', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      const stagedWarnings = commitWarnings.filter(w => w.message.includes('Staged changes are too large'));
      expect(stagedWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should not warn when staged changes are under 500 lines', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '50\t30\tfile1.js\n10\t5\tfile2.js', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const commitWarnings = issues.warning.filter(i => i.article === 3);
      const stagedWarnings = commitWarnings.filter(w => w.message.includes('Staged changes are too large'));
      expect(stagedWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should skip staged check when git diff --staged fails', () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockImplementationOnce(() => { throw new Error('not a git repo'); })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const stagedWarnings = issues.warning.filter(i => i.article === 3 && i.message.includes('Staged changes'));
      expect(stagedWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 7: Dependency Lockfile Check', () => {
    it('should warn when package.json exists but no lockfile is present', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: JSON.stringify({
          metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } }
        }), status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const lockWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Missing dependency lockfile'));
      expect(lockWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should pass when package.json and package-lock.json both exist', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}\n');

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: JSON.stringify({
          metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } }
        }), status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const lockWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Missing dependency lockfile'));
      expect(lockWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when yarn.lock exists with package.json', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '# yarn lock\n');

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: JSON.stringify({
          metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } }
        }), status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const lockWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Missing dependency lockfile'));
      expect(lockWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should warn when pyproject.toml exists but no Python lockfile is present', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'pyproject.toml'),
        '[tool.poetry]\nname = "test"\n'
      );

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const lockWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Missing dependency lockfile'));
      expect(lockWarnings.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 7: Dependency Vulnerability Scan', () => {
    it('should pass when npm audit returns 0 vulnerabilities', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: JSON.stringify({
          metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } }
        }), status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const depSecIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('vulnerabilities'));
      expect(depSecIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should trigger Blocking Error when npm audit returns critical vulnerabilities', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      const auditOutput = JSON.stringify({
        metadata: { vulnerabilities: { critical: 2, high: 1, moderate: 3, low: 0 } }
      });

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: auditOutput, status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const blockingDepIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('critical'));
      expect(blockingDepIssues.length).toBeGreaterThanOrEqual(1);
      expect(blockingDepIssues[0].message).toContain('npm audit fix');

      const warningDepIssues = issues.warning.filter(i => i.article === 7 && i.message.includes('high'));
      expect(warningDepIssues.length).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should trigger Warning when npm audit returns moderate vulnerabilities only', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      const auditOutput = JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 1, low: 2 } }
      });

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: '', status: 0 })
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockReturnValueOnce({ stdout: auditOutput, status: 0 });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const blockingDepIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('vulnerabilities'));
      expect(blockingDepIssues).toHaveLength(0);

      const warningDepIssues = issues.warning.filter(i => i.article === 7 && i.message.includes('moderate'));
      expect(warningDepIssues.length).toBeGreaterThanOrEqual(1);
      expect(warningDepIssues[0].message).toContain('npm audit fix');

      teardown();
      tempDir = null;
    });

    it('should not block when npm audit fails (network issue or no dependencies)', () => {
      setup();

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("works", () => {});\n');

      childProcess.spawnSync
        .mockReturnValueOnce({ stdout: 'abc1234 feat: init project', status: 0 })
        .mockImplementation(() => { throw new Error('npm audit failed'); });

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const blockingDepIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('vulnerabilities'));
      expect(blockingDepIssues).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });

  describe('Article 7: Insecure HTTP Endpoint Detection', () => {
    it('should pass when only HTTPS endpoints are used', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('https://api.safe.com/data');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should warn when insecure HTTP endpoint is detected', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('http://api.insecure.com/data');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings.length).toBeGreaterThanOrEqual(1);
      expect(httpWarnings[0].message).toContain('MITM');

      teardown();
      tempDir = null;
    });

    it('should pass when HTTP endpoint is in whitelist (localhost)', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('http://localhost:3000/api');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when HTTP endpoint is in whitelist (127.0.0.1)', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('http://127.0.0.1:8080/api');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when HTTP endpoint is in whitelist (0.0.0.0)', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('http://0.0.0.0:5000/api');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should pass when HTTP endpoint is in whitelist (example.com)', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'docs.js'),
        "const url = 'http://example.com/docs';\nmodule.exports = { url };\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'docs.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });

    it('should report the correct file and line number', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.js'),
        "const httpsUrl = 'https://api.safe.com';\nfetch('http://api.bad.com/v1');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'service.test.js'), 'test("ok", () => {});\n');

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings.length).toBeGreaterThanOrEqual(1);
      expect(httpWarnings[0].message).toContain('service.js:2');

      teardown();
      tempDir = null;
    });

    it('should waive Article 7 HTTP check when waived', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'api.js'),
        "fetch('http://api.insecure.com/data');\nmodule.exports = {};\n"
      );
      fs.writeFileSync(path.join(srcDir, '__tests__', 'api.test.js'), 'test("ok", () => {});\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 7\n    reason: "security waiver"\n    days: 7\n'
      );

      const checker = new ConstitutionChecker(tempDir);
      const issues = checker.run();

      const httpWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Insecure HTTP'));
      expect(httpWarnings).toHaveLength(0);

      teardown();
      tempDir = null;
    });
  });
});

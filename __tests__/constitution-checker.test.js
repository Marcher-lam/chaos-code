const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

describe('ConstitutionChecker', () => {
  let tempDir;
  const tempDirs = [];

  function setup(cwd) {
    tempDir = cwd || fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-checker-'));
    tempDirs.push(tempDir);
    return tempDir;
  }

  function teardown() {
    // cleanup handled in afterAll
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function writePackageJson(dir, data) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(data, null, 2));
  }

  function writeConfig(dir, config) {
    const configDir = path.join(dir, 'stdd');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.yaml'), yaml.dump(config));
  }

  function writeWaivers(dir, waivers) {
    const waiversDir = path.join(dir, 'stdd', 'constitution');
    fs.mkdirSync(waiversDir, { recursive: true });
    fs.writeFileSync(
      path.join(waiversDir, 'waivers.yaml'),
      yaml.dump({ waivers })
    );
  }

  function _createSrcFile(dir, relPath, content) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  function initGitRepo(dir) {
    const { execSync } = require('child_process');
    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
    // Ensure there is at least one file to commit
    if (!fs.existsSync(path.join(dir, '.gitkeep'))) {
      fs.writeFileSync(path.join(dir, '.gitkeep'), '');
    }
    execSync('git add -A', { cwd: dir, stdio: 'pipe' });
    execSync('git commit --no-verify -m "feat: initial commit"', { cwd: dir, stdio: 'pipe' });
  }

  describe('constructor', () => {
    it('should use provided cwd', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.cwd).toBe(dir);
      teardown();
    });

    it('should default to process.cwd() when no cwd given', () => {
      const checker = new ConstitutionChecker();
      expect(checker.cwd).toBe(process.cwd());
    });

    it('should accept options', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir, { workspace: null });
      expect(checker.options).toEqual({ workspace: null });
      teardown();
    });

    it('should initialize issues with empty arrays', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.issues).toEqual({
        blocking: [],
        warning: [],
        info: [],
        skipped: [],
      });
      teardown();
    });

    it('should initialize waivers as an empty Set', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.waivers).toBeInstanceOf(Set);
      expect(checker.waivers.size).toBe(0);
      teardown();
    });
  });

  describe('loadConfig', () => {
    it('should return parsed yaml config when config.yaml exists', () => {
      const dir = setup();
      writeConfig(dir, { tdd: { coverage: { threshold: 90 } } });
      const checker = new ConstitutionChecker(dir);
      const config = checker.loadConfig();
      expect(config.tdd).toBeDefined();
      expect(config.tdd.coverage.threshold).toBe(90);
      teardown();
    });

    it('should return empty object when config.yaml does not exist', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const config = checker.loadConfig();
      expect(config).toEqual({});
      teardown();
    });

    it('should return empty object when config.yaml has invalid yaml', () => {
      const dir = setup();
      const configDir = path.join(dir, 'stdd');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.yaml'), '{{invalid yaml::');
      const checker = new ConstitutionChecker(dir);
      const config = checker.loadConfig();
      expect(config).toEqual({});
      teardown();
    });
  });

  describe('loadWaivers', () => {
    it('should load valid waivers with article numbers', () => {
      const dir = setup();
      writeWaivers(dir, [{ article: 1 }, { article: 5 }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(1)).toBe(true);
      expect(checker.isWaived(5)).toBe(true);
      expect(checker.isWaived(2)).toBe(false);
      teardown();
    });

    it('should skip waivers with non-numeric article', () => {
      const dir = setup();
      writeWaivers(dir, [{ article: 'abc' }, { article: 3 }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(3)).toBe(true);
      expect(checker.isWaived('abc')).toBe(false);
      teardown();
    });

    it('should respect valid_until date (not expired)', () => {
      const dir = setup();
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      writeWaivers(dir, [{ article: 7, valid_until: future }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(7)).toBe(true);
      teardown();
    });

    it('should respect valid_until date (expired)', () => {
      const dir = setup();
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      writeWaivers(dir, [{ article: 7, valid_until: past }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(7)).toBe(false);
      teardown();
    });

    it('should respect days-based expiry (not expired)', () => {
      const dir = setup();
      writeWaivers(dir, [{ article: 4, days: 30, granted_at: new Date().toISOString() }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(4)).toBe(true);
      teardown();
    });

    it('should respect days-based expiry (expired)', () => {
      const dir = setup();
      const past = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      writeWaivers(dir, [{ article: 4, days: 10, granted_at: past }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(4)).toBe(false);
      teardown();
    });

    it('should treat waiver as permanent when no expiry specified', () => {
      const dir = setup();
      writeWaivers(dir, [{ article: 9 }]);
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.isWaived(9)).toBe(true);
      teardown();
    });

    it('should handle missing waivers file gracefully', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(() => checker.loadWaivers()).not.toThrow();
      expect(checker.waivers.size).toBe(0);
      teardown();
    });

    it('should handle invalid yaml in waivers file', () => {
      const dir = setup();
      const waiversDir = path.join(dir, 'stdd', 'constitution');
      fs.mkdirSync(waiversDir, { recursive: true });
      fs.writeFileSync(path.join(waiversDir, 'waivers.yaml'), '{{invalid::');
      const checker = new ConstitutionChecker(dir);
      expect(() => checker.loadWaivers()).not.toThrow();
      expect(checker.waivers.size).toBe(0);
      teardown();
    });

    it('should handle waivers yaml with non-array waivers key', () => {
      const dir = setup();
      const waiversDir = path.join(dir, 'stdd', 'constitution');
      fs.mkdirSync(waiversDir, { recursive: true });
      fs.writeFileSync(path.join(waiversDir, 'waivers.yaml'), yaml.dump({ waivers: 'not-an-array' }));
      const checker = new ConstitutionChecker(dir);
      checker.loadWaivers();
      expect(checker.waivers.size).toBe(0);
      teardown();
    });
  });

  describe('isTestFile', () => {
    it('should identify .test. files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.isTestFile('foo.test.js')).toBe(true);
      expect(checker.isTestFile('bar.test.ts')).toBe(true);
      teardown();
    });

    it('should identify .spec. files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.isTestFile('foo.spec.js')).toBe(true);
      expect(checker.isTestFile('bar.spec.ts')).toBe(true);
      teardown();
    });

    it('should identify test_ prefix files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.isTestFile('test_utils.py')).toBe(true);
      teardown();
    });

    it('should not identify regular source files as test files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker.isTestFile('utils.js')).toBe(false);
      expect(checker.isTestFile('helper.ts')).toBe(false);
      expect(checker.isTestFile('index.js')).toBe(false);
      teardown();
    });
  });

  describe('findSourceFiles', () => {
    it('should find JS/TS source files recursively', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(path.join(srcDir, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'a.js'), '');
      fs.writeFileSync(path.join(srcDir, 'b.ts'), '');
      fs.writeFileSync(path.join(srcDir, 'sub', 'c.js'), '');
      fs.writeFileSync(path.join(srcDir, 'a.test.js'), '');
      const checker = new ConstitutionChecker(dir);
      const files = checker.findSourceFiles(srcDir);
      const basenames = files.map(f => path.basename(f));
      expect(basenames).toContain('a.js');
      expect(basenames).toContain('b.ts');
      expect(basenames).toContain('c.js');
      expect(basenames).not.toContain('a.test.js');
      teardown();
    });

    it('should skip __tests__ directories', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, '__tests__', 'a.test.js'), '');
      fs.writeFileSync(path.join(srcDir, 'real.js'), '');
      const checker = new ConstitutionChecker(dir);
      const files = checker.findSourceFiles(srcDir);
      const basenames = files.map(f => path.basename(f));
      expect(basenames).not.toContain('a.test.js');
      expect(basenames).toContain('real.js');
      teardown();
    });

    it('should skip node_modules directories', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(path.join(srcDir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'node_modules', 'pkg', 'index.js'), '');
      fs.writeFileSync(path.join(srcDir, 'real.js'), '');
      const checker = new ConstitutionChecker(dir);
      const files = checker.findSourceFiles(srcDir);
      const basenames = files.map(f => path.basename(f));
      expect(basenames).not.toContain('index.js');
      expect(basenames).toContain('real.js');
      teardown();
    });

    it('should include Python files', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'app.py'), '');
      const checker = new ConstitutionChecker(dir);
      const files = checker.findSourceFiles(srcDir);
      const basenames = files.map(f => path.basename(f));
      expect(basenames).toContain('app.py');
      teardown();
    });

    it('should return empty array for non-existent directory', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const files = checker.findSourceFiles(path.join(dir, 'nonexistent'));
      expect(files).toEqual([]);
      teardown();
    });
  });

  describe('findTestFileForSource', () => {
    it('should find test file in __tests__ subdirectory', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), '');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), '');
      const checker = new ConstitutionChecker(dir);
      const result = checker.findTestFileForSource(
        path.join(srcDir, 'utils.js'),
        srcDir
      );
      expect(result).toBeTruthy();
      expect(result).toContain('utils.test.js');
      teardown();
    });

    it('should find sibling test file', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'helper.js'), '');
      fs.writeFileSync(path.join(srcDir, 'helper.test.js'), '');
      const checker = new ConstitutionChecker(dir);
      const result = checker.findTestFileForSource(
        path.join(srcDir, 'helper.js'),
        srcDir
      );
      expect(result).toBeTruthy();
      teardown();
    });

    it('should find spec file', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'service.ts'), '');
      fs.writeFileSync(path.join(srcDir, 'service.spec.ts'), '');
      const checker = new ConstitutionChecker(dir);
      const result = checker.findTestFileForSource(
        path.join(srcDir, 'service.ts'),
        srcDir
      );
      expect(result).toBeTruthy();
      teardown();
    });

    it('should return null when no test file exists', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'orphan.js'), '');
      const checker = new ConstitutionChecker(dir);
      const result = checker.findTestFileForSource(
        path.join(srcDir, 'orphan.js'),
        srcDir
      );
      expect(result).toBeNull();
      teardown();
    });
  });

  describe('checkArticle2TDD', () => {
    it('should report blocking when source file has no test file', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'untouched.js'), 'export const x = 1;');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TDD();
      const blocking = checker.issues.blocking.filter(i => i.article === 2);
      expect(blocking.length).toBeGreaterThan(0);
      expect(blocking[0].message).toContain('Missing test file');
      teardown();
    });

    it('should not report blocking when test file exists', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'covered.js'), 'export const x = 1;');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'covered.test.js'), 'test("x", () => {});');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TDD();
      const blocking = checker.issues.blocking.filter(i => i.article === 2);
      expect(blocking).toHaveLength(0);
      teardown();
    });

    it('should skip when waived', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'a.js'), 'export const x = 1;');
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(2);
      checker.checkArticle2TDD();
      const skipped = checker.issues.skipped.filter(i => i.article === 2);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe('Waived');
      const blocking = checker.issues.blocking.filter(i => i.article === 2);
      expect(blocking).toHaveLength(0);
      teardown();
    });

    it('should skip when no src directory exists', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TDD();
      const skipped = checker.issues.skipped.filter(i => i.article === 2);
      expect(skipped.length).toBeGreaterThan(0);
      expect(skipped[0].reason).toContain('No src/ directory');
      teardown();
    });
  });

  describe('checkArticle3Commits', () => {
    it('should skip when waived', () => {
      const dir = setup();
      initGitRepo(dir);
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(3);
      checker.checkArticle3Commits();
      const skipped = checker.issues.skipped.filter(i => i.article === 3);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe('Waived');
      teardown();
    });

    it('should skip when not a git repo', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle3Commits();
      const skipped = checker.issues.skipped.filter(i => i.article === 3);
      expect(skipped.length).toBeGreaterThan(0);
      expect(skipped[0].reason).toContain('Not a git repository');
      teardown();
    });

    it('should warn on non-conventional commit messages', () => {
      const dir = setup();
      initGitRepo(dir);
      const { execSync } = require('child_process');
      execSync('git commit --allow-empty --no-verify -m "this is not conventional"', { cwd: dir, stdio: 'pipe' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle3Commits();
      const warnings = checker.issues.warning.filter(i => i.article === 3);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('Conventional Commits');
      teardown();
    });

    it('should not warn on conventional commit messages', () => {
      const dir = setup();
      // initGitRepo already creates a conventional commit
      initGitRepo(dir);
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle3Commits();
      const warnings = checker.issues.warning.filter(i => i.article === 3);
      expect(warnings).toHaveLength(0);
      teardown();
    });
  });

  describe('checkArticle5Documentation', () => {
    it('should warn on exported functions without JSDoc', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'undoc.js'),
        'export function doStuff(x) { return x; }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle5Documentation();
      const warnings = checker.issues.warning.filter(i => i.article === 5);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('Missing JSDoc');
      expect(warnings[0].message).toContain('doStuff');
      teardown();
    });

    it('should not warn on exported functions with JSDoc', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'docced.js'),
        '/**\n * Does stuff.\n * @param {*} x\n * @returns {*}\n */\nexport function doStuff(x) { return x; }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle5Documentation();
      const warnings = checker.issues.warning.filter(i => i.article === 5);
      expect(warnings).toHaveLength(0);
      teardown();
    });

    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(5);
      checker.checkArticle5Documentation();
      const skipped = checker.issues.skipped.filter(i => i.article === 5);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe('Waived');
      teardown();
    });

    it('should skip simple const exports', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'consts.js'),
        'export const VERSION = "1.0";\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle5Documentation();
      const warnings = checker.issues.warning.filter(i => i.article === 5);
      expect(warnings).toHaveLength(0);
      teardown();
    });
  });

  describe('checkArticle6ErrorHandling', () => {
    it('should warn on empty catch blocks', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try { doSomething(); } catch (e) { }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const warnings = checker.issues.warning.filter(i => i.article === 6);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('empty catch block');
      teardown();
    });

    it('should warn on catch blocks with only comments', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try { doSomething(); } catch (e) { /* nothing */ }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const warnings = checker.issues.warning.filter(i => i.article === 6);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('empty catch block');
      teardown();
    });

    it('should not warn on catch blocks with real error handling', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try { doSomething(); } catch (e) { console.error(e); throw e; }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const emptyCatch = checker.issues.warning.filter(
        i => i.article === 6 && i.message.includes('empty catch block')
      );
      expect(emptyCatch).toHaveLength(0);
      teardown();
    });

    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(6);
      checker.checkArticle6ErrorHandling();
      const skipped = checker.issues.skipped.filter(i => i.article === 6);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn on console usage in source files', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'logger.js'),
        'export function debug() { console.log("msg"); }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const consoleWarnings = checker.issues.warning.filter(
        i => i.article === 6 && i.message.includes('console usage')
      );
      expect(consoleWarnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on Python empty except pass', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.py'),
        'try:\n    do_thing()\nexcept Exception:\n    pass\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const warnings = checker.issues.warning.filter(i => i.article === 6);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('empty except block');
      teardown();
    });
  });

  describe('checkArticle7Security', () => {
    it('should report blocking on hardcoded password', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'config.js'),
        'const password = "super-secret";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const blocking = checker.issues.blocking.filter(i => i.article === 7);
      expect(blocking.length).toBeGreaterThan(0);
      expect(blocking[0].message).toContain('Hardcoded secret');
      teardown();
    });

    it('should report blocking on hardcoded apiKey', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'keys.js'),
        'const apiKey = "AKIAIOSFODNN7EXAMPLE";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const blocking = checker.issues.blocking.filter(i => i.article === 7);
      expect(blocking.length).toBeGreaterThan(0);
      teardown();
    });

    it('should report blocking on SQL injection pattern', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'db.js'),
        'const query = `SELECT * FROM users WHERE id = ${userId}`;\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const blocking = checker.issues.blocking.filter(
        i => i.article === 7 && i.message.includes('SQL')
      );
      expect(blocking.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on insecure HTTP endpoints', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'client.js'),
        'const url = "http://api.example.com/data";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const httpWarnings = checker.issues.warning.filter(
        i => i.article === 7 && i.message.includes('Insecure HTTP')
      );
      expect(httpWarnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should not warn on HTTPS endpoints', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'client.js'),
        'const url = "https://api.example.com/data";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const httpWarnings = checker.issues.warning.filter(
        i => i.article === 7 && i.message.includes('Insecure HTTP')
      );
      expect(httpWarnings).toHaveLength(0);
      teardown();
    });

    it('should not warn on localhost HTTP', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'dev.js'),
        'const url = "http://localhost:3000/api";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const httpWarnings = checker.issues.warning.filter(
        i => i.article === 7 && i.message.includes('Insecure HTTP')
      );
      expect(httpWarnings).toHaveLength(0);
      teardown();
    });

    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(7);
      checker.checkArticle7Security();
      const skipped = checker.issues.skipped.filter(i => i.article === 7);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn on missing lockfile', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'no-lock' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const lockWarnings = checker.issues.warning.filter(
        i => i.article === 7 && i.message.includes('lockfile')
      );
      expect(lockWarnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should not warn on lockfile present', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'has-lock' });
      fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const lockWarnings = checker.issues.warning.filter(
        i => i.article === 7 && i.message.includes('lockfile')
      );
      expect(lockWarnings).toHaveLength(0);
      teardown();
    });
  });

  describe('checkArticle4Style', () => {
    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(4);
      checker.checkArticle4Style();
      const skipped = checker.issues.skipped.filter(i => i.article === 4);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn on very long files via fallback line check', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const longContent = Array(600).fill('const x = 1;').join('\n');
      fs.writeFileSync(path.join(srcDir, 'huge.js'), longContent);
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle4Style();
      const warnings = checker.issues.warning.filter(
        i => i.article === 4 && i.message.includes('too long')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('checkArticle8Performance', () => {
    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(8);
      checker.checkArticle8Performance();
      const skipped = checker.issues.skipped.filter(i => i.article === 8);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn on sync fs calls', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'sync.js'),
        'const data = fs.readFileSync("/path");\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle8Performance();
      const warnings = checker.issues.warning.filter(
        i => i.article === 8 && i.message.includes('Synchronous fs call')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on while loops without break', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'loop.js'),
        'while (true) {\n  doStuff();\n}\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle8Performance();
      const warnings = checker.issues.warning.filter(
        i => i.article === 8 && i.message.includes('while loop without break')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on N+1 query patterns', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'db.js'),
        'for (const id of ids) {\n  const user = await db.findById(id);\n}\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle8Performance();
      const warnings = checker.issues.warning.filter(
        i => i.article === 8 && i.message.includes('N+1 query')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('checkArticle9CICD', () => {
    it('should report blocking when no CI config found', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'no-ci' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle9CICD();
      const blocking = checker.issues.blocking.filter(i => i.article === 9);
      expect(blocking.length).toBeGreaterThan(0);
      expect(blocking[0].message).toContain('Missing CI Configuration');
      teardown();
    });

    it('should not report blocking when GitHub Actions exists', () => {
      const dir = setup();
      const workflowsDir = path.join(dir, '.github', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), 'name: CI\n');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle9CICD();
      const blocking = checker.issues.blocking.filter(
        i => i.article === 9 && i.message.includes('Missing CI Configuration')
      );
      expect(blocking).toHaveLength(0);
      teardown();
    });

    it('should not report blocking when .gitlab-ci.yml exists', () => {
      const dir = setup();
      fs.writeFileSync(path.join(dir, '.gitlab-ci.yml'), 'test:\n  script: echo\n');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle9CICD();
      const blocking = checker.issues.blocking.filter(
        i => i.article === 9 && i.message.includes('Missing CI Configuration')
      );
      expect(blocking).toHaveLength(0);
      teardown();
    });

    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(9);
      checker.checkArticle9CICD();
      const skipped = checker.issues.skipped.filter(i => i.article === 9);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn when test script exists but no CI config', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'test-no-ci', scripts: { test: 'jest' } });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle9CICD();
      const warnings = checker.issues.warning.filter(
        i => i.article === 9 && i.message.includes('test script but no CI')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('checkArticle1LibraryFirst', () => {
    it('should skip when waived', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      checker.waivers.add(1);
      checker.checkArticle1LibraryFirst();
      const skipped = checker.issues.skipped.filter(i => i.article === 1);
      expect(skipped).toHaveLength(1);
      teardown();
    });

    it('should warn on potential wheel reinvention in large utility files', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src', 'utils');
      fs.mkdirSync(srcDir, { recursive: true });
      const longContent = Array(250).fill('const x = 1;').join('\n');
      fs.writeFileSync(path.join(srcDir, 'date-helpers.js'), longContent);
      writePackageJson(dir, { name: 'test', dependencies: {} });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle1LibraryFirst();
      const warnings = checker.issues.warning.filter(
        i => i.article === 1 && i.message.includes('wheel reinvention')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should suggest library when heuristic matches and not installed', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src', 'utils');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'http-client.js'), 'const x = 1;\n');
      writePackageJson(dir, { name: 'test', dependencies: {} });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle1LibraryFirst();
      const warnings = checker.issues.warning.filter(
        i => i.article === 1 && i.message.includes('axios')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should not suggest library when already installed', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src', 'utils');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'http-client.js'), 'const x = 1;\n');
      writePackageJson(dir, { name: 'test', dependencies: { axios: '^1.0.0' } });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle1LibraryFirst();
      const suggestWarnings = checker.issues.warning.filter(
        i => i.article === 1 && i.message.includes('Consider using') && i.message.includes('axios')
      );
      expect(suggestWarnings).toHaveLength(0);
      teardown();
    });

    it('should warn on unused dependencies', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), 'export const x = 1;\n');
      writePackageJson(dir, { name: 'test', dependencies: { lodash: '^4.0.0' } });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle1LibraryFirst();
      const unusedWarnings = checker.issues.warning.filter(
        i => i.article === 1 && i.message.includes('Unused dependencies')
      );
      expect(unusedWarnings.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('suggestLibraryForFile', () => {
    it('should suggest date-fns for date-related files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const result = checker.suggestLibraryForFile('date-utils.js', new Set());
      expect(result).toBe('date-fns');
      teardown();
    });

    it('should suggest axios for http-related files', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const result = checker.suggestLibraryForFile('api-client.js', new Set());
      expect(result).toBe('axios');
      teardown();
    });

    it('should return null when library already installed', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const result = checker.suggestLibraryForFile('http.js', new Set(['axios']));
      expect(result).toBeNull();
      teardown();
    });

    it('should return null for non-matching filenames', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const result = checker.suggestLibraryForFile('random.js', new Set());
      expect(result).toBeNull();
      teardown();
    });
  });

  describe('detectSourceLanguage', () => {
    it('should detect JavaScript files', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'app.js'), '');
      const checker = new ConstitutionChecker(dir);
      const langs = checker.detectSourceLanguage(srcDir);
      expect(langs.has('js')).toBe(true);
      teardown();
    });

    it('should detect Python files', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'app.py'), '');
      const checker = new ConstitutionChecker(dir);
      const langs = checker.detectSourceLanguage(srcDir);
      expect(langs.has('py')).toBe(true);
      teardown();
    });

    it('should detect multiple languages', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'app.js'), '');
      fs.writeFileSync(path.join(srcDir, 'app.py'), '');
      const checker = new ConstitutionChecker(dir);
      const langs = checker.detectSourceLanguage(srcDir);
      expect(langs.has('js')).toBe(true);
      expect(langs.has('py')).toBe(true);
      teardown();
    });
  });

  describe('run', () => {
    it('should return issues object with all four categories', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'test', scripts: { test: 'jest' } });
      initGitRepo(dir);
      const checker = new ConstitutionChecker(dir);
      const result = checker.run();
      expect(result).toHaveProperty('blocking');
      expect(result).toHaveProperty('warning');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('skipped');
      expect(Array.isArray(result.blocking)).toBe(true);
      expect(Array.isArray(result.warning)).toBe(true);
      expect(Array.isArray(result.info)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);
      teardown();
    });

    it('should load waivers before running checks', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'test' });
      writeWaivers(dir, [{ article: 9 }]);
      initGitRepo(dir);
      const checker = new ConstitutionChecker(dir);
      const result = checker.run();
      const skipped9 = result.skipped.filter(i => i.article === 9);
      expect(skipped9.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('severity classification', () => {
    it('should classify missing tests as blocking', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'a.js'), 'export const x = 1;');
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TDD();
      const blocking = checker.issues.blocking.filter(i => i.article === 2);
      expect(blocking.length).toBeGreaterThan(0);
      teardown();
    });

    it('should classify missing CI as blocking', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'no-ci' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle9CICD();
      const blocking = checker.issues.blocking.filter(
        i => i.article === 9 && i.message.includes('Missing CI')
      );
      expect(blocking.length).toBeGreaterThan(0);
      teardown();
    });

    it('should classify empty catch blocks as warning', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'handler.js'),
        'try { x(); } catch (e) { }\n'
      );
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const warnings = checker.issues.warning.filter(
        i => i.article === 6 && i.message.includes('empty catch block')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should classify hardcoded secrets as blocking', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'config.js'),
        'const password = "secret123";\n'
      );
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle7Security();
      const blocking = checker.issues.blocking.filter(
        i => i.article === 7 && i.message.includes('Hardcoded secret')
      );
      expect(blocking.length).toBeGreaterThan(0);
      teardown();
    });
  });

  describe('getPackageJsonPaths', () => {
    it('should return root package.json when it exists', () => {
      const dir = setup();
      writePackageJson(dir, { name: 'test' });
      const checker = new ConstitutionChecker(dir);
      const paths = checker.getPackageJsonPaths();
      expect(paths.some(p => p.includes('package.json'))).toBe(true);
      teardown();
    });

    it('should return empty when no package.json exists', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const paths = checker.getPackageJsonPaths();
      expect(paths).toEqual([]);
      teardown();
    });

    it('should return workspace package.json when workspace option set', () => {
      const dir = setup();
      const wsDir = path.join(dir, 'packages', 'api');
      fs.mkdirSync(wsDir, { recursive: true });
      writePackageJson(wsDir, { name: '@test/api' });
      const checker = new ConstitutionChecker(dir, {
        workspace: { packageJsonPath: path.join(wsDir, 'package.json') },
      });
      const paths = checker.getPackageJsonPaths();
      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain('packages/api');
      teardown();
    });
  });

  describe('getInstalledDependencies', () => {
    it('should collect dependencies from package.json', () => {
      const dir = setup();
      writePackageJson(dir, {
        name: 'test',
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { jest: '^29.0.0' },
      });
      const checker = new ConstitutionChecker(dir);
      const deps = checker.getInstalledDependencies();
      expect(deps.has('lodash')).toBe(true);
      expect(deps.has('jest')).toBe(true);
      teardown();
    });

    it('should return empty set when no package.json', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      const deps = checker.getInstalledDependencies();
      expect(deps.size).toBe(0);
      teardown();
    });

    it('should handle invalid package.json', () => {
      const dir = setup();
      fs.writeFileSync(path.join(dir, 'package.json'), 'not json');
      const checker = new ConstitutionChecker(dir);
      const deps = checker.getInstalledDependencies();
      expect(deps.size).toBe(0);
      teardown();
    });
  });

  describe('_extractExportName', () => {
    it('should extract function name', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._extractExportName('export function add(a, b) {}')).toBe('add');
      teardown();
    });

    it('should extract async function name', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._extractExportName('export async function fetch() {}')).toBe('fetch');
      teardown();
    });

    it('should extract class name', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._extractExportName('export class User {}')).toBe('User');
      teardown();
    });

    it('should extract const name', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._extractExportName('export const VERSION = "1.0"')).toBe('VERSION');
      teardown();
    });

    it('should extract default export function name', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._extractExportName('export default function main() {}')).toBe('main');
      teardown();
    });

    it('should return identifier for default exports with value', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      // export default 42 matches /^export\s+default\s+(\w+)/i -> "42"
      expect(checker._extractExportName('export default 42')).toBe('42');
      teardown();
    });
  });

  describe('_isPublicExport', () => {
    it('should detect exported functions', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isPublicExport('export function foo() {}')).toBe(true);
      teardown();
    });

    it('should detect exported classes', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isPublicExport('export class Foo {}')).toBe(true);
      teardown();
    });

    it('should detect exported arrow functions', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isPublicExport('export const fn = () => {}')).toBe(true);
      teardown();
    });

    it('should not detect non-exports', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isPublicExport('function foo() {}')).toBe(false);
      teardown();
    });
  });

  describe('_isSimpleExport', () => {
    it('should detect simple const exports with primitive values', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isSimpleExport('export const VERSION = "1.0"')).toBe(true);
      expect(checker._isSimpleExport('export const MAX = 100')).toBe(true);
      expect(checker._isSimpleExport('export const FLAG = true')).toBe(true);
      teardown();
    });

    it('should not flag function exports as simple', () => {
      const dir = setup();
      const checker = new ConstitutionChecker(dir);
      expect(checker._isSimpleExport('export function foo() {}')).toBe(false);
      teardown();
    });
  });

  describe('checkArticle2TestExecution', () => {
    it('should warn when no test command configured', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      writePackageJson(dir, { name: 'no-test-script' });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TestExecution();
      const warnings = checker.issues.warning.filter(
        i => i.article === 2 && i.message.includes('No test command')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on skipped tests', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      const testDir = path.join(srcDir, '__tests__');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'a.test.js'),
        'describe.skip("bad", () => { it("skipped", () => {}); });\n'
      );
      writePackageJson(dir, { name: 'test', scripts: { test: 'jest' } });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TestExecution();
      const warnings = checker.issues.warning.filter(
        i => i.article === 2 && i.message.includes('Skipped test')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });

    it('should warn on test files with no assertions', () => {
      const dir = setup();
      const srcDir = path.join(dir, 'src');
      const testDir = path.join(srcDir, '__tests__');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'empty.test.js'),
        'describe("empty", () => {});\n'
      );
      writePackageJson(dir, { name: 'test', scripts: { test: 'jest' } });
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle2TestExecution();
      const warnings = checker.issues.warning.filter(
        i => i.article === 2 && i.message.includes('no assertions')
      );
      expect(warnings.length).toBeGreaterThan(0);
      teardown();
    });
  });
});

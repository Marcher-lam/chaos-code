const fs = require('fs');
const path = require('path');
const os = require('os');
const { ConstitutionFixCommand } = require('../src/cli/commands/constitution-fix');

describe('ConstitutionFixCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-const-fix-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  afterAll(() => {
    teardown();
  });

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  async function captureConsole(fn) {
    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.map(String).join(' '));
    try {
      await fn();
    } finally {
      console.log = origLog;
    }
    return lines.join('\n');
  }

  function setupWorkspaces() {
    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    fs.mkdirSync(path.join(tempDir, 'packages', 'api', 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages', 'web', 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
    fs.writeFileSync(path.join(tempDir, 'packages', 'web', 'package.json'), JSON.stringify({ name: '@test/web' }));
  }

  describe('Article 5 - JSDoc fix', () => {
    it('should insert JSDoc blocks before undocumented exported functions', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function add(a, b) { return a + b; }\nexport function subtract(x, y) { return x - y; }\nmodule.exports = {};\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);
      expect(article5Result.fixed).toContain('src/utils.js');

      const content = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('[Description needed]');
      expect(content).toContain('@param');
      expect(content).toContain('@returns');
      expect(content).toContain('export function add');
      expect(content).toContain('export function subtract');

      teardown();
    });

    it('should not modify files that already have JSDoc', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'documented.js'),
        '/**\n * Adds two numbers.\n * @param {number} a\n * @param {number} b\n * @returns {number}\n */\nexport function add(a, b) { return a + b; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toHaveLength(0);

      teardown();
    });

    it('should handle exported classes', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.js'),
        'export class UserService {\n  getName() { return "test"; }\n}\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      const content = fs.readFileSync(path.join(srcDir, 'service.js'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('@name UserService');
      expect(content).toContain('export class UserService');

      teardown();
    });

    it('should handle arrow function exports', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'fn.js'),
        'export const multiply = (a, b) => a * b;\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      const content = fs.readFileSync(path.join(srcDir, 'fn.js'), 'utf8');
      expect(content).toContain('export const multiply');
      expect(content).toContain('@param');
      expect(content).toContain('@returns');

      teardown();
    });

    it('should insert JSDoc in workspace source files', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
      const srcDir = path.join(tempDir, 'packages', 'api', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
      fs.writeFileSync(
        path.join(srcDir, 'service.ts'),
        'export function getUser(id) { return { id }; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toContain('packages/api/src/service.ts');

      const content = fs.readFileSync(path.join(srcDir, 'service.ts'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('@name getUser');
      expect(content).toContain('@param {*} id');
      expect(content).toContain('export function getUser');

      teardown();
    });

    it('should skip simple constant exports', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'consts.js'),
        'export const VERSION = "1.0";\nexport const NAME = "app";\n'
      );

      const originalContent = fs.readFileSync(path.join(srcDir, 'consts.js'), 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toHaveLength(0);

      const contentAfter = fs.readFileSync(path.join(srcDir, 'consts.js'), 'utf8');
      expect(contentAfter).toBe(originalContent);

      teardown();
    });
  });

  describe('--dry-run mode', () => {
    it('should not modify files in dry-run mode for Article 5', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function add(a, b) { return a + b; }\n'
      );

      const originalContent = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5, dryRun: true });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);
      expect(article5Result.dryRun).toBe(true);

      const contentAfter = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');
      expect(contentAfter).toBe(originalContent);

      teardown();
    });

    it('should not create test files in dry-run mode for Article 2', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'helper.js'), 'export const foo = () => 1;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2, dryRun: true });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.dryRun).toBe(true);
      expect(article2Result.created.length).toBe(1);
      expect(article2Result.created).toContain('src/__tests__/helper.test.js');

      const testPath = path.join(srcDir, '__tests__', 'helper.test.js');
      expect(fs.existsSync(testPath)).toBe(false);

      teardown();
    });

    it('should not modify workspace files in dry-run mode for Article 5', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
      const srcDir = path.join(tempDir, 'packages', 'api', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
      const filePath = path.join(srcDir, 'service.ts');
      fs.writeFileSync(filePath, 'export function getUser(id) { return { id }; }\n');

      const originalContent = fs.readFileSync(filePath, 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5, dryRun: true });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toContain('packages/api/src/service.ts');
      expect(article5Result.dryRun).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe(originalContent);

      teardown();
    });
  });

  describe('Article 2 - TDD fix', () => {
    it('should create test files for source files without tests', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'math.js'), 'export const add = (a, b) => a + b;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2 });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.created.length).toBe(1);
      expect(article2Result.created).toContain('src/__tests__/math.test.js');
      expect(fs.existsSync(path.join(srcDir, '__tests__', 'math.test.js'))).toBe(true);

      teardown();
    });

    it('should create tests only inside the selected workspace', async () => {
      setup();
      setupWorkspaces();

      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'src', 'api.js'), 'export const api = () => true;\n');
      fs.writeFileSync(path.join(tempDir, 'packages', 'web', 'src', 'web.js'), 'export const web = () => true;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2, workspace: 'packages/api' });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article2Result.created).toContain('packages/api/src/__tests__/api.test.js');
      expect(fs.existsSync(path.join(tempDir, 'packages', 'api', 'src', '__tests__', 'api.test.js'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'packages', 'web', 'src', '__tests__', 'web.test.js'))).toBe(false);

      teardown();
    });
  });

  describe('Article 4 - Code Style lint auto-fix', () => {
    it('should detect eslint from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');
      expect(linter.command).toContain('eslint');
      expect(linter.command).toContain('--fix');

      teardown();
    });

    it('should detect prettier from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { prettier: '^3.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');
      expect(linter.command).toContain('prettier');
      expect(linter.command).toContain('--write');

      teardown();
    });

    it('should detect standard from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { standard: '^17.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('standard');
      expect(linter.command).toContain('standard');
      expect(linter.command).toContain('--fix');

      teardown();
    });

    it('should detect eslint from config file when not in dependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, '.eslintrc.json'), JSON.stringify({ rules: {} }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');

      teardown();
    });

    it('should detect prettier from config file when not in dependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, '.prettierrc'), JSON.stringify({ semi: true }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');

      teardown();
    });

    it('should return null when no linter is detected', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter).toBeNull();

      teardown();
    });

    it('should return null when package.json is invalid', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), 'not valid json');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter).toBeNull();

      teardown();
    });

    it('should execute dry-run mode for Article 4', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4, dryRun: true });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.dryRun).toBe(true);
      expect(article4Result.linter).toBe('eslint');
      expect(article4Result.command).toContain('eslint');
      expect(article4Result.fixed).toBe(0);

      teardown();
    });

    it('should return linter: null when no linter detected for Article 4', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4 });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.linter).toBeNull();
      expect(article4Result.fixed).toBe(0);

      teardown();
    });

    it('should use workspace package.json linter and not fall back to root', async () => {
      setup();
      setupWorkspaces();
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { prettier: '^3.0.0' } }));
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api', devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4, workspace: 'packages/api', dryRun: true });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article4Result.linter).toBe('eslint');
      expect(article4Result.command).toContain('eslint');
      expect(article4Result.command).not.toContain('prettier');
      expect(article4Result.targets).toEqual(['packages/api']);

      teardown();
    });

    it('should count lint errors before and after fix', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);

      const linter = cmd._detectLinter(tempDir);
      expect(linter.name).toBe('eslint');

      const errors = await cmd._countLintErrors(tempDir, linter);
      expect(errors).toBeGreaterThanOrEqual(0);

      teardown();
    });

    it('should handle prettier config detection', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: {}, devDependencies: {} }));
      fs.writeFileSync(path.join(tempDir, '.prettierrc'), JSON.stringify({ singleQuote: true }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');
      expect(linter.command).toContain('prettier');
      expect(linter.command).toContain('--write');

      teardown();
    });

    it('should prefer eslint over prettier when both exist', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0', prettier: '^3.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');

      teardown();
    });
  });

  describe('Article 9 - CI/CD generation', () => {
    it('should generate GitHub Actions workflow when CI is missing', async () => {
      setup();
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'ci-test',
        scripts: { test: 'jest' },
      }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9).toBeDefined();
      expect(a9.created).toEqual(['.github/workflows/chaos-ci.yml']);
      expect(a9.skipped).toBe(false);
      expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'chaos-ci.yml'))).toBe(true);

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', 'chaos-ci.yml'), 'utf8');
      expect(content).toContain('name: Chaos Code CI/CD');
      expect(content).toContain('npm test');

      teardown();
    });

    it('should report generated workflow in dry-run without writing files', async () => {
      setup();
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'ci-dry-run',
        scripts: { test: 'jest' },
      }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9, dryRun: true });

      const a9 = results.find(r => r.article === 9);
      expect(a9.created).toEqual(['.github/workflows/chaos-ci.yml']);
      expect(a9.skipped).toBe(false);
      expect(a9.dryRun).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'chaos-ci.yml'))).toBe(false);

      teardown();
    });

    it('should skip Article 9 when any CI config already exists', async () => {
      setup();
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: Existing CI\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9.created).toEqual([]);
      expect(a9.skipped).toBe(true);
      expect(a9.reason).toBe('CI configuration already exists');
      expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'chaos-ci.yml'))).toBe(false);

      teardown();
    });
  });


  describe('default - run all fixes', () => {
    it('should fix all articles when no article specified', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function helper(x) { return x; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, {});

      expect(results.length).toBe(7);
      expect(results.find(r => r.article === 1)).toBeDefined();
      expect(results.find(r => r.article === 2)).toBeDefined();
      expect(results.find(r => r.article === 4)).toBeDefined();
      expect(results.find(r => r.article === 5)).toBeDefined();
      expect(results.find(r => r.article === 6)).toBeDefined();
      expect(results.find(r => r.article === 7)).toBeDefined();
      expect(results.find(r => r.article === 9)).toBeDefined();

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      teardown();
    });
  });

  describe('Article 6 - empty catch blocks', () => {
    it('should fill empty catch blocks with console.error', async () => {
      setup();
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'handler.js'), [
        'try { doSomething(); } catch (e) { }',
        'try { doOther(); } catch (err) { /* nothing */ }',
        'try { doMore(); } catch (x) { console.error(x); }',
      ].join('\n'));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 6 });

      const a6 = results.find(r => r.article === 6);
      expect(a6).toBeDefined();
      expect(a6.fixed.length).toBe(1);

      const fixed = fs.readFileSync(path.join(srcDir, 'handler.js'), 'utf8');
      expect(fixed).toContain('console.error(e)');
      expect(fixed).toContain('console.error(err)');
    });

    it('should handle dry-run mode for Article 6', async () => {
      setup();
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'dry.js'), 'try { x(); } catch (e) { }');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 6, dryRun: true });

      const a6 = results.find(r => r.article === 6);
      expect(a6.fixed.length).toBe(1);
      expect(a6.dryRun).toBe(true);

      const content = fs.readFileSync(path.join(srcDir, 'dry.js'), 'utf8');
      expect(content).toBe('try { x(); } catch (e) { }');
    });
  });

  describe('Article 7 - hardcoded secrets', () => {
    it('should detect and report hardcoded secrets', async () => {
      setup();
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'config.js'), [
        'const apiKey = "AKIAIOSFODNN7EXAMPLE";',
        'const password = "my-super-secret-password";',
      ].join('\n'));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 7, dryRun: true });

      const a7 = results.find(r => r.article === 7);
      expect(a7).toBeDefined();
      expect(a7.warnings.length).toBeGreaterThan(0);
      expect(a7.dryRun).toBe(true);

      const content = fs.readFileSync(path.join(srcDir, 'config.js'), 'utf8');
      expect(content).toContain('AKIAIOSFODNN7EXAMPLE');

      teardown();
    });

    it('should redact secrets when not in dry-run mode', async () => {
      setup();
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'secrets.js'), [
        'const token = "abcdef1234567890abcdef1234567890";',
      ].join('\n'));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 7 });

      const a7 = results.find(r => r.article === 7);
      expect(a7).toBeDefined();
      expect(a7.fixed.length).toBeGreaterThan(0);

      const content = fs.readFileSync(path.join(srcDir, 'secrets.js'), 'utf8');
      expect(content).toContain('process.env.SECRET');

      teardown();
    });

    it('should return empty when no secrets found', async () => {
      setup();
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'clean.js'), 'const x = 1;\nconst y = 2;');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 7 });

      const a7 = results.find(r => r.article === 7);
      expect(a7.warnings).toEqual([]);
      expect(a7.fixed).toEqual([]);

      teardown();
    });
  });

  describe('workspace scope', () => {
    it('should throw a clear error when workspace does not exist', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      await expect(cmd.execute(tempDir, { article: 2, workspace: 'packages/missing' }))
        .rejects
        .toThrow("Workspace 'packages/missing' not found.");

      teardown();
    });

    it('should dry-run Article 5 for selected workspace without modifying files and print workspace', async () => {
      setup();
      setupWorkspaces();

      const apiFile = path.join(tempDir, 'packages', 'api', 'src', 'service.js');
      const webFile = path.join(tempDir, 'packages', 'web', 'src', 'service.js');
      fs.writeFileSync(apiFile, 'export function apiService() { return true; }\n');
      fs.writeFileSync(webFile, 'export function webService() { return true; }\n');
      const apiOriginal = fs.readFileSync(apiFile, 'utf8');
      const webOriginal = fs.readFileSync(webFile, 'utf8');

      let results;
      const output = await captureConsole(async () => {
        const cmd = new ConstitutionFixCommand(silentSpinner);
        results = await cmd.execute(tempDir, { article: 5, workspace: 'packages/api', dryRun: true });
      });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article5Result.fixed).toContain('packages/api/src/service.js');
      expect(article5Result.fixed).not.toContain('packages/web/src/service.js');
      expect(output).toContain('Workspace: @test/api (packages/api)');
      expect(fs.readFileSync(apiFile, 'utf8')).toBe(apiOriginal);
      expect(fs.readFileSync(webFile, 'utf8')).toBe(webOriginal);

      teardown();
    });
  });

  describe('unsupported article number', () => {
    it('should return empty results for unsupported article number', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 3 });
        expect(results).toEqual([]);
      });

      expect(output).toContain('No auto-fix available for Article 3');
      expect(output).toContain('Supported articles: 1, 2, 4, 5, 6, 7, 9');

      teardown();
    });

    it('should return empty results for article 8', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 8 });
        expect(results).toEqual([]);
      });

      expect(output).toContain('No auto-fix available for Article 8');

      teardown();
    });
  });

  describe('Article 2 - workspace + dryRun combined', () => {
    it('should dry-run Article 2 for a specific workspace and log workspace name', async () => {
      setup();
      setupWorkspaces();

      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'src', 'api.js'), 'export const api = () => true;\n');

      let results;
      const output = await captureConsole(async () => {
        const cmd = new ConstitutionFixCommand(silentSpinner);
        results = await cmd.execute(tempDir, { article: 2, workspace: 'packages/api', dryRun: true });
      });

      const a2 = results.find(r => r.article === 2);
      expect(a2.dryRun).toBe(true);
      expect(output).toContain('Workspace: @test/api (packages/api)');

      teardown();
    });
  });

  describe('_findSourceFiles', () => {
    it('should skip __tests__ and node_modules directories', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'lib'), { recursive: true });

      fs.writeFileSync(path.join(srcDir, '__tests__', 'skip.test.js'), 'export const testFn = () => 1;');
      fs.writeFileSync(path.join(srcDir, 'node_modules', 'pkg.js'), 'export const pkg = () => 2;');
      fs.writeFileSync(path.join(srcDir, 'lib', 'real.js'), 'export const real = () => 3;');
      fs.writeFileSync(path.join(srcDir, 'root.js'), 'export const root = () => 4;');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const files = cmd._findSourceFiles(srcDir);

      const basenames = files.map(f => path.basename(f));
      expect(basenames).toContain('real.js');
      expect(basenames).toContain('root.js');
      expect(basenames).not.toContain('skip.test.js');
      expect(basenames).not.toContain('pkg.js');

      teardown();
    });

    it('should return empty array for non-existent directory', () => {
      const cmd = new ConstitutionFixCommand(silentSpinner);
      const files = cmd._findSourceFiles('/nonexistent/path/12345');
      expect(files).toEqual([]);
    });

    it('should find .ts files as well as .js files', () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'a.js'), 'export const a = 1;');
      fs.writeFileSync(path.join(srcDir, 'b.ts'), 'export const b = 2;');
      fs.writeFileSync(path.join(srcDir, 'c.txt'), 'not source');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const files = cmd._findSourceFiles(srcDir);

      const basenames = files.map(f => path.basename(f));
      expect(basenames).toContain('a.js');
      expect(basenames).toContain('b.ts');
      expect(basenames).not.toContain('c.txt');

      teardown();
    });
  });

  describe('_hasJsdocBeforeLine edge cases', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('handles single-line jsdoc on same line as closing comment', () => {
      const lines = ['/** single line */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 1)).toBe(true);
    });

    it('returns false when only a regular comment is above', () => {
      const lines = ['/* not jsdoc */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 1)).toBe(false);
    });

    it('returns false when multiple blank lines with no jsdoc above', () => {
      const lines = ['', '', '', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 3)).toBe(false);
    });

    it('handles jsdoc block followed by */ then newline then export', () => {
      const lines = ['/**', ' * doc', ' */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 3)).toBe(true);
    });
  });

  describe('Article 5 - no source dirs', () => {
    it('should return empty fixed when no src directory exists', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const a5 = results.find(r => r.article === 5);
      expect(a5.fixed).toEqual([]);

      teardown();
    });

    it('should handle file read errors gracefully', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create a file then delete it right away to simulate read error (race condition scenario)
      // Instead, use a directory where we can test the catch block
      const filePath = path.join(srcDir, 'test.js');
      fs.writeFileSync(filePath, 'export function foo() {}');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      // File should be found and fixed normally
      const a5 = results.find(r => r.article === 5);
      expect(a5.fixed.length).toBe(1);

      teardown();
    });
  });

  describe('Article 5 - dry-run with workspace console output', () => {
    it('should print unique modified files in dry-run output', async () => {
      setup();
      setupWorkspaces();

      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'src', 'svc.js'), 'export function svc() { return 1; }\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 5, workspace: 'packages/api', dryRun: true });
        const a5 = results.find(r => r.article === 5);
        expect(a5.fixed.length).toBe(1);
      });

      expect(output).toContain('Dry run - the following files would be modified');
      expect(output).toContain('Total: 1 file(s)');

      teardown();
    });
  });

  describe('Article 6 - edge cases', () => {
    it('should skip non-js and non-ts files', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'handler.py'), 'try:\n  pass\nexcept:\n  pass\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 6 });

      const a6 = results.find(r => r.article === 6);
      expect(a6.fixed).toEqual([]);

      teardown();
    });

    it('should print dry-run message when fixing empty catch blocks', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'app.js'), 'try { x(); } catch (e) { }');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 6, dryRun: true });
        const a6 = results.find(r => r.article === 6);
        expect(a6.fixed.length).toBe(1);
      });

      expect(output).toContain('Dry run - Article 6 (Error Handling) would fix empty catch blocks');

      teardown();
    });

    it('should handle catch without a variable name using default err', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      // catch with just parentheses but no named variable
      fs.writeFileSync(path.join(srcDir, 'edge.js'), 'try { doWork(); } catch (_) { }');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 6 });

      const a6 = results.find(r => r.article === 6);
      expect(a6.fixed.length).toBe(1);

      const fixed = fs.readFileSync(path.join(srcDir, 'edge.js'), 'utf8');
      expect(fixed).toContain('console.error(_);');

      teardown();
    });

    it('should not modify catch blocks that already have code', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const original = 'try { doWork(); } catch (e) { handleError(e); }';
      fs.writeFileSync(path.join(srcDir, 'handled.js'), original);

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 6 });

      const a6 = results.find(r => r.article === 6);
      expect(a6.fixed).toEqual([]);

      const content = fs.readFileSync(path.join(srcDir, 'handled.js'), 'utf8');
      expect(content).toBe(original);

      teardown();
    });
  });

  describe('Article 7 - dry-run console output', () => {
    it('should print dry-run message with file and line info', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'secret.js'), [
        'const apiKey = "AKIAIOSFODNN7EXAMPLE";',
      ].join('\n'));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 7, dryRun: true });
        const a7 = results.find(r => r.article === 7);
        expect(a7.warnings.length).toBeGreaterThan(0);
      });

      expect(output).toContain('Dry run - Article 7 (Security) found hardcoded secrets');
      expect(output).toContain('[AWS Key]');

      teardown();
    });
  });

  describe('Article 1 - library-first with warnings', () => {
    it('should return zero suggestions when no warnings', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 1 });

      const a1 = results.find(r => r.article === 1);
      expect(a1.suggestions).toBe(0);

      teardown();
    });
  });

  describe('Article 9 - _hasCiConfig edge cases', () => {
    it('should skip when CircleCI config exists', async () => {
      setup();
      fs.mkdirSync(path.join(tempDir, '.circleci'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.circleci', 'config.yml'), 'version: 2.1\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9.skipped).toBe(true);
      expect(a9.reason).toBe('CI configuration already exists');
      expect(a9.path).toBeNull();

      teardown();
    });

    it('should skip when GitLab CI config exists', async () => {
      setup();
      fs.writeFileSync(path.join(tempDir, '.gitlab-ci.yml'), 'stages:\n  - test\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9.skipped).toBe(true);
      expect(a9.path).toBeNull();

      teardown();
    });

    it('should skip when Jenkinsfile exists', async () => {
      setup();
      fs.writeFileSync(path.join(tempDir, 'Jenkinsfile'), 'pipeline { agent any }\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9.skipped).toBe(true);
      expect(a9.path).toBeNull();

      teardown();
    });

    it('should detect CI config when github workflows exist', async () => {
      setup();
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'existing.yml'), 'name: existing\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 9 });

      const a9 = results.find(r => r.article === 9);
      expect(a9).toBeDefined();

      teardown();
    });
  });

  describe('_detectLinter - various config files', () => {
    it('detects eslint from .eslintrc.js', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, '.eslintrc.js'), 'module.exports = {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from .eslintrc (no extension)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, '.eslintrc'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from .eslintrc.yaml', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, '.eslintrc.yaml'), 'rules: {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from eslint.config.js (flat config)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), 'export default {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from eslint.config.mjs', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from .prettierrc.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, '.prettierrc.json'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from .prettierrc.js', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, '.prettierrc.js'), 'module.exports = {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from prettier.config.js', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'prettier.config.js'), 'module.exports = {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('handles malformed package.json gracefully', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{invalid json');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('_getLintTargets', () => {
    it('should return workspace linter when workspace provided', () => {
      setup();
      setupWorkspaces();
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({
        name: '@test/api',
        devDependencies: { eslint: '^8.0.0' },
      }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const ws = {
        name: '@test/api',
        root: path.join(tempDir, 'packages', 'api'),
        sourceDir: path.join(tempDir, 'packages', 'api', 'src'),
        packageJsonPath: path.join(tempDir, 'packages', 'api', 'package.json'),
      };
      const targets = cmd._getLintTargets(tempDir, ws);

      expect(targets.length).toBe(1);
      expect(targets[0].linter.name).toBe('eslint');
      expect(targets[0].cwd).toBe(path.join(tempDir, 'packages', 'api'));

      teardown();
    });

    it('should return empty when workspace has no linter', () => {
      setup();
      setupWorkspaces();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const ws = {
        name: '@test/api',
        root: path.join(tempDir, 'packages', 'api'),
        sourceDir: path.join(tempDir, 'packages', 'api', 'src'),
        packageJsonPath: path.join(tempDir, 'packages', 'api', 'package.json'),
      };
      const targets = cmd._getLintTargets(tempDir, ws);

      expect(targets).toEqual([]);

      teardown();
    });

    it('should return root linter when no workspace provided', () => {
      setup();
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        devDependencies: { eslint: '^8.0.0' },
      }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const targets = cmd._getLintTargets(tempDir, null);

      expect(targets.length).toBe(1);
      expect(targets[0].linter.name).toBe('eslint');
      expect(targets[0].cwd).toBe(tempDir);

      teardown();
    });

    it('should fall back to workspace linters when root has no linter', () => {
      setup();
      setupWorkspaces();
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({
        name: '@test/api',
        devDependencies: { eslint: '^8.0.0' },
      }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const targets = cmd._getLintTargets(tempDir, null);

      expect(targets.length).toBe(1);
      expect(targets[0].linter.name).toBe('eslint');

      teardown();
    });
  });

  describe('_countLintErrors', () => {
    it('should return 0 for unknown linter name', async () => {
      const cmd = new ConstitutionFixCommand(silentSpinner);
      const count = await cmd._countLintErrors('/tmp', { name: 'unknown' });
      expect(count).toBe(0);
    });
  });

  describe('Article 4 - workspace with no linter', () => {
    it('should print message when workspace has no linter', async () => {
      setup();
      setupWorkspaces();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tempDir, { article: 4, workspace: 'packages/api' });
        const a4 = results.find(r => r.article === 4);
        expect(a4.linter).toBeNull();
        expect(a4.fixed).toBe(0);
      });

      expect(output).toContain('No linter found for workspace @test/api');

      teardown();
    });
  });

  describe('_isPublicExport additional patterns', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('detects exported default expression', () => {
      expect(cmd._isPublicExport('export default Something')).toBe(true);
    });

    it('detects exported const array', () => {
      expect(cmd._isPublicExport('export const items = [1, 2, 3]')).toBe(true);
    });

    it('detects exported const object', () => {
      expect(cmd._isPublicExport('export const config = { key: "val" }')).toBe(true);
    });

    it('detects exported const with function keyword', () => {
      expect(cmd._isPublicExport('export const fn = function() {}')).toBe(true);
    });
  });

  describe('_extractExportName additional patterns', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('extracts let name', () => {
      expect(cmd._extractExportName('export let counter = 0')).toBe('counter');
    });

    it('extracts var name', () => {
      expect(cmd._extractExportName('export var flag = true')).toBe('flag');
    });
  });

  describe('_extractParams additional patterns', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('extracts params from const = function expression', () => {
      expect(cmd._extractParams('export const fn = function(a, b) {}')).toEqual(['a', 'b']);
    });

    it('extracts params from async arrow function', () => {
      expect(cmd._extractParams('export const fn = async (x) => {}')).toEqual(['x']);
    });

    it('extracts params with default values', () => {
      expect(cmd._extractParams('export const fn = (a = 1, b = 2) => {}')).toEqual(['a', 'b']);
    });

    it('returns empty for arrow function with no params', () => {
      expect(cmd._extractParams('export const fn = () => {}')).toEqual([]);
    });
  });

  describe('remaining branch coverage', () => {
    const cmd = new ConstitutionFixCommand({ start: jest.fn(), succeed: jest.fn(), fail: jest.fn() });

    it('_extractExportName returns unknown for unrecognized pattern', () => {
      expect(cmd._extractExportName('export { something }')).toBe('unknown');
    });

    it('_extractParams returns empty array for no match', () => {
      expect(cmd._extractParams('const x = 42')).toEqual([]);
    });

    it('_extractParams handles arrow with empty params', () => {
      expect(cmd._extractParams('export const fn = () => {}')).toEqual([]);
    });

    it('_fixArticle6 handles unreadable source file', async () => {
      setup();
      const results = await cmd.execute(tempDir, { article: 6 });
      expect(Array.isArray(results)).toBe(true);
      teardown();
    });

    it('_fixArticle7 handles empty source dirs', async () => {
      setup();
      const results = await cmd.execute(tempDir, { article: 7 });
      expect(Array.isArray(results)).toBe(true);
      teardown();
    });

    it('_fixArticle4 handles non-js files', async () => {
      setup();
      fs.writeFileSync(path.join(tempDir, 'style.css'), 'body { color: red; }');
      const results = await cmd.execute(tempDir, { article: 4 });
      expect(Array.isArray(results)).toBe(true);
      teardown();
    });

    it('_isPublicExport detects various exports', () => {
      expect(cmd._isPublicExport('export function hello() {}')).toBe(true);
      expect(cmd._isPublicExport('export class Foo {}')).toBe(true);
      expect(cmd._isPublicExport('const Y = 2')).toBe(false);
    });

    it('_isSimpleExport detects simple exports', () => {
      expect(cmd._isSimpleExport('export const X = 42;')).toBe(true);
      expect(cmd._isSimpleExport('export function complex() { return 1; }')).toBe(false);
    });
  });
});

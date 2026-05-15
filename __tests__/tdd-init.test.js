const fs = require('fs');
const path = require('path');
const os = require('os');
const { TddInitCommand } = require('../src/cli/commands/tdd-init');

describe('TddInitCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-tdd-init-'));
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

  it('should create test files for source files without tests', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'a.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, 'b.js'), 'module.exports = {};\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created.length).toBe(2);
    expect(result.created).toContain('src/__tests__/a.test.js');
    expect(result.created).toContain('src/__tests__/b.test.js');
    expect(fs.existsSync(path.join(srcDir, '__tests__', 'a.test.js'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, '__tests__', 'b.test.js'))).toBe(true);

    teardown();
  });

  it('should create test files for workspace source files', async () => {
    setup();

    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    const srcDir = path.join(tempDir, 'packages', 'api', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
    fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const handler = () => true;\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('packages/api/src/__tests__/index.test.ts');
    expect(fs.existsSync(path.join(srcDir, '__tests__', 'index.test.ts'))).toBe(true);

    teardown();
  });

  it('should only scan the explicit source dir when sourceDir is provided', async () => {
    setup();

    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    const rootSrc = path.join(tempDir, 'src');
    const workspaceSrc = path.join(tempDir, 'packages', 'api', 'src');
    fs.mkdirSync(rootSrc, { recursive: true });
    fs.mkdirSync(workspaceSrc, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
    fs.writeFileSync(path.join(rootSrc, 'root.ts'), 'export const root = () => true;\n');
    fs.writeFileSync(path.join(workspaceSrc, 'index.ts'), 'export const handler = () => true;\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir, { sourceDir: 'src' });

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('src/__tests__/root.test.ts');
    expect(result.created).not.toContain('packages/api/src/__tests__/index.test.ts');
    expect(fs.existsSync(path.join(workspaceSrc, '__tests__', 'index.test.ts'))).toBe(false);

    teardown();
  });

  it('should not overwrite existing test files', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'c.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, '__tests__', 'c.test.js'), '// existing test\n');

    const contentBefore = fs.readFileSync(path.join(srcDir, '__tests__', 'c.test.js'), 'utf8');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(0);
    const contentAfter = fs.readFileSync(path.join(srcDir, '__tests__', 'c.test.js'), 'utf8');
    expect(contentAfter).toBe(contentBefore);

    teardown();
  });

  it('should support --dry-run mode', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'x.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, 'y.js'), 'module.exports = {};\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.created.length).toBe(2);
    expect(result.created).toContain('src/__tests__/x.test.js');
    expect(result.created).toContain('src/__tests__/y.test.js');

    expect(fs.existsSync(path.join(srcDir, '__tests__', 'x.test.js'))).toBe(false);
    expect(fs.existsSync(path.join(srcDir, '__tests__', 'y.test.js'))).toBe(false);

    teardown();
  });

  it('should handle TS source files', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'util.ts'), 'export const fn = () => 1;\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('src/__tests__/util.test.ts');
    expect(fs.existsSync(path.join(srcDir, '__tests__', 'util.test.ts'))).toBe(true);

    teardown();
  });

  it('should handle Python source files with pytest', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'pytest.ini'), '[pytest]\n');
    fs.writeFileSync(path.join(srcDir, 'calculator.py'), 'def add(a, b): return a + b\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('src/__tests__/test_calculator.py');

    const testContent = fs.readFileSync(path.join(srcDir, '__tests__', 'test_calculator.py'), 'utf8');
    expect(testContent).toContain('def test_calculator');

    teardown();
  });

  it('should handle Python source files with unittest (default)', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'helper.py'), 'def help(): pass\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('src/__tests__/test_helper.py');

    const testContent = fs.readFileSync(path.join(srcDir, '__tests__', 'test_helper.py'), 'utf8');
    expect(testContent).toContain('class TestHelper');
    expect(testContent).toContain('unittest.TestCase');

    teardown();
  });

  it('should handle mixed JS and Python source files', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, 'utils.py'), 'def util(): pass\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(2);
    expect(result.created).toContain('src/__tests__/app.test.js');
    expect(result.created).toContain('src/__tests__/test_utils.py');

    teardown();
  });

  it('should handle nested directories', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(path.join(srcDir, 'services'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'services', 'auth.js'), 'module.exports = {};\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(1);
    expect(result.created).toContain('src/services/__tests__/auth.test.js');
    expect(fs.existsSync(path.join(srcDir, 'services', '__tests__', 'auth.test.js'))).toBe(true);

    teardown();
  });

  it('should detect existing .spec test files as already covered', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'math.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, 'math.spec.js'), 'test("math", () => {});\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(0);

    teardown();
  });

  it('should return empty array when no source files exist', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(0);

    teardown();
  });

  it('should skip __tests__ and node_modules directories', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'node_modules'), { recursive: true });

    const existingTest = path.join(srcDir, '__tests__', 'orphan.test.js');
    const existingFile = 'console.log("orphan");\n';
    fs.writeFileSync(existingTest, existingFile);

    const nodeFile = path.join(srcDir, 'node_modules', 'pkg.js');
    fs.writeFileSync(nodeFile, 'module.exports = {};\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toHaveLength(0);

    teardown();
  });

  it('should detect pytest from requirements.txt', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0\npytest==7.0\n');
    fs.writeFileSync(path.join(srcDir, 'app.py'), 'def run(): pass\n');

    const cmd = new TddInitCommand(silentSpinner);
    const result = await cmd.execute(tempDir);

    expect(result.created).toContain('src/__tests__/test_app.py');
    const testContent = fs.readFileSync(path.join(srcDir, '__tests__', 'test_app.py'), 'utf8');
    expect(testContent).toContain('def test_app');

    teardown();
  });

  it('should detect pytest from pyproject.toml', async () => {
    setup();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'pyproject.toml'),
      '[tool.pytest.ini_options]\nminversion = "6.0"\n'
    );
    fs.writeFileSync(path.join(srcDir, 'core.py'), 'def core(): pass\n');

    const cmd = new TddInitCommand(silentSpinner);
    await cmd.execute(tempDir);

    const testContent = fs.readFileSync(path.join(srcDir, '__tests__', 'test_core.py'), 'utf8');
    expect(testContent).toContain('def test_core');

    teardown();
  });
});

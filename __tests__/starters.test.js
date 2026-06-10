const fs = require('fs');
const path = require('path');
const os = require('os');
const { StartersCommand } = require('../src/cli/commands/starters');

describe('StartersCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempDir(prefix = 'stdd-starters-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('list()', () => {
    it('should return available starter types', async () => {
      const cmd = new StartersCommand(silentSpinner);
      const types = await cmd.list();

      expect(types.length).toBeGreaterThan(0);
      expect(types.map(t => t.name)).toContain('javascript');
      expect(types.map(t => t.name)).toContain('python');
      expect(types.map(t => t.name)).toContain('typescript');
      expect(types.map(t => t.name)).toContain('go');
      expect(types.map(t => t.name)).toContain('rust');
    });

    it('should indicate which types have starter.md', async () => {
      const cmd = new StartersCommand(silentSpinner);
      const types = await cmd.list();

      for (const t of types) {
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('hasStarterMd');
      }
    });

    it('should exclude non-directory entries', async () => {
      const cmd = new StartersCommand(silentSpinner);
      const types = await cmd.list();

      const names = types.map(t => t.name);
      expect(names).not.toContain('README.md');
    });
  });

  describe('execute()', () => {
    it('should delegate to printList when subcommand is "list"', async () => {
      const cmd = new StartersCommand(silentSpinner);
      await cmd.execute('list');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available Chaos Code Starters')
      );
    });

    it('should delegate to printList when subcommand is undefined', async () => {
      const cmd = new StartersCommand(silentSpinner);
      await cmd.execute(undefined);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available Chaos Code Starters')
      );
    });

    it('should delegate to printList for unknown subcommand', async () => {
      const cmd = new StartersCommand(silentSpinner);
      await cmd.execute('unknown');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available Chaos Code Starters')
      );
    });

    it('should use default type when options has no type', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'default-type-test');
      const cmd = new StartersCommand(silentSpinner);

      // 'default' type should throw because no such template exists
      await expect(cmd.execute('create', projectName, { stdd: false })).rejects.toThrow(
        /Template 'default' not found/
      );
    });

    it('should use args[1].type when options.type is not set', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'args-type-test');
      const cmd = new StartersCommand(silentSpinner);

      // Pass options as second arg in args spread
      await cmd.execute('create', projectName, { type: 'javascript', stdd: false });

      expect(fs.existsSync(path.join(projectName, 'package.json'))).toBe(true);
    });

    it('should use default spinner when none provided', async () => {
      const cmd = new StartersCommand(undefined);
      const types = await cmd.list();
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('printList()', () => {
    it('should print a formatted list header', async () => {
      const cmd = new StartersCommand(silentSpinner);
      await cmd.printList();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available Chaos Code Starters')
      );
    });
  });

  describe('create()', () => {
    it('should create a project from the javascript template', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'js-starter-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'javascript', { stdd: false });

      expect(fs.existsSync(path.join(targetPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'jest.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'src', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, '__tests__', 'index.test.js'))).toBe(true);
    });

    it('should replace {{name}} template placeholder with project name', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'my-awesome-app');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'javascript', { stdd: false });

      const packageJson = JSON.parse(fs.readFileSync(path.join(targetPath, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('my-awesome-app');

      const readme = fs.readFileSync(path.join(targetPath, 'README.md'), 'utf-8');
      expect(readme).toContain('my-awesome-app');
    });

    it('should create a project from the python template', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'py-starter-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'python', { stdd: false });

      expect(fs.existsSync(path.join(targetPath, 'pyproject.toml'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'src', '__init__.py'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'src', 'greeter.py'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'tests', 'test_greeter.py'))).toBe(true);
    });

    it('should create a project from the typescript template', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'ts-starter-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'typescript', { stdd: false });

      expect(fs.existsSync(path.join(targetPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'src', 'index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, '__tests__', 'index.test.ts'))).toBe(true);
    });

    it('should create a project from the go template', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'go-starter-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'go', { stdd: false });

      expect(fs.existsSync(path.join(targetPath, 'go.mod'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'main.go'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'main_test.go'))).toBe(true);
    });

    it('should create a project from the rust template', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'rust-starter-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'rust', { stdd: false });

      expect(fs.existsSync(path.join(targetPath, 'Cargo.toml'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'src', 'main.rs'))).toBe(true);
    });

    it('should throw an error for unknown template type', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'unknown-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await expect(cmd.create(projectName, 'unknown-type')).rejects.toThrow(
        /Template 'unknown-type' not found/
      );

      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it('should throw an error if target directory already exists', async () => {
      const targetRoot = createTempDir();
      const projectAbsPath = path.join(targetRoot, 'existing-project');
      fs.mkdirSync(projectAbsPath, { recursive: true });

      const cmd = new StartersCommand(silentSpinner);
      await expect(cmd.create(projectAbsPath, 'javascript')).rejects.toThrow(
        /already exists/
      );
    });

    it('should create STDD structure when stdd option is true (default)', async () => {
      const targetRoot = createTempDir();
      const projectName = path.join(targetRoot, 'stdd-integrated-test');
      const targetPath = projectName;

      const cmd = new StartersCommand(silentSpinner);
      await cmd.create(projectName, 'javascript', { stdd: true });

      expect(fs.existsSync(path.join(targetPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'stdd'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'specs'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'changes'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'config.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'memory', 'foundation.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'AGENTS.md'))).toBe(true);
    });

    it('should copy starter.md files to template directories', async () => {
      const cmd = new StartersCommand(silentSpinner);
      const types = await cmd.list();

      for (const t of types) {
        expect(t.hasStarterMd).toBe(true);
      }
    });
  });
});

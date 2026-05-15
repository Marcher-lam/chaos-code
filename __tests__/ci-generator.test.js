const fs = require('fs');
const path = require('path');
const os = require('os');
const { CiGeneratorCommand, CI_FILE_NAME } = require('../src/cli/commands/ci-generator');

describe('CiGeneratorCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ci-generator-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  afterAll(() => {
    teardown();
  });

  describe('execute', () => {
    it('creates .github/workflows/stdd-ci.yml for GitHub platform', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      const result = await cmd.execute('github');

      expect(result.platform).toBe('github');
      expect(result.path).toContain('.github/workflows/stdd-ci.yml');
      expect(fs.existsSync(result.path)).toBe(true);

      const content = fs.readFileSync(result.path, 'utf-8');
      expect(content).toContain('name: STDD CI/CD');

      teardown();
    });

    it('defaults to github when platform not specified', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      const result = await cmd.execute(undefined);

      expect(result.platform).toBe('github');

      teardown();
    });

    it('throws error for unsupported platforms', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);

      await expect(cmd.execute('gitlab')).rejects.toThrow('Unsupported platform: gitlab');

      teardown();
    });

    it('throws error when CI file already exists without --force', async () => {
      setup();

      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, CI_FILE_NAME), 'existing: content\n');

      const cmd = new CiGeneratorCommand(tempDir);

      await expect(cmd.execute('github')).rejects.toThrow('Use --force to overwrite');

      teardown();
    });

    it('overwrites CI file when --force is set', async () => {
      setup();

      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, CI_FILE_NAME), 'existing: content\n');

      const cmd = new CiGeneratorCommand(tempDir);
      const result = await cmd.execute('github', { force: true });

      expect(fs.existsSync(result.path)).toBe(true);
      const content = fs.readFileSync(result.path, 'utf-8');
      expect(content).toContain('name: STDD CI/CD');
      expect(content).not.toContain('existing: content');

      teardown();
    });
  });

  describe('GitHub Actions YAML content', () => {
    it('contains push trigger on main branch', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('push');
      expect(content).toContain('branches: [main]');

      teardown();
    });

    it('contains pull_request trigger on main branch', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('pull_request');
      expect(content).toContain('branches: [main]');

      teardown();
    });

    it('contains Checkout step', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('Checkout');
      expect(content).toContain('actions/checkout@v4');

      teardown();
    });

    it('contains Setup Node step', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('Setup Node.js');
      expect(content).toContain('actions/setup-node@v4');

      teardown();
    });

    it('contains STDD Guard step', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('STDD Guard');
      expect(content).toContain('stdd guard');

      teardown();
    });

    it('contains Run Tests step', async () => {
      setup();

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');
      expect(content).toContain('Run Tests');
      expect(content).toContain('npm test');

      teardown();
    });
  });

  describe('Node.js project detection', () => {
    it('generates node-specific config when package.json exists', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        scripts: { test: 'jest' },
      }));

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('Setup Node.js');
      expect(content).toContain('npm ci');
      expect(content).toContain('npx stdd guard --no-lint');
      expect(content).toContain('npm test');

      teardown();
    });

    it('generates pnpm workspace test steps when root has no test script', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'workspace-root',
        private: true,
      }));
      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(tempDir, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({
        name: '@test/api',
        scripts: { test: 'jest' },
      }));

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('pnpm/action-setup@v4');
      expect(content).toContain("cache: 'pnpm'");
      expect(content).toContain('pnpm install --frozen-lockfile');
      expect(content).toContain('npx stdd guard --no-lint');
      expect(content).toContain('Run Tests - @test/api (packages/api)');
      expect(content).toContain('cd "packages/api" && pnpm test');

      teardown();
    });

    it('uses npm ci for npm workspace roots with package-lock.json', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'workspace-root',
        private: true,
        workspaces: ['packages/*'],
      }));
      fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify({
        name: 'workspace-root',
        lockfileVersion: 3,
      }));
      fs.mkdirSync(path.join(tempDir, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({
        name: '@test/api',
        scripts: { test: 'jest' },
      }));

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain("cache: 'npm'");
      expect(content).toContain('npm ci');
      expect(content).toContain('Run Tests - @test/api (packages/api)');
      expect(content).toContain('cd "packages/api" && npm test');

      teardown();
    });

    it('prefers root test script and does not duplicate workspace tests', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'workspace-root',
        private: true,
        workspaces: ['packages/*'],
        scripts: { test: 'jest' },
      }));
      fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify({
        name: 'workspace-root',
        lockfileVersion: 3,
      }));
      fs.mkdirSync(path.join(tempDir, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({
        name: '@test/api',
        scripts: { test: 'jest' },
      }));

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('Run Tests - workspace-root');
      expect(content).toContain('run: npm test');
      expect(content).not.toContain('cd "packages/api" && npm test');
      expect(content).not.toContain('Run Tests - @test/api (packages/api)');

      teardown();
    });

    it('keeps single-project npm CI behavior', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'single-project',
        scripts: { test: 'jest' },
      }));

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain("cache: 'npm'");
      expect(content).toContain('npm ci');
      expect(content).toContain('Run Tests - single-project');
      expect(content).toContain('run: npm test');
      expect(content).not.toContain('pnpm/action-setup@v4');
      expect(content).not.toContain('cd "packages/');

      teardown();
    });
  });

  describe('Python project detection', () => {
    it('generates python-specific config when requirements.txt exists', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0\npytest==7.0\n');

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('Setup Python');
      expect(content).toContain('actions/setup-python@v5');
      expect(content).toContain('pip install -r requirements.txt');

      teardown();
    });

    it('uses pytest command for Python projects with pytest', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest==7.0\n');

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('pytest');

      teardown();
    });
  });

  describe('Go project detection', () => {
    it('generates go-specific config when go.mod exists', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/test\n');

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('Setup Go');
      expect(content).toContain('actions/setup-go@v5');
      expect(content).toContain('go mod download');
      expect(content).toContain('go test ./...');

      teardown();
    });
  });

  describe('Rust project detection', () => {
    it('generates rust-specific config when Cargo.toml exists', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"\n');

      const cmd = new CiGeneratorCommand(tempDir);
      await cmd.execute('github');

      const content = fs.readFileSync(path.join(tempDir, '.github', 'workflows', CI_FILE_NAME), 'utf-8');

      expect(content).toContain('Setup Rust');
      expect(content).toContain('rust-toolchain');
      expect(content).toContain('cargo build --all-targets');
      expect(content).toContain('cargo test');

      teardown();
    });
  });

  describe('constructor API', () => {
    it('accepts cwd option', () => {
      const cmd = new CiGeneratorCommand('/tmp');
      expect(cmd.cwd).toBe('/tmp');
    });

    it('defaults cwd to process.cwd()', () => {
      const cmd = new CiGeneratorCommand();
      expect(cmd.cwd).toBe(process.cwd());
    });
  });
});

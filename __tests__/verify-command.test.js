const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('verify CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-test-'));
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo'), { recursive: true });

    const tasksContent = options.tasksContent || `- [x] TASK-001 Write tests\n- [x] TASK-002 Implement feature`;
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo', 'tasks.md'),
      tasksContent
    );

    if (options.packageJson) {
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(options.packageJson)
      );
    }

    if (options.ciConfig !== false) {
      fs.mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: CI\non: push\n');
    }

    return projectPath;
  }

  function writeWorkspacePackage(projectPath, workspacePath, packageJson) {
    const workspaceDir = path.join(projectPath, workspacePath);
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(path.join(workspaceDir, 'package.json'), JSON.stringify(packageJson));
    return workspaceDir;
  }

  it('verifies all tasks completed, passes tests', () => {
    const projectPath = createTempProject('pass-project', {
      packageJson: { scripts: { test: 'echo ok' } },
    });

    const result = runCli(['verify', 'demo', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('Verifying');
    expect(result.stdout).toContain('Tasks:       PASS  (2/2)');
    expect(result.stdout).toContain('Tests:       PASS');
    expect(result.stdout).toContain('Constitution: PASS');
    expect(result.stdout).toContain('Verification passed');
    expect(result.status).toBe(0);
  });

  it('fails when tasks are incomplete', () => {
    const projectPath = createTempProject('incomplete-project', {
      tasksContent: `- [x] TASK-001 Write tests\n- [ ] TASK-002 Implement feature`,
    });

    const result = runCli(['verify', 'demo'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Tasks:       FAIL');
    expect(result.stdout).toContain('TASK-002');
    expect(result.stdout).toContain('Verification failed');
  });

  it('skips tests when no test command configured', () => {
    const projectPath = createTempProject('no-test-cmd-project');

    const result = runCli(['verify', 'demo'], projectPath);

    expect(result.stdout).toContain('Tests:       SKIP');
    expect(result.stdout).toContain('Verification passed');
    expect(result.status).toBe(0);
  });

  it('fails when tests fail', () => {
    const projectPath = createTempProject('fail-test-project', {
      packageJson: { scripts: { test: 'echo nope' } },
    });

    const result = runCli(['verify', 'demo', '--test-command', 'false'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Tests:       FAIL');
    expect(result.stdout).toContain('Verification failed');
  });

  it('runs workspace test when root package has no test script', () => {
    const projectPath = createTempProject('workspace-pass-project', {
      packageJson: { private: true, workspaces: ['packages/*'] },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'test-ran.txt\', process.cwd())"' },
    });

    const result = runCli(['verify', 'demo', '--no-constitution'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('@demo/api');
    expect(result.stdout).toContain('Tests:       PASS');
    expect(fs.readFileSync(path.join(projectPath, 'packages', 'api', 'test-ran.txt'), 'utf-8'))
      .toBe(fs.realpathSync(path.join(projectPath, 'packages', 'api')));
  });

  it('saves workspace metadata in verify evidence when --workspace is used', () => {
    const projectPath = createTempProject('workspace-evidence-project', {
      packageJson: { private: true, workspaces: ['packages/*'] },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'api-ran.txt\', process.cwd())"' },
    });
    writeWorkspacePackage(projectPath, 'packages/web', {
      name: '@demo/web',
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'web-ran.txt\', process.cwd())"' },
    });

    const result = runCli(['verify', 'demo', '--workspace', 'packages/api', '--no-constitution'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'api-ran.txt'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'web', 'web-ran.txt'))).toBe(false);

    const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'evidence');
    const evidenceFile = fs.readdirSync(evidenceDir).find(f => f.startsWith('verify-'));
    const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFile), 'utf-8'));
    expect(evidenceContent.metadata.workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
    }));
    expect(evidenceContent.results.workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
    }));
    expect(evidenceContent.results.tests.workspaces[0].workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
    }));
  });

  it('fails when one workspace test fails', () => {
    const projectPath = createTempProject('workspace-fail-project', {
      packageJson: { private: true, workspaces: ['packages/*'] },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "process.exit(0)"' },
    });
    writeWorkspacePackage(projectPath, 'packages/web', {
      name: '@demo/web',
      scripts: { test: 'node -e "process.exit(1)"' },
    });

    const result = runCli(['verify', 'demo', '--no-constitution'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('@demo/api');
    expect(result.stdout).toContain('@demo/web');
    expect(result.stdout).toContain('Tests:       FAIL');
    expect(result.stdout).toContain('Verification failed');
  });

  it('prefers root test script over workspace tests', () => {
    const projectPath = createTempProject('root-priority-project', {
      packageJson: {
        private: true,
        workspaces: ['packages/*'],
        scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'root-ran.txt\', process.cwd())"' },
      },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'workspace-ran.txt\', process.cwd())"' },
    });

    const result = runCli(['verify', 'demo', '--no-constitution'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'root-ran.txt'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'workspace-ran.txt'))).toBe(false);
  });

  it('auto-detects first active change when none specified', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-auto-'));
    const projectPath = path.join(root, 'auto-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'alpha', 'tasks.md'),
      '- [x] TASK-A Done\n'
    );
    fs.mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

    const result = runCli(['verify'], projectPath);

    expect(result.stdout).toContain('Verifying alpha');
    expect(result.status).toBe(0);
  });

  it('errors when no active changes exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-nochange-'));
    const projectPath = path.join(root, 'no-change');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

    const result = runCli(['verify'], projectPath);

    expect(result.stderr).toContain('No active changes found');
    expect(result.status).toBe(1);
  });

  it('errors when STDD is not initialized', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-nostdd-'));
    const projectPath = path.join(root, 'no-stdd');
    fs.mkdirSync(projectPath, { recursive: true });

    const result = runCli(['verify'], projectPath);

    expect(result.stderr).toContain('STDD not initialized');
    expect(result.status).toBe(1);
  });

  it('runs lint when --lint flag is passed', () => {
    const projectPath = createTempProject('lint-project', {
      packageJson: { scripts: { test: 'echo ok', lint: 'echo lint ok' } },
    });

    const result = runCli(['verify', 'demo', '--test-command', 'true', '--lint'], projectPath);

    expect(result.stdout).toContain('Lint:');
    expect(result.stdout).toContain('PASS');
    expect(result.status).toBe(0);
  });

  it('lint failure makes verification fail', () => {
    const projectPath = createTempProject('lint-fail-project', {
      packageJson: { scripts: { test: 'echo ok', lint: 'exit 1' } },
    });

    const result = runCli(['verify', 'demo', '--test-command', 'true', '--lint-command', 'npm run lint'], projectPath);

    expect(result.stdout).toContain('Lint:');
    expect(result.stdout).toContain('FAIL');
    expect(result.status).toBe(1);
  });

  it('fails when tests pass but TDD constitution is violated (missing test file)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-tdd-'));
    const projectPath = path.join(root, 'tdd-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    // Create a source file WITHOUT a corresponding test file
    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');

    const result = runCli(['verify', 'demo', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('Constitution:');
    expect(result.stdout).toContain('FAIL');
    expect(result.stdout).toContain('Article 2 (TDD)');
    expect(result.stdout).toContain('Verification failed');
    expect(result.status).not.toBe(0);
  });

  it('fails when tests pass but Security constitution is violated (hardcoded secret)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-sec-'));
    const projectPath = path.join(root, 'sec-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    // Create a source file WITH a test (TDD passes) but with hardcoded secret
    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'config.js'),
      "const password = 'mysecret123';\nmodule.exports = {};\n"
    );
    fs.writeFileSync(
      path.join(srcDir, '__tests__', 'config.test.js'),
      'test("config ok", () => {});\n'
    );

    const result = runCli(['verify', 'demo', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('Constitution:');
    expect(result.stdout).toContain('FAIL');
    expect(result.stdout).toContain('Article 7 (Security)');
    expect(result.stdout).toContain('Verification failed');
    expect(result.status).not.toBe(0);
  });

  it('succeeds when tests pass and constitution is clean', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-clean-'));
    const projectPath = path.join(root, 'clean-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    // Create CI config
    fs.mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

    // Create a source file WITH a test (TDD passes) and no secrets
    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'utils.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => {});\n');

    const result = runCli(['verify', 'demo', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('Constitution:');
    expect(result.stdout).toContain('PASS');
    expect(result.stdout).toContain('Verification passed');
    expect(result.status).toBe(0);
  });

  it('skips constitution check when --no-constitution flag is passed', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-noconst-'));
    const projectPath = path.join(root, 'noconst-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    // Create a source file WITHOUT a test (TDD would fail)
    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');

    const result = runCli(['verify', 'demo', '--test-command', 'true', '--no-constitution'], projectPath);

    expect(result.stdout).toContain('Constitution: skipped');
    expect(result.stdout).toContain('Verification passed');
    expect(result.status).toBe(0);
  });

  it('saves evidence file to change directory on verify completion', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-evidence-'));
    const projectPath = path.join(root, 'evidence-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );
    fs.mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'utils.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(srcDir, '__tests__', 'utils.test.js'), 'test("ok", () => {});\n');

    const result = runCli(['verify', 'demo', '--test-command', 'true'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Evidence saved to');

    const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'evidence');
    expect(fs.existsSync(evidenceDir)).toBe(true);

    const files = fs.readdirSync(evidenceDir);
    const evidenceFiles = files.filter(f => f.startsWith('verify-') && f.endsWith('.json'));
    expect(evidenceFiles.length).toBeGreaterThan(0);

    const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFiles[0]), 'utf-8'));
    expect(evidenceContent).toHaveProperty('type', 'verify');
    expect(evidenceContent).toHaveProperty('status');
    expect(evidenceContent).toHaveProperty('results');
    expect(evidenceContent).toHaveProperty('metadata');
    expect(evidenceContent.metadata).toHaveProperty('changeName', 'demo');
    expect(evidenceContent.metadata).toHaveProperty('os');
    expect(evidenceContent.metadata).toHaveProperty('nodeVersion');
    expect(evidenceContent.results).toHaveProperty('tasks');
    expect(evidenceContent.results).toHaveProperty('tests');
    expect(evidenceContent.results).toHaveProperty('constitution');
  });

  it('saves evidence file even when verification fails', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-fail-evidence-'));
    const projectPath = path.join(root, 'fail-evidence-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n- [ ] TASK-002 Pending\n'
    );

    const result = runCli(['verify', 'demo'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Evidence saved to');

    const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'evidence');
    expect(fs.existsSync(evidenceDir)).toBe(true);

    const files = fs.readdirSync(evidenceDir);
    const evidenceFiles = files.filter(f => f.startsWith('verify-') && f.endsWith('.json'));
    expect(evidenceFiles.length).toBeGreaterThan(0);

    const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFiles[0]), 'utf-8'));
    expect(evidenceContent).toHaveProperty('type', 'verify');
    expect(evidenceContent.status).toBe('fail');
  });
});

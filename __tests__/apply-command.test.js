const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('apply CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-test-'));
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo', 'specs'), { recursive: true });

    const tasksContent = options.tasksContent || `- [ ] TASK-001 Write unit tests\n- [ ] TASK-002 Implement login logic`;
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

    return projectPath;
  }

  function writeWorkspacePackage(projectPath, workspacePath, packageJson) {
    const workspaceDir = path.join(projectPath, workspacePath);
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(path.join(workspaceDir, 'package.json'), JSON.stringify(packageJson));
    return workspaceDir;
  }

  it('prints dry-run output without changing files', () => {
    const projectPath = createTempProject('dry-run-project', {
      packageJson: { scripts: { test: 'echo test' } },
    });
    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const before = fs.readFileSync(tasksPath, 'utf-8');

    const result = runCli(['apply', 'demo', '--dry-run'], projectPath);

    expect(result.stdout).toContain('Dry run mode');
    expect(result.stdout).toContain('TASK-001');
    expect(fs.readFileSync(tasksPath, 'utf-8')).toBe(before);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'demo', 'apply.log'))).toBe(false);
  });

  it('marks task as [x] and writes apply.log on test success', () => {
    const projectPath = createTempProject('success-project');
    const result = runCli(['apply', 'demo', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('TASK-001');
    expect(result.stdout).toContain('Task passed tests');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toContain('- [x] TASK-001');

    const [logEntry] = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'apply.log'),
      'utf-8'
    ).trim().split('\n');
    const logPayload = JSON.parse(logEntry.replace(/^\[.*?\] /, ''));
    expect(logPayload.status).toBe('passed');
    expect(logPayload.change).toBe('demo');
  });

  it('keeps task as [ ] on test failure and exits non-zero', () => {
    const projectPath = createTempProject('fail-project');
    const result = runCli(['apply', 'demo', '--test-command', 'false'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('reverted to pending');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toContain('- [ ] TASK-001');
    expect(tasksContent).not.toContain('- [x] TASK-001');
    expect(result.stdout).toContain('Fix packet:');
    const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'evidence');
    expect(fs.readdirSync(evidenceDir).some(file => /^fix-packet-.*\.md$/.test(file))).toBe(true);
  });

  it('selects specified task with --task flag', () => {
    const projectPath = createTempProject('task-select-project');
    const result = runCli(['apply', 'demo', '--task', 'TASK-002', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('TASK-002');
    expect(result.stdout).toContain('Task passed tests');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toMatch(/- \[x\] TASK-002/);
  });

  it('marks task complete when workspace tests pass', () => {
    const projectPath = createTempProject('workspace-success-project', {
      packageJson: { private: true, workspaces: ['packages/*'] },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'test-ran.txt\', process.cwd())"' },
    });

    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('@demo/api');
    expect(result.stdout).toContain('Task passed tests');
    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    expect(fs.readFileSync(tasksPath, 'utf-8')).toContain('- [x] TASK-001');
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'test-ran.txt'))).toBe(true);
  });

  it('writes workspace metadata to apply.log when --workspace is used', () => {
    const projectPath = createTempProject('workspace-log-project', {
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

    const result = runCli(['apply', 'demo', '--workspace', 'packages/api'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'api-ran.txt'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'web', 'web-ran.txt'))).toBe(false);

    const [logEntry] = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'apply.log'),
      'utf-8'
    ).trim().split('\n');
    const logPayload = JSON.parse(logEntry.replace(/^\[.*?\] /, ''));
    expect(logPayload.workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
    }));
    expect(logPayload.workspaces[0].workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
    }));
  });

  it('keeps task pending when one workspace test fails', () => {
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

    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('@demo/api');
    expect(result.stdout).toContain('@demo/web');
    expect(result.stdout).toContain('reverted to pending');
    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    expect(fs.readFileSync(tasksPath, 'utf-8')).toContain('- [ ] TASK-001');
  });

  it('lists workspace test commands during dry-run', () => {
    const projectPath = createTempProject('workspace-dry-run-project', {
      packageJson: { private: true, workspaces: ['packages/*', 'apps/*'] },
    });
    writeWorkspacePackage(projectPath, 'packages/api', {
      name: '@demo/api',
      scripts: { test: 'node -e "process.exit(0)"' },
    });
    writeWorkspacePackage(projectPath, 'apps/web', {
      name: '@demo/web',
      scripts: { test: 'node -e "process.exit(0)"' },
    });

    const result = runCli(['apply', 'demo', '--dry-run'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Dry run mode');
    expect(result.stdout).toContain('@demo/api');
    expect(result.stdout).toContain('@demo/web');
    expect(result.stdout).toContain('npm test');
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

    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'root-ran.txt'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'workspace-ran.txt'))).toBe(false);
  });

  it('errors when tasks.md is missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-test-'));
    const projectPath = path.join(root, 'no-tasks');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo', 'specs'), { recursive: true });

    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.stderr).toContain('tasks.md not found');
    expect(result.status).toBe(1);
  });

  it('errors when no active changes exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-test-'));
    const projectPath = path.join(root, 'no-changes');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

    const result = runCli(['apply'], projectPath);

    expect(result.stderr).toContain('No active changes found');
    expect(result.status).toBe(1);
  });

  it('errors when no test command configured', () => {
    const projectPath = createTempProject('no-cmd-project');
    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.stdout).toContain('requires test commands to be configured');
    // P0-1 Fix: TDD mode now fails when no test command is configured
    expect(result.status).toBe(1);

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    // Task should remain pending (not marked as done)
    expect(tasksContent).toContain('- [ ] TASK-001');
  });

  it('fails GREEN phase when no test command configured unless explicitly allowed', () => {
    const projectPath = createTempProject('no-cmd-green-project', {
      tasksContent: '- [ ] [phase:green] TASK-001 Implement docs-only change',
    });

    const result = runCli(['apply', 'demo'], projectPath);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('GREEN Phase requires test commands');
    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    expect(fs.readFileSync(tasksPath, 'utf-8')).toContain('[phase:green]');
  });

  it('allows explicit no-test GREEN phase bypass', () => {
    const projectPath = createTempProject('allow-no-tests-green-project', {
      tasksContent: '- [ ] [phase:green] TASK-001 Implement docs-only change',
    });

    const result = runCli(['apply', 'demo', '--allow-no-tests'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--allow-no-tests');
    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    expect(fs.readFileSync(tasksPath, 'utf-8')).toContain('[phase:refactor]');
  });
});

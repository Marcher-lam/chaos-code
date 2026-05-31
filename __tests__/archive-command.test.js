const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('archive CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  function runCli(args, cwd) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    result.stdout = stripAnsi(result.stdout || '');
    result.stderr = stripAnsi(result.stderr || '');
    return result;
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-test-'));
    const projectPath = path.join(root, name);
    const changeDir = options.changeDir || 'demo';
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', changeDir), { recursive: true });

    const tasksContent = options.tasksContent || `- [x] TASK-001 Write tests\n- [x] TASK-002 Implement feature`;
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', changeDir, 'tasks.md'),
      tasksContent
    );

    return projectPath;
  }

  it('archives a completed change', () => {
    const projectPath = createTempProject('archive-ok-project');

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.stdout).toContain('Archived');
    expect(result.stdout).toContain('demo');
    expect(result.status).toBe(0);

    // Change dir should no longer exist in active changes
    const activeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    expect(fs.existsSync(activeDir)).toBe(false);

    // Archived dir should exist
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    expect(fs.existsSync(archiveDir)).toBe(true);

    const archived = fs.readdirSync(archiveDir);
    expect(archived.length).toBe(1);
    expect(archived[0]).toMatch(/^demo-\d{14}$/);
  });

  it('refuses to archive incomplete change', () => {
    const projectPath = createTempProject('incomplete-project', {
      tasksContent: `- [x] TASK-001 Write tests\n- [ ] TASK-002 Still pending`,
    });

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('incomplete tasks');
    expect(result.stdout).toContain('TASK-002');
    expect(result.stdout).toContain('verify');

    // Change should still be in place
    const activeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    expect(fs.existsSync(activeDir)).toBe(true);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    expect(fs.existsSync(archiveDir)).toBe(false);
  });

  it('auto-detects first active change when none specified', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-auto-'));
    const projectPath = path.join(root, 'auto-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'beta'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'beta', 'tasks.md'),
      '- [x] TASK-B Done\n'
    );

    const result = runCli(['archive'], projectPath);

    expect(result.stdout).toContain('Archived beta');
    expect(result.status).toBe(0);
  });

  it('errors when no active changes exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-nochange-'));
    const projectPath = path.join(root, 'no-change');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

    const result = runCli(['archive'], projectPath);

    expect(result.stderr).toContain('No active changes found');
    expect(result.status).toBe(1);
  });

  it('errors when STDD is not initialized', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-nostdd-'));
    const projectPath = path.join(root, 'no-stdd');
    fs.mkdirSync(projectPath, { recursive: true });

    const result = runCli(['archive'], projectPath);

    expect(result.stderr).toContain('STDD not initialized');
    expect(result.status).toBe(1);
  });

  it('removes specs directory if it exists', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-specs-'));
    const projectPath = path.join(root, 'specs-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs', 'demo-feature'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'specs', 'demo-feature', 'spec.md'),
      '# Spec\n'
    );

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'demo'))).toBe(false);
  });

  it('creates archive directory if it does not exist', () => {
    const projectPath = createTempProject('fresh-archive-project');
    // Ensure no archive dir
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    expect(fs.existsSync(archiveDir)).toBe(false);

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(archiveDir)).toBe(true);
  });

  it('generates summary.md in archived directory', () => {
    const projectPath = createTempProject('summary-project', {
      tasksContent: `- [x] TASK-001 Write tests\n- [x] TASK-002 Implement feature\n- [x] TASK-003 Add docs`,
    });

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    expect(fs.existsSync(summaryPath)).toBe(true);

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('Archive Summary:');
    expect(content).toContain('Tasks');
    expect(content).toContain('3/3 completed');
    expect(content).toContain('100%');
  });

  it('summary.md contains verification status when evidence exists', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-summary-evidence-'));
    const projectPath = path.join(root, 'evidence-project');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'verified-change');
    fs.mkdirSync(changeDir, { recursive: true });

    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '# Proposal: Add Login Feature\n\nDescription here\n'
    );

    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [x] TASK-001 Write login tests\n- [x] TASK-002 Implement login\n'
    );

    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const evidenceData = {
      type: 'verify',
      id: 'abc123',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      status: 'pass',
      results: {
        tasks: { allDone: true, done: 2, total: 2 },
        tests: { passed: true },
        constitution: { status: 'pass', score: 100 },
      },
      metadata: {
        testRunner: 'npm test',
      },
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'verify-1000000001.json'),
      JSON.stringify(evidenceData, null, 2)
    );

    const result = runCli(['archive', 'verified-change'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    expect(fs.existsSync(summaryPath)).toBe(true);

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('Verification Passed');
    expect(content).toContain('Add Login Feature');
    expect(content).toContain('2/2 completed');
    expect(content).toContain('Constitution Status: PASS (Score: 100%)');
    expect(content).toContain('Test Runner: npm test');
  });

  it('summary.md includes workspace test results when evidence has workspaces', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-summary-workspaces-'));
    const projectPath = path.join(root, 'workspace-project');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'workspace-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
    fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));

    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [x] TASK-001 Update packages/api/src/index.ts\n'
    );

    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidenceData = {
      type: 'verify',
      id: 'workspace123',
      timestamp: '2026-03-01T00:00:00.000Z',
      unixTimestamp: 1740787200000,
      status: 'pass',
      results: {
        tasks: { allDone: true, done: 1, total: 1 },
        tests: {
          passed: true,
          workspaces: [
            { workspaceName: 'packages/api', passed: true, command: 'npm test' },
          ],
        },
        constitution: { status: 'pass', score: 100 },
      },
      metadata: {},
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'verify-1000000003.json'),
      JSON.stringify(evidenceData, null, 2)
    );

    const result = runCli(['archive', 'workspace-change'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');
    const content = fs.readFileSync(summaryPath, 'utf-8');

    expect(content).toContain('## Workspaces');
    expect(content).toContain('`packages/api`');
    expect(content).toContain('packages/api: PASS');
  });

  it('summary.md shows Verification Failed when evidence status is fail', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-summary-fail-'));
    const projectPath = path.join(root, 'fail-project');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'failing-change');
    fs.mkdirSync(changeDir, { recursive: true });

    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '# Bug: Fix crash on login\n\nCrash happens\n'
    );

    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [x] TASK-001 Fix the bug\n'
    );

    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const evidenceData = {
      type: 'verify',
      id: 'def456',
      timestamp: '2026-02-01T00:00:00.000Z',
      unixTimestamp: 1738368000000,
      status: 'fail',
      results: {
        tasks: { allDone: true, done: 1, total: 1 },
        tests: { passed: false },
        constitution: { status: 'fail' },
      },
      metadata: {},
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'verify-1000000002.json'),
      JSON.stringify(evidenceData, null, 2)
    );

    const result = runCli(['archive', 'failing-change'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('Verification Failed');
  });

  it('summary.md includes spec files when present', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-summary-specs-'));
    const projectPath = path.join(root, 'specs-project');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'specs-change');
    fs.mkdirSync(changeDir, { recursive: true });

    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    const specsDir = path.join(changeDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'login.feature'), 'Feature: Login\n');
    fs.writeFileSync(path.join(specsDir, 'auth.md'), '# Auth Spec\n');

    const result = runCli(['archive', 'specs-change'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('`specs/login.feature`');
    expect(content).toContain('`specs/auth.md`');
  });

  it('summary.md includes workspaces from spec metadata', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-summary-spec-workspace-'));
    const projectPath = path.join(root, 'spec-workspace-project');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'spec-workspace-change');
    fs.mkdirSync(changeDir, { recursive: true });

    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [x] TASK-001 Done\n'
    );

    const specsDir = path.join(changeDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'packages-api-login.feature'), `# Task: TASK-001 - User Login
# Workspace: packages/api

Feature: User Login
  @task-001 @workspace:packages-api
  Scenario: User Login
    Given the system is ready
`);

    const result = runCli(['archive', 'spec-workspace-change'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('## Workspaces');
    expect(content).toContain('`packages/api`');
  });

  it('summary.md handles missing evidence gracefully', () => {
    const projectPath = createTempProject('no-evidence-project');

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);

    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archivedName = fs.readdirSync(archiveDir)[0];
    const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

    expect(fs.existsSync(summaryPath)).toBe(true);

    const content = fs.readFileSync(summaryPath, 'utf-8');
    expect(content).toContain('Verification Passed');
    expect(content).toContain('Constitution Status: N/A');
  });
});

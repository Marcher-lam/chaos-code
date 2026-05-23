const fs = require('fs');
const path = require('path');
const os = require('os');
const { GraphRunCommand } = require('../src/cli/commands/graph-run');
const { FFCommand } = require('../src/cli/commands/ff');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { ApplyCommand } = require('../src/cli/commands/apply');
const { VerifyCommand } = require('../src/cli/commands/verify');
const { ArchiveCommand } = require('../src/cli/commands/archive');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');
const { IssueCommand } = require('../src/cli/commands/issue');

jest.mock('../src/cli/commands/issue');
jest.mock('../src/cli/commands/ff');
jest.mock('../src/cli/commands/spec-generator');
jest.mock('../src/cli/commands/apply');
jest.mock('../src/cli/commands/verify');
jest.mock('../src/cli/commands/archive');
jest.mock('../src/cli/commands/fix-packet');
jest.mock('../src/cli/commands/outside-in');

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => cb(null, { stdout: '', stderr: '' })),
  spawnSync: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
}));

const { exec, spawnSync } = require('child_process');

describe('GraphRunCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-run-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    if (initialized) {
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    }
    return projectPath;
  }

  function createWorkspace(projectPath, workspacePath = 'packages/api', pkg = { name: '@demo/api' }) {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    const workspaceRoot = path.join(projectPath, workspacePath);
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify(pkg));
    return workspaceRoot;
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    FFCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    SpecGenerator.mockImplementation(() => ({
      generateFromTasks: jest.fn().mockResolvedValue({ generated: [], skipped: [] }),
    }));
    ApplyCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    VerifyCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    ArchiveCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    IssueCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({ changeName: 'hotfix-change' }),
    }));
    IssueCommand.mockClear();
    FixPacketCommand.mockImplementation(() => ({
      execute: jest.fn().mockReturnValue({ output: 'stdd/changes/test/evidence/fix-packet.md', jsonOutput: 'stdd/changes/test/evidence/fix-packet.json' }),
    }));
    OutsideInCommand.mockImplementation(() => ({
      execute: jest.fn().mockReturnValue({ plan: 'stdd/changes/test/outside-in/plan.md', skeletons: [] }),
    }));

    exec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '', stderr: '' }));
    exec.mockClear();
    spawnSync.mockImplementation(() => ({ status: 0, stdout: '', stderr: '' }));
    spawnSync.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
    console.error.mockRestore();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  it('should execute nodes in topological order for feature intent', async () => {
    const projectPath = createTempProject('graph-run-feature');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'test-change' });

    expect(result.changeName).toBe('test-change');
    expect(result.failedAt).toBeNull();

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-propose',
      'stdd-spec',
      'stdd-plan',
      'stdd-outside-in',
      'stdd-apply',
      'stdd-verify',
    ]);

    // Verify each command class was called in order
    expect(FFCommand).toHaveBeenCalled();
    expect(SpecGenerator).toHaveBeenCalled();
    expect(OutsideInCommand).toHaveBeenCalled();
    expect(ApplyCommand).toHaveBeenCalled();
    expect(VerifyCommand).toHaveBeenCalled();
  });

  it('should execute nodes in topological order for hotfix intent', async () => {
    const projectPath = createTempProject('graph-run-hotfix');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('hotfix', { changeName: 'hotfix-change' });

    expect(result.changeName).toBe('hotfix-change');
    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-issue',
      'stdd-apply',
      'stdd-verify',
      'stdd-archive',
    ]);

    const issueInstance = IssueCommand.mock.results[0].value;
    expect(issueInstance.execute).toHaveBeenCalledWith('hotfix-change', expect.objectContaining({ changeName: 'hotfix-change' }));
  });

  it('should pass generated hotfix change name into issue command', async () => {
    const projectPath = createTempProject('graph-run-hotfix-generated');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('hotfix');

    expect(result.changeName).toMatch(/^graph-hotfix-\d{8}-\d{4}$/);
    const issueInstance = IssueCommand.mock.results[0].value;
    expect(issueInstance.execute).toHaveBeenCalledWith(result.changeName, expect.objectContaining({ changeName: result.changeName }));
  });

  it('should skip apply and verify when --skip-apply is passed', async () => {
    const projectPath = createTempProject('graph-run-skip');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'skip-change', skipApply: true });

    const skippedSteps = result.steps.filter(s => s.status === 'skipped');
    expect(skippedSteps.length).toBeGreaterThanOrEqual(2);
    expect(skippedSteps.some(s => s.node === 'stdd-apply')).toBe(true);
    expect(skippedSteps.some(s => s.node === 'stdd-verify')).toBe(true);
  });

  it('should execute repair intent starting with fix-packet', async () => {
    const projectPath = createTempProject('graph-run-repair');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('repair', { changeName: 'repair-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual(['stdd-fix-packet', 'stdd-apply', 'stdd-verify']);
    expect(FixPacketCommand).toHaveBeenCalled();
  });

  it('should include workspace in skip-apply step results and output', async () => {
    const projectPath = createTempProject('graph-run-workspace-skip');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', {
      changeName: 'workspace-skip-change',
      skipApply: true,
      workspace: 'packages/api',
    });

    expect(result.workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
      sourceDir: 'packages/api/src',
    }));
    const applyStep = result.steps.find(s => s.node === 'stdd-apply');
    const verifyStep = result.steps.find(s => s.node === 'stdd-verify');
    expect(applyStep.workspace.path).toBe('packages/api');
    expect(verifyStep.workspace.path).toBe('packages/api');
    expect(logSpy.mock.calls.flat().join('\n')).toContain('Workspace: @demo/api (packages/api)');
  });

  it('should fail when workspace does not exist', async () => {
    const projectPath = createTempProject('graph-run-workspace-missing');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const command = new GraphRunCommand();

    await expect(command.execute('feature', {
      changeName: 'workspace-missing-change',
      skipApply: true,
      workspace: 'packages/missing',
    })).rejects.toThrow("Workspace 'packages/missing' not found.");
  });

  it('should abort when a step fails', async () => {
    const projectPath = createTempProject('graph-run-fail');
    process.chdir(projectPath);

    ApplyCommand.mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new Error('test execution failed')),
    }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'fail-change' });

    expect(result.failedAt).toBe('stdd-apply');

    const failedStep = result.steps.find(s => s.node === 'stdd-apply');
    expect(failedStep.status).toBe('failed');
    expect(failedStep.error).toBe('test execution failed');

    // Steps after the failure should not exist
    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).not.toContain('stdd-verify');
  });

  it('should use default intent feature when not specified', async () => {
    const projectPath = createTempProject('graph-run-default');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute(undefined, { changeName: 'default-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toContain('stdd-propose');
    expect(stepNames).toContain('stdd-spec');
  });

  it('should generate a change name when not provided', async () => {
    const projectPath = createTempProject('graph-run-autoname');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature');

    expect(result.changeName).toMatch(/^graph-feature-\d{8}-\d{4}$/);
  });

  it('should use fallback graph when graph file is missing', async () => {
    const projectPath = createTempProject('graph-run-no-stdd', false);
    // Create minimal stdd dir so graph-run doesn't bail on init check
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'fallback-change' });
    expect(result.changeName).toBe('fallback-change');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should return result with all steps recorded', async () => {
    const projectPath = createTempProject('graph-run-steps');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'steps-change' });

    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    expect(result.steps.every(s => s.node)).toBe(true);
    expect(result.steps.every(s => s.command)).toBe(true);
    expect(result.steps.every(s => s.status)).toBe(true);
  });

  it('should NOT inject type-check when tsconfig.json does not exist', async () => {
    const projectPath = createTempProject('graph-run-no-tsconfig');
    process.chdir(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test-project' }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'no-tsconfig-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-propose',
      'stdd-spec',
      'stdd-plan',
      'stdd-outside-in',
      'stdd-apply',
      'stdd-verify',
    ]);
    expect(stepNames).not.toContain('stdd-type-check');
  });

  it('should inject type-check and execute it when tsconfig.json exists', async () => {
    const projectPath = createTempProject('graph-run-with-tsconfig');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test-project' }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'with-tsconfig-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toContain('stdd-type-check');

    const typeCheckIdx = stepNames.indexOf('stdd-type-check');
    const applyIdx = stepNames.indexOf('stdd-apply');
    const verifyIdx = stepNames.indexOf('stdd-verify');
    expect(typeCheckIdx).toBeGreaterThan(applyIdx);
    expect(verifyIdx).toBeGreaterThan(typeCheckIdx);

    expect(exec).toHaveBeenCalled();
  });

  describe('_evaluateCondition - has_dependency', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-cond-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      originalCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns true when dependency exists in package.json', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { express: '^4.0.0' },
        devDependencies: { jest: '^29.0.0' },
      }));

      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ has_dependency: 'express' })).toBe(true);
      expect(command._evaluateCondition({ has_dependency: 'jest' })).toBe(true);
      expect(command._evaluateCondition({ has_dependency: 'react' })).toBe(false);
    });

    test('returns false when no package.json exists', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ has_dependency: 'anything' })).toBe(false);
    });

    test('returns false for corrupt package.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), 'not json');
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ has_dependency: 'express' })).toBe(false);
    });

    test('returns false for unknown condition type', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ unknown_check: true })).toBe(false);
    });
  });

  describe('_evaluateCondition - evaluators', () => {
    let tmpDir;
    let originalEnv;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-evaluator-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
      originalCwd = process.cwd();
      originalEnv = { ...process.env };
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      process.env = originalEnv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('matches files by glob pattern', () => {
      fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'button.test.js'), 'test');
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ has_file_pattern: 'src/**/*.test.js' })).toBe(true);
      expect(command._evaluateCondition({ has_file_pattern: 'src/**/*.spec.ts' })).toBe(false);
    });

    test('evaluates environment variables with operators', () => {
      process.env.STDD_MODE = 'repair';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_MODE', operator: 'equals', value: 'repair' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_MODE', operator: 'contains', value: 'pair' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'MISSING_ENV' })).toBe(false);
    });

    test('evaluates json_path conditions from JSON files', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'jest' }, engines: { node: '>=20' } }));
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ json_path: { file: 'package.json', path: '$.scripts.test', operator: 'equals', value: 'jest' } })).toBe(true);
      expect(command._evaluateCondition({ json_path: 'package.json', path: '$.engines.node', operator: 'contains', value: '20' })).toBe(true);
      expect(command._evaluateCondition({ json_path: { file: 'missing.json', path: '$.x' } })).toBe(false);
    });

    test('evaluates safe command conditions and rejects unsafe commands', () => {
      spawnSync.mockImplementation((bin) => ({ status: bin === 'git' ? 0 : 1, stdout: 'feature/test\n', stderr: '' }));
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ command: 'git branch --show-current' })).toBe(true);
      expect(command._evaluateCondition({ command: 'git branch --show-current', operator: 'contains', value: 'feature' })).toBe(true);
      expect(command._evaluateCondition({ command: 'bash -c "echo unsafe"' })).toBe(false);
      expect(command._evaluateCondition({ command: 'git status; rm -rf .' })).toBe(false);
    });

    test('evaluates git branch and git status conditions', () => {
      spawnSync.mockImplementation((bin, args) => {
        const commandText = [bin, ...args].join(' ');
        if (commandText === 'git branch --show-current') return { status: 0, stdout: 'feature/graph\n', stderr: '' };
        if (commandText === 'git status --porcelain') return { status: 0, stdout: '', stderr: '' };
        return { status: 1, stdout: '', stderr: 'unexpected' };
      });
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ git_branch: 'feature/graph' })).toBe(true);
      expect(command._evaluateCondition({ git_branch: 'feature', operator: 'contains' })).toBe(true);
      expect(command._evaluateCondition({ git_status: 'clean' })).toBe(true);
      expect(command._evaluateCondition({ git_status: 'dirty' })).toBe(false);
    });

    test('supports all, any, and not composition', () => {
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
      process.env.STDD_FLAG = 'enabled';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ all: [{ has_file: 'tsconfig.json' }, { variable: 'STDD_FLAG', operator: 'equals', value: 'enabled' }] })).toBe(true);
      expect(command._evaluateCondition({ any: [{ has_file: 'missing' }, { has_file: 'tsconfig.json' }] })).toBe(true);
      expect(command._evaluateCondition({ not: { has_file: 'missing' } })).toBe(true);
    });
  });

  describe('NODE_COMMAND_MAP completeness', () => {
    const { NODE_COMMAND_MAP } = require('../src/cli/commands/graph-run');
    const DynamicGraphRouter = require('../src/utils/dynamic-router');
    const router = new DynamicGraphRouter();

    test('all feature nodes have handlers', () => {
      const graph = router.compile('feature');
      const nodes = Object.keys(graph.skills);
      for (const node of nodes) {
        expect(NODE_COMMAND_MAP[node]).toBeDefined();
      }
    });

    test('all research nodes have handlers', () => {
      const graph = router.compile('research');
      const nodes = Object.keys(graph.skills);
      for (const node of nodes) {
        expect(NODE_COMMAND_MAP[node]).toBeDefined();
      }
    });

    test('all brownfield nodes have handlers', () => {
      const graph = router.compile('brownfield');
      const nodes = Object.keys(graph.skills);
      for (const node of nodes) {
        expect(NODE_COMMAND_MAP[node]).toBeDefined();
      }
    });

    test('all hotfix nodes have handlers', () => {
      const graph = router.compile('hotfix');
      const nodes = Object.keys(graph.skills);
      for (const node of nodes) {
        expect(NODE_COMMAND_MAP[node]).toBeDefined();
      }
    });

    test('all repair nodes have handlers', () => {
      const graph = router.compile('repair');
      const nodes = Object.keys(graph.skills);
      for (const node of nodes) {
        expect(NODE_COMMAND_MAP[node]).toBeDefined();
      }
    });
  });

  describe('_executeNode: research/brownfield nodes', () => {
    let command;

    beforeEach(() => {
      command = new GraphRunCommand();
    });

    test('stdd-explore node executes ExploreCommand', async () => {
      jest.doMock('../src/cli/commands/explore', () => ({
        ExploreCommand: jest.fn().mockImplementation(() => ({
          execute: jest.fn().mockResolvedValue({}),
        })),
      }));
      const result = await command._executeNode('stdd-explore', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.node).toBe('stdd-explore');
    });

    test('stdd-brainstorm node executes ElicitationCommand', async () => {
      jest.doMock('../src/cli/commands/elicitation', () => ({
        ElicitationCommand: jest.fn().mockImplementation(() => ({
          execute: jest.fn().mockResolvedValue({}),
        })),
      }));
      const result = await command._executeNode('stdd-brainstorm', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.node).toBe('stdd-brainstorm');
    });

    test('stdd-final-doc node writes document', async () => {
      const result = await command._executeNode('stdd-final-doc', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.node).toBe('stdd-final-doc');
    });

    test('stdd-init node executes InitCommand', async () => {
      jest.doMock('../src/cli/commands/init', () => ({
        InitCommand: jest.fn().mockImplementation(() => ({
          execute: jest.fn().mockResolvedValue({}),
        })),
      }));
      const result = await command._executeNode('stdd-init', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.node).toBe('stdd-init');
    });
  });

  describe('execute - STDD init check', () => {
    it('throws when STDD not initialized', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-no-init-'));
      const origCwd = process.cwd();
      process.chdir(emptyDir);
      const command = new GraphRunCommand();
      await expect(command.execute('feature')).rejects.toThrow('STDD not initialized');
      process.chdir(origCwd);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('globPatternToRegex edge cases', () => {
    const { GraphRunCommand: _GRC } = require('../src/cli/commands/graph-run');

    test('** without trailing slash matches any path', () => {
      // Covers lines 41-42: ** without / after it
      const re = require('../src/cli/commands/graph-run');
      // Access the function indirectly via _evaluateCondition with has_file_pattern
      // We'll test via globPatternToRegex by invoking file pattern evaluation
      const command = new _GRC();
      // Pattern "**.js" should hit the `**` without trailing `/` branch (lines 41-42)
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-glob-'));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'foo.js'), '');
      // Use has_file_pattern which calls globPatternToRegex internally
      expect(command._evaluateCondition({ has_file_pattern: '**.js' })).toBe(true);
      expect(command._evaluateCondition({ has_file_pattern: '**.ts' })).toBe(false);
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('? wildcard matches single character', () => {
      // Covers line 47: ? wildcard
      const _GRC2 = require('../src/cli/commands/graph-run').GraphRunCommand;
      const command = new _GRC2();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-glob-q-'));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'a.txt'), '');
      // Pattern "?.txt" should use the ? wildcard branch (line 47)
      expect(command._evaluateCondition({ has_file_pattern: '?.txt' })).toBe(true);
      expect(command._evaluateCondition({ has_file_pattern: '?.js' })).toBe(false);
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('getValueAtPath edge cases', () => {
    test('returns undefined when traversing into null', () => {
      // Covers line 63: null/undefined property access
      const command = new GraphRunCommand();
      // _evaluateJsonPath calls getValueAtPath internally
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-jsonpath-null-'));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'test.json'), JSON.stringify({ a: null }));
      // path "$.a.b" should encounter null and return undefined (line 63)
      const result = command._evaluateCondition({
        json_path: { file: 'test.json', path: '$.a.b' },
      });
      // undefined vs 'exists' operator = false
      expect(result).toBe(false);
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('compareValues operator branches', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-compare-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('not_equals operator (line 74)', () => {
      process.env.STDD_TEST_VAL = 'alpha';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_TEST_VAL', operator: 'not_equals', value: 'beta' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_TEST_VAL', operator: 'not_equals', value: 'alpha' })).toBe(false);
      delete process.env.STDD_TEST_VAL;
    });

    test('matches operator (line 76)', () => {
      process.env.STDD_TEST_VAL = 'hello-world-123';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_TEST_VAL', operator: 'matches', value: '\\d+' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_TEST_VAL', operator: 'matches', value: '^xyz' })).toBe(false);
      delete process.env.STDD_TEST_VAL;
    });

    test('greater_than operator (line 77)', () => {
      process.env.STDD_NUM = '10';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'greater_than', value: '5' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'greater_than', value: '15' })).toBe(false);
      delete process.env.STDD_NUM;
    });

    test('less_than operator (line 78)', () => {
      process.env.STDD_NUM = '5';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'less_than', value: '10' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'less_than', value: '3' })).toBe(false);
      delete process.env.STDD_NUM;
    });

    test('greater_or_equal operator (line 79)', () => {
      process.env.STDD_NUM = '10';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'greater_or_equal', value: '10' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'greater_or_equal', value: '11' })).toBe(false);
      delete process.env.STDD_NUM;
    });

    test('less_or_equal operator (line 80)', () => {
      process.env.STDD_NUM = '10';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'less_or_equal', value: '10' })).toBe(true);
      expect(command._evaluateCondition({ variable: 'STDD_NUM', operator: 'less_or_equal', value: '9' })).toBe(false);
      delete process.env.STDD_NUM;
    });

    test('default operator returns false (line 81)', () => {
      process.env.STDD_VAL = 'x';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ variable: 'STDD_VAL', operator: 'bogus_op', value: 'x' })).toBe(false);
      delete process.env.STDD_VAL;
    });
  });

  describe('_executeNode edge cases', () => {
    let command;
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-exnode-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
      command = new GraphRunCommand();
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('stdd-archive node executes ArchiveCommand (lines 201-203)', async () => {
      const result = await command._executeNode('stdd-archive', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.node).toBe('stdd-archive');
      expect(ArchiveCommand).toHaveBeenCalled();
    });

    test('stdd-commit catches errors gracefully (line 217)', async () => {
      exec.mockImplementation((cmd, opts, cb) => cb(new Error('git not available'), { stdout: '', stderr: '' }));
      const result = await command._executeNode('stdd-commit', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.detail).toContain('commit skipped');
    });

    test('stdd-type-check with stderr and no stdout (line 228)', async () => {
      exec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '', stderr: 'some warning' }));
      const result = await command._executeNode('stdd-type-check', 'test-change', {});
      expect(result.status).toBe('success');
      expect(result.detail).toBe('some warning');
    });

    test('stdd-type-check throws on error (line 232)', async () => {
      exec.mockImplementation((cmd, opts, cb) => cb(new Error('tsc failed'), { stdout: '', stderr: '' }));
      await expect(command._executeNode('stdd-type-check', 'test-change', {})).rejects.toThrow('Type check failed');
    });

    test('default unknown node returns status unknown (line 268)', async () => {
      const result = await command._executeNode('stdd-unknown-node', 'test-change', {});
      expect(result.status).toBe('unknown');
      expect(result.node).toBe('stdd-unknown-node');
    });
  });

  describe('execute - error paths', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-exec-err-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('throws when DynamicGraphRouter constructor fails (line 282)', async () => {
      process.chdir(tmpDir);
      jest.resetModules();
      // Mock the constructor to throw when `new DynamicGraphRouter()` is called inside execute()
      jest.doMock('../src/utils/dynamic-router', () => {
        return function DynamicGraphRouter() {
          throw new Error('router boom');
        };
      });
      const { GraphRunCommand: MockedGRC } = require('../src/cli/commands/graph-run');
      const command = new MockedGRC();
      await expect(command.execute('feature', { changeName: 'test' })).rejects.toThrow('Failed to initialize graph router');
      jest.dontMock('../src/utils/dynamic-router');
      jest.resetModules();
    });

    test('throws when no nodes found for intent (line 290)', async () => {
      process.chdir(tmpDir);
      jest.resetModules();
      jest.doMock('../src/utils/dynamic-router', () => {
        return function DynamicGraphRouter() {
          this.compile = () => ({ name: 'empty-graph', skills: {} });
        };
      });
      const { GraphRunCommand: MockedGRC2 } = require('../src/cli/commands/graph-run');
      const command = new MockedGRC2();
      await expect(command.execute('nonexistent', { changeName: 'test' })).rejects.toThrow("No nodes found for intent 'nonexistent'");
      jest.dontMock('../src/utils/dynamic-router');
      jest.resetModules();
    });

    test('logs unknown status for unrecognized node result (line 330)', async () => {
      process.chdir(tmpDir);
      jest.resetModules();
      jest.doMock('../src/utils/dynamic-router', () => {
        return function DynamicGraphRouter() {
          this.compile = () => ({
            name: 'test-graph',
            skills: {
              'stdd-custom-unknown': { description: 'custom', phase: 'test', depends_on: [] },
            },
          });
        };
      });
      const { GraphRunCommand: MockedGRC3 } = require('../src/cli/commands/graph-run');
      const command = new MockedGRC3();
      const result = await command.execute('feature', { changeName: 'test-unknown' });
      // The default handler returns { status: 'unknown' } so we should see it in steps
      expect(result.steps[0].status).toBe('unknown');
      // Also check that the "unknown" log was called
      const logOutput = logSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('?');
      jest.dontMock('../src/utils/dynamic-router');
      jest.resetModules();
    });
  });

  describe('_loadConditions', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-conditions-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns empty rules when conditions file is corrupt (lines 364-366)', () => {
      const command = new GraphRunCommand();

      // Use jest.spyOn to intercept fs.readFileSync and return corrupt JSON
      // for the conditions.json file specifically
      const origReadFileSync = fs.readFileSync;
      const spy = jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...args) => {
        if (String(filePath).includes('conditions.json')) {
          return 'NOT VALID JSON {{{';
        }
        return origReadFileSync.call(fs, filePath, ...args);
      });

      // Also need existsSync to return true for conditions path
      const origExistsSync = fs.existsSync;
      const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        if (String(filePath).includes('conditions.json')) return true;
        return origExistsSync.call(fs, filePath);
      });

      const result = command._loadConditions();
      expect(result).toEqual({ rules: [] });

      spy.mockRestore();
      existsSpy.mockRestore();
    });
  });

  describe('_applyConditions branches', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-cond-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns early when conditions has empty rules (line 372)', () => {
      const command = new GraphRunCommand();
      // Mock _loadConditions to return empty rules
      command._loadConditions = () => ({ rules: [] });
      const graph = { skills: { 'stdd-apply': { depends_on: [] } } };
      command._applyConditions(graph);
      // Graph should be unchanged
      expect(Object.keys(graph.skills)).toEqual(['stdd-apply']);
    });

    test('skips rules missing required fields (line 379)', () => {
      const command = new GraphRunCommand();
      command._loadConditions = () => ({
        rules: [
          { if: { has_file: 'x.txt' }, then: {} }, // missing inject_node
          { if: { has_file: 'x.txt' } }, // missing then
          {}, // missing if and then
        ],
      });
      const graph = { skills: {} };
      command._applyConditions(graph);
      expect(Object.keys(graph.skills)).toEqual([]);
    });

    test('skips injection when node already exists in graph (line 387)', () => {
      const command = new GraphRunCommand();
      command._loadConditions = () => ({
        rules: [
          { if: { has_file: 'package.json' }, then: { inject_node: 'stdd-apply', after: 'stdd-propose' } },
        ],
      });
      // stdd-apply already exists in the graph
      const graph = { skills: { 'stdd-apply': { depends_on: [] } } };
      command._applyConditions(graph);
      // Should not re-add; skills count stays the same
      expect(Object.keys(graph.skills).length).toBe(1);
    });

    test('creates graph.skills when missing and condition is met (line 394)', () => {
      const command = new GraphRunCommand();
      command._loadConditions = () => ({
        rules: [
          { if: { has_file: 'package.json' }, then: { inject_node: 'stdd-custom', after: null } },
        ],
      });
      command._evaluateCondition = () => true;
      const graph = {}; // no skills property
      command._applyConditions(graph);
      expect(graph.skills).toBeDefined();
      expect(graph.skills['stdd-custom']).toBeDefined();
    });
  });

  describe('_evaluateGitBranch and _evaluateGitStatus error paths', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-git-eval-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('_evaluateGitBranch returns false on error (lines 532-533)', () => {
      spawnSync.mockImplementation(() => { throw new Error('spawn failed'); });
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ git_branch: 'main' })).toBe(false);
    });

    test('_evaluateGitStatus returns false on error (lines 545-546)', () => {
      spawnSync.mockImplementation(() => { throw new Error('spawn failed'); });
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ git_status: 'clean' })).toBe(false);
    });

    test('_evaluateCommand returns false on error', () => {
      spawnSync.mockImplementation(() => { throw new Error('spawn failed'); });
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ command: 'npm test' })).toBe(false);
    });

    test('_evaluateGitStatus with operator', () => {
      spawnSync.mockImplementation(() => ({ status: 0, stdout: '', stderr: '' }));
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ git_status: 'clean', operator: 'equals', value: true })).toBe(true);
    });

    test('_evaluateGitStatus dirty with operator', () => {
      spawnSync.mockImplementation(() => ({ status: 0, stdout: 'M file.js\n', stderr: '' }));
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ git_status: 'dirty', operator: 'equals', value: true })).toBe(true);
    });
  });

  describe('file_pattern alias', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fpat-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('file_pattern key works as alias for has_file_pattern', () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# hello');
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ file_pattern: 'README.md' })).toBe(true);
      expect(command._evaluateCondition({ file_pattern: 'NONEXISTENT.md' })).toBe(false);
    });
  });

  describe('has_file condition', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-hasfile-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('has_file returns true when file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'marker.txt'), 'x');
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ has_file: 'marker.txt' })).toBe(true);
      expect(command._evaluateCondition({ has_file: 'nope.txt' })).toBe(false);
    });
  });

  describe('_evaluateCondition edge cases', () => {
    let tmpDir;
    let origCwd;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-evaledge-'));
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
      origCwd = process.cwd();
      process.chdir(tmpDir);
    });

    afterEach(() => {
      process.chdir(origCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns false for null/undefined condition', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition(null)).toBe(false);
      expect(command._evaluateCondition(undefined)).toBe(false);
      expect(command._evaluateCondition('string')).toBe(false);
      expect(command._evaluateCondition(42)).toBe(false);
    });

    test('all with non-array returns false', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ all: 'not-array' })).toBe(false);
    });

    test('any with non-array returns false', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ any: 123 })).toBe(false);
    });

    test('env key works as alias for variable', () => {
      process.env.STDD_ALIAS = 'yes';
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({ env: 'STDD_ALIAS', operator: 'equals', value: 'yes' })).toBe(true);
      delete process.env.STDD_ALIAS;
    });

    test('json_path with string config and missing path returns false', () => {
      const command = new GraphRunCommand();
      // path is missing
      expect(command._evaluateCondition({ json_path: 'package.json' })).toBe(false);
    });

    test('json_path with non-existent file returns false', () => {
      const command = new GraphRunCommand();
      expect(command._evaluateCondition({
        json_path: { file: 'missing.json', path: '$.x' },
      })).toBe(false);
    });
  });
});

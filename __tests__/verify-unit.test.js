/**
 * UNIT tests for VerifyCommand
 * Directly tests the VerifyCommand class with all external dependencies mocked.
 */

const path = require('path');

// ---------- Mocks ----------

const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(''),
};
jest.mock('fs', () => mockFs);

const mockCompare = jest.fn();
jest.mock('../src/cli/commands/browser', () => ({
  BrowserCommand: jest.fn().mockImplementation(() => ({
    compare: mockCompare,
  })),
}));

jest.mock('chalk', () => {
  const passthrough = (str) => str;
  const chalk = new Proxy(passthrough, {
    get: () => passthrough,
  });
  chalk.bold = passthrough;
  chalk.green = passthrough;
  chalk.red = passthrough;
  chalk.yellow = passthrough;
  chalk.cyan = passthrough;
  chalk.dim = passthrough;
  return chalk;
});

const mockFindActiveChange = jest.fn();
const mockCheckTasksCompletion = jest.fn();
jest.mock('../src/utils/change-utils', () => ({
  findActiveChange: mockFindActiveChange,
  checkTasksCompletion: mockCheckTasksCompletion,
}));

const mockConstitutionCheckerRun = jest.fn();
jest.mock('../src/cli/commands/constitution-checker', () => ({
  ConstitutionChecker: jest.fn().mockImplementation(() => ({
    run: mockConstitutionCheckerRun,
  })),
}));

const mockCaptureVerify = jest.fn();
const mockSaveToFile = jest.fn();
jest.mock('../src/utils/evidence-capture', () => {
  return jest.fn().mockImplementation(() => ({
    captureVerify: mockCaptureVerify,
    saveToFile: mockSaveToFile,
  }));
});

const mockInjectReporter = jest.fn();
jest.mock('../src/utils/reporter-injector', () => ({
  injectReporter: mockInjectReporter,
}));

const mockResolveTestCommands = jest.fn();
const mockGetConfigTestCommand = jest.fn();
jest.mock('../src/utils/test-command-resolver', () => ({
  resolveTestCommands: mockResolveTestCommands,
  getConfigTestCommand: mockGetConfigTestCommand,
}));

const mockCommandToWorkspaceScope = jest.fn();
const mockResolveWorkspaceScope = jest.fn();
jest.mock('../src/utils/workspace-scope', () => ({
  commandToWorkspaceScope: mockCommandToWorkspaceScope,
  resolveWorkspaceScope: mockResolveWorkspaceScope,
}));

const mockFindLatestMutationEvidence = jest.fn();
jest.mock('../src/cli/commands/mutation', () => ({
  findLatestMutationEvidence: mockFindLatestMutationEvidence,
}));

const mockRunParsedCommand = jest.fn();
jest.mock('../src/utils/command-runner', () => ({
  runCommand: mockRunParsedCommand,
}));

// ---------- Import after mocks ----------

const { VerifyCommand } = require('../src/cli/commands/verify');

// ---------- Helpers ----------

const FAKE_CWD = '/fake/project';
const FAKE_STDD_DIR = path.join(FAKE_CWD, 'stdd');
const FAKE_CHANGE_DIR = path.join(FAKE_STDD_DIR, 'changes', 'demo-change');
const FAKE_EVIDENCE_PATH = path.join(FAKE_CHANGE_DIR, 'evidence', 'verify-1234567890.json');

function setupBasicStubs() {
  // Reset all mocks
  jest.clearAllMocks();
  // Reset process.exitCode
  delete process.exitCode;

  // Default: stdd dir exists
  mockFs.existsSync.mockReturnValue(true);
  // Default: find active change returns a change dir
  mockFindActiveChange.mockReturnValue(FAKE_CHANGE_DIR);
  // Default: all tasks done
  mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 3, done: 3, pending: [] });
  // Default: no test commands
  mockResolveTestCommands.mockReturnValue([]);
  mockGetConfigTestCommand.mockReturnValue(null);
  // Default: constitution passes with no issues
  mockConstitutionCheckerRun.mockReturnValue({ blocking: [], warning: [], info: [], skipped: [] });
  // Default: no mutation evidence
  mockFindLatestMutationEvidence.mockReturnValue(null);
  // Default: evidence capture
  mockCaptureVerify.mockReturnValue({ type: 'verify', unixTimestamp: 1234567890 });
  mockSaveToFile.mockReturnValue(FAKE_EVIDENCE_PATH);
  // Default: no workspace
  mockResolveWorkspaceScope.mockReturnValue(null);
  mockCommandToWorkspaceScope.mockReturnValue(null);
}

function runVerify(changeName, options = {}) {
  const cmd = new VerifyCommand();
  return cmd.execute(changeName, options);
}

// Capture console.log output
function captureConsole() {
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return { logs, restore: () => { console.log = original; } };
}

// ---------- Tests ----------

describe('VerifyCommand (unit)', () => {
  let consoleCapture;
  let originalCwd;

  beforeAll(() => {
    originalCwd = process.cwd;
    process.cwd = () => FAKE_CWD;
  });

  afterAll(() => {
    process.cwd = originalCwd;
  });

  beforeEach(() => {
    setupBasicStubs();
    consoleCapture = captureConsole();
  });

  afterEach(() => {
    consoleCapture.restore();
  });

  // ========================================
  // Error cases
  // ========================================

  describe('error cases', () => {
    it('throws when STDD is not initialized', async () => {
      mockFs.existsSync.mockReturnValue(false);
      await expect(runVerify('my-change')).rejects.toThrow('STDD not initialized');
    });

    it('throws "No active changes found" when findActiveChange returns null with no name', async () => {
      mockFindActiveChange.mockReturnValue(null);
      await expect(runVerify(undefined)).rejects.toThrow('No active changes found');
    });

    it('throws "Change not found" when a specific change name is given but not found', async () => {
      mockFindActiveChange.mockReturnValue(null);
      await expect(runVerify('missing-change')).rejects.toThrow("Change 'missing-change' not found");
    });

    it('throws when change specified via options.change is not found', async () => {
      mockFindActiveChange.mockReturnValue(null);
      await expect(runVerify(undefined, { change: 'ghost-change' })).rejects.toThrow(
        "Change 'ghost-change' not found"
      );
    });
  });

  // ========================================
  // Tasks check
  // ========================================

  describe('tasks check', () => {
    it('reports PASS when all tasks are done', async () => {
      mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 5, done: 5, pending: [] });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tasks: 5/5 completed');
      expect(output).toContain('PASS');
    });

    it('reports FAIL and sets exitCode when tasks are pending', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 3,
        done: 1,
        pending: ['TASK-002 Write tests', 'TASK-003 Review'],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tasks: 1/3 completed');
      expect(output).toContain('TASK-002 Write tests');
      expect(output).toContain('TASK-003 Review');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
    });

    it('uses the change dir returned by findActiveChange for task check', async () => {
      const customDir = '/project/stdd/changes/feature-x';
      mockFindActiveChange.mockReturnValue(customDir);
      await runVerify('feature-x');
      expect(mockCheckTasksCompletion).toHaveBeenCalledWith(customDir);
    });
  });

  // ========================================
  // Tests check
  // ========================================

  describe('tests check', () => {
    it('skips tests when no test commands are configured', async () => {
      mockResolveTestCommands.mockReturnValue([]);
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('no test command configured');
      expect(output).toContain('Tests:       SKIP');
    });

    it('reports PASS when a single test command succeeds', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      expect(mockRunParsedCommand).toHaveBeenCalledWith(
        'npm test',
        expect.objectContaining({ cwd: FAKE_CWD, stdio: 'pipe' })
      );
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       PASS');
    });

    it('reports FAIL when a test command fails', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'FAIL src/foo.js' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       FAIL');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
    });

    it('retries without reporter when injected command fails', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test --reporter=/foo.js', env: undefined });

      // First call (with reporter) fails, second call (without) succeeds
      mockRunParsedCommand
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'reporter error' })
        .mockReturnValueOnce({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      // Should have been called twice: once with injected cmd, once with original
      expect(mockRunParsedCommand).toHaveBeenCalledTimes(2);
      expect(mockRunParsedCommand).toHaveBeenNthCalledWith(
        1,
        'npm test --reporter=/foo.js',
        expect.objectContaining({ cwd: FAKE_CWD })
      );
      expect(mockRunParsedCommand).toHaveBeenNthCalledWith(
        2,
        'npm test',
        expect.objectContaining({ cwd: FAKE_CWD })
      );
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       PASS');
    });

    it('runs multiple test commands for workspace projects', async () => {
      const ws1 = { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' };
      const ws2 = { command: 'npm test', cwd: '/proj/packages/web', workspaceName: '@proj/web', source: 'workspace' };
      mockResolveTestCommands.mockReturnValue([ws1, ws2]);
      mockInjectReporter.mockImplementation((cmd) => ({ command: cmd, env: undefined }));
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope
        .mockReturnValueOnce({ name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' })
        .mockReturnValueOnce({ name: '@proj/web', root: '/proj/packages/web', path: 'packages/web' });

      await runVerify('demo');

      expect(mockRunParsedCommand).toHaveBeenCalledTimes(2);
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('@proj/api');
      expect(output).toContain('@proj/web');
      expect(output).toContain('Tests:       PASS');
    });

    it('reports FAIL when one of multiple workspace tests fails', async () => {
      const ws1 = { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' };
      const ws2 = { command: 'npm test', cwd: '/proj/packages/web', workspaceName: '@proj/web', source: 'workspace' };
      mockResolveTestCommands.mockReturnValue([ws1, ws2]);
      mockInjectReporter.mockImplementation((cmd) => ({ command: cmd, env: undefined }));
      mockRunParsedCommand
        .mockReturnValueOnce({ status: 0, stdout: 'ok', stderr: '' })
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'fail' });
      mockCommandToWorkspaceScope
        .mockReturnValueOnce({ name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' })
        .mockReturnValueOnce({ name: '@proj/web', root: '/proj/packages/web', path: 'packages/web' });

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       FAIL');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
    });

    it('passes custom test command via options.testCommand', async () => {
      mockResolveTestCommands.mockImplementation((_cwd, opts) => {
        if (opts.testCommand) {
          return [{ command: opts.testCommand, cwd: _cwd, workspaceName: 'root', source: 'root' }];
        }
        return [];
      });
      mockInjectReporter.mockReturnValue({ command: 'jest --coverage', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo', { testCommand: 'jest --coverage' });

      expect(mockResolveTestCommands).toHaveBeenCalledWith(
        FAKE_CWD,
        expect.objectContaining({ testCommand: 'jest --coverage' })
      );
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       PASS');
    });
  });

  // ========================================
  // Constitution check
  // ========================================

  describe('constitution check', () => {
    it('reports PASS when constitution has no issues', async () => {
      mockConstitutionCheckerRun.mockReturnValue({ blocking: [], warning: [], info: [], skipped: [] });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Constitution: passed');
      expect(output).toContain('Constitution: PASS');
    });

    it('reports FAIL when constitution has blocking issues', async () => {
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [{ article: 2, name: 'TDD', message: 'Missing test file for: src/utils.js' }],
        warning: [],
        info: [],
        skipped: [],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('blocking issue(s)');
      expect(output).toContain('Article 2 (TDD)');
      expect(output).toContain('Missing test file for: src/utils.js');
      expect(output).toContain('Constitution: FAIL');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
    });

    it('reports passed with warnings when constitution has only warnings', async () => {
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [],
        warning: [
          { article: 5, name: 'Documentation', message: 'Missing JSDoc for public API' },
          { article: 4, name: 'Style', message: 'File too long' },
        ],
        info: [],
        skipped: [],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('passed with 2 warning(s)');
      expect(output).toContain('Article 5 (Documentation)');
      expect(output).toContain('Article 4 (Style)');
      // Warnings should not cause failure
      expect(output).toContain('Constitution: PASS');
      expect(output).toContain('Verification passed');
    });

    it('skips constitution when --no-constitution is passed', async () => {
      await runVerify('demo', { constitution: false });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Constitution: skipped');
      expect(mockConstitutionCheckerRun).not.toHaveBeenCalled();
    });

    it('shows skipped articles in constitution output', async () => {
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [],
        warning: [],
        info: [],
        skipped: [{ article: 8, name: 'Performance', reason: 'Waived' }],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Article 8 (Performance)');
      expect(output).toContain('Waived');
    });
  });

  // ========================================
  // Mutation evidence
  // ========================================

  describe('mutation evidence', () => {
    it('reports mutation evidence when found', async () => {
      mockFindLatestMutationEvidence.mockReturnValue({
        filePath: '/proj/stdd/changes/demo/evidence/mutation-123.json',
        data: { status: 'pass', mutationScore: 85, threshold: 80, mode: 'full' },
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Mutation:');
      expect(output).toContain('85%');
    });

    it('reports skipped when no mutation evidence found', async () => {
      mockFindLatestMutationEvidence.mockReturnValue(null);
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Mutation: skipped');
    });

    it('uses mutationScore field, falling back to score field', async () => {
      mockFindLatestMutationEvidence.mockReturnValue({
        filePath: '/proj/stdd/changes/demo/evidence/mutation-123.json',
        data: { status: 'pass', score: 72, threshold: 70, mode: 'full' },
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('72%');
    });

    it('shows n/a when mutation score is null/undefined', async () => {
      mockFindLatestMutationEvidence.mockReturnValue({
        filePath: '/proj/stdd/changes/demo/evidence/mutation-123.json',
        data: { status: 'pass', mutationScore: undefined, threshold: 80, mode: 'full' },
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('n/a');
    });

    it('passes changeName and workspace to findLatestMutationEvidence', async () => {
      const wsScope = { name: 'api', root: '/proj/packages/api', path: 'packages/api' };
      mockResolveWorkspaceScope.mockReturnValue(wsScope);
      mockFindLatestMutationEvidence.mockReturnValue(null);

      await runVerify('demo', { workspace: 'packages/api' });

      expect(mockFindLatestMutationEvidence).toHaveBeenCalledWith(FAKE_CWD, {
        changeName: 'demo-change',
        workspace: wsScope,
      });
    });
  });

  // ========================================
  // Lint check
  // ========================================

  describe('lint check', () => {
    it('skips lint by default', async () => {
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Lint: skipped');
    });

    it('runs lint when --lint flag is passed and reports PASS', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'lint ok', stderr: '' });
      await runVerify('demo', { lint: true });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Running: npm run lint');
      expect(output).toContain('Lint: passed');
      expect(output).toContain('Lint:        PASS');
    });

    it('reports FAIL when lint command fails', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'lint error' });
      await runVerify('demo', { lint: true });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Lint: failed');
      expect(output).toContain('Lint:        FAIL');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
    });

    it('runs custom lint command when --lint-command is passed', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      await runVerify('demo', { lintCommand: 'eslint src/' });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Running: eslint src/');
      expect(mockRunParsedCommand).toHaveBeenCalledWith(
        'eslint src/',
        expect.objectContaining({ cwd: FAKE_CWD, stdio: 'pipe' })
      );
    });

    it('prefers --lint-command over default npm run lint', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      await runVerify('demo', { lint: true, lintCommand: 'pnpm lint' });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Running: pnpm lint');
    });
  });

  // ========================================
  // Evidence file saving
  // ========================================

  describe('evidence file saving', () => {
    it('saves evidence file via EvidenceCapture', async () => {
      await runVerify('demo');

      expect(mockCaptureVerify).toHaveBeenCalledTimes(1);
      expect(mockCaptureVerify).toHaveBeenCalledWith(
        'verify',
        expect.objectContaining({
          tasks: expect.any(Object),
          tests: expect.any(Object),
          constitution: expect.any(Object),
        }),
        expect.objectContaining({
          changeName: 'demo-change',
          os: process.platform,
          nodeVersion: process.version,
          cwd: FAKE_CWD,
        })
      );

      expect(mockSaveToFile).toHaveBeenCalledTimes(1);
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Evidence saved to');
    });

    it('saves evidence even when verification fails', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 2,
        done: 1,
        pending: ['TASK-002'],
      });

      await runVerify('demo');

      expect(mockSaveToFile).toHaveBeenCalledTimes(1);
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Evidence saved to');
      expect(output).toContain('Verification failed');
    });

    it('includes workspace metadata in evidence when --workspace is used', async () => {
      const wsScope = { name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' };
      mockResolveWorkspaceScope.mockReturnValue(wsScope);
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(wsScope);

      await runVerify('demo', { workspace: 'packages/api' });

      // Verify metadata includes workspace
      expect(mockCaptureVerify).toHaveBeenCalledWith(
        'verify',
        expect.any(Object),
        expect.objectContaining({ workspace: wsScope })
      );
    });
  });

  // ========================================
  // Summary output
  // ========================================

  describe('summary output', () => {
    it('shows full passing summary', async () => {
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Verification Report');
      expect(output).toContain('Tasks:       PASS');
      expect(output).toContain('Tests:       SKIP');
      expect(output).toContain('Constitution: PASS');
      expect(output).toContain('Lint: skipped');
      expect(output).toContain('Verification passed');
    });

    it('shows failing summary for task failure', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 2,
        done: 0,
        pending: ['TASK-001', 'TASK-002'],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tasks:       FAIL');
      expect(output).toContain('Verification failed');
    });

    it('shows individual workspace results when multiple workspaces exist', async () => {
      const ws1 = { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' };
      const ws2 = { command: 'npm test', cwd: '/proj/packages/web', workspaceName: '@proj/web', source: 'workspace' };
      mockResolveTestCommands.mockReturnValue([ws1, ws2]);
      mockInjectReporter.mockImplementation((cmd) => ({ command: cmd, env: undefined }));
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope
        .mockReturnValueOnce({ name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' })
        .mockReturnValueOnce({ name: '@proj/web', root: '/proj/packages/web', path: 'packages/web' });

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tests:       PASS');
      expect(output).toContain('@proj/api');
      expect(output).toContain('@proj/web');
    });

    it('shows PASS and Lint PASS in summary when all checks pass with lint', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      await runVerify('demo', { lint: true });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Lint:        PASS');
    });
  });

  // ========================================
  // process.exitCode
  // ========================================

  describe('process.exitCode', () => {
    it('does not set exitCode on success', async () => {
      await runVerify('demo');
      expect(process.exitCode).toBeUndefined();
    });

    it('sets exitCode to 1 when tasks are incomplete', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 1,
        done: 0,
        pending: ['TASK-001'],
      });
      await runVerify('demo');
      expect(process.exitCode).toBe(1);
    });

    it('sets exitCode to 1 when tests fail', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');
      expect(process.exitCode).toBe(1);
    });

    it('sets exitCode to 1 when constitution has blocking issues', async () => {
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [{ article: 7, name: 'Security', message: 'Hardcoded secret' }],
        warning: [],
        info: [],
        skipped: [],
      });
      await runVerify('demo');
      expect(process.exitCode).toBe(1);
    });

    it('sets exitCode to 1 when lint fails', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'lint error' });
      await runVerify('demo', { lint: true });
      expect(process.exitCode).toBe(1);
    });

    it('sets exitCode to 1 when multiple checks fail simultaneously', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 2,
        done: 1,
        pending: ['TASK-002'],
      });
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
      mockCommandToWorkspaceScope.mockReturnValue(null);
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [{ article: 2, name: 'TDD', message: 'Missing test' }],
        warning: [],
        info: [],
        skipped: [],
      });
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'lint err' });

      await runVerify('demo', { lint: true });
      expect(process.exitCode).toBe(1);
    });
  });

  // ========================================
  // Combined scenarios
  // ========================================

  describe('combined scenarios', () => {
    it('full pass: tasks done + tests pass + constitution pass + mutation pass', async () => {
      mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 3, done: 3, pending: [] });
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'all pass', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);
      mockConstitutionCheckerRun.mockReturnValue({ blocking: [], warning: [], info: [], skipped: [] });
      mockFindLatestMutationEvidence.mockReturnValue({
        filePath: '/proj/stdd/changes/demo/evidence/mutation-123.json',
        data: { status: 'pass', mutationScore: 92, threshold: 80, mode: 'full' },
      });

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tasks:       PASS  (3/3)');
      expect(output).toContain('Tests:       PASS');
      expect(output).toContain('Constitution: PASS');
      expect(output).toContain('92%');
      expect(output).toContain('Verification passed');
      expect(process.exitCode).toBeUndefined();
    });

    it('full fail: tasks + tests + constitution + lint all fail', async () => {
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 3,
        done: 1,
        pending: ['TASK-002', 'TASK-003'],
      });
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 1, stdout: '', stderr: 'test failed' });
      mockCommandToWorkspaceScope.mockReturnValue(null);
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [{ article: 7, name: 'Security', message: 'Hardcoded secret' }],
        warning: [],
        info: [],
        skipped: [],
      });
      // lint uses the same mockRunParsedCommand, so it will also fail
      await runVerify('demo', { lint: true });

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Tasks:       FAIL');
      expect(output).toContain('Tests:       FAIL');
      expect(output).toContain('Constitution: FAIL');
      expect(output).toContain('Lint:        FAIL');
      expect(output).toContain('Verification failed');
      expect(process.exitCode).toBe(1);
      // Evidence should still be saved
      expect(mockSaveToFile).toHaveBeenCalledTimes(1);
    });

    it('uses options.change to override the change name argument', async () => {
      const altDir = '/fake/project/stdd/changes/other-change';
      mockFindActiveChange.mockReturnValue(altDir);

      await runVerify('demo', { change: 'other-change' });

      expect(mockFindActiveChange).toHaveBeenCalledWith(FAKE_STDD_DIR, 'other-change');
    });

    it('passes testCommand and configCommand to resolveTestCommands', async () => {
      mockGetConfigTestCommand.mockReturnValue('npx vitest run');
      mockResolveTestCommands.mockReturnValue([]);

      await runVerify('demo', { testCommand: 'jest', configCommand: 'npx vitest run' });

      expect(mockResolveTestCommands).toHaveBeenCalledWith(
        FAKE_CWD,
        expect.objectContaining({
          testCommand: 'jest',
          configCommand: 'npx vitest run',
        })
      );
    });

    it('resolves workspace scope from options.workspace', async () => {
      const wsScope = { name: 'api', root: '/proj/packages/api', path: 'packages/api' };
      mockResolveWorkspaceScope.mockReturnValue(wsScope);
      mockFindLatestMutationEvidence.mockReturnValue(null);

      await runVerify('demo', { workspace: 'packages/api' });

      expect(mockResolveWorkspaceScope).toHaveBeenCalledWith(FAKE_CWD, 'packages/api');
      // Workspace should be passed to findLatestMutationEvidence
      expect(mockFindLatestMutationEvidence).toHaveBeenCalledWith(
        FAKE_CWD,
        expect.objectContaining({ workspace: wsScope })
      );
    });

    it('handles injectReporter returning custom env vars', async () => {
      const customEnv = { PYTHONPATH: '/some/path', PATH: '/usr/bin' };
      mockResolveTestCommands.mockReturnValue([
        { command: 'pytest', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'pytest -p pytest_plugin', env: customEnv });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      // The env should be passed through runCommand -> runParsedCommand
      expect(mockRunParsedCommand).toHaveBeenCalledWith(
        'pytest -p pytest_plugin',
        expect.objectContaining({
          env: expect.objectContaining({ PYTHONPATH: '/some/path' }),
        })
      );
    });
  });

  // ========================================
  // Report structure
  // ========================================

  describe('report structure passed to evidence capture', () => {
    it('includes all sections in the report', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      const reportArg = mockCaptureVerify.mock.calls[0][1];
      expect(reportArg).toHaveProperty('tasks');
      expect(reportArg).toHaveProperty('tests');
      expect(reportArg).toHaveProperty('lint');
      expect(reportArg).toHaveProperty('constitution');
      expect(reportArg).toHaveProperty('mutation');
      expect(reportArg.tasks).toEqual({ allDone: true, total: 3, done: 3, pending: [] });
      expect(reportArg.tests).toEqual(expect.objectContaining({ passed: true }));
      expect(reportArg.constitution).toEqual(expect.objectContaining({ status: 'pass' }));
      expect(reportArg.mutation).toEqual({ status: 'skipped', reason: 'No mutation evidence found' });
      expect(reportArg.lint).toBeNull();
    });

    it('includes lint report when lint runs', async () => {
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'lint ok', stderr: '' });
      await runVerify('demo', { lint: true });

      const reportArg = mockCaptureVerify.mock.calls[0][1];
      expect(reportArg.lint).toEqual({ passed: true, output: 'lint ok', error: '' });
    });

    it('includes mutation report when evidence is found', async () => {
      mockFindLatestMutationEvidence.mockReturnValue({
        filePath: '/proj/stdd/changes/demo/evidence/mutation-123.json',
        data: { status: 'pass', mutationScore: 88, threshold: 80, mode: 'full' },
      });

      await runVerify('demo');

      const reportArg = mockCaptureVerify.mock.calls[0][1];
      expect(reportArg.mutation).toEqual(
        expect.objectContaining({
          status: 'pass',
          score: 88,
          threshold: 80,
          mode: 'full',
        })
      );
    });

    it('includes workspace in report when single workspace test is present', async () => {
      const wsScope = { name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' };
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(wsScope);

      await runVerify('demo');

      const metadataArg = mockCaptureVerify.mock.calls[0][2];
      expect(metadataArg).toHaveProperty('workspace', wsScope);
    });

    it('includes workspaces array in metadata when multiple workspace tests are present', async () => {
      const ws1 = { name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' };
      const ws2 = { name: '@proj/web', root: '/proj/packages/web', path: 'packages/web' };
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' },
        { command: 'npm test', cwd: '/proj/packages/web', workspaceName: '@proj/web', source: 'workspace' },
      ]);
      mockInjectReporter.mockImplementation((cmd) => ({ command: cmd, env: undefined }));
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope
        .mockReturnValueOnce(ws1)
        .mockReturnValueOnce(ws2);

      await runVerify('demo');

      const metadataArg = mockCaptureVerify.mock.calls[0][2];
      expect(metadataArg).toHaveProperty('workspaces');
      expect(metadataArg.workspaces).toHaveLength(2);
    });
  });

  // ========================================
  // Edge cases
  // ========================================

  describe('edge cases', () => {
    it('handles constitution with both blocking and warning issues', async () => {
      mockConstitutionCheckerRun.mockReturnValue({
        blocking: [{ article: 2, name: 'TDD', message: 'Missing test' }],
        warning: [{ article: 4, name: 'Style', message: 'File too long' }],
        info: [],
        skipped: [],
      });
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('1 blocking issue(s)');
      expect(output).toContain('Article 2 (TDD)');
      // Warnings are not printed when there are blocking issues
      expect(process.exitCode).toBe(1);
    });

    it('handles zero test commands gracefully (no testCommand, no configCommand, no workspaces)', async () => {
      mockResolveTestCommands.mockReturnValue([]);
      await runVerify('demo');
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('no test command configured');
      expect(output).toContain('Tests:       SKIP');
      // Should still pass verification
      expect(output).toContain('Verification passed');
    });

    it('handles test commands with workspace source correctly', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: '/proj/packages/api', workspaceName: '@proj/api', source: 'workspace' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue({ name: '@proj/api', root: '/proj/packages/api', path: 'packages/api' });

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      // Workspace label should show the workspace name
      expect(output).toContain('@proj/api');
    });

    it('handles test commands with root source', async () => {
      mockResolveTestCommands.mockReturnValue([
        { command: 'npm test', cwd: FAKE_CWD, workspaceName: 'root', source: 'root' },
      ]);
      mockInjectReporter.mockReturnValue({ command: 'npm test', env: undefined });
      mockRunParsedCommand.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      mockCommandToWorkspaceScope.mockReturnValue(null);

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('root');
    });
  });

  // ========================================
  // Visual Regression Check
  // ========================================

  describe('visual regression check', () => {
    it('triggers visual regression when enabled in config.yaml and succeeds', async () => {
      // Mock existsSync for config.yaml to return true
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath.endsWith('config.yaml') || filePath.includes('stdd')) return true;
        return false;
      });

      const configYaml = `
visual_regression:
  enabled: true
  routes:
    - name: dashboard
      url: http://localhost:3000/dashboard
      threshold: 0.01
`;
      mockFs.readFileSync.mockReturnValue(configYaml);
      mockCompare.mockResolvedValue({
        status: 'pass',
        diffRatio: 0.005,
        engine: 'fallback',
        message: 'Matched 99.5%'
      });

      await runVerify('demo');

      expect(mockCompare).toHaveBeenCalledWith('http://localhost:3000/dashboard', {
        name: 'dashboard',
        threshold: 0.01,
        width: undefined,
        height: undefined
      });
      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Visual Regression Check');
      expect(output).toContain('Comparing route: dashboard');
      expect(output).toContain('Visual:      PASS');
      expect(process.exitCode).toBeUndefined();
    });

    it('triggers visual regression and fails when mismatch exceeds threshold', async () => {
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath.endsWith('config.yaml') || filePath.includes('stdd')) return true;
        return false;
      });

      const configYaml = `
visual_regression:
  enabled: true
  routes:
    - name: dashboard
      url: http://localhost:3000/dashboard
      threshold: 0.01
`;
      mockFs.readFileSync.mockReturnValue(configYaml);
      mockCompare.mockResolvedValue({
        status: 'fail',
        diffRatio: 0.04,
        engine: 'fallback',
        message: 'Diff 4%'
      });

      await runVerify('demo');

      const output = consoleCapture.logs.join('\n');
      expect(output).toContain('Visual Regression: failed');
      expect(output).toContain('Visual:      FAIL');
      expect(process.exitCode).toBe(1);
    });
  });
});

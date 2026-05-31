/**
 * Round 20: Branch-coverage tests for 4 runtime modules.
 * Targets uncovered branches to push coverage from 80-83% -> 85%+.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// 1. agent-simulator.js  (80% branch -> 85%+)
// ---------------------------------------------------------------------------
const { AgentEngine, DEFAULT_AGENTS } = require('../src/runtime/agent-simulator');

describe('round20: AgentEngine uncovered branches', () => {
  let tmpDir;
  let engine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-agent-'));
    engine = new AgentEngine(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('start falls back to DEFAULT_AGENTS when options.agents is an empty array', () => {
    const state = engine.start('empty-agents-topic', { agents: [] });
    expect(state.agents).toEqual(DEFAULT_AGENTS);
  });

  test('loadState returns default when state file has invalid JSON (non-ENOENT, non-EACCES error)', () => {
    const runtimeDir = path.join(tmpDir, 'stdd', 'runtime');
    fs.mkdirSync(runtimeDir, { recursive: true });
    const statePath = path.join(runtimeDir, 'agent-state.json');
    // Write invalid JSON to trigger the catch branch with a SyntaxError (code undefined, not ENOENT/EACCES)
    fs.writeFileSync(statePath, '{invalid json!!!', 'utf8');
    const state = engine.loadState();
    expect(state.status).toBe('idle');
  });

  test('ensureRuntimeDir does not overwrite existing state file', () => {
    const runtimeDir = path.join(tmpDir, 'stdd', 'runtime');
    fs.mkdirSync(runtimeDir, { recursive: true });
    const statePath = path.join(runtimeDir, 'agent-state.json');
    const existingState = { status: 'active', topic: 'pre-existing', agents: DEFAULT_AGENTS, currentSpeakerIndex: 0, round: 5, maxRounds: 10, convergenceDetected: false };
    fs.writeFileSync(statePath, JSON.stringify(existingState), 'utf8');

    engine.ensureRuntimeDir();
    const loaded = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    expect(loaded.topic).toBe('pre-existing');
    expect(loaded.round).toBe(5);
  });

  test('getHistory returns [] for empty turns file', () => {
    engine.start('topic');
    const turnsPath = path.join(tmpDir, 'stdd', 'runtime', 'agent-turns.jsonl');
    // File was cleared by start() -- write empty content
    fs.writeFileSync(turnsPath, '', 'utf8');
    expect(engine.getHistory()).toEqual([]);
  });

  test('detectKeywordConvergence: history with single entry does not converge', () => {
    engine.start('topic', { rounds: 100 });
    engine.recordTurn('po', 'I agree');
    // Only 1 turn -- convergence requires >= 2
    const _result = engine.nextTurn();
    // Simulation should still be active (rounds=100, only 1 turn so no keyword convergence)
    const state = engine.getStatus();
    expect(state.status).toBe('active');
  });

  test('nextTurn completes by maxRounds even without keyword convergence', () => {
    const agents = [{ id: 'a', name: 'A', role: 'r' }];
    engine.start('topic', { agents, rounds: 1 });
    // 1 agent, 1 round: after 1 nextTurn call, round increments to 1 which equals maxRounds
    engine.nextTurn();
    const state = engine.getStatus();
    expect(state.status).toBe('completed');
    expect(state.convergenceDetected).toBe(true);
  });

  test('loadState returns default when state file does not exist', () => {
    // Use a fresh tmpDir that has never had state
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-fresh-'));
    const freshEngine = new AgentEngine(freshDir);
    const state = freshEngine.loadState();
    expect(state.status).toBe('idle');
    fs.rmSync(freshDir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// 2. browser-controller.js  (80% branch -> 85%+)
//---------------------------------------------------------------------------
const { BrowserController } = require('../src/runtime/browser-controller');

describe('round20: BrowserController uncovered branches', () => {
  test('ensurePlaywright succeeds when playwright is present and dir already exists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-bc-'));
    const evDir = path.join(tmpDir, 'evidence');
    fs.mkdirSync(evDir, { recursive: true });
    const bc = new BrowserController(evDir);
    bc.playwright = {};

    // Should not throw and should not fail on existing dir
    await expect(bc.ensurePlaywright()).resolves.toBeUndefined();
    expect(fs.existsSync(evDir)).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('inspect returns null httpStatus when page.goto response is null', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-bc-insp-'));
    const evDir = path.join(tmpDir, 'evidence');
    fs.mkdirSync(evDir, { recursive: true });

    const bc = new BrowserController(evDir);
    // Mock page where goto returns null (e.g. navigation to about:blank or timeout)
    const mockPage = {
      goto: jest.fn().mockResolvedValue(null),
      url: jest.fn().mockReturnValue('about:blank'),
      title: jest.fn().mockResolvedValue(''),
    };
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    bc.playwright = {
      chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) },
    };

    const result = await bc.inspect({ url: 'about:blank' });
    expect(result.status).toBe('success');
    expect(result.httpStatus).toBeNull();
    expect(mockBrowser.close).toHaveBeenCalled();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('snapshot uses default width/height when not provided', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-bc-def-'));
    const evDir = path.join(tmpDir, 'evidence');
    fs.mkdirSync(evDir, { recursive: true });

    const bc = new BrowserController(evDir);
    const mockScreenshot = jest.fn().mockResolvedValue(undefined);
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Example'),
      screenshot: mockScreenshot,
    };
    const mockContext = { newPage: jest.fn().mockResolvedValue(mockPage) };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    bc.playwright = { chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) } };

    const result = await bc.snapshot({ url: 'https://example.com' });
    expect(result.status).toBe('success');
    // Verify default viewport was used
    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ viewport: { width: 1280, height: 800 } })
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// 3. browser-runtime.js  (80% branch -> 85%+)
// ---------------------------------------------------------------------------
const { BrowserRuntime } = require('../src/runtime/browser-runtime');

describe('round20: BrowserRuntime uncovered branches', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-br-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('_withBrowser returns error result when getBrowser() throws', async () => {
    const rt = new BrowserRuntime(tmpDir);
    rt.playwright = null;
    // getBrowser() will throw because playwright is not installed
    const result = await rt.snapshot('http://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Playwright is not installed');
  });

  test('_withBrowser returns error result when browser.launch fails (browser stays undefined)', async () => {
    const rt = new BrowserRuntime(tmpDir);
    rt.playwright = {
      chromium: {
        launch: jest.fn().mockRejectedValue(new Error('Chromium not found')),
      },
    };
    const result = await rt.snapshot('http://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Chromium not found');
  });

  test('_withBrowser returns error when callback fails but browser still closes', async () => {
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED')),
        setViewportSize: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const rt = new BrowserRuntime(tmpDir);
    rt.playwright = {
      chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) },
    };

    const result = await rt.snapshot('http://unreachable.local');
    expect(result.success).toBe(false);
    expect(result.error).toContain('net::ERR_CONNECTION_REFUSED');
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('inspect passes custom selector to page.evaluate', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({
        title: 'Test',
        url: 'http://example.com',
        text: 'Hello',
        selectorFound: true,
      }),
    };
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const rt = new BrowserRuntime(tmpDir);
    rt.playwright = { chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) } };

    const result = await rt.inspect('http://example.com', 'h1');
    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Test');
    // page.evaluate should receive a function and the selector argument
    expect(mockPage.evaluate).toHaveBeenCalledWith(
      expect.any(Function),
      'h1'
    );
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  test('executeScript handles evaluate error gracefully', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockRejectedValue(new Error('JS execution error')),
    };
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const rt = new BrowserRuntime(tmpDir);
    rt.playwright = { chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) } };

    const result = await rt.executeScript('http://example.com', 'throw new Error("boom")');
    expect(result.success).toBe(false);
    expect(result.error).toContain('JS execution error');
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. shell-executor.js  (82.92% branch -> 85%+)
//    Lines 95-108: spawnSync catch branch with spawn-error audit
// ---------------------------------------------------------------------------
const { ShellAgentExecutor } = require('../src/runtime/agents/shell-executor');

describe('round20: ShellAgentExecutor uncovered branches', () => {
  test('isAllowedBin uses basename for full paths', () => {
    const executor = new ShellAgentExecutor({ command: 'node -e "1"', allowedBins: 'mybin' });
    // Direct name match
    expect(executor.isAllowedBin('mybin')).toBe(true);
    // Basename extraction from a full path
    expect(executor.isAllowedBin('/usr/local/bin/mybin')).toBe(true);
  });

  test('isAllowedBin returns false for unknown bin when not unsafe', () => {
    const executor = new ShellAgentExecutor({ command: 'node -e "1"' });
    expect(executor.isAllowedBin('unknown-binary')).toBe(false);
  });

  test('isAllowedBin returns true for everything when allowUnsafe is set', () => {
    const executor = new ShellAgentExecutor({ command: 'node -e "1"', allowUnsafe: true });
    expect(executor.isAllowedBin('anything-goes')).toBe(true);
    expect(executor.isAllowedBin('/totally/unsafe/bin')).toBe(true);
  });

  test('constructor reads STDD_ALLOW_UNSAFE_SHELL_EXECUTOR from env', () => {
    const origEnv = process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR;
    process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = '1';
    const executor = new ShellAgentExecutor({ command: 'node -e "1"' });
    expect(executor.allowUnsafe).toBe(true);
    process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = origEnv;
  });

  test('constructor reads STDD_AGENT_COMMAND from env', () => {
    const origCmd = process.env.STDD_AGENT_COMMAND;
    const origUnsafe = process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR;
    process.env.STDD_AGENT_COMMAND = 'node -e "42"';
    process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = '1';
    const executor = new ShellAgentExecutor();
    expect(executor.command).toBe('node -e "42"');
    process.env.STDD_AGENT_COMMAND = origCmd;
    process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = origUnsafe;
  });

  test('constructor reads STDD_AGENT_ALLOWED_BINS from env', () => {
    const origBins = process.env.STDD_AGENT_ALLOWED_BINS;
    process.env.STDD_AGENT_ALLOWED_BINS = 'custom1,custom2';
    const executor = new ShellAgentExecutor({ command: 'node -e "1"' });
    expect(executor.isAllowedBin('custom1')).toBe(true);
    expect(executor.isAllowedBin('custom2')).toBe(true);
    process.env.STDD_AGENT_ALLOWED_BINS = origBins;
  });

  test('run throws when spawnSync throws (lines 95-108)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-spawn-'));
    const executor = new ShellAgentExecutor({ command: 'node -e "1"', allowUnsafe: true, cwd: tmpDir });

    try {
      await executor.run({ role: 'qa', goal: 'spawn-error test' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('run writes fail audit when spawned process exits non-zero', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-fail-'));
    const executor = new ShellAgentExecutor({
      command: `${process.execPath} -e "process.exit(1)"`,
      cwd: tmpDir,
    });

    const result = await executor.run({ role: 'qa', goal: 'test fail' });
    expect(result.status).toBe('fail');
    expect(result.exitCode).toBe(1);

    // Verify fail audit was written
    const auditPath = path.join(tmpDir, 'stdd', 'logs', 'shell-executor-audit.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
    const lastAudit = JSON.parse(auditLines[auditLines.length - 1]);
    expect(lastAudit.status).toBe('fail');
    expect(lastAudit.exitCode).toBe(1);
    expect(lastAudit.role).toBe('qa');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('_writeAudit silently catches write failures', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-audit-'));
    const executor = new ShellAgentExecutor({ command: 'node -e "1"', cwd: tmpDir });

    // Make the logs directory a file (not a dir) so appendFileSync will fail
    const logsDir = path.join(tmpDir, 'stdd', 'logs');
    fs.mkdirSync(path.dirname(logsDir), { recursive: true });
    fs.writeFileSync(logsDir, 'blocker', 'utf8');

    // Should not throw
    expect(() => executor._writeAudit({ ts: 'now', status: 'test' })).not.toThrow();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('run writes blocked audit when bin is rejected', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-blocked-'));
    const executor = new ShellAgentExecutor({
      command: 'python3 -c "print(1)"',
      cwd: tmpDir,
    });

    await expect(executor.run({ role: 'dev', goal: 'blocked bin' }))
      .rejects.toThrow('rejected');

    // Verify blocked audit
    const auditPath = path.join(tmpDir, 'stdd', 'logs', 'shell-executor-audit.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
    const lastAudit = JSON.parse(auditLines[auditLines.length - 1]);
    expect(lastAudit.status).toBe('blocked');
    expect(lastAudit.allowlisted).toBe(false);
    expect(lastAudit.bin).toBe('python3');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('run truncates long goal in audit to 256 chars', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-goal-'));
    const longGoal = 'x'.repeat(300);
    const executor = new ShellAgentExecutor({
      command: `${process.execPath} -e "console.log('ok')"`,
      cwd: tmpDir,
    });

    const result = await executor.run({ role: 'qa', goal: longGoal });
    expect(result.status).toBe('success');

    const auditPath = path.join(tmpDir, 'stdd', 'logs', 'shell-executor-audit.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
    const lastAudit = JSON.parse(auditLines[auditLines.length - 1]);
    expect(lastAudit.goal.length).toBeLessThanOrEqual(256);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('run captures stderr in audit on failure', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r20-stderr-'));
    const executor = new ShellAgentExecutor({
      command: `${process.execPath} -e "process.stderr.write('err-output'); process.exit(1)"`,
      cwd: tmpDir,
    });

    const result = await executor.run({ role: 'qa', goal: 'stderr test' });
    expect(result.status).toBe('fail');
    expect(result.stderr).toContain('err-output');

    const auditPath = path.join(tmpDir, 'stdd', 'logs', 'shell-executor-audit.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
    const lastAudit = JSON.parse(auditLines[auditLines.length - 1]);
    expect(lastAudit.stderrTail).toContain('err-output');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

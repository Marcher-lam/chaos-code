const fs = require('fs');
const os = require('os');
const path = require('path');
const child_process = require('child_process');
const { EventEmitter } = require('events');
const { AgentHooks } = require('../src/runtime/agent-kernel/hooks');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');

jest.mock('child_process');
jest.mock('../src/runtime/agent-kernel/index');
jest.mock('../src/runtime/agent-kernel/provider-config', () => ({
  initFromEnv: jest.fn(() => null),
  getActive: jest.fn(() => null),
  setActive: jest.fn(),
  listProviders: jest.fn(() => []),
  addProvider: jest.fn(),
  BUILTIN_PROVIDERS: {},
}));

/**
 * Fake async child for child_process.spawn mocks. Emits captured stdio and
 * closes with `status` on the next macrotask, mimicking real spawn timing.
 */
function fakeSpawn(status, { stdout = '', stderr = '' } = {}) {
  return () => {
    const child = new EventEmitter();
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = jest.fn();
    setImmediate(() => {
      if (stdout) child.stdout.emit('data', Buffer.from(stdout));
      if (stderr) child.stderr.emit('data', Buffer.from(stderr));
      child.emit('close', status);
    });
    return child;
  };
}

/** A child that never exits until killed — for timeout tests. */
function fakeHangingSpawn() {
  return () => {
    const child = new EventEmitter();
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = jest.fn(() => child.emit('close', null));
    return child;
  };
}

function makeHomeWithHooks(hooks) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-home-'));
  fs.mkdirSync(path.join(home, '.chaos'), { recursive: true });
  fs.writeFileSync(path.join(home, '.chaos', 'config.json'), JSON.stringify({ hooks }));
  return home;
}

describe('AgentHooks runtime (async spawn)', () => {
  let originalEnv;
  let originalHomedir;
  let tmpWork;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    originalHomedir = os.homedir;
    jest.clearAllMocks();
    tmpWork = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-hooks-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    os.homedir = originalHomedir;
    fs.rmSync(tmpWork, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('is a no-op when no hooks are configured (no spawn at all)', async () => {
    const emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-home-'));
    os.homedir = () => emptyHome;

    const hooks = new AgentHooks(tmpWork);
    expect(hooks.enabled).toBe(false);
    await expect(hooks.preToolUse({ tool: 'fs_write' })).resolves.toEqual({ blocked: false });
    expect(child_process.spawn).not.toHaveBeenCalled();
  });

  it('blocks a tool when a preToolUse hook exits non-zero', async () => {
    os.homedir = () => makeHomeWithHooks({ preToolUse: [{ command: 'node guard.js', timeout: 2000 }] });
    child_process.spawn.mockImplementation(fakeSpawn(1, { stderr: 'forbidden by policy' }));

    const hooks = new AgentHooks(tmpWork);
    const verdict = await hooks.preToolUse({ tool: 'fs_write', args: { path: 'x' } });

    expect(verdict.blocked).toBe(true);
    expect(verdict.reason).toContain('forbidden by policy');
    // payload delivered as JSON on stdin
    const child = child_process.spawn.mock.results[0].value;
    expect(JSON.parse(child.stdin.write.mock.calls[0][0])).toMatchObject({ event: 'preToolUse', tool: 'fs_write' });
  });

  it('allows the tool when the hook exits zero', async () => {
    os.homedir = () => makeHomeWithHooks({ preToolUse: [{ command: 'true' }] });
    child_process.spawn.mockImplementation(fakeSpawn(0));

    const hooks = new AgentHooks(tmpWork);
    await expect(hooks.preToolUse({ tool: 'fs_read' })).resolves.toEqual({ blocked: false });
  });

  it('accepts the string shorthand form', async () => {
    os.homedir = () => makeHomeWithHooks({ preToolUse: 'deny-all' });
    child_process.spawn.mockImplementation(fakeSpawn(2, { stderr: 'nope' }));

    const hooks = new AgentHooks(tmpWork);
    expect(hooks.enabled).toBe(true);
    const verdict = await hooks.preToolUse({ tool: 'x' });
    expect(verdict.blocked).toBe(true);
  });

  it('times out a hanging hook: SIGKILL + block (fail-closed)', async () => {
    os.homedir = () => makeHomeWithHooks({ preToolUse: [{ command: 'sleep 60', timeout: 1000 }] });
    child_process.spawn.mockImplementation(fakeHangingSpawn());

    const hooks = new AgentHooks(tmpWork);
    const t0 = Date.now();
    const verdict = await hooks.preToolUse({ tool: 'fs_write' });

    expect(Date.now() - t0).toBeLessThan(5000);
    expect(verdict.blocked).toBe(true);
    expect(verdict.reason).toContain('timed out');
    const child = child_process.spawn.mock.results[0].value;
    expect(child.kill).toHaveBeenCalled();
  }, 10000);

  it('postToolUse failures never reject', async () => {
    os.homedir = () => makeHomeWithHooks({ postToolUse: [{ command: 'log.js' }] });
    child_process.spawn.mockImplementation(fakeSpawn(1, { stderr: 'log broken' }));

    const hooks = new AgentHooks(tmpWork);
    await expect(hooks.postToolUse({ tool: 'fs_write', result: { ok: 1 } })).resolves.toBeUndefined();
    const child = child_process.spawn.mock.results[0].value;
    const payload = JSON.parse(child.stdin.write.mock.calls[0][0]);
    expect(payload.event).toBe('postToolUse');
    expect(payload.result).toBe('{"ok":1}');
  });

  describe('integration with the agent loop', () => {
    it('a blocking hook vetoes the tool call and reports the reason to the model', async () => {
      os.homedir = () => makeHomeWithHooks({ preToolUse: [{ command: 'guard' }] });
      child_process.spawn.mockImplementation(fakeSpawn(1, { stderr: 'blocked: secrets' }));

      const loop = new ChaosAgentLoop(tmpWork);
      expect(loop.hooks.enabled).toBe(true);

      let callCount = 0;
      const toolResults = [];
      jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'fs_read', arguments: { path: 'a.txt' } }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'fs_read', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'ack', toolCalls: [], usage: {} };
      });

      const messages = await loop.run('read a.txt', [], {
        onMessage: () => {},
        onToolStart: () => {},
        onToolEnd: (name, res) => toolResults.push(res),
      });

      const toolMsg = messages.find(m => m.role === 'tool');
      expect(toolMsg).toBeDefined();
      expect(toolMsg.content).toContain('Blocked by preToolUse hook');
      expect(toolMsg.content).toContain('blocked: secrets');
      expect(toolResults[0].error).toContain('Blocked by preToolUse hook');
    });

    it('postToolUse runs after a successful tool execution', async () => {
      os.homedir = () => makeHomeWithHooks({ postToolUse: [{ command: 'log' }] });
      child_process.spawn.mockImplementation(fakeSpawn(0));

      const loop = new ChaosAgentLoop(tmpWork);
      let callCount = 0;
      jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'task_list', arguments: {} }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'task_list', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'done', toolCalls: [], usage: {} };
      });

      await loop.run('list tasks', [], { onMessage: () => {} });

      const child = child_process.spawn.mock.results[0].value;
      const payload = JSON.parse(child.stdin.write.mock.calls[0][0]);
      expect(payload.event).toBe('postToolUse');
      expect(payload.tool).toBe('task_list');
    });
  });
});

const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const { dispatchSubagents, runSubagent, READ_ONLY_TOOLS, MAX_TASKS_PER_DISPATCH } = require('../src/runtime/agent-kernel/subagent');
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../src/runtime/agent-kernel/index');
jest.mock('../src/runtime/agent-kernel/provider-config', () => ({
  initFromEnv: jest.fn(() => null),
  getActive: jest.fn(() => null),
  setActive: jest.fn(),
  listProviders: jest.fn(() => []),
  addProvider: jest.fn(),
  BUILTIN_PROVIDERS: {},
}));

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-subagent-'));
}

function makeLoop(tmpDir) {
  const loop = new ChaosAgentLoop(tmpDir);
  loop.apiKey = 'test-key';
  loop.provider = 'openai';
  loop.model = 'gpt-4o-mini';
  loop.baseUrl = undefined;
  return loop;
}

describe('Subagent dispatch', () => {
  let tmpDir;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('constructor kernel injection', () => {
    it('reuses an injected kernel instead of constructing a new one', () => {
      const parent = makeLoop(tmpDir);
      const sub = new ChaosAgentLoop(tmpDir, { kernel: parent.kernel });
      expect(sub.kernel).toBe(parent.kernel);
    });

    it('shares provider credentials from the parent loop in runSubagent', async () => {
      const parent = makeLoop(tmpDir);
      parent.model = 'custom-model-x';

      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async function () {
        // `this` is the subagent instance
        expect(this.model).toBe('custom-model-x');
        expect(this.apiKey).toBe('test-key');
        return { content: 'done', toolCalls: [], usage: { prompt_tokens: 5, completion_tokens: 3 } };
      });

      const result = await runSubagent({ parentLoop: parent, task: { prompt: 'explore the repo' } });
      expect(result.ok).toBe(true);
      expect(result.summary).toBe('done');
      expect(result.turnsUsed).toBe(1);
    });
  });

  describe('tool whitelist enforcement', () => {
    it('default whitelist is read-only', () => {
      expect(READ_ONLY_TOOLS).toContain('fs_read');
      expect(READ_ONLY_TOOLS).not.toContain('fs_write');
      expect(READ_ONLY_TOOLS).not.toContain('shell_run');
    });

    it('_getLLMTools filters the catalog to allowed tools', () => {
      const loop = makeLoop(tmpDir);
      loop.allowedTools = new Set(['fs_read', 'git_log']);
      const names = loop._getLLMTools().map(t => t.function.name);
      expect(names).toContain('fs_read');
      expect(names).toContain('git_log');
      expect(names).not.toContain('fs_write');
      expect(names).not.toContain('task_dispatch');
    });

    it('_executeTool rejects a non-allowed tool with a helpful error', async () => {
      const loop = makeLoop(tmpDir);
      loop.allowedTools = new Set(['fs_read']);
      const res = await loop._executeTool('fs_write', { path: 'x' });
      expect(res.error).toContain('not available');
      expect(res.error).toContain('fs_read');
    });

    it('subagents get an isolated history and default to read-only tools', async () => {
      const parent = makeLoop(tmpDir);
      const seenAllowed = [];
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async function () {
        seenAllowed.push(this.allowedTools ? [...this.allowedTools] : null);
        return { content: 'investigated', toolCalls: [], usage: { prompt_tokens: 1, completion_tokens: 1 } };
      });

      await parent._executeTool('task_dispatch', { tasks: [{ prompt: 'look around' }] });
      expect(seenAllowed).toHaveLength(1);
      expect(seenAllowed[0]).toEqual(expect.arrayContaining(READ_ONLY_TOOLS));
    });
  });

  describe('permission passthrough', () => {
    it('granted guarded tools go through the parent askPermission callback', async () => {
      const parent = makeLoop(tmpDir);
      const askPermission = jest.fn().mockResolvedValue(false);
      parent._currentCallbacks = { askPermission };

      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM')
        .mockImplementationOnce(async () => ({
          content: null,
          toolCalls: [{ id: 'call_1', name: 'shell_run', arguments: { command: 'echo hi' } }],
          toolCallsRaw: [{ id: 'call_1', type: 'function', function: { name: 'shell_run', arguments: '{}' } }],
          usage: {},
        }))
        .mockImplementationOnce(async () => ({
          content: 'user said no, skipped',
          toolCalls: [],
          usage: {},
        }));

      const result = await parent._executeTool('task_dispatch', {
        tasks: [{ prompt: 'run echo', tools: ['shell_run', 'fs_read'] }],
      });

      expect(askPermission).toHaveBeenCalledTimes(1);
      expect(askPermission).toHaveBeenCalledWith('shell_run', { command: 'echo hi' });
      expect(result.status).toBe('ok');
      expect(result.results[0].ok).toBe(true);
    });
  });

  describe('dispatch aggregation', () => {
    it('aggregates results and folds subagent tokens into parent stats', async () => {
      const parent = makeLoop(tmpDir);
      const before = parent.totalPromptTokens;

      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => ({
        content: 'result text',
        toolCalls: [],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }));

      const res = await parent._executeTool('task_dispatch', {
        tasks: [{ prompt: 'a' }, { prompt: 'b' }],
      });

      expect(res.status).toBe('ok');
      expect(res.count).toBe(2);
      expect(res.okCount).toBe(2);
      expect(res.results.map(r => r.summary)).toEqual(['result text', 'result text']);
      expect(parent.totalPromptTokens).toBe(before + 20);
    });

    it('caps tasks per dispatch', async () => {
      const parent = makeLoop(tmpDir);
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => ({
        content: 'ok', toolCalls: [], usage: {},
      }));
      const tooMany = Array.from({ length: MAX_TASKS_PER_DISPATCH + 2 }, (_, i) => ({ prompt: `t${i}` }));
      const res = await parent._executeTool('task_dispatch', { tasks: tooMany });
      expect(res.count).toBe(MAX_TASKS_PER_DISPATCH);
    });

    it('captures subagent errors instead of throwing', async () => {
      const parent = makeLoop(tmpDir);
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
        throw new Error('provider exploded');
      });
      const res = await parent._executeTool('task_dispatch', { tasks: [{ prompt: 'doomed' }] });
      expect(res.results[0].ok).toBe(false);
      expect(res.results[0].error).toContain('provider exploded');
    });

    it('runs at most 3 subagents concurrently', async () => {
      const parent = makeLoop(tmpDir);
      let active = 0;
      let maxActive = 0;

      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(r => setTimeout(r, 15));
        active--;
        return { content: 'done', toolCalls: [], usage: {} };
      });

      const res = await dispatchSubagents({
        parentLoop: parent,
        tasks: [{ prompt: '1' }, { prompt: '2' }, { prompt: '3' }, { prompt: '4' }, { prompt: '5' }],
      });

      expect(res.count).toBe(5);
      expect(maxActive).toBeLessThanOrEqual(3);
      expect(maxActive).toBeGreaterThan(1); // actually parallel
    });

    it('accepts the single-task convenience form', async () => {
      const parent = makeLoop(tmpDir);
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => ({
        content: 'single', toolCalls: [], usage: {},
      }));
      const res = await parent._executeTool('task_dispatch', { prompt: 'just one' });
      expect(res.count).toBe(1);
      expect(res.results[0].summary).toBe('single');
    });

    it('errors on empty dispatch', async () => {
      const parent = makeLoop(tmpDir);
      const res = await parent._executeTool('task_dispatch', {});
      expect(res.status).toBe('error');
    });
  });

  describe('LLM tool catalog', () => {
    it('exposes task_dispatch and skill to the main loop', () => {
      const loop = makeLoop(tmpDir);
      const names = loop._getLLMTools().map(t => t.function.name);
      expect(names).toContain('task_dispatch');
      expect(names).toContain('skill');
      expect(names).toContain('git_pull');
      expect(names).toContain('git_log');
      expect(names).toContain('git_stash');
    });
  });
});

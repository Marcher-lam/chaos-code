const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { ReadOnlyToolExecutor } = require('../src/runtime/agent-kernel/read-only-tools');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');

jest.mock('https');
jest.mock('../src/runtime/agent-kernel/index');
jest.mock('../src/runtime/agent-kernel/provider-config', () => ({
  initFromEnv: jest.fn(() => null),
  getActive: jest.fn(() => null),
  setActive: jest.fn(),
  listProviders: jest.fn(() => []),
  addProvider: jest.fn(),
  BUILTIN_PROVIDERS: {},
}));

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

function tmp(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function imageToolResult(p, data) {
  return {
    tool: 'fs.read_image',
    path: p,
    mimeType: 'image/png',
    bytes: data ? Buffer.byteLength(data, 'base64') : 100,
    note: 'loaded',
    _image: { data: data || TINY_PNG.toString('base64'), mimeType: 'image/png', detail: 'auto' },
  };
}

function mockLlmScriptingImageTurn() {
  return jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async function () {
    if (!this.__imageTurnDone) {
      this.__imageTurnDone = true;
      return {
        content: null,
        toolCalls: [{ id: 'c1', name: 'fs_read_image', arguments: { path: 'shot.png' } }],
        toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'fs_read_image', arguments: '{}' } }],
        usage: {},
      };
    }
    return { content: 'the image shows a red square', toolCalls: [], usage: {} };
  });
}

describe('multimodal image input (fs_read_image)', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('readImage executor', () => {
    let dir;
    let ro;

    beforeEach(() => {
      dir = tmp('chaos-img-');
      fs.writeFileSync(path.join(dir, 'shot.png'), TINY_PNG);
      ro = new ReadOnlyToolExecutor({ cwd: dir });
    });
    afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    it('reads a png into base64 with mime metadata', () => {
      const res = ro.readImage({ path: 'shot.png' });
      expect(res.tool).toBe('fs.read_image');
      expect(res.mimeType).toBe('image/png');
      expect(res._image.data).toBe(TINY_PNG.toString('base64'));
      expect(res._image.mimeType).toBe('image/png');
    });

    it('rejects non-image extensions', () => {
      fs.writeFileSync(path.join(dir, 'note.txt'), 'x');
      expect(() => ro.readImage({ path: 'note.txt' })).toThrow(/Unsupported image type/);
    });

    it('rejects images over 5MB', () => {
      const big = path.join(dir, 'big.png');
      fs.writeFileSync(big, Buffer.alloc(5 * 1024 * 1024 + 1, 1));
      expect(() => ro.readImage({ path: 'big.png' })).toThrow(/5MB limit/);
      fs.rmSync(big);
    });

    it('refuses paths outside the workspace', () => {
      expect(() => ro.readImage({ path: '../../etc/passwd.png' })).toThrow();
    });
  });

  describe('OpenAI wire mapping', () => {
    it('tool message gets a text placeholder + a following user image_url vision block', async () => {
      const dir = tmp('chaos-img2-');
      const loop = new ChaosAgentLoop(dir);
      loop.apiKey = 'k';
      loop.provider = 'openai';
      loop.kernel.executeTool.mockReturnValue(imageToolResult('shot.png'));

      mockLlmScriptingImageTurn();
      const messages = await loop.run('look at shot.png', [], { onMessage: () => {} });

      const toolMsg = messages.find(m => m.role === 'tool');
      expect(toolMsg.content).toContain('vision block');
      expect(toolMsg.content).not.toContain('base64'); // raw image stays OUT of the tool text

      const imgMsg = messages.find(m => m.role === 'user' && Array.isArray(m.content));
      expect(imgMsg).toBeDefined();
      expect(imgMsg.content[0].type).toBe('image_url');
      expect(imgMsg.content[0].image_url.url).toMatch(/^data:image\/png;base64,/);
      expect(imgMsg.content[0].image_url.detail).toBe('auto');
      expect(imgMsg.content[1].text).toContain('shot.png');
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('the image_url user message survives payload construction unchanged', async () => {
      let payload = null;
      https.request.mockImplementation((url, options, callback) => ({
        on: jest.fn(),
        write: jest.fn(body => { payload = JSON.parse(body); }),
        end: jest.fn(() => callback({
          statusCode: 200,
          on: (e, cb) => {
            if (e === 'data') cb('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n');
            if (e === 'end') cb();
          },
        })),
      }));

      const loop = new ChaosAgentLoop(tmp('chaos-img3-'));
      loop.apiKey = 'k';
      loop.provider = 'openai';
      const imgMsg = {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA', detail: 'low' } },
          { type: 'text', text: '[Image from fs_read_image: x.png]' },
        ],
      };
      await loop._callOpenAIStream([{ role: 'user', content: 'hi' }, imgMsg], null, null);
      const sent = payload.messages.find(m => Array.isArray(m.content));
      expect(sent.content[0].image_url.url).toBe('data:image/png;base64,AAA');
    });
  });

  describe('Anthropic wire mapping', () => {
    it('the image block lives INSIDE the tool_result content array', async () => {
      const dir = tmp('chaos-img4-');
      const loop = new ChaosAgentLoop(dir);
      loop.apiKey = 'k';
      loop.provider = 'anthropic';
      loop.kernel.executeTool.mockReturnValue(imageToolResult('shot.png'));

      mockLlmScriptingImageTurn();
      const messages = await loop.run('look at shot.png', [], { onMessage: () => {} });

      const trMsg = messages.find(m => m.role === 'user' && Array.isArray(m.content) && m.content[0] && m.content[0].type === 'tool_result');
      expect(trMsg).toBeDefined();
      const blocks = trMsg.content[0].content;
      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('image');
      expect(blocks[1].source).toMatchObject({ type: 'base64', media_type: 'image/png' });
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  it('fs_read_image is in the LLM tool catalog and read-only for subagents', () => {
    const { READ_ONLY_TOOLS } = require('../src/runtime/agent-kernel/subagent');
    const loop = new ChaosAgentLoop(tmp('chaos-img5-'));
    const names = loop._getLLMTools().map(t => t.function.name);
    expect(names).toContain('fs_read_image');
    expect(READ_ONLY_TOOLS).toContain('fs_read_image');
  });
});

describe('background subagents (task_dispatch background + task_status)', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  async function waitFor(predicate, timeoutMs = 3000) {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
      await new Promise(r => setTimeout(r, 20));
    }
  }

  it('dispatches detached, returns an id immediately, and completes asynchronously', async () => {
    const dir = tmp('chaos-bg-');
    const loop = new ChaosAgentLoop(dir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return { content: 'bg result: ok', toolCalls: [], usage: {} };
    });

    const res = await loop._executeTool('task_dispatch', { tasks: [{ prompt: 'scan deps', background: true }] });
    expect(res.status).toBe('ok');
    expect(res.background).toHaveLength(1);
    expect(res.background[0].id).toMatch(/^bg-\d+$/);
    expect(res.background[0].status).toBe('running');

    await waitFor(() => loop._backgroundTasks.get(res.background[0].id).status === 'completed');
    const one = await loop._executeTool('task_status', { id: res.background[0].id });
    expect(one.task.status).toBe('completed');
    expect(one.task.summary).toBe('bg result: ok');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('mixed dispatch: foreground results inline, background by id', async () => {
    const dir = tmp('chaos-bg2-');
    const loop = new ChaosAgentLoop(dir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 30));
      return { content: 'done ' + Math.random(), toolCalls: [], usage: {} };
    });

    const res = await loop._executeTool('task_dispatch', {
      tasks: [{ prompt: 'fg job' }, { prompt: 'bg job', background: true }],
    });
    expect(res.results).toHaveLength(1);       // foreground completed inline
    expect(res.results[0].ok).toBe(true);
    expect(res.background).toHaveLength(1);    // background detached
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('caps concurrent background tasks at 3 with a helpful error', async () => {
    const dir = tmp('chaos-bg3-');
    const loop = new ChaosAgentLoop(dir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 500));
      return { content: 'slow', toolCalls: [], usage: {} };
    });

    const res = await loop._executeTool('task_dispatch', {
      tasks: [1, 2, 3, 4].map(n => ({ prompt: `job ${n}`, background: true })),
    });
    expect(res.background.filter(b => b.status === 'running')).toHaveLength(3);
    expect(res.background[3].error).toContain('capacity');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('task_status lists tasks and errors on unknown ids', async () => {
    const dir = tmp('chaos-bg4-');
    const loop = new ChaosAgentLoop(dir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    expect((await loop._executeTool('task_status', {})).count).toBe(0);

    jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockResolvedValue({ content: 'x', toolCalls: [], usage: {} });
    await loop._executeTool('task_dispatch', { tasks: [{ prompt: 'p', background: true }] });

    const list = await loop._executeTool('task_status', {});
    expect(list.count).toBe(1);
    expect(list.tasks[0].id).toMatch(/^bg-/);

    const missing = await loop._executeTool('task_status', { id: 'bg-999' });
    expect(missing.status).toBe('error');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('failed background tasks surface their error via task_status', async () => {
    const dir = tmp('chaos-bg5-');
    const loop = new ChaosAgentLoop(dir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
      throw new Error('boom');
    });
    const res = await loop._executeTool('task_dispatch', { tasks: [{ prompt: 'doomed', background: true }] });
    const id = res.background[0].id;
    await waitFor(() => loop._backgroundTasks.get(id).status !== 'running');
    const one = await loop._executeTool('task_status', { id });
    expect(one.task.ok).toBe(false);
    expect(one.task.error).toContain('boom'); // the real LLM error is surfaced
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

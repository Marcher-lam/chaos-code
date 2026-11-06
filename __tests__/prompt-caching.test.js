const https = require('https');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

function makeAnthropicLoop(tmpDir) {
  const loop = new ChaosAgentLoop(tmpDir);
  loop.apiKey = 'anthropic-test-key';
  loop.provider = 'anthropic';
  loop.model = 'claude-3-5-sonnet-latest';
  return loop;
}

function mockHttpsCapture() {
  let requestPayload = null;
  https.request.mockImplementation((url, options, callback) => {
    const mockReq = {
      on: jest.fn(),
      write: jest.fn(body => { requestPayload = JSON.parse(body); }),
      end: jest.fn(() => {
        const mockRes = {
          statusCode: 200,
          on: (event, cb) => {
            if (event === 'data') {
              cb('data: {"type":"message_start","message":{"usage":{"input_tokens":5,"output_tokens":0}}}\n\n');
              cb('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n\n');
            }
            if (event === 'end') cb();
          },
        };
        callback(mockRes);
      }),
    };
    return mockReq;
  });
  return () => requestPayload;
}

describe('Anthropic prompt caching & max_tokens', () => {
  let tmpDir;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.STDD_LLM_API_KEY;
    delete process.env.STDD_LLM_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-caching-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('marks the system prompt, last tool, and last message with cache_control', async () => {
    const loop = makeAnthropicLoop(tmpDir);
    const getPayload = mockHttpsCapture();

    await loop._callAnthropicStream([{ role: 'user', content: 'hello' }], null, null);

    const payload = getPayload();
    expect(payload).not.toBeNull();

    // system is a block array with an ephemeral breakpoint
    expect(Array.isArray(payload.system)).toBe(true);
    expect(payload.system[0].cache_control).toEqual({ type: 'ephemeral' });

    // last tool definition carries a breakpoint
    const tools = payload.tools;
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[tools.length - 1].cache_control).toEqual({ type: 'ephemeral' });

    // last message content is block-array with a breakpoint
    const lastMsg = payload.messages[payload.messages.length - 1];
    expect(Array.isArray(lastMsg.content)).toBe(true);
    expect(lastMsg.content[lastMsg.content.length - 1].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('uses the configurable maxTokens instead of a hardcoded 4096', async () => {
    const loop = makeAnthropicLoop(tmpDir);
    loop.maxTokens = 8192;
    const getPayload = mockHttpsCapture();

    await loop._callAnthropicStream([{ role: 'user', content: 'hello' }], null, null);

    expect(getPayload().max_tokens).toBe(8192);
  });

  it('defaults maxTokens to 4096 when unset', async () => {
    const loop = makeAnthropicLoop(tmpDir);
    const getPayload = mockHttpsCapture();

    await loop._callAnthropicStream([{ role: 'user', content: 'hello' }], null, null);

    expect(getPayload().max_tokens).toBe(4096);
  });

  it('sends a plain string system prompt when promptCaching is disabled', async () => {
    const loop = makeAnthropicLoop(tmpDir);
    loop.promptCaching = false;
    const getPayload = mockHttpsCapture();

    await loop._callAnthropicStream([{ role: 'user', content: 'hello' }], null, null);

    const payload = getPayload();
    expect(typeof payload.system).toBe('string');
    expect(payload.tools.every(t => !t.cache_control)).toBe(true);
  });

  it('defaults to prompt caching enabled', () => {
    const loop = makeAnthropicLoop(tmpDir);
    expect(loop.promptCaching).toBe(true);
    expect(loop.maxTokens).toBe(4096);
  });
});

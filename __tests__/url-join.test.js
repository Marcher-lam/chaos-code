const https = require('https');
const http = require('http');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('https');
jest.mock('http');
jest.mock('../src/runtime/agent-kernel/index');
jest.mock('../src/runtime/agent-kernel/provider-config', () => ({
  initFromEnv: jest.fn(() => null),
  getActive: jest.fn(() => null),
  setActive: jest.fn(),
  listProviders: jest.fn(() => []),
  addProvider: jest.fn(),
  BUILTIN_PROVIDERS: {},
}));

describe('provider URL construction preserves base paths', () => {
  let tmpDir;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-url-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it.each([
    ['https://api.openai.com/v1', 'https://api.openai.com/v1/chat/completions'],
    ['https://api.openai.com/v1/', 'https://api.openai.com/v1/chat/completions'],
    ['https://open.bigmodel.cn/api/paas/v4', 'https://open.bigmodel.cn/api/paas/v4/chat/completions'],
    ['http://127.0.0.1:1234/v1', 'http://127.0.0.1:1234/v1/chat/completions'],
  ])('openai stream: %s → %s', async (baseUrl, expected) => {
    const urls = [];
    const impl = (url, options, callback) => {
      urls.push(url.href);
      return {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(() => callback({
          statusCode: 200,
          on: (event, cb) => {
            if (event === 'data') cb('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n');
            if (event === 'end') cb();
          },
        })),
      };
    };
    https.request.mockImplementation(impl);
    http.request.mockImplementation(impl);

    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';
    loop.model = 'm';
    loop.baseUrl = baseUrl;

    await loop._callOpenAIStream([{ role: 'user', content: 'hi' }], null, null);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe(expected);
  });

  it('uses the correct default OpenAI URL when no baseUrl is set', async () => {
    const urls = [];
    https.request.mockImplementation((url, options, callback) => {
      urls.push(url.href);
      return {
        on: jest.fn(), write: jest.fn(),
        end: jest.fn(() => callback({ statusCode: 200, on: (e, cb) => { if (e === 'data') cb('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'); if (e === 'end') cb(); } })),
      };
    });

    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';
    loop.baseUrl = undefined;
    await loop._callOpenAIStream([{ role: 'user', content: 'hi' }], null, null);
    expect(urls[0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('anthropic stream preserves the /v1 prefix on the default base', async () => {
    const urls = [];
    https.request.mockImplementation((url, options, callback) => {
      urls.push(url.href);
      return {
        on: jest.fn(), write: jest.fn(),
        end: jest.fn(() => callback({
          statusCode: 200,
          on: (e, cb) => {
            if (e === 'data') {
              cb('data: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n');
            }
            if (e === 'end') cb();
          },
        })),
      };
    });

    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'anthropic';
    loop.model = 'claude-3-5-sonnet-latest';
    loop.baseUrl = undefined;
    await loop._callAnthropicStream([{ role: 'user', content: 'hi' }], null, null);
    expect(urls[0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('dispatches plain-http base URLs to the http module', async () => {
    const httpsUrls = [];
    const httpUrls = [];
    https.request.mockImplementation((url, options, callback) => {
      httpsUrls.push(url.href);
      return { on: jest.fn(), write: jest.fn(), end: jest.fn(() => callback({ statusCode: 200, on: (e, cb) => { if (e === 'end') cb(); } })) };
    });
    http.request.mockImplementation((url, options, callback) => {
      httpUrls.push(url.href);
      return {
        on: jest.fn(), write: jest.fn(),
        end: jest.fn(() => callback({ statusCode: 200, on: (e, cb) => { if (e === 'data') cb('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'); if (e === 'end') cb(); } })),
      };
    });

    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';
    loop.baseUrl = 'http://127.0.0.1:1234/v1';
    const res = await loop._callOpenAIStream([{ role: 'user', content: 'hi' }], null, null);
    expect(httpUrls).toEqual(['http://127.0.0.1:1234/v1/chat/completions']);
    expect(httpsUrls).toEqual([]);
    expect(res.content).toBe('ok');
  });
});

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

function buildHistory() {
  return [
    { role: 'user', content: 'refactor the auth module' },
    { role: 'assistant', content: 'reading files...' },
    { role: 'user', content: 'also fix the tests' },
    { role: 'assistant', content: 'running tests' },
    { role: 'user', content: 'msg5' },
    { role: 'assistant', content: 'msg6' },
    { role: 'user', content: 'msg7' },
    { role: 'assistant', content: 'msg8' },
  ];
}

function makeLoop(tmpDir) {
  const loop = new ChaosAgentLoop(tmpDir);
  loop.apiKey = 'test-key';
  loop.provider = 'openai';
  loop.model = 'gpt-4o-mini';
  return loop;
}

describe('compactHistory with LLM summarization', () => {
  let tmpDir;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-compact-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('injects the LLM summary and preserves the original goal + tail', async () => {
    const loop = makeLoop(tmpDir);
    jest.spyOn(loop, '_summarizeSegment').mockResolvedValue('- touched src/auth.js\n- fixed 2 tests');

    const compacted = await loop.compactHistory(buildHistory());

    expect(compacted[0].role).toBe('user');
    expect(compacted[0].content).toContain('refactor the auth module'); // goal preserved
    expect(compacted[0].content).toContain('- touched src/auth.js');     // LLM summary present
    expect(compacted[0].content).toContain('summarized below');
    expect(compacted[1].role).toBe('assistant');
    // Tail intact
    expect(compacted[compacted.length - 1].content).toBe('msg8');
  });

  it('falls back to structural truncation when summarization fails', async () => {
    const loop = makeLoop(tmpDir);
    jest.spyOn(loop, '_summarizeSegment').mockResolvedValue(null);

    const compacted = await loop.compactHistory(buildHistory());

    expect(compacted[0].content).toContain('omitted');
    expect(compacted[0].content).not.toContain('summarized below');
    expect(compacted.length).toBe(8);
  });

  it('returns short histories untouched without calling the LLM', async () => {
    const loop = makeLoop(tmpDir);
    const spy = jest.spyOn(loop, '_summarizeSegment');
    const short = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];

    const result = await loop.compactHistory(short);
    expect(result).toBe(short);
    expect(spy).not.toHaveBeenCalled();
  });

  describe('_summarizeSegment', () => {
    it('resolves null immediately when no API key is set', async () => {
      const loop = makeLoop(tmpDir);
      loop.apiKey = undefined;
      expect(await loop._summarizeSegment([{ role: 'user', content: 'x' }])).toBeNull();
      expect(https.request).not.toHaveBeenCalled();
    });

    it('sends a non-streaming request and extracts the text (OpenAI wire format)', async () => {
      const loop = makeLoop(tmpDir);
      let requestPayload = null;
      https.request.mockImplementation((url, options, callback) => {
        const mockReq = {
          on: jest.fn(),
          write: jest.fn(body => { requestPayload = JSON.parse(body); }),
          end: jest.fn(() => {
            const mockRes = {
              statusCode: 200,
              on: (event, cb) => {
                if (event === 'data') cb(JSON.stringify({ choices: [{ message: { content: 'summary text' } }] }));
                if (event === 'end') cb();
              },
            };
            callback(mockRes);
          }),
        };
        return mockReq;
      });

      const summary = await loop._summarizeSegment(buildHistory());
      expect(summary).toBe('summary text');
      expect(requestPayload.stream).toBeUndefined();
      expect(requestPayload.messages[0].role).toBe('system');
      expect(requestPayload.messages[1].content).toContain('USER: refactor the auth module');
      expect(requestPayload.max_tokens).toBe(400);
    });

    it('resolves null on HTTP error', async () => {
      const loop = makeLoop(tmpDir);
      https.request.mockImplementation((url, options, callback) => {
        const mockReq = {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(() => {
            const mockRes = {
              statusCode: 500,
              on: (event, cb) => {
                if (event === 'data') cb('boom');
                if (event === 'end') cb();
              },
            };
            callback(mockRes);
          }),
        };
        return mockReq;
      });

      expect(await loop._summarizeSegment(buildHistory())).toBeNull();
    });

    it('renders tool calls and tool results into the summary input', async () => {
      const loop = makeLoop(tmpDir);
      let requestPayload = null;
      https.request.mockImplementation((url, options, callback) => {
        const mockReq = {
          on: jest.fn(),
          write: jest.fn(body => { requestPayload = JSON.parse(body); }),
          end: jest.fn(() => {
            const mockRes = {
              statusCode: 200,
              on: (event, cb) => {
                if (event === 'data') cb(JSON.stringify({ choices: [{ message: { content: 's' } }] }));
                if (event === 'end') cb();
              },
            };
            callback(mockRes);
          }),
        };
        return mockReq;
      });

      await loop._summarizeSegment([
        { role: 'user', content: 'go' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', type: 'function', function: { name: 'fs_read', arguments: '{"path":"a.js"}' } }] },
        { role: 'tool', tool_call_id: '1', name: 'fs_read', content: 'file contents here' },
      ]);

      const promptText = requestPayload.messages[1].content;
      expect(promptText).toContain('TOOL_CALL fs_read');
      expect(promptText).toContain('TOOL_RESULT fs_read');
    });
  });
});

const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
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

// SSE chunks emulating a thinking model (qwen3/glm/deepseek-r1 style):
// reasoning_content deltas, optionally ending with no visible content.
function sseStreamReply(chunks) {
  https.request.mockImplementation((url, options, callback) => {
    let requestPayload = null;
    const mockReq = {
      on: jest.fn(),
      write: jest.fn(body => { requestPayload = JSON.parse(body); }),
      end: jest.fn(() => {
        const mockRes = {
          statusCode: 200,
          on: (event, cb) => {
            if (event === 'data') for (const c of chunks) cb(`data: ${JSON.stringify(c)}\n\n`);
            if (event === 'end') cb();
          },
        };
        callback(mockRes);
        mockReq.payload = requestPayload;
      }),
    };
    return mockReq;
  });
}

describe('thinking-model support (reasoning_content)', () => {
  let tmpDir;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-think-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('captures reasoning_content and reports it on the result', async () => {
    sseStreamReply([
      { choices: [{ delta: { reasoning_content: 'step 1: think' } }] },
      { choices: [{ delta: { reasoning_content: ' step 2' } }] },
      { choices: [{ delta: { content: 'FINAL-ANSWER' } }] },
      { choices: [{ delta: {} }], usage: { prompt_tokens: 5, completion_tokens: 9 } },
    ]);
    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    const res = await loop._callOpenAIStream([{ role: 'user', content: 'q' }], null, null);
    expect(res.content).toBe('FINAL-ANSWER');
    expect(res.reasoning).toContain('step 1: think');
  });

  it('requests real usage via stream_options', async () => {
    sseStreamReply([{ choices: [{ delta: { content: 'x' } }] }]);
    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';
    await loop._callOpenAIStream([{ role: 'user', content: 'q' }], null, null);

    const reqObj = https.request.mock.results[0].value;
    const payload = JSON.parse(reqObj.write.mock.calls[0][0]);
    expect(payload.stream_options).toEqual({ include_usage: true });
  });

  it('nudges once when a turn ends with reasoning but no visible answer', async () => {
    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    let call = 0;
    jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
      call++;
      if (call === 1) {
        // thinking-only turn: reasoning, no content, no tool calls
        return { content: null, reasoning: 'long internal deliberation', toolCalls: [], usage: {} };
      }
      return { content: 'visible final answer', toolCalls: [], usage: {} };
    });

    const messages = await loop.run('do the thing', [], { onMessage: () => {} });
    const nudge = messages.find(m => m.role === 'user' && /no visible answer/.test(m.content));
    expect(nudge).toBeDefined();
    expect(call).toBe(2);
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    expect(lastAssistant.content).toBe('visible final answer');
  });

  it('does not nudge twice — a second empty turn ends the run', async () => {
    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';

    let call = 0;
    jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
      call++;
      return { content: null, reasoning: 'r' + call, toolCalls: [], usage: {} };
    });

    const messages = await loop.run('do it', [], { onMessage: () => {} });
    const nudges = messages.filter(m => m.role === 'user' && /no visible answer/.test(m.content));
    expect(nudges).toHaveLength(1);
    expect(call).toBe(2);
  });

  it('does not nudge when the model answered normally', async () => {
    const loop = new ChaosAgentLoop(tmpDir);
    loop.apiKey = 'k';
    loop.provider = 'openai';
    jest.spyOn(loop, '_callLLM').mockResolvedValue({ content: 'fine', reasoning: 'some CoT', toolCalls: [], usage: {} });

    const messages = await loop.run('hi', [], { onMessage: () => {} });
    expect(messages.some(m => m.role === 'user' && /no visible answer/.test(m.content))).toBe(false);
  });
});

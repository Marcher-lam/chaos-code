const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const { AgentKernel } = require('../src/runtime/agent-kernel/index');
const https = require('https');

jest.mock('../src/runtime/agent-kernel/index');

describe('_callLLMWithRetry — Retry and Error Diagnostics', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createAgent() {
    return new ChaosAgentLoop();
  }

  test('should retry on transient errors with exponential backoff', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];
    const msgs = [];

    // First two calls fail with timeout, third succeeds
    let callCount = 0;
    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        const err = new Error('ETIMEDOUT');
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return Promise.resolve({ content: 'success', toolCalls: [], usage: {} });
    });

    const result = await agent._callLLMWithRetry(messages, { onMessage: (m) => msgs.push(m) }, null);
    expect(result.content).toBe('success');
    expect(callCount).toBe(3);
  });

  test('should not retry 401 authentication errors', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];

    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      throw new Error('401 Invalid API key');
    });

    await expect(agent._callLLMWithRetry(messages, {}, null))
      .rejects.toThrow('401 Invalid API key');
  });

  test('should not retry 403 forbidden errors', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];

    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      throw new Error('403 Forbidden');
    });

    await expect(agent._callLLMWithRetry(messages, {}, null))
      .rejects.toThrow('403 Forbidden');
  });

  test('should provide friendly error for ECONNREFUSED', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];

    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:443');
      err.code = 'ECONNREFUSED';
      throw err;
    });

    await expect(agent._callLLMWithRetry(messages, {}, null))
      .rejects.toThrow('Connection refused');
  });

  test('should provide friendly error for ENOTFOUND', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];

    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      const err = new Error('getaddrinfo ENOTFOUND api.invalid-host.com');
      err.code = 'ENOTFOUND';
      throw err;
    });

    await expect(agent._callLLMWithRetry(messages, {}, null))
      .rejects.toThrow('Host not found');
  });

  test('should handle 429 rate limit with longer backoff', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];
    const msgs = [];

    let callCount = 0;
    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        throw new Error('429 Too Many Requests');
      }
      return Promise.resolve({ content: 'ok', toolCalls: [], usage: {} });
    });

    const result = await agent._callLLMWithRetry(messages, { onMessage: (m) => msgs.push(m) }, null);
    expect(result.content).toBe('ok');
    expect(msgs.some(m => m.includes('Rate limited'))).toBe(true);
  });

  test('should throw after max retries exceeded', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];

    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      throw new Error('ETIMEDOUT');
    });

    await expect(agent._callLLMWithRetry(messages, { onMessage: () => {} }, null))
      .rejects.toThrow('ETIMEDOUT');
  });

  test('should respect abort signal between retries', async () => {
    const agent = createAgent();
    const messages = [{ role: 'user', content: 'test' }];
    const controller = new AbortController();

    let callCount = 0;
    jest.spyOn(agent, '_callLLM').mockImplementation(() => {
      callCount++;
      if (callCount >= 1) {
        controller.abort();
      }
      throw new Error('ETIMEDOUT');
    });

    await expect(agent._callLLMWithRetry(messages, { onMessage: () => {} }, controller.signal))
      .rejects.toThrow('Aborted');
  });
});

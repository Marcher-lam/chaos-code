const readline = require('readline');
const chalk = require('chalk');
const https = require('https');
const { EventEmitter } = require('events');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const { launchChaosTerminal, runChaosAgentPrompt } = require('../src/cli/commands/chaos-terminal');
const { AgentKernel } = require('../src/runtime/agent-kernel/index');

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

describe('ChaosAgentLoop', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should initialize correctly with OpenAI provider by default', () => {
    const agent = new ChaosAgentLoop();
    expect(agent.provider).toBe('openai');
    expect(agent.apiKey).toBe('test-key');
  });

  test('should initialize with Anthropic provider when only Anthropic key is set', () => {
    delete process.env.STDD_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';
    
    const agent = new ChaosAgentLoop();
    expect(agent.provider).toBe('anthropic');
    expect(agent.apiKey).toBe('anthropic-test-key');
  });

  test('should reject execution when no API key is present', async () => {
    delete process.env.STDD_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const agent = new ChaosAgentLoop();
    const mockOnMessage = jest.fn();
    
    await agent.run('test goal', [], { onMessage: mockOnMessage });
    expect(mockOnMessage).toHaveBeenCalledWith(expect.stringContaining('No API key detected'));
  });

  test('should map tool name correctly from underscores to dots', async () => {
    const agent = new ChaosAgentLoop();
    const mockExecute = jest.fn().mockResolvedValue('tool-result');
    agent.kernel.executeTool = mockExecute;

    await agent._executeTool('fs_read', { path: 'package.json' });
    expect(mockExecute).toHaveBeenCalledWith('fs.read', { path: 'package.json' });

    await agent._executeTool('fs_patch', { diff: 'some-diff' });
    expect(mockExecute).toHaveBeenCalledWith('fs.patch', { diff: 'some-diff', approved: true, apply: true });
  });

  test('should support setting and getting model dynamically', () => {
    const agent = new ChaosAgentLoop();
    agent.setModel('claude-3-5-sonnet-latest');
    expect(agent.getModel()).toBe('claude-3-5-sonnet-latest');
    expect(agent.getProvider()).toBe('anthropic');

    agent.setModel('gpt-4o-mini');
    expect(agent.getModel()).toBe('gpt-4o-mini');
    expect(agent.getProvider()).toBe('openai');
  });

  test('should calculate cost correctly based on provider and model', () => {
    const agent = new ChaosAgentLoop();
    const costOpenAI = agent._calculateCost('openai', 'gpt-4o-mini', 1000000, 1000000);
    expect(costOpenAI).toBeCloseTo(0.15 + 0.60);

    const costAnthropic = agent._calculateCost('anthropic', 'claude-3-5-sonnet-latest', 1000000, 1000000);
    expect(costAnthropic).toBeCloseTo(3.00 + 15.00);
  });

  test('should return session stats', () => {
    const agent = new ChaosAgentLoop();
    agent.totalPromptTokens = 100;
    agent.totalCompletionTokens = 50;
    agent.totalCost = 0.005;

    const stats = agent.getSessionStats();
    expect(stats.promptTokens).toBe(100);
    expect(stats.completionTokens).toBe(50);
    expect(stats.totalTokens).toBe(150);
    expect(stats.cost).toBe(0.005);
  });

  test('should compact chat history correctly', () => {
    const agent = new ChaosAgentLoop();
    const history = [
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
      { role: 'user', content: 'msg3' },
      { role: 'assistant', content: 'msg4' },
      { role: 'user', content: 'msg5' },
      { role: 'assistant', content: 'msg6' },
      { role: 'user', content: 'msg7' },
      { role: 'assistant', content: 'msg8' },
    ];
    const compacted = agent.compactHistory(history);
    // Smart compact: first user msg + summary + tail (6) = 8
    expect(compacted.length).toBe(8);
    // First message preserves original goal
    expect(compacted[0].role).toBe('user');
    expect(compacted[0].content).toContain('msg1');
    // Second is the compaction summary
    expect(compacted[1].role).toBe('assistant');
    expect(compacted[1].content).toContain('compacted');
    // Tail starts from message 3 in original (index 2)
    expect(compacted[2].content).toBe('msg3');
  });

  test('_callOpenAIStream should correctly map tool_call_id and name in the payload', async () => {
    const agent = new ChaosAgentLoop();
    let requestPayload = null;

    https.request.mockImplementation((url, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      const mockReq = {
        on: jest.fn(),
        write: jest.fn((body) => {
          requestPayload = JSON.parse(body);
        }),
        end: jest.fn(() => {
          const mockRes = {
            statusCode: 200,
            on: jest.fn((event, cb) => {
              if (event === 'data') {
                // SSE format: data: {...}\n\n
                cb('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n');
              }
              if (event === 'end') {
                cb();
              }
            })
          };
          callback(mockRes);
        })
      };
      return mockReq;
    });

    const messages = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'running tool', tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'shell_run', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'call_123', name: 'shell_run', content: 'tool output' }
    ];

    await agent._callOpenAIStream(messages);

    expect(requestPayload).not.toBeNull();
    // System prompt is prepended at index 0, so messages are shifted by 1
    expect(requestPayload.messages[1]).toEqual({ role: 'user', content: 'hello' });
    expect(requestPayload.messages[2]).toEqual({ role: 'assistant', content: 'running tool', tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'shell_run', arguments: '{}' } }] });
    expect(requestPayload.messages[3]).toEqual({ role: 'tool', tool_call_id: 'call_123', name: 'shell_run', content: 'tool output' });
  });
});

describe('Chaos Terminal CLI routing and REPL commands', () => {
  let mockRl;
  let mockStdout;
  let originalExit;
  let originalConsoleClear;

  beforeEach(() => {
    originalExit = process.exit;
    originalConsoleClear = console.clear;
    process.exit = jest.fn();
    console.clear = jest.fn();
    
    mockStdout = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((val) => {
      mockStdout.push(val);
      return true;
    });

    mockRl = new EventEmitter();
    mockRl.prompt = jest.fn();
    mockRl.close = jest.fn();
    mockRl.pause = jest.fn();
    mockRl.resume = jest.fn();

    jest.spyOn(readline, 'createInterface').mockReturnValue(mockRl);
  });

  afterEach(() => {
    process.exit = originalExit;
    console.clear = originalConsoleClear;
    jest.restoreAllMocks();
  });

  test('/exit slash command should terminate the shell', async () => {
    launchChaosTerminal();
    
    mockRl.emit('line', '/exit');
    expect(mockRl.close).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  test('/clear slash command should call console.clear', async () => {
    launchChaosTerminal();
    
    mockRl.emit('line', '/clear');
    expect(console.clear).toHaveBeenCalled();
  });

  test('/help slash command should print available commands', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    launchChaosTerminal();
    
    mockRl.emit('line', '/help');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
    logSpy.mockRestore();
  });

  test('/model slash command should view or set model', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    launchChaosTerminal();

    mockRl.emit('line', '/model');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Model:'));

    mockRl.emit('line', '/model gpt-4o');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Model: gpt-4o'));
    logSpy.mockRestore();
  });

  test('/cost slash command should print token usage and cost', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    launchChaosTerminal();

    mockRl.emit('line', '/cost');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('tokens:'));
    logSpy.mockRestore();
  });

  test('/session slash command should print session info', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    launchChaosTerminal();

    mockRl.emit('line', '/session');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('provider:'));
    logSpy.mockRestore();
  });

  test('/compact slash command should compact chat history', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    launchChaosTerminal();

    mockRl.emit('line', '/compact');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Compacted'));
    logSpy.mockRestore();
  });

  test('non-command normal prompt should trigger agent loop', async () => {
    const mockRun = jest.fn().mockResolvedValue([]);
    jest.spyOn(ChaosAgentLoop.prototype, 'run').mockImplementation(mockRun);
    
    launchChaosTerminal();
    mockRl.emit('line', 'hello agent');

    expect(mockRl.pause).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith('hello agent', [], expect.any(Object));
  });
});

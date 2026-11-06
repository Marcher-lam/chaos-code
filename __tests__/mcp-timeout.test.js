const { McpClient, McpClientManager } = require('../src/runtime/agent-kernel/mcp-client');
const { EventEmitter } = require('events');

describe('MCP per-request timeout', () => {
  function makeFakeProcess() {
    const proc = new EventEmitter();
    proc.stdin = { write: jest.fn() };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = jest.fn();
    return proc;
  }

  it('rejects a request that never gets a response', async () => {
    const client = new McpClient('slow', {}, { timeoutMs: 30 });
    client.process = makeFakeProcess();

    await expect(client.sendRequest('tools/list')).rejects.toThrow(/timed out after 30ms/);
    // Pending entry must be cleaned up
    expect(client.pendingRequests.size).toBe(0);
  });

  it('resolves when the response arrives before the timeout and clears the timer', async () => {
    const client = new McpClient('fast', {}, { timeoutMs: 5000 });
    client.process = makeFakeProcess();

    const pending = client.sendRequest('tools/list');
    // Simulate the server responding on stdout (parsed via handleMessage)
    client.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'echo' }] } }));

    const result = await pending;
    expect(result.tools).toHaveLength(1);
    expect(client.pendingRequests.size).toBe(0);
  });

  it('supports requests for different ids independently', async () => {
    const client = new McpClient('multi', {}, { timeoutMs: 5000 });
    client.process = makeFakeProcess();

    const p1 = client.sendRequest('tools/list');
    const p2 = client.sendRequest('tools/call', { name: 'x' });

    client.handleMessage(JSON.stringify({ id: 2, result: { content: [] } }));
    client.handleMessage(JSON.stringify({ id: 1, result: { tools: [] } }));

    await Promise.all([p1, p2]);
    expect(client.pendingRequests.size).toBe(0);
  });

  it('rejects pending requests when the server process exits', async () => {
    const client = new McpClient('dying', {}, { timeoutMs: 5000 });
    client.process = makeFakeProcess();
    client._attachProcessHandlers(() => {});

    const pending = client.sendRequest('tools/list');
    client.process.emit('close', 1);

    await expect(pending).rejects.toThrow(/exited with code 1/);
  });

  it('resolves timeout from CHAOS_MCP_TIMEOUT env when not explicit', () => {
    const original = process.env.CHAOS_MCP_TIMEOUT;
    process.env.CHAOS_MCP_TIMEOUT = '7777';
    try {
      const client = new McpClient('envcfg', {});
      expect(client.timeoutMs).toBe(7777);
      const manager = new McpClientManager('/tmp');
      expect(manager.timeoutMs).toBe(7777);
    } finally {
      if (original === undefined) delete process.env.CHAOS_MCP_TIMEOUT;
      else process.env.CHAOS_MCP_TIMEOUT = original;
    }
  });

  it('explicit timeoutMs wins over env', () => {
    const original = process.env.CHAOS_MCP_TIMEOUT;
    process.env.CHAOS_MCP_TIMEOUT = '7777';
    try {
      const client = new McpClient('explicit', {}, { timeoutMs: 1234 });
      expect(client.timeoutMs).toBe(1234);
    } finally {
      if (original === undefined) delete process.env.CHAOS_MCP_TIMEOUT;
      else process.env.CHAOS_MCP_TIMEOUT = original;
    }
  });
});

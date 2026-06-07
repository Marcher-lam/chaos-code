const EventEmitter = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { McpCommand } = require('../src/cli/commands/mcp');

describe('McpCommand', () => {
  let mcp;
  let originalStdoutWrite;
  let originalStdin;
  let originalCwd;
  let mockStdin;
  let tempDirs = [];
  let writeCalls = [];

  beforeEach(() => {
    writeCalls = [];
    originalCwd = process.cwd();
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      writeCalls.push(chunk.toString());
      return true;
    };

    // Mock process.stdin
    originalStdin = process.stdin;
    mockStdin = new EventEmitter();
    mockStdin.setEncoding = () => mockStdin;
    mockStdin.resume = () => mockStdin;
    mockStdin.pause = () => mockStdin;
    mockStdin.on = (event, listener) => {
      EventEmitter.prototype.on.call(mockStdin, event, listener);
      return mockStdin;
    };
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      configurable: true
    });

    mcp = new McpCommand();
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.chdir(originalCwd);
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      configurable: true
    });
    mcp.close();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempProject() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-mcp-test-'));
    tempDirs.push(root);
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'echo ok' } }), 'utf8');
    return root;
  }

  it('responds to initialize request correctly', async () => {
    await mcp.execute();

    mockStdin.emit('data', JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {}
    }) + '\n');

    expect(writeCalls.length).toBe(1);
    const response = JSON.parse(writeCalls[0].trim());
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result.protocolVersion).toBe('2024-11-05');
    expect(response.result.serverInfo.name).toBe('stdd-mcp');
  });

  it('lists tools correctly', async () => {
    await mcp.execute();

    mockStdin.emit('data', JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 2
    }) + '\n');

    expect(writeCalls.length).toBe(1);
    const response = JSON.parse(writeCalls[0].trim());
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(2);
    expect(Array.isArray(response.result.tools)).toBe(true);
    expect(response.result.tools.find(t => t.name === 'stdd_status')).toBeDefined();
  });

  it('calls stdd_status tool successfully', async () => {
    await mcp.execute();

    mcp.callTool = jest.fn().mockResolvedValue('Mocked status output');

    mockStdin.emit('data', JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 3,
      params: {
        name: "stdd_status",
        arguments: { change: "test-change" }
      }
    }) + '\n');

    await new Promise(resolve => setImmediate(resolve));

    expect(writeCalls.length).toBe(1);
    const response = JSON.parse(writeCalls[0].trim());
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(3);
    expect(response.result.content[0].text).toBe('Mocked status output');
  });

  it('dispatches stdd_check_constitution without module resolution failure', async () => {
    const project = createTempProject();
    process.chdir(project);

    const output = await mcp.callTool('stdd_check_constitution', { force: true });

    expect(output).toContain('Constitution check');
    expect(output).not.toContain('Cannot find module');
  });
});

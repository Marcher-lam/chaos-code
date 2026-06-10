const { GitTool } = require('../src/runtime/agent-kernel/git-tool');
const { McpClientManager } = require('../src/runtime/agent-kernel/mcp-client');
const { AgentKernel } = require('../src/runtime/agent-kernel/index');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const child_process = require('child_process');

jest.mock('child_process');

describe('Git & MCP Enhancements', () => {
  let activeKernel;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (activeKernel && activeKernel.mcpClientManager) {
      activeKernel.mcpClientManager.stopAll();
    }
  });

  describe('GitTool Enhancements', () => {
    it('git.add stages files successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: '',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.add({ files: ['file1.js'] });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['add', 'file1.js'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('git.commit commits staged changes successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: '[main 12345] feat: commit message',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.commit({ message: 'feat: commit message' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['commit', '-m', 'feat: commit message'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('git.push pushes commits successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'To github.com...',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.push({ remote: 'origin', branch: 'feat/test' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['push', 'origin', 'feat/test'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('git.checkout switches branches successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'Switched to branch...',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.checkout({ branch: 'main' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['checkout', 'main'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('git.branch creates and checkouts new branch successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'Switched to a new branch...',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.branch({ name: 'feat/new' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['checkout', '-b', 'feat/new'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('git.reset resets modifications successfully', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'HEAD is now at...',
        stderr: ''
      });
      const git = new GitTool({ cwd: '/tmp' });
      const result = git.reset({ hard: true });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['reset', '--hard'], expect.any(Object));
      expect(result.status).toBe('ok');
    });
  });

  describe('McpClientManager & AgentKernel Integration', () => {
    it('AgentKernel registers and routes MCP tools', async () => {
      const mockConfig = {
        mcpServers: {
          sqlite: {
            command: 'node',
            args: ['server.js']
          }
        }
      };

      const manager = new McpClientManager('/tmp');
      jest.spyOn(manager, 'loadConfig').mockReturnValue(mockConfig);
      
      const mockProcess = {
        stdin: { write: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };
      child_process.spawn.mockReturnValue(mockProcess);

      activeKernel = new AgentKernel({
        cwd: '/tmp',
        mcpClientManager: manager
      });

      // Simulate client startup and tool response
      manager.clients.set('sqlite', {
        name: 'sqlite',
        tools: [
          {
            name: 'query',
            description: 'Run SQL query',
            inputSchema: { type: 'object' }
          }
        ],
        callTool: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'query results' }]
        }),
        stop: jest.fn()
      });

      // Populate tools
      const mcpTools = manager.getTools();
      for (const tool of mcpTools) {
        activeKernel.tools.register({
          name: tool.name,
          description: tool.description,
          category: 'mcp',
          risk: 'write',
          requiresApproval: true,
          inputSchema: tool.inputSchema
        });
      }

      // Assert registration
      const registered = activeKernel.tools.get('sqlite_query');
      expect(registered).not.toBeNull();
      expect(registered.category).toBe('mcp');

      // Assert execution routing
      const res = await activeKernel.executeTool('sqlite_query', { approved: true, query: 'SELECT 1' });
      expect(res).toBe('query results');
    });
  });

  describe('ChaosAgentLoop Tool Gathering', () => {
    it('_getLLMTools gathers registered MCP tools dynamically', () => {
      const loop = new ChaosAgentLoop('/tmp');
      activeKernel = loop.kernel;
      loop.kernel.tools.register({
        name: 'sqlite_query',
        description: 'Run SQL query',
        category: 'mcp',
        risk: 'write',
        requiresApproval: true,
        inputSchema: { type: 'object' }
      });

      const llmTools = loop._getLLMTools();
      const sqliteTool = llmTools.find(t => t.function.name === 'sqlite_query');

      expect(sqliteTool).toBeDefined();
      expect(sqliteTool.function.description).toBe('Run SQL query');
    });
  });
});

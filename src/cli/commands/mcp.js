const readline = require('readline');
const path = require('path');
const fs = require('fs');

const { StatusCommand } = require('./status');
const { RecommendEngine } = require('./recommend');
const { ListCommand } = require('./list');
const { NewCommand } = require('./new');
const { ApplyCommand } = require('./apply');
const { VerifyCommand } = require('./verify');
const { InitCommand } = require('./init');
const { AgentKernel } = require('../../runtime/agent-kernel');

const TOOLS = [
  {
    name: "stdd_status",
    description: "Show status of a change (active or archived)",
    inputSchema: {
      type: "object",
      properties: {
        change: { type: "string", description: "Name of the change" }
      }
    }
  },
  {
    name: "stdd_recommend",
    description: "Recommend next step for an STDD change",
    inputSchema: {
      type: "object",
      properties: {
        change: { type: "string", description: "Name of the change" }
      }
    }
  },
  {
    name: "stdd_list_changes",
    description: "List all active/archived changes or specifications",
    inputSchema: {
      type: "object",
      properties: {
        changes: { type: "boolean", description: "List changes" },
        specs: { type: "boolean", description: "List specs" },
        archived: { type: "boolean", description: "Include archived changes" }
      }
    }
  },
  {
    name: "stdd_new_change",
    description: "Create a new change work unit",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the change (kebab-case)" },
        title: { type: "string", description: "Optional title for the change" }
      },
      required: ["name"]
    }
  },
  {
    name: "stdd_apply",
    description: "Run next pending task in Ralph Loop TDD flow",
    inputSchema: {
      type: "object",
      properties: {
        change: { type: "string", description: "Name of the change" },
        phase: { type: "string", description: "TDD phase (red, green, refactor)" },
        allowNoTests: { type: "boolean", description: "Allow proceeding without a test command" },
        workspace: { type: "string", description: "Scope to workspace" }
      }
    }
  },
  {
    name: "stdd_verify",
    description: "Verify change readiness against BDD tests and Constitution quality gates",
    inputSchema: {
      type: "object",
      properties: {
        change: { type: "string", description: "Name of the change" },
        lint: { type: "boolean", description: "Run lint check" },
        workspace: { type: "string", description: "Scope to workspace" },
        force: { type: "boolean", description: "Force verify, bypassing cache" }
      }
    }
  },
  {
    name: "stdd_check_constitution",
    description: "Check constitution合规性 (Article 1-9 check)",
    inputSchema: {
      type: "object",
      properties: {
        workspace: { type: "string", description: "Scope to workspace" },
        force: { type: "boolean", description: "Force check, bypassing cache" }
      }
    }
  },
  {
    name: "stdd_init",
    description: "Initialize STDD workspace in the current directory",
    inputSchema: {
      type: "object",
      properties: {
        force: { type: "boolean", description: "Overwrite existing files" }
      }
    }
  },
  {
    name: "stdd_agent_plan",
    description: "Create a dry-run native STDD agent plan for a goal",
    inputSchema: { type: "object", properties: { goal: { type: "string" }, mode: { type: "string" } } }
  },
  {
    name: "stdd_agent_read",
    description: "Safely read a workspace text file through the agent kernel",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
  },
  {
    name: "stdd_agent_search",
    description: "Safely search workspace text files through the agent kernel",
    inputSchema: { type: "object", properties: { query: { type: "string" }, path: { type: "string" }, maxResults: { type: "number" } }, required: ["query"] }
  },
  {
    name: "stdd_agent_patch_preview",
    description: "Validate a unified diff file without applying it",
    inputSchema: { type: "object", properties: { file: { type: "string" } }, required: ["file"] }
  },
  {
    name: "stdd_agent_test_run",
    description: "Run configured tests and return normalized agent result",
    inputSchema: { type: "object", properties: { command: { type: "string" }, workspace: { type: "string" }, timeout: { type: "number" } } }
  },
  {
    name: "stdd_agent_git_diff",
    description: "Inspect git status and diff through read-only agent git tool",
    inputSchema: { type: "object", properties: { patch: { type: "boolean" }, maxBytes: { type: "number" } } }
  },
  {
    name: "stdd_agent_history",
    description: "List agent run reports",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "stdd_agent_show_run",
    description: "Show an agent run report by run id",
    inputSchema: { type: "object", properties: { runId: { type: "string" } }, required: ["runId"] }
  },
  {
    name: "stdd_agent_resume",
    description: "Return resume context and suggested next command for an agent run",
    inputSchema: { type: "object", properties: { runId: { type: "string" } }, required: ["runId"] }
  },
  {
    name: "stdd_agent_doctor",
    description: "Run agent readiness checks and return diagnostic results",
    inputSchema: { type: "object", properties: {} }
  }
];

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

class McpCommand {
  constructor() {
    this._kernelCache = new Map();
  }

  getKernel(cwd) {
    if (!this._kernelCache.has(cwd)) {
      this._kernelCache.set(cwd, new AgentKernel({ cwd }));
    }
    return this._kernelCache.get(cwd);
  }

  async execute() {
    // 1) Redirect process.stdout.write to stderr EXCEPT for JSON-RPC messages
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = function (chunk, encoding, callback) {
      const str = chunk.toString();
      if (str.startsWith('{"jsonrpc"') || str.startsWith('{"id":')) {
        return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
      } else {
        return process.stderr.write(chunk, encoding, callback);
      }
    };

    // 2) Write logs to stdd/logs/mcp.log
    const logDir = path.join(process.cwd(), 'stdd', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logStream = fs.createWriteStream(path.join(logDir, 'mcp.log'), { flags: 'a' });
    const log = (msg) => {
      logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
    };

    log('STDD MCP Server started.');

    // 3) Standard Input readline loop
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    const sendResponse = (id, result) => {
      const response = JSON.stringify({ jsonrpc: "2.0", id, result });
      originalStdoutWrite.call(process.stdout, response + '\n');
      log(`Sent response for id ${id}`);
    };

    const sendError = (id, code, message) => {
      const response = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
      originalStdoutWrite.call(process.stdout, response + '\n');
      log(`Sent error for id ${id}: [${code}] ${message}`);
    };

    this.rl.on('line', async (line) => {
      if (!line.trim()) return;
      log(`Received request line: ${line}`);
      try {
        const req = JSON.parse(line);
        const { id, method, params } = req;

        if (method === 'initialize') {
          sendResponse(id, {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "stdd-mcp", version: "2.0.0" }
          });
        } else if (method === 'tools/list') {
          sendResponse(id, { tools: TOOLS });
        } else if (method === 'tools/call') {
          const { name, arguments: args } = params || {};
          try {
            const resultText = await this.callTool(name, args || {});
            sendResponse(id, {
              content: [{ type: "text", text: resultText }]
            });
          } catch (err) {
            sendResponse(id, {
              isError: true,
              content: [{ type: "text", text: `Tool call failed: ${err.message}\n${err.stack || ''}` }]
            });
          }
        } else if (method.startsWith('notifications/')) {
          // Notifications do not receive responses
          log(`Received notification: ${method}`);
        } else {
          sendError(id, -32601, `Method not found: ${method}`);
        }
      } catch (err) {
        log(`Parse error: ${err.message}`);
        sendError(null, -32700, `Parse error: ${err.message}`);
      }
    });
  }

  async runCapture(fn) {
    const originalLog = console.log;
    const originalError = console.error;
    let output = '';
    console.log = (...args) => {
      output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') + '\n';
    };
    console.error = (...args) => {
      output += '[Error] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') + '\n';
    };
    try {
      await fn();
    } catch (err) {
      output += `[Exception] ${err.message}\n${err.stack || ''}\n`;
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    // Remove ANSI escape codes
    return output.replace(/\u001b\[\d+m/g, '');
  }

  async callTool(name, args) {
    const cwd = process.cwd();
    switch (name) {
      case 'stdd_status': {
        const cmd = new StatusCommand();
        return this.runCapture(() => cmd.execute(args.change, { json: false }));
      }
      case 'stdd_recommend': {
        const engine = new RecommendEngine(cwd);
        const { printRecommendations } = require('./recommend');
        return this.runCapture(() => {
          const recs = engine.recommend(args.change, {});
          printRecommendations(recs);
        });
      }
      case 'stdd_list_changes': {
        const cmd = new ListCommand();
        const options = {
          changes: args.changes !== false,
          specs: !!args.specs,
          archived: !!args.archived,
          json: false
        };
        return this.runCapture(() => cmd.execute('.', options));
      }
      case 'stdd_new_change': {
        const cmd = new NewCommand();
        return this.runCapture(() => cmd.createChange(args.name, { title: args.title }));
      }
      case 'stdd_apply': {
        const cmd = new ApplyCommand();
        const options = {
          phase: args.phase,
          allowNoTests: !!args.allowNoTests,
          workspace: args.workspace
        };
        return this.runCapture(() => cmd.execute(args.change, options));
      }
      case 'stdd_verify': {
        const cmd = new VerifyCommand();
        const options = {
          lint: !!args.lint,
          workspace: args.workspace,
          force: !!args.force
        };
        return this.runCapture(() => cmd.execute(args.change, options));
      }
      case 'stdd_check_constitution': {
        return this.runCapture(async () => {
          const { checkConstitutionAction } = require('../helpers/mcp-helpers');
          await checkConstitutionAction(args);
        });
      }
      case 'stdd_init': {
        const cmd = new InitCommand();
        const options = {
          force: !!args.force,
          skipSkills: false,
          yes: true
        };
        return this.runCapture(() => cmd.execute(cwd, options));
      }
      case 'stdd_agent_plan': {
        const kernel = this.getKernel(cwd);
        kernel.configManager = kernel.configManager || new (require('../../runtime/agent-kernel/config').AgentConfig)(cwd);
        kernel.config = kernel.config || kernel.configManager.load();
        kernel.policy = kernel.policy || new (require('../../runtime/agent-kernel/permission-policy').PermissionPolicy)({ mode: args.mode });
        return jsonText(kernel.createPlan(args.goal || 'No goal provided'));
      }
      case 'stdd_agent_read': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.executeTool('fs.read', { path: args.path }));
      }
      case 'stdd_agent_search': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.executeTool('fs.search', { query: args.query, path: args.path || '.', maxResults: args.maxResults }));
      }
      case 'stdd_agent_patch_preview': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.executeTool('fs.patch', { file: args.file, approved: true }));
      }
      case 'stdd_agent_test_run': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.executeTool('test.run', { command: args.command, workspace: args.workspace, timeout: args.timeout }));
      }
      case 'stdd_agent_git_diff': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.executeTool('git.diff', { patch: !!args.patch, maxBytes: args.maxBytes }));
      }
      case 'stdd_agent_history': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.listHistory());
      }
      case 'stdd_agent_show_run': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.showRun(args.runId));
      }
      case 'stdd_agent_resume': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.resumeRun(args.runId));
      }
      case 'stdd_agent_doctor': {
        const kernel = this.getKernel(cwd);
        return jsonText(kernel.runDoctor());
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  close() {
    if (this.rl && typeof this.rl.close === 'function') {
      this.rl.close();
    }
  }
}

module.exports = { McpCommand };

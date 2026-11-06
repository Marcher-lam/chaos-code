const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Resolve per-request timeout: explicit option > CHAOS_MCP_TIMEOUT env > ~/.chaos/config.json mcpTimeout > 30s
// (env intentionally wins over the config file — conventional 12-factor override)
function _resolveTimeoutMs(explicit) {
  if (explicit && explicit > 0) return explicit;
  const envVal = Number(process.env.CHAOS_MCP_TIMEOUT);
  if (envVal > 0) return envVal;
  try {
    const cfgPath = path.join(os.homedir(), '.chaos', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.mcpTimeout > 0) return cfg.mcpTimeout;
    }
  } catch (_) { /* fall through to default */ }
  return 30000;
}

class McpClient {
  constructor(name, config, options = {}) {
    this.name = name;
    this.config = config;
    this.timeoutMs = _resolveTimeoutMs(options.timeoutMs);
    this.process = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.buffer = '';
    this.initialized = false;
    this.tools = [];
  }

  async start() {
    return new Promise((resolve, reject) => {
      const { command, args = [], env = {} } = this.config;

      const spawnEnv = { ...process.env, ...env };
      this.process = spawn(command, args, {
        cwd: process.cwd(),
        env: spawnEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this._attachProcessHandlers((err) => reject(err));

      // Give it a short delay to spawn, then send initialize request
      this.spawnTimeout = setTimeout(async () => {
        try {
          await this.initialize();
          const tools = await this.listTools();
          this.tools = tools;
          resolve(this);
        } catch (err) {
          // Startup failed (timeout/hang) — kill the child so it doesn't
          // leak for the lifetime of the host process.
          this.stop();
          reject(err);
        }
      }, 500);
    });
  }

  /**
   * Wire stdout buffering and exit/error handling onto this.process.
   * Split out of start() so tests (and manual process injection) can attach
   * the same behavior without spawning.
   */
  _attachProcessHandlers(onError) {
    this.process.stderr.on('data', () => {
      // Keep logs quiet but allow stderr handling
    });

    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.on('close', (code) => {
      for (const [, { reject, timer }] of this.pendingRequests.entries()) {
        if (timer) clearTimeout(timer);
        reject(new Error(`MCP server ${this.name} exited with code ${code}`));
      }
      this.pendingRequests.clear();
    });

    this.process.on('error', (err) => {
      if (onError) onError(err);
    });
  }

  processBuffer() {
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        this.handleMessage(line);
      }
    }
  }

  handleMessage(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
        const { resolve, reject, timer } = this.pendingRequests.get(msg.id);
        if (timer) clearTimeout(timer);
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    } catch (err) {
      // Silence parsing errors for potential non-json-rpc debug logs
    }
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        return reject(new Error(`MCP server ${this.name} is not running`));
      }
      const id = this.requestId++;
      const req = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      // Per-request timeout: a hung server must not stall the agent loop
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request ${method} to ${this.name} timed out after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);
      this.pendingRequests.set(id, { resolve, reject, timer });
      this.process.stdin.write(JSON.stringify(req) + '\n');
    });
  }

  sendNotification(method, params = {}) {
    if (!this.process) return;
    const req = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.process.stdin.write(JSON.stringify(req) + '\n');
  }

  /**
   * Initialize with a GENEROUS startup budget: MCP servers launched via npx
   * can take well over 30s on a cold cache. Post-init tool calls keep the
   * normal (shorter) per-request timeout.
   */
  async initialize() {
    const savedTimeout = this.timeoutMs;
    this.timeoutMs = Math.max(this.timeoutMs, 120000);
    try {
      const res = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'chaos-mcp-client', version: '2.0.0' }
      });
      this.sendNotification('notifications/initialized');
      this.initialized = true;
      return res;
    } finally {
      this.timeoutMs = savedTimeout;
    }
  }

  async listTools() {
    const res = await this.sendRequest('tools/list');
    return res.tools || [];
  }

  async callTool(name, args) {
    const res = await this.sendRequest('tools/call', {
      name,
      arguments: args
    });
    return res;
  }

  stop() {
    if (this.spawnTimeout) {
      clearTimeout(this.spawnTimeout);
      this.spawnTimeout = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

class McpClientManager {
  constructor(cwd = process.cwd(), options = {}) {
    this.cwd = cwd;
    this.timeoutMs = _resolveTimeoutMs(options.timeoutMs);
    this.clients = new Map();
    this.startingClients = new Set();
  }

  loadConfig() {
    const configPath = path.join(this.cwd, 'stdd', 'mcp-servers.json');
    if (!fs.existsSync(configPath)) {
      return { mcpServers: {} };
    }
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (_) {
      return { mcpServers: {} };
    }
  }

  async startAll() {
    const config = this.loadConfig();
    const servers = config.mcpServers || {};
    const startPromises = [];
    
    for (const [name, srvConfig] of Object.entries(servers)) {
      const client = new McpClient(name, srvConfig, { timeoutMs: this.timeoutMs });
      this.startingClients.add(client);
      const promise = client.start()
        .then(() => {
          this.clients.set(name, client);
        })
        .catch(() => {
          // Quietly handle errors in loading individual MCP servers
        })
        .finally(() => {
          this.startingClients.delete(client);
        });
      startPromises.push(promise);
    }
    
    await Promise.all(startPromises);
  }

  getTools() {
    const allTools = [];
    for (const [clientName, client] of this.clients.entries()) {
      for (const tool of client.tools) {
        const prefixedName = `${clientName}_${tool.name}`;
        allTools.push({
          name: prefixedName,
          originalName: tool.name,
          clientName,
          description: tool.description,
          inputSchema: tool.inputSchema
        });
      }
    }
    return allTools;
  }

  async callTool(prefixedName, args) {
    for (const [clientName, client] of this.clients.entries()) {
      if (prefixedName.startsWith(`${clientName}_`)) {
        const originalName = prefixedName.slice(clientName.length + 1);
        const res = await client.callTool(originalName, args);
        if (res && res.content) {
          return res.content.map(c => c.text || JSON.stringify(c)).join('\n');
        }
        return JSON.stringify(res);
      }
    }
    throw new Error(`Tool ${prefixedName} not found in any MCP client.`);
  }

  stopAll() {
    for (const client of this.clients.values()) {
      client.stop();
    }
    for (const client of this.startingClients) {
      client.stop();
    }
    this.clients.clear();
    this.startingClients.clear();
  }
}

module.exports = { McpClient, McpClientManager };

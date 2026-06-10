const fs = require('fs');
const path = require('path');
const https = require('https');
const { AgentKernel } = require('./index');
const { initFromEnv, getActive, setActive, listProviders, addProvider, BUILTIN_PROVIDERS } = require('./provider-config');
const chalk = require('chalk');

// ── Shared HTTPS agent for connection reuse ──
const _httpAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 4,
  maxFreeSockets: 2,
});

const SYSTEM_PROMPT_BASE = `You are the Chaos Ace Agent, a self-contained AI coding assistant similar to Claude Code.
Your goal is to help the user implement features, refactor code, and fix bugs in their workspace.

Available tools:
- fs_read: Read a file's contents
- fs_search: Basic text search across files
- fs_glob: Find files by glob pattern (e.g., "**/*.js", "src/**/*.ts") — use this to locate files
- fs_grep: Regex search with context lines, glob filter, and output modes (content/files/count) — use this for code exploration
- fs_write: Write entire file content (create new files or complete rewrites)
- fs_patch: Apply modifications via unified diff (for targeted edits to existing files)
- shell_run: Execute shell commands
- test_run: Run project tests
- git_diff, git_add, git_commit, git_push, git_checkout, git_branch, git_reset: Git operations
- stdd_status, stdd_recommend, stdd_verify: STDD workflow tools

Rules of operation:
1. First, inspect the project environment. Use fs_glob to find relevant files, fs_grep to search code patterns, and fs_read to understand implementation.
2. For targeted edits to existing files, prefer fs_patch (diff-based). For creating new files or complete rewrites, use fs_write.
3. After making changes, run tests via test_run to verify correctness.
4. If tests fail, use fs_read and fs_grep to diagnose issues, then fix and re-test.
5. Provide concise, clear explanations. Be direct and actionable.`;

// ── Build dynamic system prompt with project context ──
function buildSystemPrompt(cwd) {
  const parts = [SYSTEM_PROMPT_BASE];

  // Detect project type
  try {
    const fs = require('fs');
    const path = require('path');
    const contextParts = [];

    // Package.json info
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        contextParts.push(`Project: ${pkg.name || 'unnamed'} v${pkg.version || '?'}`);
        if (pkg.description) contextParts.push(`Description: ${pkg.description}`);
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        if (deps.length > 0) contextParts.push(`Dependencies: ${deps.slice(0, 15).join(', ')}${deps.length > 15 ? '...' : ''}`);
        if (devDeps.length > 0) contextParts.push(`DevDeps: ${devDeps.slice(0, 10).join(', ')}${devDeps.length > 10 ? '...' : ''}`);
      } catch (_) {}
    }

    // Key directory listing (non-recursive, limited)
    try {
      const entries = fs.readdirSync(cwd).filter(e => !e.startsWith('.') && !e.startsWith('node_modules'));
      const dirs = entries.filter(e => fs.statSync(path.join(cwd, e)).isDirectory());
      if (dirs.length > 0) contextParts.push(`Directories: ${dirs.slice(0, 12).join(', ')}`);
    } catch (_) {}

    // Git branch
    try {
      const { execSync } = require('child_process');
      const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
      if (branch) contextParts.push(`Git branch: ${branch}`);
    } catch (_) {}

    if (contextParts.length > 0) {
      parts.push('\n\nProject context:\n' + contextParts.map(l => `- ${l}`).join('\n'));
    }
  } catch (_) {}

  return parts.join('');
}

const TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'fs_read',
      description: 'Read a file from the workspace. Path must be relative to the workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to read' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_search',
      description: 'Search workspace files by query string or pattern.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or pattern to search for' },
          path: { type: 'string', description: 'Optional relative path to search within, defaults to root' },
          limit: { type: 'integer', description: 'Max number of results to return' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_glob',
      description: 'Find files matching a glob pattern (e.g., "**/*.js", "src/**/*.ts"). Returns matching file paths sorted by modification time.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern to match (e.g., "**/*.js", "src/**/*.ts", "*.json")' },
          path: { type: 'string', description: 'Optional directory to search within, defaults to workspace root' },
          limit: { type: 'integer', description: 'Max number of results to return (default 50)' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_grep',
      description: 'Search file contents by regex pattern. Returns matching lines with file paths and optional context. More powerful than fs_search for code exploration.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern to search for' },
          path: { type: 'string', description: 'Optional directory or file to search within' },
          glob: { type: 'string', description: 'Optional glob to filter files (e.g., "*.js", "*.{ts,tsx}")' },
          mode: { type: 'string', enum: ['content', 'files', 'count'], description: 'Output mode: content (matching lines), files (file paths only), count (match counts). Default: content' },
          context: { type: 'integer', description: 'Number of context lines before and after match (default: 2)' },
          limit: { type: 'integer', description: 'Max number of matches to return (default: 100)' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_patch',
      description: 'Apply modifications to files via a unified diff (patch). The diff must contain standard header, hunk ranges @@, and correct context.',
      parameters: {
        type: 'object',
        properties: {
          diff: { type: 'string', description: 'The complete, valid unified diff string' }
        },
        required: ['diff']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_write',
      description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does. Use for creating new files or complete rewrites.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path from workspace root' },
          content: { type: 'string', description: 'The complete file content to write' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'shell_run',
      description: 'Run a shell command inside the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line string to execute' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'test_run',
      description: 'Run the project tests and get normalized results.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Optional custom test command' },
          workspace: { type: 'string', description: 'Optional sub-workspace to run tests in' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Inspect current git dirty status and diff representation.',
      parameters: {
        type: 'object',
        properties: {
          patch: { type: 'boolean', description: 'Whether to include the full patch diff content' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_add',
      description: 'Stage modified or untracked files in the repository.',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files to stage'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Commit staged changes to the repository with a message.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The commit message' }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_push',
      description: 'Push local commits to the remote repository.',
      parameters: {
        type: 'object',
        properties: {
          remote: { type: 'string', description: 'The remote name, defaults to origin' },
          branch: { type: 'string', description: 'The branch name, defaults to main' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_checkout',
      description: 'Switch branch or restore working tree files.',
      parameters: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'The branch name to checkout' }
        },
        required: ['branch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_branch',
      description: 'Create and checkout a new branch in the repository.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The new branch name' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_reset',
      description: 'Reset current HEAD to discard local modifications.',
      parameters: {
        type: 'object',
        properties: {
          hard: { type: 'boolean', description: 'Whether to perform a hard reset, discarding modifications' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_status',
      description: 'Inspect the active STDD specifications, change tracking and Ralph Loop TDD phases.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_recommend',
      description: 'Get next step suggestion from STDD engine based on current files and progress.',
      parameters: {
        type: 'object',
        properties: {
          change: { type: 'string', description: 'Name of specific change to get recommendation for' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_verify',
      description: 'Run STDD Constitution rules audit and automated test verification gating.',
      parameters: {
        type: 'object',
        properties: {
          change: { type: 'string', description: 'Name of the change to verify' }
        }
      }
    }
  }
];

class ChaosAgentLoop {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.kernel = new AgentKernel({ cwd });
    this.systemPrompt = buildSystemPrompt(cwd);

    // Initialize provider config from ~/.chaos/providers.json + env vars
    const activeProvider = initFromEnv();

    if (activeProvider) {
      this.apiKey = activeProvider.apiKey;
      this.baseUrl = activeProvider.baseUrl;
      this.provider = activeProvider.providerType;
      this.providerId = activeProvider.id;
      this.model = activeProvider.model || (this.provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');
    } else {
      // Fallback to raw env vars
      this.apiKey = process.env.STDD_LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
      this.baseUrl = process.env.STDD_LLM_BASE_URL;
      this.provider = 'openai';
      this.providerId = 'openai';
      if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.STDD_LLM_BASE_URL) {
        this.provider = 'anthropic';
        this.providerId = 'anthropic';
      }
      const config = this.kernel.getConfig() || {};
      const configDefaults = config.defaults || {};
      this.model = process.env.STDD_LLM_MODEL || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || configDefaults.model || (this.provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');
    }

    // Token tracking
    this.maxTurns = 20;
    this.temperature = 0.2;
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.totalCost = 0;
  }

  async run(goal, chatHistory = [], callbacks = {}) {
    if (this.kernel && this.kernel.mcpInitPromise) {
      await this.kernel.mcpInitPromise.catch(() => {});
    }

    // Dynamically append MCP tool names to system prompt
    if (this.kernel && !this._mcpPromptAppended) {
      try {
        const mcpTools = this.kernel.mcpClientManager ? this.kernel.mcpClientManager.getTools() : [];
        if (mcpTools.length > 0) {
          const mcpNames = mcpTools.map(t => t.name).join(', ');
          this.systemPrompt += `\n\nMCP tools available: ${mcpNames}`;
        }
      } catch (_) {}
      this._mcpPromptAppended = true;
    }

    const defaultCallbacks = {
      onMessage: (msg) => console.log(msg),
      onToolDetected: (name) => {},
      onToolStart: (name, args) => console.log(chalk.dim(`  [${name}]`)),
      onToolEnd: (name, res) => {},
      askPermission: async (name, args) => true,
    };
    const cb = { ...defaultCallbacks, ...callbacks };
    const signal = callbacks.signal || null;

    if (!this.apiKey) {
      cb.onMessage(chalk.red('Error: No API key detected.'));
      cb.onMessage('Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, STDD_LLM_API_KEY\n');
      return;
    }

    // Initialize messages array for this execution turn
    const messages = [...chatHistory];
    messages.push({ role: 'user', content: goal });

    let running = true;
    let turnCount = 0;
    const maxTurns = this.maxTurns || 20;

    while (running && turnCount < maxTurns) {
      // Check abort signal between turns
      if (signal && signal.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }

      turnCount++;

      let response;
      try {
        response = await this._callLLMWithRetry(messages, cb, signal);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        cb.onMessage(chalk.red(`\nLLM Call Error: ${err.message}`));
        break;
      }

      // Track usage
      if (response && response.usage) {
        const pTokens = response.usage.prompt_tokens || 0;
        const cTokens = response.usage.completion_tokens || 0;
        this.totalPromptTokens += pTokens;
        this.totalCompletionTokens += cTokens;
        const turnCost = this._calculateCost(this.provider, this.model, pTokens, cTokens);
        this.totalCost += turnCost;
      }

      // Handle response content
      if (response.content) {
        messages.push({ role: 'assistant', content: response.content });
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        if (!response.content) {
          messages.push({ role: 'assistant', content: null, tool_calls: response.toolCallsRaw });
        } else {
          messages[messages.length - 1].tool_calls = response.toolCallsRaw;
        }

        for (const toolCall of response.toolCalls) {
          cb.onToolStart(toolCall.name, toolCall.arguments);

          let toolResult;
          let allowed = true;

          // Guarded / write tools require permission check
          const isGuarded = ['fs_patch', 'fs_write', 'shell_run', 'test_run', 'stdd_verify', 'git_add', 'git_commit', 'git_push', 'git_checkout', 'git_branch', 'git_reset'].includes(toolCall.name);
          if (isGuarded) {
            allowed = await cb.askPermission(toolCall.name, toolCall.arguments);
          }

          if (allowed) {
            try {
              toolResult = await this._executeTool(toolCall.name, toolCall.arguments);
              cb.onToolEnd(toolCall.name, toolResult);
            } catch (err) {
              toolResult = { error: err.message };
              cb.onToolEnd(toolCall.name, toolResult);
            }
          } else {
            toolResult = { error: 'User rejected permission to run this tool.' };
            cb.onToolEnd(toolCall.name, toolResult);
          }

          // Append tool result message
          if (this.provider === 'anthropic') {
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                }
              ]
            });
          } else {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.name,
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
            });
          }

          // Self-healing nudge: if tests fail, guide the model to fix them
          if (toolCall.name === 'test_run') {
            try {
              const parsedRes = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
              if (parsedRes && parsedRes.passed === false) {
                messages.push({
                  role: 'user',
                  content: 'Some tests failed. Read the error output above, fix the code using fs_patch, and re-run tests.'
                });
              }
            } catch (_) {}
          }
        }
      } else {
        // No tool calls, finish the conversation cycle
        running = false;
      }
    }

    // Return the updated chat history including this run
    return messages;
  }

  _getLLMTools() {
    const list = [...TOOLS_DEFINITION];
    if (this.kernel && this.kernel.tools) {
      const allTools = this.kernel.tools.list();
      for (const tool of allTools) {
        if (tool.category === 'mcp') {
          list.push({
            type: 'function',
            function: {
              name: tool.name.replace(/\./g, '_'),
              description: tool.description,
              parameters: tool.inputSchema || { type: 'object', properties: {} }
            }
          });
        }
      }
    }
    return list;
  }

  async _callLLM(messages, callbacks, signal) {
    if (this.provider === 'anthropic') {
      return this._callAnthropicStream(messages, callbacks, signal);
    }
    return this._callOpenAIStream(messages, callbacks, signal);
  }

  // ── LLM call with exponential backoff retry ──
  async _callLLMWithRetry(messages, callbacks, signal) {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal && signal.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      try {
        return await this._callLLM(messages, callbacks, signal);
      } catch (err) {
        const msg = err.message || '';
        // Non-retryable errors: throw immediately
        if (msg.includes('401') || msg.includes('403') || msg.includes('Invalid API key')) {
          throw err;
        }
        // Network errors with helpful messages
        if (err.code === 'ECONNREFUSED') {
          throw new Error(`Connection refused: ${msg}. Check your API base URL and internet connection.`);
        }
        if (err.code === 'ENOTFOUND') {
          throw new Error(`Host not found: ${msg}. Check your API base URL.`);
        }
        if (msg.includes('429') && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 2000;
          if (callbacks && callbacks.onMessage) {
            callbacks.onMessage(chalk.yellow(`\n  Rate limited. Retrying in ${(delay / 1000).toFixed(0)}s...\n`));
          }
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Timeout / other transient errors
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          if (callbacks && callbacks.onMessage) {
            callbacks.onMessage(chalk.yellow(`\n  Retry ${attempt + 1}/${maxRetries} in ${(delay / 1000).toFixed(0)}s...\n`));
          }
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  // ── Streaming OpenAI (SSE) ──
  _callOpenAIStream(messages, callbacks, signal) {
    return new Promise((resolve, reject) => {
      const url = this.baseUrl ? new URL('/chat/completions', this.baseUrl.replace(/\/$/, '')) : new URL('https://api.openai.com/v1/chat/completions');

      const payload = {
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...messages.map(m => ({
            role: m.role,
            content: m.content || '',
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.name ? { name: m.name } : {})
          }))
        ],
        tools: this._getLLMTools(),
        tool_choice: 'auto',
        temperature: this.temperature,
        stream: true,
      };

      const body = JSON.stringify(payload);
      const reqOptions = {
        method: 'POST',
        agent: _httpAgent,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      };
      if (signal) reqOptions.signal = signal;
      const req = https.request(url, reqOptions, (res) => {
        if (res.statusCode >= 400) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => reject(new Error(`OpenAI API error (${res.statusCode}): ${data}`)));
          return;
        }

        let content = '';
        const toolCallsMap = {};
        let promptTokens = 0;
        let completionTokens = 0;

        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta;
              if (!delta) continue;

              // Stream text content
              if (delta.content) {
                content += delta.content;
                if (callbacks && callbacks.onToken) {
                  callbacks.onToken(delta.content);
                } else if (callbacks && callbacks.onMessage) {
                  callbacks.onMessage(delta.content);
                }
              }

              // Accumulate tool calls from streaming chunks
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCallsMap[idx]) {
                    toolCallsMap[idx] = { id: tc.id || '', name: '', arguments: '' };
                  }
                  if (tc.id) toolCallsMap[idx].id = tc.id;
                  if (tc.function?.name) {
                    const isNew = !toolCallsMap[idx].name;
                    toolCallsMap[idx].name += tc.function.name;
                    if (isNew && callbacks && callbacks.onToolDetected) {
                      callbacks.onToolDetected(tc.function.name);
                    }
                  }
                  if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
                }
              }

              // Usage from final chunk
              if (json.usage) {
                promptTokens = json.usage.prompt_tokens || 0;
                completionTokens = json.usage.completion_tokens || 0;
              }
            } catch (_) { /* skip malformed SSE */ }
          }
        });

        res.on('end', () => {
          const toolCalls = [];
          const toolCallsRaw = [];
          for (const idx of Object.keys(toolCallsMap).sort((a, b) => Number(a) - Number(b))) {
            const tc = toolCallsMap[idx];
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.arguments); } catch (_) {}
            toolCalls.push({ id: tc.id, name: tc.name, arguments: parsedArgs });
            toolCallsRaw.push({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            });
          }

          resolve({
            content: content || null,
            toolCalls,
            toolCallsRaw,
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
          });
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // ── Streaming Anthropic ──
  _callAnthropicStream(messages, callbacks, signal) {
    return new Promise((resolve, reject) => {
      const base = (this.baseUrl && this.baseUrl.trim()) || 'https://api.anthropic.com/v1';
      const url = new URL('/messages', base.replace(/\/$/, ''));

      const anthropicTools = this._getLLMTools().map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      const formattedMessages = messages.map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content
              }
            ]
          };
        }
        if (Array.isArray(m.content)) {
          return { role: m.role, content: m.content };
        }
        if (m.tool_calls) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content || '' },
              ...m.tool_calls.map(tc => ({
                type: 'tool_use',
                id: tc.id,
                name: tc.name || tc.function?.name,
                input: tc.input || (tc.function?.arguments ? JSON.parse(tc.function.arguments) : {})
              }))
            ]
          };
        }
        return { role: m.role, content: m.content || '' };
      });

      const payload = {
        model: this.model,
        system: this.systemPrompt,
        messages: formattedMessages,
        tools: anthropicTools,
        max_tokens: 4096,
        temperature: this.temperature,
        stream: true,
      };

      const body = JSON.stringify(payload);
      const reqOptions = {
        method: 'POST',
        agent: _httpAgent,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      };
      if (signal) reqOptions.signal = signal;
      const req = https.request(url, reqOptions, (res) => {
        if (res.statusCode >= 400) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => reject(new Error(`Anthropic API error (${res.statusCode}): ${data}`)));
          return;
        }

        let content = '';
        const toolCalls = [];
        const toolCallsRaw = [];
        let inputTokens = 0;
        let outputTokens = 0;
        let currentTool = null;

        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));

              if (json.type === 'content_block_delta' && json.delta) {
                if (json.delta.type === 'text_delta' && json.delta.text) {
                  content += json.delta.text;
                  if (callbacks && callbacks.onToken) {
                    callbacks.onToken(json.delta.text);
                  } else if (callbacks && callbacks.onMessage) {
                    callbacks.onMessage(json.delta.text);
                  }
                }
                if (json.delta.type === 'input_json_delta' && json.delta.partial_json && currentTool) {
                  currentTool.arguments += json.delta.partial_json;
                }
              }

              if (json.type === 'content_block_start' && json.content_block) {
                if (json.content_block.type === 'tool_use') {
                  currentTool = {
                    id: json.content_block.id,
                    name: json.content_block.name,
                    arguments: '',
                  };
                  // Real-time notification when tool call starts
                  if (callbacks && callbacks.onToolDetected) {
                    callbacks.onToolDetected(json.content_block.name);
                  }
                }
              }

              if (json.type === 'content_block_stop' && currentTool) {
                let parsedArgs = {};
                try { parsedArgs = JSON.parse(currentTool.arguments || '{}'); } catch (_) {}
                toolCalls.push({
                  id: currentTool.id,
                  name: currentTool.name,
                  arguments: parsedArgs,
                });
                toolCallsRaw.push({
                  id: currentTool.id,
                  type: 'function',
                  function: {
                    name: currentTool.name,
                    arguments: currentTool.arguments || '{}',
                  },
                });
                currentTool = null;
              }

              if (json.type === 'message_start' && json.message?.usage) {
                inputTokens = json.message.usage.input_tokens || 0;
              }
              if (json.type === 'message_delta' && json.usage) {
                outputTokens = json.usage.output_tokens || 0;
              }
            } catch (_) { /* skip malformed SSE */ }
          }
        });

        res.on('end', () => {
          resolve({
            content: content || null,
            toolCalls,
            toolCallsRaw,
            usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
          });
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // ── Fallback: non-streaming (kept for tests / compatibility) ──
  _callOpenAI(messages) {
    return new Promise((resolve, reject) => {
      const url = this.baseUrl ? new URL('/chat/completions', this.baseUrl.replace(/\/$/, '')) : new URL('https://api.openai.com/v1/chat/completions');

      const payload = {
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...messages.map(m => ({
            role: m.role,
            content: m.content || '',
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.name ? { name: m.name } : {})
          }))
        ],
        tools: this._getLLMTools(),
        tool_choice: 'auto',
        temperature: this.temperature
      };

      const body = JSON.stringify(payload);
      const req = https.request(url, {
        method: 'POST',
        agent: _httpAgent,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`OpenAI API error (${res.statusCode}): ${data}`));
          try {
            const json = JSON.parse(data);
            const choice = json.choices?.[0] || {};
            const content = choice.message?.content || null;
            const toolCallsRaw = choice.message?.tool_calls || [];

            const toolCalls = toolCallsRaw.map(tc => {
              let parsedArgs = {};
              try {
                parsedArgs = JSON.parse(tc.function.arguments);
              } catch (_) {}
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: parsedArgs
              };
            });

            const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0 };
            resolve({ content, toolCalls, toolCallsRaw, usage });
          } catch (err) {
            reject(new Error(`Failed to parse LLM response: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  _callAnthropic(messages) {
    return new Promise((resolve, reject) => {
      const base = (this.baseUrl && this.baseUrl.trim()) || 'https://api.anthropic.com/v1';
      const url = new URL('/messages', base.replace(/\/$/, ''));

      const anthropicTools = this._getLLMTools().map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      const formattedMessages = messages.map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content
              }
            ]
          };
        }
        if (Array.isArray(m.content)) {
          return { role: m.role, content: m.content };
        }
        if (m.tool_calls) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content || '' },
              ...m.tool_calls.map(tc => ({
                type: 'tool_use',
                id: tc.id,
                name: tc.name || tc.function?.name,
                input: tc.input || (tc.function?.arguments ? JSON.parse(tc.function.arguments) : {})
              }))
            ]
          };
        }
        return { role: m.role, content: m.content || '' };
      });

      const payload = {
        model: this.model,
        system: this.systemPrompt,
        messages: formattedMessages,
        tools: anthropicTools,
        max_tokens: 4096,
        temperature: this.temperature
      };

      const body = JSON.stringify(payload);
      const req = https.request(url, {
        method: 'POST',
        agent: _httpAgent,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`Anthropic API error (${res.statusCode}): ${data}`));
          try {
            const json = JSON.parse(data);
            let content = '';
            const toolCalls = [];
            const toolCallsRaw = [];

            if (Array.isArray(json.content)) {
              for (const block of json.content) {
                if (block.type === 'text') {
                  content += block.text;
                } else if (block.type === 'tool_use') {
                  toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input
                  });
                  toolCallsRaw.push({
                    id: block.id,
                    type: 'function',
                    function: {
                      name: block.name,
                      arguments: JSON.stringify(block.input)
                    }
                  });
                }
              }
            }

            const usage = {
              prompt_tokens: json.usage?.input_tokens || 0,
              completion_tokens: json.usage?.output_tokens || 0
            };

            resolve({
              content: content || null,
              toolCalls,
              toolCallsRaw,
              usage
            });
          } catch (err) {
            reject(new Error(`Failed to parse Anthropic response: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async _executeTool(name, args) {
    const kernelToolName = name.replace(/_/g, '.');

    // Custom handling for fs_glob
    if (name === 'fs_glob') {
      return this._executeGlob(args);
    }

    // Custom handling for fs_grep
    if (name === 'fs_grep') {
      return this._executeGrep(args);
    }

    // Custom handling for fs_write
    if (name === 'fs_write') {
      return this._executeWrite(args);
    }

    // Custom handling for fs_patch
    if (kernelToolName === 'fs.patch') {
      const patchArgs = {
        diff: args.diff,
        approved: true,
        apply: true
      };
      return this.kernel.executeTool('fs.patch', patchArgs);
    }

    // Normal handling
    return this.kernel.executeTool(kernelToolName, args);
  }

  _executeGlob(args) {
    const fs = require('fs');
    const path = require('path');
    const pattern = args.pattern || '**/*';
    const searchDir = args.path ? path.resolve(this.cwd, args.path) : this.cwd;
    const limit = args.limit || 50;

    // Convert glob pattern to a regex that properly handles **, *, and ?
    function globToRegex(pat) {
      // Process the pattern as a whole string
      // First escape all regex-special chars except * and ?
      let re = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      // Replace ** with a placeholder
      re = re.replace(/\*\*/g, '{{GLOBSTAR}}');
      // Replace remaining * (single star = match anything except /)
      re = re.replace(/\*/g, '[^/]*');
      // Replace ? (single char except /)
      re = re.replace(/\?/g, '[^/]');
      // Now handle globstar: **/ means zero or more directory levels
      // It can be at start, middle, or end of pattern
      re = re.replace(/\{\{GLOBSTAR\}\}\//g, '(?:.+/)?'); // **/foo -> (?:.+/)?foo
      re = re.replace(/\/\{\{GLOBSTAR\}\}/g, '/.*');        // foo/** -> foo/.*
      re = re.replace(/\{\{GLOBSTAR\}\}/g, '.*');            // standalone ** -> .*
      return new RegExp('^' + re + '$');
    }

    const re = globToRegex(pattern);
    const results = [];

    function walk(dir, depth) {
      if (depth > 20 || results.length >= limit) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(searchDir, fullPath);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (re.test(relPath)) {
            results.push(relPath);
          }
        }
      } catch (_) { /* skip inaccessible dirs */ }
    }

    walk(searchDir, 0);

    return {
      status: 'ok',
      pattern,
      path: args.path || '.',
      count: results.length,
      files: results.slice(0, limit),
    };
  }

  _executeGrep(args) {
    const fs = require('fs');
    const path = require('path');
    const pattern = args.pattern;
    const searchDir = args.path ? path.resolve(this.cwd, args.path) : this.cwd;
    const mode = args.mode || 'content';
    const contextLines = args.context || 2;
    const limit = args.limit || 100;
    const globFilter = args.glob || null;

    if (!pattern) return { status: 'error', error: 'pattern is required' };

    let re;
    try {
      re = new RegExp(pattern, 'i');
    } catch (e) {
      return { status: 'error', error: `Invalid regex: ${e.message}` };
    }

    // Simple glob filter regex
    let globRe = null;
    if (globFilter) {
      const exts = globFilter.match(/\{([^}]+)\}/);
      if (exts) {
        const alts = exts[1].split(',').map(e => e.replace(/\./g, '\\.')).join('|');
        const base = globFilter.replace(/\{[^}]+\}/, '(' + alts + ')').replace(/\*/g, '[^/]*');
        globRe = new RegExp(base + '$');
      } else {
        globRe = new RegExp(globFilter.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
      }
    }

    const matches = [];
    const fileMatches = {};

    function walk(dir) {
      if (matches.length >= limit) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (matches.length >= limit) return;
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            const relPath = path.relative(searchDir, fullPath);
            if (globRe && !globRe.test(relPath)) continue;
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length && matches.length < limit; i++) {
                if (re.test(lines[i])) {
                  if (mode === 'files') {
                    if (!fileMatches[relPath]) {
                      fileMatches[relPath] = true;
                      matches.push(relPath);
                    }
                  } else if (mode === 'count') {
                    fileMatches[relPath] = (fileMatches[relPath] || 0) + 1;
                  } else {
                    // content mode — include context lines
                    const start = Math.max(0, i - contextLines);
                    const end = Math.min(lines.length, i + contextLines + 1);
                    const contextBlock = [];
                    for (let j = start; j < end; j++) {
                      contextBlock.push({
                        line: j + 1,
                        text: lines[j],
                        match: j === i,
                      });
                    }
                    matches.push({ file: relPath, line: i + 1, context: contextBlock });
                  }
                }
              }
            } catch (_) { /* skip binary/unreadable files */ }
          }
        }
      } catch (_) { /* skip inaccessible dirs */ }
    }

    walk(searchDir);

    if (mode === 'count') {
      return {
        status: 'ok',
        pattern,
        mode,
        results: Object.entries(fileMatches).map(([file, count]) => ({ file, matches: count })),
      };
    }

    return {
      status: 'ok',
      pattern,
      mode,
      count: mode === 'files' ? matches.length : matches.length,
      results: matches,
    };
  }

  _executeWrite(args) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(this.cwd, args.path);
    const content = args.content || '';

    // Safety: prevent writing outside workspace
    if (!filePath.startsWith(this.cwd)) {
      return { status: 'error', error: 'Path outside workspace' };
    }

    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const isNew = !fs.existsSync(filePath);
    const bytesWritten = Buffer.byteLength(content, 'utf8');
    fs.writeFileSync(filePath, content, 'utf8');

    return {
      status: 'ok',
      path: args.path,
      action: isNew ? 'created' : 'overwritten',
      bytes: bytesWritten,
    };
  }

  _calculateCost(provider, model, promptTokens, completionTokens) {
    let inputRate = 0; // per million tokens
    let outputRate = 0; // per million tokens

    if (provider === 'openai') {
      const lowerModel = String(model).toLowerCase();
      if (lowerModel.includes('gpt-4o-mini')) {
        inputRate = 0.15;
        outputRate = 0.60;
      } else if (lowerModel.includes('gpt-4o')) {
        inputRate = 2.50;
        outputRate = 10.00;
      } else if (lowerModel.includes('o1-')) {
        inputRate = 15.00;
        outputRate = 60.00;
      } else if (lowerModel.includes('gpt-4')) {
        inputRate = 30.00;
        outputRate = 90.00;
      } else {
        inputRate = 0.15;
        outputRate = 0.60;
      }
    } else if (provider === 'anthropic') {
      const lowerModel = String(model).toLowerCase();
      if (lowerModel.includes('sonnet')) {
        inputRate = 3.00;
        outputRate = 15.00;
      } else if (lowerModel.includes('haiku')) {
        inputRate = 0.80;
        outputRate = 4.00;
      } else if (lowerModel.includes('opus')) {
        inputRate = 15.00;
        outputRate = 75.00;
      } else {
        inputRate = 3.00;
        outputRate = 15.00;
      }
    }

    const inputCost = (promptTokens / 1000000) * inputRate;
    const outputCost = (completionTokens / 1000000) * outputRate;
    return inputCost + outputCost;
  }

  setModel(model) {
    this.model = model;
    const lower = model.toLowerCase();
    if (lower.includes('claude') || lower.includes('anthropic')) {
      this.provider = 'anthropic';
    } else if (lower.includes('gpt') || lower.includes('openai') || lower.includes('o1') || lower.includes('o3')) {
      this.provider = 'openai';
    }
  }

  /**
   * Switch to a different provider by ID.
   * Loads its apiKey, baseUrl, model from provider config.
   */
  switchProvider(providerId) {
    const result = setActive(providerId);
    if (!result) return false;
    const active = getActive();
    if (!active) return false;
    this.apiKey = active.apiKey;
    this.baseUrl = active.baseUrl;
    this.provider = active.providerType;
    this.providerId = active.id;
    if (active.model) this.model = active.model;
    return true;
  }

  getProviderId() {
    return this.providerId || this.provider;
  }

  getModel() {
    return this.model;
  }

  getProvider() {
    return this.provider;
  }

  getSessionStats() {
    return {
      provider: this.provider,
      model: this.model,
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      totalTokens: this.totalPromptTokens + this.totalCompletionTokens,
      cost: this.totalCost
    };
  }

  compactHistory(chatHistory) {
    if (chatHistory.length <= 6) return chatHistory;

    // Keep the first user message (original goal) always
    const firstUser = chatHistory.find(m => m.role === 'user' && typeof m.content === 'string');

    // Find a safe slice point for the tail — avoid orphaned tool results
    const KEEP_TAIL = 6;
    let sliceIndex = chatHistory.length - KEEP_TAIL;
    while (sliceIndex > 0 && (
      chatHistory[sliceIndex].role === 'tool' ||
      chatHistory[sliceIndex].role === 'tool_result' ||
      (chatHistory[sliceIndex].content && Array.isArray(chatHistory[sliceIndex].content) && chatHistory[sliceIndex].content.some(c => c.type === 'tool_result'))
    )) {
      sliceIndex--;
    }
    const tail = chatHistory.slice(sliceIndex);

    // If first user message is already in the tail, just return tail
    if (firstUser && tail.includes(firstUser)) return tail;

    // Build a summary of discarded messages
    const discarded = chatHistory.slice(0, sliceIndex);
    const summaryParts = [];
    let toolCallCount = 0;
    let userMsgCount = 0;
    for (const m of discarded) {
      if (m.role === 'user' && typeof m.content === 'string' && m.content.length > 0) userMsgCount++;
      if (m.role === 'assistant' && m.tool_calls) toolCallCount += m.tool_calls.length;
    }
    summaryParts.push(`${userMsgCount} user messages`);
    if (toolCallCount > 0) summaryParts.push(`${toolCallCount} tool calls`);

    const summary = `[Context compacted: ${summaryParts.join(', ')} omitted. Original goal preserved below.]\n\n`;

    // Return: first user message + compact summary + tail
    const result = [];
    if (firstUser) {
      result.push(firstUser);
      // Replace firstUser content with summary + original
      result[result.length - 1] = {
        ...firstUser,
        content: summary + firstUser.content,
      };
    }

    // Add assistant acknowledgment of compaction
    result.push({ role: 'assistant', content: `[System: ${summaryParts.join(', ')} compacted. Continuing from recent context.]` });

    result.push(...tail);
    return result;
  }
}

module.exports = { ChaosAgentLoop };

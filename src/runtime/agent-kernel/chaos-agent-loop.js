const https = require('https');
const http = require('http');
const { AgentKernel } = require('./index');
const { AgentHooks } = require('./hooks');
const { initFromEnv, getActive, setActive } = require('./provider-config');
const chalk = require('chalk');

// ── Shared keep-alive agents for connection reuse ──
const AGENT_OPTS = { keepAlive: true, keepAliveMsecs: 30000, maxSockets: 4, maxFreeSockets: 2 };
const _agents = {
  'http:': new http.Agent(AGENT_OPTS),
  'https:': new https.Agent(AGENT_OPTS),
};

/**
 * Local model servers (Ollama, LM Studio, llama.cpp, vLLM dev servers) speak
 * plain http:// on localhost — dispatch the request module and keep-alive
 * agent by URL protocol instead of hardcoding https.
 */
function _transportFor(url) {
  if (url.protocol === 'http:') {
    const host = url.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      // Plaintext to a non-loopback host sends the API key in cleartext
      console.warn(chalk.yellow(`Warning: sending API key over plaintext http to ${host}`));
    }
    return { mod: http, agent: _agents['http:'] };
  }
  return { mod: https, agent: _agents['https:'] };
}

// Parse streamed tool-call arguments defensively: malformed JSON must never
// crash a turn — degrade to empty args and let the model retry.
function safeParseToolArgs(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

const SYSTEM_PROMPT_BASE = `You are the Chaos Ace Agent, a self-contained AI coding assistant similar to Claude Code.
Your goal is to help the user implement features, refactor code, and fix bugs in their workspace.

Available tools:
- fs_read: Read a file's contents (large files return a line window with totalLines/truncated — paginate with startLine/lineCount)
- fs_read_image: Read an image (png/jpg/gif/webp) for visual analysis — it arrives as a native vision block you can see
- symbols: Symbol-level navigation (functions/classes/methods with line numbers; LSP when configured, heuristics otherwise) — combine with fs_read startLine to jump to definitions
- fs_search: Basic text search across files
- fs_glob: Find files by glob pattern (e.g., "**/*.js", "src/**/*.ts") — use this to locate files
- fs_grep: Regex search with context lines, glob filter, and output modes (content/files/count) — use this for code exploration
- fs_write: Write entire file content (create new files or complete rewrites)
- fs_patch: Apply modifications via unified diff (for targeted edits to existing files)
- shell_run: Execute shell commands
- test_run: Run project tests
- git_diff, git_add, git_commit, git_push, git_pull, git_log, git_stash, git_checkout, git_branch, git_reset: Git operations
- git_pr: Create a GitHub pull request via the gh CLI (pushes current branch first)
- git_worktree: List/add/remove git worktrees for isolated parallel workspaces — combine with task_dispatch cwd to run subagents in separate worktrees
- stdd_status, stdd_recommend, stdd_verify: STDD workflow tools
- task_create: Create a tracked work item with subject, description, and optional dependencies
- task_update: Update task status (pending/in_progress/completed/deleted), add blockers or blocked-by dependencies
- task_list: List all tasks with status, subject, and dependency info; optionally filter by status
- task_dispatch: Dispatch subagent tasks with isolated contexts. Subagents do NOT see this conversation — write fully self-contained prompts (include file paths, goals, expected output). Ideal for parallel exploration/research. Default read-only tools; granted write tools still require user approval. Set background:true to run detached, then poll with task_status.
- task_status: List background subagent tasks (id/prompt/status/summary) or fetch one by id.
- skill: Load a STDD skill's instructions by name before following its workflow (catalog via /skills)

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

    // Project memory: persistent instructions the user keeps in the workspace.
    // Same convention as Claude Code (CLAUDE.md) and OpenCode (AGENTS.md).
    const MEMORY_FILES = ['CHAOS.md', 'CLAUDE.md', 'AGENTS.md'];
    const MEMORY_CAP = 16 * 1024;
    for (const name of MEMORY_FILES) {
      const memPath = path.join(cwd, name);
      if (fs.existsSync(memPath)) {
        let text = fs.readFileSync(memPath, 'utf8');
        let truncatedNote = '';
        if (text.length > MEMORY_CAP) {
          text = text.slice(0, MEMORY_CAP);
          truncatedNote = '\n[... truncated]';
        }
        if (text.trim()) {
          parts.push(`\n\nProject instructions (from ${name}):\n${text.trim()}${truncatedNote}`);
        }
        break; // first match wins — avoids conflicting duplicates
      }
    }
  } catch (_) {}

  return parts.join('');
}

const TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'fs_read',
      description: 'Read a file from the workspace. Path must be relative to the workspace root. Large files are returned as a line window (see totalLines/truncated in the result) — paginate with startLine/lineCount instead of re-reading the whole file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to read' },
          startLine: { type: 'integer', description: 'First line to read (1-based), for windowed reads of large files' },
          lineCount: { type: 'integer', description: 'Number of lines to read per window (max 2000)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_read_image',
      description: 'Read an image file (png/jpg/jpeg/gif/webp, max 5MB) for visual analysis. The image is delivered to you as a native vision block — describe/analyze it directly.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the image file' },
          detail: { type: 'string', enum: ['low', 'high', 'auto'], description: 'OpenAI vision detail level, default auto' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'symbols',
      description: 'Symbol-level navigation for a source file: list functions/classes/methods/types with line numbers (LSP server when configured in .chaos/lsp.json, heuristic extraction otherwise). Jump to a symbol with fs_read startLine.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the source file' },
          name: { type: 'string', description: 'Optional substring filter by symbol name' },
          kind: { type: 'string', description: 'Optional kind filter: function | class | method | type | interface | impl' }
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
      name: 'git_pull',
      description: 'Pull commits from the remote repository and merge into the current branch.',
      parameters: {
        type: 'object',
        properties: {
          remote: { type: 'string', description: 'The remote name, defaults to origin' },
          branch: { type: 'string', description: 'Optional branch to pull; defaults to current branch' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Read commit history. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'integer', description: 'Number of commits to show (1-200, default 20)' },
          file: { type: 'string', description: 'Optional file path to show commits for' },
          format: { type: 'string', description: 'git pretty format, default "%h %ad %an %s"' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_stash',
      description: 'Stash operations: temporarily save (push), restore (pop), list, or drop stashed changes.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['push', 'pop', 'list', 'drop'], description: 'Stash action, defaults to push' },
          message: { type: 'string', description: 'Message for stash push (optional)' },
          index: { type: 'integer', description: 'Stash index for pop/drop (optional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_pr',
      description: 'Create a GitHub pull request for the current branch via the gh CLI (pushes the branch first).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'PR title (usually a Conventional Commit summary)' },
          body: { type: 'string', description: 'PR description (what/why/evidence)' },
          base: { type: 'string', description: 'Target branch, optional (repo default otherwise)' },
          draft: { type: 'boolean', description: 'Create as draft PR' },
          skipPush: { type: 'boolean', description: 'Skip pushing before creating the PR' }
        },
        required: ['title']
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
  },
  {
    type: 'function',
    function: {
      name: 'task_create',
      description: 'Create a new task to track work items. Use this to break down complex goals into manageable steps.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Short title describing the task (imperative form, e.g. "Fix auth bug in login flow")' },
          description: { type: 'string', description: 'Detailed description of what needs to be done' },
          activeForm: { type: 'string', description: 'Present continuous form shown during work (e.g. "Fixing auth bug")' }
        },
        required: ['subject', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_update',
      description: 'Update a task\'s status, description, or other fields. Use to mark tasks in_progress when starting work and completed when done.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The task ID to update' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'deleted'], description: 'New status for the task' },
          subject: { type: 'string', description: 'New subject title' },
          description: { type: 'string', description: 'New description' },
          addBlocks: { type: 'array', items: { type: 'string' }, description: 'Task IDs that this task blocks (dependents)' },
          addBlockedBy: { type: 'array', items: { type: 'string' }, description: 'Task IDs that must complete before this task can start' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_list',
      description: 'List all tasks and their current status. Returns a summary of each task including ID, subject, status, and dependencies.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'deleted'], description: 'Filter by status (optional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_dispatch',
      description: 'Dispatch one or more subagent tasks, each with an isolated fresh context. Subagents do NOT see this conversation — every prompt must be fully self-contained. Best for parallel exploration, research, or independent multi-file investigation. By default subagents only have read-only tools; you may grant write tools explicitly (granted write tools still require user approval).',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'Tasks to run (1-5). Runs in parallel where possible.',
            items: {
              type: 'object',
              properties: {
                prompt: { type: 'string', description: 'Self-contained instruction for the subagent, including any file paths or context it needs' },
                agent: { type: 'string', description: 'Optional named agent from .chaos/agents.json (role prompt + tool whitelist + model); see /agents' },
                background: { type: 'boolean', description: 'Run detached — dispatch returns a task id immediately; poll results with task_status' },
                cwd: { type: 'string', description: 'Optional relative working directory for workspace isolation (e.g. ".worktrees/feat-x" created via git_worktree). No ".." allowed.' },
                tools: { type: 'array', items: { type: 'string' }, description: 'Tool names the subagent may use. Default read-only set: fs_read, fs_read_image, fs_search, fs_glob, fs_grep, git_diff, git_log, task_list, skill' },
                model: { type: 'string', description: 'Optional model override for this subagent' },
                maxTurns: { type: 'integer', description: 'Optional turn cap, 1-20 (default 10)' }
              },
              required: ['prompt']
            }
          }
        },
        required: ['tasks']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_worktree',
      description: 'Manage git worktrees for isolated parallel workspaces. add creates .worktrees/<name> with its own branch; dispatch subagents with cwd pointing into the worktree for conflict-free parallel changes.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'add', 'remove'], description: 'Defaults to list' },
          name: { type: 'string', description: 'Worktree name (add/remove) — no path separators' },
          branch: { type: 'string', description: 'Branch name for add (defaults to the worktree name)' },
          force: { type: 'boolean', description: 'Force remove even with uncommitted changes' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_status',
      description: 'Check background subagent tasks: list all running/completed tasks with summaries, or fetch a single result by id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Optional background task id (e.g. "bg-1") — omit to list all' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'skill',
      description: 'Load a STDD skill\'s full instructions by name (e.g. "commit", "verify", "plan"). Load the skill BEFORE executing its workflow, then follow the instructions for the rest of the session.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Skill name, e.g. "commit" (see the /skills command for the catalog)' }
        },
        required: ['name']
      }
    }
  }
];

class ChaosAgentLoop {
  constructor(cwd = process.cwd(), options = {}) {
    this.cwd = cwd;
    // A parent loop may inject its own kernel so subagents share tool
    // executors and already-running MCP servers instead of respawning them.
    this.kernel = options.kernel || new AgentKernel({ cwd });
    // When set (a Set of tool names), restricts both the LLM tool catalog
    // and tool execution to those tools. Used by subagents.
    this.allowedTools = null;
    // Lifecycle hooks from ~/.chaos/config.json (preToolUse / postToolUse).
    // Applied to subagents too — each loop reads the same user config.
    this.hooks = new AgentHooks(cwd);
    // Plan mode: when active, write tools are refused so the model explores
    // read-only and presents an implementation plan for user approval
    // (Claude Code / OpenCode "plan" mode equivalent). Toggle via /plan.
    this.planMode = false;
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
    this.maxTokens = 4096;        // Anthropic max_tokens (configurable via ~/.chaos/config.json)
    this.promptCaching = true;    // Anthropic prompt caching via cache_control breakpoints
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.lastPromptTokens = 0;
    this.lastCompletionTokens = 0;
    this.totalCost = 0;

    // Task management store
    this._tasks = [];
    this._nextTaskId = 1;
    // Background subagent registry (task_dispatch background:true)
    this._backgroundTasks = new Map();
    this._bgSeq = 1;
    // One-shot/pipe callers set this so run() drains background tasks before
    // the process exits (REPL keeps them resident across turns instead).
    this.awaitBackgroundOnExit = false;
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
      onToolDetected: () => {},
      onToolStart: (name) => console.log(chalk.dim(`  [${name}]`)),
      onToolEnd: () => {},
      askPermission: async () => true,
    };
    const cb = { ...defaultCallbacks, ...callbacks };
    const signal = callbacks.signal || null;
    // Expose the active callbacks/signal so nested executors (task_dispatch
    // subagents) can forward permission prompts to the same UI.
    this._currentCallbacks = cb;
    this._currentSignal = signal;

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
    let emptyAnswerNudged = false;
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
        // Last-request usage approximates CURRENT context size (each request
        // contains the whole history) — used by usage-driven auto-compaction.
        this.lastPromptTokens = pTokens;
        this.lastCompletionTokens = cTokens;
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

        // Image vision messages must NOT interleave between the tool messages
        // of one batch (OpenAI requires tool messages to directly follow the
        // assistant tool_calls message) — collect and append after the loop.
        const pendingImageMessages = [];

        for (const toolCall of response.toolCalls) {
          cb.onToolStart(toolCall.name, toolCall.arguments);

          let toolResult;
          let allowed = true;
          let hookBlocked = false;
          let planBlocked = false;

          // preToolUse hook can veto the call before permission checks run
          if (this.hooks && this.hooks.enabled) {
            const verdict = await this.hooks.preToolUse({ tool: toolCall.name, args: toolCall.arguments, cwd: this.cwd });
            if (verdict.blocked) {
              hookBlocked = true;
              toolResult = { error: `Blocked by preToolUse hook: ${verdict.reason}` };
              cb.onToolEnd(toolCall.name, toolResult);
            }
          }

          // Guarded / write tools require permission check
          const isGuarded = ['fs_patch', 'fs_write', 'shell_run', 'test_run', 'stdd_verify', 'git_add', 'git_commit', 'git_push', 'git_pull', 'git_stash', 'git_pr', 'git_worktree', 'git_checkout', 'git_branch', 'git_reset'].includes(toolCall.name);
          if (allowed && !hookBlocked && this.planMode && isGuarded) {
            // Plan mode: refuse writes and steer the model toward planning
            allowed = false;
            planBlocked = true;
            toolResult = {
              error: 'Plan mode is active: write tools are disabled. Explore with read-only tools, then present a concise implementation plan (files to change, steps, risks) and ask the user to approve execution with /plan off.',
            };
            cb.onToolEnd(toolCall.name, toolResult);
          } else if (allowed && !hookBlocked && isGuarded) {
            allowed = await cb.askPermission(toolCall.name, toolCall.arguments);
          }

          if (allowed && !hookBlocked) {
            try {
              toolResult = await this._executeTool(toolCall.name, toolCall.arguments);
              cb.onToolEnd(toolCall.name, toolResult);
              // postToolUse fires only when the tool actually ran
              if (this.hooks && this.hooks.enabled) {
                await this.hooks.postToolUse({ tool: toolCall.name, args: toolCall.arguments, result: toolResult, cwd: this.cwd });
              }
            } catch (err) {
              toolResult = { error: err.message };
              cb.onToolEnd(toolCall.name, toolResult);
            }
          } else if (!hookBlocked && !planBlocked) {
            toolResult = { error: 'User rejected permission to run this tool.' };
            cb.onToolEnd(toolCall.name, toolResult);
          }

          // Append tool result message — multimodal results (fs_read_image)
          // carry an _image payload that maps to the provider-native block.
          const img = (toolResult && typeof toolResult === 'object' && toolResult._image) ? toolResult._image : null;
          const resultText = typeof toolResult === 'string'
            ? toolResult
            : JSON.stringify(toolResult, (k, v) => (k === '_image' ? undefined : v), 2);

          if (this.provider === 'anthropic') {
            // Anthropic: image blocks live INSIDE the tool_result content array
            const blocks = [{ type: 'text', text: resultText }];
            if (img) {
              blocks.push({
                type: 'image',
                source: { type: 'base64', media_type: img.mimeType, data: img.data },
              });
            }
            messages.push({
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: toolCall.id, content: blocks }]
            });
          } else {
            // OpenAI-compatible: tool message carries text; the image follows
            // as a user message with an image_url vision block.
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.name,
              content: resultText + (img ? '\n[The image is attached in the next message as a vision block.]' : ''),
            });
            if (img) {
              pendingImageMessages.push({
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}`, detail: img.detail || 'auto' } },
                  { type: 'text', text: `[Image from fs_read_image: ${toolResult.path}]` },
                ],
              });
            }
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

        // Flush deferred image vision messages AFTER all tool messages of the
        // batch (interleaving would violate the tool-message ordering rule).
        messages.push(...pendingImageMessages);
      } else {
        // No tool calls: normally finish — but a thinking model (qwen3/glm/
        // deepseek-r1) can burn the whole turn on reasoning_content and emit
        // NO visible answer, which used to end the run silently. Nudge once.
        if (!response.content && response.reasoning && !emptyAnswerNudged && turnCount < maxTurns) {
          emptyAnswerNudged = true;
          messages.push({ role: 'user', content: 'Your previous turn produced only internal reasoning with no visible answer. Reply now with a concise final answer to the user.' });
          continue;
        }
        // No tool calls, finish the conversation cycle
        running = false;
      }
    }

    // Background subagents stay RESIDENT across turns in the REPL (the next
    // prompt can poll task_status; finished tasks are announced by the
    // terminal). One-shot/pipe mode opts into draining here because the
    // process exits right after run().
    if (this.awaitBackgroundOnExit) {
      const stillRunning = [...this._backgroundTasks.values()].filter(e => e.status === 'running' && e.promise);
      if (stillRunning.length > 0) {
        await Promise.allSettled(stillRunning.map(e => e.promise));
      }
    }

    // Return the updated chat history including this run
    return messages;
  }

  _getLLMTools() {
    let list = [...TOOLS_DEFINITION];
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
    if (this.allowedTools) {
      list = list.filter(t => this.allowedTools.has(t.function.name));
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
      const url = new URL(((this.baseUrl && this.baseUrl.trim()) || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions');

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
        // Standard OpenAI field; compatible servers that don't know it ignore
        // it, and ones that do report real usage in the final chunk.
        stream_options: { include_usage: true },
      };

      const body = JSON.stringify(payload);
      const _t = _transportFor(url);
      const reqOptions = {
        method: 'POST',
        agent: _t.agent,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      };
      if (signal) reqOptions.signal = signal;
      const req = _t.mod.request(url, reqOptions, (res) => {
        if (res.statusCode >= 400) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => reject(new Error(`OpenAI API error (${res.statusCode}): ${data}`)));
          return;
        }

        let content = '';
        let reasoning = '';
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

              // Usage-only final chunk (stream_options.include_usage) carries
              // an EMPTY choices array — capture usage BEFORE the delta guard
              // below skips that chunk entirely.
              if (json.usage) {
                promptTokens = json.usage.prompt_tokens || 0;
                completionTokens = json.usage.completion_tokens || 0;
              }

              const delta = json.choices?.[0]?.delta;
              if (!delta) continue;

              // Thinking models (qwen3 / glm / deepseek-r1) put CoT in
              // reasoning_content — capture it so an empty-content turn is
              // detectable instead of silently ending the loop.
              if (delta.reasoning_content) {
                reasoning += delta.reasoning_content;
              }

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
            reasoning: reasoning ? reasoning.slice(0, 4000) : null,
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
      const url = new URL(base.replace(/\/+$/, '') + '/messages');

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
          // Clone blocks and strip stale cache_control so per-request
          // breakpoints never mutate/accumulate in the persistent history
          // (Anthropic caps cache_control at 4 blocks per request).
          return {
            role: m.role,
            content: m.content.map(b => {
              if (b && typeof b === 'object') {
                const clone = { ...b };
                delete clone.cache_control;
                return clone;
              }
              return b;
            }),
          };
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
                // Streamed tool args can occasionally be malformed — a bare
                // JSON.parse here would crash the whole turn.
                input: tc.input || safeParseToolArgs(tc.function?.arguments)
              }))
            ]
          };
        }
        return { role: m.role, content: m.content || '' };
      });

      // Prompt caching: mark stable prefixes (system prompt + tool definitions) and the
      // last conversational message with ephemeral cache_control breakpoints so the
      // Anthropic API can reuse the cached prefix across turns.
      const useCaching = this.promptCaching !== false;
      const systemBlocks = useCaching
        ? [{ type: 'text', text: this.systemPrompt, cache_control: { type: 'ephemeral' } }]
        : this.systemPrompt;
      if (useCaching && anthropicTools.length > 0) {
        anthropicTools[anthropicTools.length - 1].cache_control = { type: 'ephemeral' };
      }
      if (useCaching && formattedMessages.length > 0) {
        const lastMsg = formattedMessages[formattedMessages.length - 1];
        if (Array.isArray(lastMsg.content)) {
          lastMsg.content[lastMsg.content.length - 1].cache_control = { type: 'ephemeral' };
        } else if (typeof lastMsg.content === 'string' && lastMsg.content) {
          lastMsg.content = [{ type: 'text', text: lastMsg.content, cache_control: { type: 'ephemeral' } }];
        }
      }

      const payload = {
        model: this.model,
        system: systemBlocks,
        messages: formattedMessages,
        tools: anthropicTools,
        max_tokens: this.maxTokens || 4096,
        temperature: this.temperature,
        stream: true,
      };

      const body = JSON.stringify(payload);
      const _t = _transportFor(url);
      const reqOptions = {
        method: 'POST',
        agent: _t.agent,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      };
      if (signal) reqOptions.signal = signal;
      const req = _t.mod.request(url, reqOptions, (res) => {
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

  async _executeTool(name, args) {
    const kernelToolName = name.replace(/_/g, '.');

    // Subagent tool whitelist: the model never sees filtered tools, but
    // enforce here too in case a tool call slips through.
    if (this.allowedTools && !this.allowedTools.has(name)) {
      return { error: `Tool "${name}" is not available to this agent. Allowed tools: ${[...this.allowedTools].join(', ')}` };
    }

    // Dispatch subagent tasks (lazy require avoids a load-time cycle with ./subagent)
    if (name === 'task_dispatch') {
      return this._executeTaskDispatch(args);
    }

    // Background subagent status polling
    if (name === 'task_status') {
      return this._executeTaskStatus(args);
    }

    // Multimodal image read (dot-mapping would corrupt the name — explicit)
    if (name === 'fs_read_image') {
      return this.kernel.executeTool('fs.read_image', args);
    }

    // Symbol-level navigation (LSP with heuristic fallback)
    if (name === 'symbols') {
      const { getSymbols } = require('./lsp');
      try {
        return await getSymbols(this.cwd, args || {});
      } catch (err) {
        return { status: 'error', error: err.message };
      }
    }

    // Load a STDD skill's instructions on demand
    if (name === 'skill') {
      return this._executeSkillLoad(args);
    }

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

    // Task management tools
    if (name === 'task_create') {
      return this._executeTaskCreate(args);
    }
    if (name === 'task_update') {
      return this._executeTaskUpdate(args);
    }
    if (name === 'task_list') {
      return this._executeTaskList(args);
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
      lastPromptTokens: this.lastPromptTokens,
      lastCompletionTokens: this.lastCompletionTokens,
      cost: this.totalCost
    };
  }

  async compactHistory(chatHistory) {
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

    // Try an LLM summary of the discarded segment first; fall back to the
    // structural placeholder if no key is set or the call fails.
    let llmSummary = null;
    try {
      llmSummary = await this._summarizeSegment(discarded);
    } catch (_) { /* fall back below */ }

    const summary = llmSummary
      ? `[Context compacted: ${summaryParts.join(', ')} summarized below.]\n\n${llmSummary.trim()}\n\n[Original goal preserved below.]\n\n`
      : `[Context compacted: ${summaryParts.join(', ')} omitted. Original goal preserved below.]\n\n`;

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

  /**
   * Summarize a discarded history segment with a single non-streaming LLM call.
   * Resolves null (never throws) when no key is set or the call fails, so
   * compactHistory can fall back to structural truncation.
   */
  _summarizeSegment(messages) {
    if (!this.apiKey) return Promise.resolve(null);

    // Render the segment into bounded plain text
    const lines = [];
    for (const m of messages) {
      if (m.role === 'user') {
        const text = typeof m.content === 'string'
          ? m.content
          : (Array.isArray(m.content)
            ? m.content.map(c => {
                if (typeof c === 'string') return c;
                if (c.text) return c.text;
                // Anthropic tool_result blocks nest their content — flatten
                // instead of stringifying to "[object Object]"
                if (Array.isArray(c.content)) return c.content.map(b => b.text || '').join(' ');
                return '';
              }).join(' ')
            : '');
        if (text && text.trim()) lines.push(`USER: ${text.slice(0, 400)}`);
      } else if (m.role === 'assistant') {
        if (m.content && typeof m.content === 'string' && m.content.trim()) {
          lines.push(`ASSISTANT: ${m.content.slice(0, 400)}`);
        }
        if (m.tool_calls) {
          for (const tc of m.tool_calls) {
            const fn = tc.function || {};
            const args = String(fn.arguments || '').slice(0, 150);
            lines.push(`TOOL_CALL ${fn.name || tc.name} ${args}`);
          }
        }
      } else if (m.role === 'tool') {
        const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
        lines.push(`TOOL_RESULT ${m.name || ''}: ${text.slice(0, 300)}`);
      }
    }
    const rendered = lines.join('\n').slice(0, 12000);
    if (!rendered.trim()) return Promise.resolve(null);

    const systemPrompt = 'You are a context compactor for an AI coding agent session. Produce a dense, factual summary of the conversation segment. Preserve: user goals and decisions, file paths touched, commands run and their outcomes, errors encountered, unresolved questions, and current task state. Use terse bullet points. No preamble.';
    const userPrompt = `Summarize this conversation segment for continued work:\n\n${rendered}`;

    return new Promise((resolve) => {
      let url, payload, headers;
      if (this.provider === 'anthropic') {
        const base = (this.baseUrl && this.baseUrl.trim()) || 'https://api.anthropic.com/v1';
        url = new URL(base.replace(/\/+$/, '') + '/messages');
        payload = {
          model: this.model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 400,
          temperature: 0,
        };
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        };
      } else {
        url = new URL(((this.baseUrl && this.baseUrl.trim()) || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions');
        payload = {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 400,
          temperature: 0,
        };
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        };
      }

      const body = JSON.stringify(payload);
      const _t = _transportFor(url);
      const reqOptions = { method: 'POST', agent: _t.agent, headers, timeout: 30000 };
      const req = _t.mod.request(url, reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 400) return resolve(null);
            const json = JSON.parse(data);
            const text = this.provider === 'anthropic'
              ? (json.content || []).map(b => b.text || '').join('').trim()
              : (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content || '').trim();
            resolve(text || null);
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    });
  }

  // ── Task Management ──

  _executeTaskCreate(args) {
    if (!args.subject) return { status: 'error', error: 'subject is required' };
    if (!args.description) return { status: 'error', error: 'description is required' };

    const id = String(this._nextTaskId++);
    const task = {
      id,
      subject: args.subject,
      description: args.description,
      activeForm: args.activeForm || '',
      status: 'pending',
      blockedBy: [],
      blocks: [],
      createdAt: Date.now(),
    };
    this._tasks.push(task);

    return { status: 'ok', task: { id, subject: task.subject, status: task.status } };
  }

  _executeTaskUpdate(args) {
    if (!args.id) return { status: 'error', error: 'id is required' };

    const task = this._tasks.find(t => t.id === args.id);
    if (!task) return { status: 'error', error: `Task ${args.id} not found` };
    if (task.status === 'deleted') return { status: 'error', error: `Task ${args.id} is deleted` };

    if (args.status) {
      const valid = ['pending', 'in_progress', 'completed', 'deleted'];
      if (!valid.includes(args.status)) {
        return { status: 'error', error: `Invalid status: ${args.status}. Must be one of: ${valid.join(', ')}` };
      }
      task.status = args.status;
    }
    if (args.subject) task.subject = args.subject;
    if (args.description) task.description = args.description;

    // Handle dependency links
    if (args.addBlockedBy) {
      for (const depId of args.addBlockedBy) {
        const dep = this._tasks.find(t => t.id === depId);
        if (dep && !task.blockedBy.includes(depId)) {
          task.blockedBy.push(depId);
        }
        if (dep && !dep.blocks.includes(task.id)) {
          dep.blocks.push(task.id);
        }
      }
    }
    if (args.addBlocks) {
      for (const depId of args.addBlocks) {
        const dep = this._tasks.find(t => t.id === depId);
        if (dep && !task.blocks.includes(depId)) {
          task.blocks.push(depId);
        }
        if (dep && !dep.blockedBy.includes(task.id)) {
          dep.blockedBy.push(task.id);
        }
      }
    }

    return { status: 'ok', task: { id: task.id, subject: task.subject, status: task.status } };
  }

  _executeTaskList(args) {
    let tasks = this._tasks.filter(t => t.status !== 'deleted');

    if (args && args.status) {
      tasks = tasks.filter(t => t.status === args.status);
    }

    const summary = tasks.map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      activeForm: t.activeForm || '',
      blockedBy: t.blockedBy,
      blocks: t.blocks,
    }));

    return {
      status: 'ok',
      count: summary.length,
      tasks: summary,
    };
  }

  // ── Subagent dispatch ──

  async _executeTaskDispatch(args) {
    const { dispatchSubagents } = require('./subagent');
    let tasks = Array.isArray(args && args.tasks) ? args.tasks : [];
    // Convenience form: task_dispatch({ prompt, tools, model, maxTurns }) for a single task
    if (tasks.length === 0 && args && args.prompt) {
      tasks = [{ prompt: args.prompt, tools: args.tools, model: args.model, maxTurns: args.maxTurns }];
    }
    if (tasks.length === 0) {
      return { status: 'error', error: 'Provide a tasks array with at least one {prompt} entry.' };
    }
    const cb = this._currentCallbacks || {};

    const fg = [];
    const bg = [];
    for (const t of tasks) (t && t.background ? bg : fg).push(t);

    let fgResult = null;
    if (fg.length > 0) {
      try {
        fgResult = await dispatchSubagents({
          parentLoop: this,
          tasks: fg,
          askPermission: cb.askPermission,
          signal: this._currentSignal || null,
        });
      } catch (err) {
        fgResult = { status: 'error', error: err.message };
      }
    }

    const background = [];
    const MAX_BACKGROUND = 3;
    for (const t of bg) {
      const running = [...this._backgroundTasks.values()].filter(e => e.status === 'running').length;
      if (running >= MAX_BACKGROUND) {
        background.push({ prompt: t.prompt, ok: false, error: `Background capacity reached (${MAX_BACKGROUND} running). Dispatch this task as foreground instead.` });
        continue;
      }
      const id = `bg-${this._bgSeq++}`;
      const entry = { id, prompt: t.prompt, status: 'running', startedAt: Date.now(), result: null };
      this._backgroundTasks.set(id, entry);
      // Prune old completed entries beyond 20
      if (this._backgroundTasks.size > 20) {
        for (const [k, e] of this._backgroundTasks) {
          if (this._backgroundTasks.size <= 20) break;
          if (e.status !== 'running') this._backgroundTasks.delete(k);
        }
      }
      entry.promise = dispatchSubagents({
        parentLoop: this,
        tasks: [t],
        askPermission: cb.askPermission,
        signal: this._currentSignal || null,
      })
        .then(res => { entry.status = 'completed'; entry.result = res.results[0]; })
        .catch(err => { entry.status = 'failed'; entry.result = { ok: false, summary: '', error: err.message }; });
      background.push({ id, prompt: t.prompt, status: 'running', note: 'Poll with task_status' });
    }

    if (bg.length === 0) return fgResult;
    if (fg.length === 0) return { status: 'ok', count: bg.length, background };
    return { ...fgResult, background };
  }

  // ── Background subagent status ──

  _executeTaskStatus(args) {
    const map = this._backgroundTasks;
    if (!map || map.size === 0) {
      return { status: 'ok', count: 0, tasks: [], note: 'No background tasks. Dispatch with task_dispatch({ tasks: [{ prompt, background: true }] }).' };
    }
    const fmt = (e) => ({
      id: e.id,
      prompt: e.prompt,
      status: e.status,
      elapsedSec: Math.round((Date.now() - e.startedAt) / 1000),
      ...(e.result
        ? { ok: e.result.ok, summary: e.result.summary, ...(e.result.error ? { error: e.result.error } : {}) }
        : {}),
    });
    if (args && args.id) {
      const e = map.get(args.id);
      if (!e) return { status: 'error', error: `Unknown background task "${args.id}". List all with task_status().` };
      return { status: 'ok', task: fmt(e) };
    }
    return { status: 'ok', count: map.size, tasks: [...map.values()].map(fmt) };
  }

  // ── On-demand STDD skill loading ──

  _executeSkillLoad(args) {
    const { loadSkill } = require('../../utils/skills-loader');
    if (!args || !args.name) return { status: 'error', error: 'name is required.' };
    // Trust boundary: skill names come from the model — reject traversal
    if (/[\\/]|\.\./.test(args.name)) {
      return { status: 'error', error: 'Invalid skill name.' };
    }
    try {
      const skill = loadSkill(args.name, this.cwd);
      if (!skill) {
        return { status: 'error', error: `Skill "${args.name}" not found. Available skills can be listed with the /skills command.` };
      }
      return { status: 'ok', skill: skill.name, description: skill.description, instructions: skill.body };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}

module.exports = { ChaosAgentLoop, buildSystemPrompt };

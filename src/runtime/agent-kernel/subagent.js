/**
 * Subagent execution for the Chaos agent kernel.
 *
 * A subagent is a fresh ChaosAgentLoop with an isolated message history that
 * shares the parent's AgentKernel (tool executors + already-running MCP
 * servers) and provider credentials. By default a subagent is restricted to
 * read-only tools; explicitly granted write tools still go through the same
 * askPermission callback as the main loop.
 */

const { ChaosAgentLoop } = require('./chaos-agent-loop');
const { getAgentConfig } = require('../../utils/agents-config');

// Default tool whitelist for subagents — read-only exploration.
const READ_ONLY_TOOLS = [
  'fs_read', 'fs_read_image', 'fs_search', 'fs_glob', 'fs_grep', 'symbols',
  'git_diff', 'git_log',
  'task_list',
  'skill',
];

// Upper bound on subagents running at the same time.
const SUBAGENT_CONCURRENCY = 3;

// Upper bound on tasks accepted per dispatch call.
const MAX_TASKS_PER_DISPATCH = 5;

/**
 * Run a single subagent task against the parent loop's kernel/provider.
 *
 * @param {object} options
 * @param {ChaosAgentLoop} options.parentLoop - loop whose kernel/credentials are shared
 * @param {{prompt: string, tools?: string[], model?: string, maxTurns?: number}} options.task
 * @param {Function} [options.askPermission] - permission callback forwarded from the main loop
 * @param {AbortSignal} [options.signal] - abort signal shared with the main loop
 * @param {Function} [options.onEvent] - optional progress sink: (event, data)
 * @returns {Promise<{prompt: string, ok: boolean, summary: string, turnsUsed: number, tokens: number, error?: string}>}
 */
async function runSubagent({ parentLoop, task, askPermission, signal, onEvent }) {
  if (!parentLoop) throw new Error('runSubagent requires a parentLoop');
  if (!task || !task.prompt || typeof task.prompt !== 'string') {
    return { prompt: (task && task.prompt) || '', ok: false, summary: '', turnsUsed: 0, tokens: 0, error: 'task.prompt is required' };
  }

  // Named agent configs (.chaos/agents.json) supply defaults for tools,
  // model and a role prompt; explicit task fields still win.
  const agentCfg = task.agent ? getAgentConfig(task.agent, parentLoop.cwd) : null;
  if (task.agent && !agentCfg) {
    return { prompt: task.prompt, ok: false, summary: '', turnsUsed: 0, tokens: 0, error: `Unknown agent "${task.agent}". Define it in .chaos/agents.json (see /agents).` };
  }

  const requestedTools = (Array.isArray(task.tools) && task.tools.length > 0)
    ? task.tools.filter(t => typeof t === 'string')
    : (agentCfg && agentCfg.tools && agentCfg.tools.length > 0 ? agentCfg.tools : READ_ONLY_TOOLS);

  // Optional workspace isolation (e.g. a git worktree): a subagent with its
  // own cwd gets its OWN kernel + rebuilt system prompt so every tool
  // operates inside the isolated tree instead of the parent workspace.
  let subCwd = parentLoop.cwd;
  let subKernel = parentLoop.kernel;
  if (task.cwd && typeof task.cwd === 'string' && !task.cwd.includes('..')) {
    const path = require('path');
    const fs = require('fs');
    const candidate = path.resolve(parentLoop.cwd, task.cwd);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      subCwd = candidate;
      const { AgentKernel } = require('./index');
      subKernel = new AgentKernel({ cwd: subCwd }); // fresh MCP/tool executors
    }
  }

  const sub = new ChaosAgentLoop(subCwd, { kernel: subKernel });
  // Share provider credentials from the parent (never re-read env/config).
  sub.apiKey = parentLoop.apiKey;
  sub.baseUrl = parentLoop.baseUrl;
  sub.provider = parentLoop.provider;
  sub.providerId = parentLoop.providerId;
  sub.model = task.model || (agentCfg && agentCfg.model) || parentLoop.model;
  if (subCwd !== parentLoop.cwd) {
    // Rebuild project context for the isolated workspace
    const { buildSystemPrompt } = require('./chaos-agent-loop');
    sub.systemPrompt = buildSystemPrompt(subCwd);
  }
  if (agentCfg && agentCfg.prompt) {
    sub.systemPrompt += `\n\nRole instructions (agent: ${task.agent}):\n${agentCfg.prompt}`;
  }
  sub.temperature = parentLoop.temperature;
  sub.maxTokens = parentLoop.maxTokens;
  sub.promptCaching = parentLoop.promptCaching;
  sub.planMode = parentLoop.planMode; // plan mode applies to subagents too
  sub.maxTurns = Math.max(1, Math.min(Number(task.maxTurns) || 10, 20));
  sub.allowedTools = new Set(requestedTools);

  let messages;
  let llmError = null;
  try {
    messages = await sub.run(task.prompt, [], {
      // run() reports unrecoverable LLM failures through onMessage rather than
      // throwing — capture them so the dispatch result can flag the failure.
      onMessage: (msg) => {
        const text = String(msg || '');
        if (!llmError && text.includes('LLM Call Error')) {
          llmError = text.split('LLM Call Error:').pop().trim();
        }
      },
      onToolStart: (name, args) => { if (onEvent) onEvent('tool', { tool: name, args }); },
      onToolEnd: () => {},
      // Fail-CLOSED: with no permission callback available, guarded tools are
      // denied — the model sees the rejection and the dispatch stays honest.
      askPermission: askPermission || (async () => false),
      signal,
    });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return {
      prompt: task.prompt,
      ok: false,
      summary: '',
      turnsUsed: 0,
      tokens: 0,
      error: aborted ? 'aborted' : (err && err.message) || String(err),
    };
  }

  if (!Array.isArray(messages)) {
    return { prompt: task.prompt, ok: false, summary: '', turnsUsed: 0, tokens: 0, error: 'subagent produced no output (missing API key?)' };
  }

  const assistantMsgs = messages.filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim());
  const summary = (assistantMsgs[assistantMsgs.length - 1] || {}).content || '';
  const stats = sub.getSessionStats();

  // A subagent that produced no assistant output failed (e.g. every LLM
  // attempt errored out) — surface it instead of reporting an empty success.
  if (assistantMsgs.length === 0) {
    return {
      prompt: task.prompt,
      ok: false,
      summary: '',
      turnsUsed: 0,
      tokens: stats.totalTokens,
      error: llmError || 'subagent produced no output',
    };
  }

  return {
    prompt: task.prompt,
    ok: true,
    summary: summary.slice(0, 2000),
    turnsUsed: assistantMsgs.length,
    tokens: stats.totalTokens,
    promptTokens: stats.promptTokens,
    completionTokens: stats.completionTokens,
    ...(llmError ? { warning: llmError } : {}),
  };
}

/**
 * Dispatch multiple subagent tasks with a small concurrency pool.
 * Never throws: failures are captured per-task.
 */
async function dispatchSubagents({ parentLoop, tasks, askPermission, signal, onEvent }) {
  let list = Array.isArray(tasks) ? tasks : [];
  if (list.length > MAX_TASKS_PER_DISPATCH) list = list.slice(0, MAX_TASKS_PER_DISPATCH);

  const results = new Array(list.length);
  let next = 0;

  async function worker() {
    while (next < list.length) {
      const i = next++;
      results[i] = await runSubagent({
        parentLoop,
        task: list[i],
        askPermission,
        signal,
        onEvent,
      });
      if (onEvent) onEvent('done', { index: i, ok: results[i].ok });
    }
  }

  const workers = [];
  const concurrency = Math.min(SUBAGENT_CONCURRENCY, Math.max(list.length, 1));
  for (let w = 0; w < concurrency; w++) workers.push(worker());
  await Promise.all(workers);

  // Fold subagent token usage into the parent's session stats —
  // unconditionally, so failed tasks' costs are accounted too.
  if (parentLoop) {
    parentLoop.totalPromptTokens += results.reduce((acc, r) => acc + ((r && r.promptTokens) || 0), 0);
    parentLoop.totalCompletionTokens += results.reduce((acc, r) => acc + ((r && r.completionTokens) || 0), 0);
  }

  return {
    status: 'ok',
    count: results.length,
    okCount: results.filter(r => r && r.ok).length,
    results: results.map(r => ({
      prompt: r.prompt,
      ok: r.ok,
      summary: r.summary,
      turnsUsed: r.turnsUsed,
      tokens: r.tokens || 0,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
}

module.exports = { runSubagent, dispatchSubagents, READ_ONLY_TOOLS, SUBAGENT_CONCURRENCY, MAX_TASKS_PER_DISPATCH };

/**
 * Agent lifecycle hooks (Claude Code-compatible concept, minimal core).
 *
 * User-configured shell commands that run at tool-execution boundaries:
 *   ~/.chaos/config.json:
 *   {
 *     "hooks": {
 *       "preToolUse":  [{ "command": "node guard.js", "timeout": 5000 }, "echo ok"],
 *       "postToolUse": [{ "command": "node log.js" }]
 *     }
 *   }
 *
 * - preToolUse: receives a JSON payload on stdin ({event, tool, args, cwd});
 *   a NON-ZERO exit blocks the tool call (stderr/stdout tail becomes the
 *   reason). A hook that times out is killed and ALSO blocks (fail-closed).
 * - postToolUse: same payload plus { result }; failures are logged, never fatal.
 * - No config → zero-cost no-op.
 *
 * Hooks execute via ASYNC child processes — spawnSync here used to block the
 * whole event loop (SSE streaming, REPL input, parallel subagents) for up to
 * the hook timeout on every tool call.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pluginHooks } = require('../../utils/plugins-loader');

const HOOK_EVENTS = ['preToolUse', 'postToolUse'];
const DEFAULT_TIMEOUT_MS = 10000;

function loadHookConfig(cwd = process.cwd()) {
  const normalized = { preToolUse: [], postToolUse: [], untrustedPluginHooks: [] };
  const addEntry = (event, entry) => {
    if (!normalized[event]) normalized[event] = [];
    normalized[event].push(entry);
  };
  const addRaw = (event, raw) => {
    if (typeof raw === 'string') addEntry(event, { command: raw });
    else if (Array.isArray(raw)) {
      for (const h of raw) {
        if (typeof h === 'string') addEntry(event, { command: h });
        else if (h && h.command) addEntry(event, h);
      }
    }
  };

  let trustedPlugins = [];
  try {
    const cfgPath = path.join(os.homedir(), '.chaos', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const hooks = cfg.hooks && typeof cfg.hooks === 'object' ? cfg.hooks : {};
      for (const event of HOOK_EVENTS) addRaw(event, hooks[event]);
      if (Array.isArray(cfg.trustedPlugins)) trustedPlugins = cfg.trustedPlugins;
    }
  } catch (_) { /* keep plugin hooks even if user config is broken */ }

  // Plugin packs (.chaos/plugins/*/hooks.json) — SECURITY: only plugins the
  // user explicitly trusted in ~/.chaos/config.json ("trustedPlugins") run.
  // Cloned repos must not auto-execute arbitrary shell commands.
  try {
    const plugins = pluginHooks(cwd, { trusted: trustedPlugins });
    for (const event of HOOK_EVENTS) {
      for (const h of plugins[event] || []) addEntry(event, h);
    }
    normalized.untrustedPluginHooks = plugins.untrusted;
  } catch (_) { /* best-effort */ }

  return normalized;
}

class AgentHooks {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.config = loadHookConfig(cwd);
    // One visible notice per process when a workspace ships plugin hooks the
    // user has not trusted — they are NOT executed, but the user should know.
    const untrusted = this.config.untrustedPluginHooks;
    if (untrusted && untrusted.length > 0 && !AgentHooks._warned) {
      AgentHooks._warned = true;
      console.warn(`[chaos] Plugin hook(s) detected but NOT trusted (not executed): ${untrusted.join(', ')}. Trust them via "trustedPlugins" in ~/.chaos/config.json.`);
    }
  }

  get enabled() {
    return HOOK_EVENTS.some(e => this.config[e] && this.config[e].length > 0);
  }

  describe() {
    return HOOK_EVENTS.map(event => ({
      event,
      commands: (this.config[event] || []).map(h => h.command),
    }));
  }

  /**
   * Run preToolUse hooks. Resolves { blocked, reason } — never rejects.
   */
  async preToolUse({ tool, args, cwd } = {}) {
    const hooks = this.config.preToolUse || [];
    if (hooks.length === 0) return { blocked: false };

    for (const hook of hooks) {
      const res = await this._exec(hook, { event: 'preToolUse', tool, args, cwd: cwd || this.cwd });
      const status = res ? res.status : undefined;
      if (status !== 0) {
        const reason = ((res && (res.stderr || res.stdout)) || `exit ${status}`).trim().slice(0, 300);
        return { blocked: true, reason, command: hook.command };
      }
    }
    return { blocked: false };
  }

  /**
   * Run postToolUse hooks. Failures are swallowed (best-effort) — never rejects.
   */
  async postToolUse({ tool, args, result, cwd } = {}) {
    const hooks = this.config.postToolUse || [];
    for (const hook of hooks) {
      try {
        await this._exec(hook, { event: 'postToolUse', tool, args, result: this._summarize(result), cwd: cwd || this.cwd });
      } catch (_) { /* best-effort */ }
    }
  }

  _summarize(result) {
    if (result === undefined) return undefined;
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    return text.length > 2000 ? text.slice(0, 2000) + '...' : text;
  }

  /**
   * Spawn a hook command asynchronously. Resolves { status, stdout, stderr };
   * never rejects. The payload is written to stdin; a slow hook is SIGKILLed
   * at its timeout (default 10s) and reported as status 1.
   */
  _exec(hook, payload) {
    const timeout = Math.max(1000, Number(hook.timeout) || DEFAULT_TIMEOUT_MS);
    return new Promise((resolve) => {
      let child;
      try {
        child = spawn(hook.command, { cwd: this.cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        resolve({ status: 1, stdout: '', stderr: (err && err.message) || 'hook failed to spawn' });
        return;
      }

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timedOut = false;
      const timeoutNote = `hook timed out after ${timeout}ms`;
      const finish = (status, extraErr) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ status, stdout, stderr: stderr + (extraErr ? `\n${extraErr}` : '') });
      };
      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGKILL'); } catch (_) { /* already gone */ }
        finish(1, timeoutNote);
      }, timeout);

      if (child.stdout) child.stdout.on('data', d => { stdout += d; });
      if (child.stderr) child.stderr.on('data', d => { stderr += d; });
      child.on('error', err => finish(1, (err && err.message) || 'spawn error'));
      // A kill-triggered close (code null) must still read as a timeout
      child.on('close', code => finish(timedOut ? 1 : code, timedOut ? timeoutNote : undefined));
      try {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      } catch (_) { /* stdin closed early — the hook will still exit */ }
    });
  }
}

module.exports = { AgentHooks, HOOK_EVENTS };

/**
 * Named agent configurations (OpenCode-style agents system).
 *
 * Define reusable subagent personas with their own role prompt, tool
 * whitelist and model, then reference them by name from task_dispatch:
 *
 *   ~/.chaos/agents.json (global) and <cwd>/.chaos/agents.json (workspace,
 *   wins per-name):
 *   {
 *     "agents": {
 *       "reviewer": {
 *         "description": "Critical code reviewer",
 *         "prompt": "You are a strict senior reviewer. Focus on bugs...",
 *         "tools": ["fs_read", "fs_grep", "fs_glob"],
 *         "model": "gpt-4o"
 *       },
 *       "explorer": { "description": "Repo cartographer", "tools": ["fs_read", "fs_glob", "fs_grep", "git_log"] }
 *     }
 *   }
 *
 * task_dispatch usage: { "tasks": [{ "agent": "reviewer", "prompt": "..." }] }
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function _readConfig(file) {
  try {
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const agents = data.agents && typeof data.agents === 'object' ? data.agents : {};
    // Null-prototype accumulator: a JSON key of "__proto__" can't hijack the
    // prototype, and inherited keys ('constructor', 'toString') can't sneak in.
    const clean = Object.create(null);
    for (const [name, cfg] of Object.entries(agents)) {
      if (cfg && typeof cfg === 'object') {
        clean[name] = {
          description: String(cfg.description || ''),
          prompt: typeof cfg.prompt === 'string' ? cfg.prompt : '',
          tools: Array.isArray(cfg.tools) ? cfg.tools.filter(t => typeof t === 'string') : undefined,
          model: typeof cfg.model === 'string' ? cfg.model : undefined,
        };
      }
    }
    return clean;
  } catch (_) {
    return {};
  }
}

/**
 * Load named agent configs. Workspace .chaos/agents.json entries override
 * global ~/.chaos/agents.json entries with the same name.
 * @returns {Record<string, {description, prompt, tools?, model?}>}
 */
function loadAgentConfigs(cwd = process.cwd()) {
  const globalCfg = _readConfig(path.join(os.homedir(), '.chaos', 'agents.json'));
  const workspaceCfg = _readConfig(path.join(cwd, '.chaos', 'agents.json'));
  return { ...globalCfg, ...workspaceCfg };
}

function getAgentConfig(name, cwd = process.cwd()) {
  if (!name) return null;
  const cfgs = loadAgentConfigs(cwd);
  // Own-property check only — 'constructor'/'toString' must not resolve
  return Object.prototype.hasOwnProperty.call(cfgs, name) ? cfgs[name] : null;
}

function listAgentConfigs(cwd = process.cwd()) {
  const cfgs = loadAgentConfigs(cwd);
  return Object.entries(cfgs)
    .map(([name, cfg]) => ({
      name,
      description: cfg.description,
      hasPrompt: Boolean(cfg.prompt),
      tools: cfg.tools || null,
      model: cfg.model || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { loadAgentConfigs, getAgentConfig, listAgentConfigs };

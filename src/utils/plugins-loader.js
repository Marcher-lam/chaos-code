/**
 * Workspace plugin packs (.chaos/plugins/<name>/).
 *
 * A plugin bundles any combination of:
 *   plugin.json   { "name": "...", "description": "..." }   (optional metadata)
 *   skills/<skill>/SKILL.md                                  → merged into the skill catalog
 *   commands/<name>.md                                        → merged into command templates
 *   hooks.json   { "preToolUse": [...], "postToolUse": [...] } → appended to lifecycle hooks
 *
 * Everything is merged at load time — no runtime install step. Workspace
 * stdd/skills entries still win over plugin skills with the same name.
 */

const fs = require('fs');
const path = require('path');

function _readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function _pluginDirs(cwd) {
  const root = path.join(cwd, '.chaos', 'plugins');
  const dirs = [];
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      const meta = _readJsonSafe(path.join(dir, 'plugin.json')) || {};
      dirs.push({
        name: meta.name || entry.name,
        description: meta.description || '',
        dir,
      });
    }
  } catch (_) { /* no plugins dir */ }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

function countDir(dir, filter) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(filter).length;
  } catch (_) {
    return 0;
  }
}

/**
 * List installed plugins with what they contribute.
 */
function listPlugins(cwd = process.cwd()) {
  return _pluginDirs(cwd).map(p => ({
    ...p,
    skillCount: countDir(path.join(p.dir, 'skills'), e => e.isDirectory()),
    commandCount: countDir(path.join(p.dir, 'commands'), e => e.isFile() && e.name.endsWith('.md')),
    hookCount: _readJsonSafe(path.join(p.dir, 'hooks.json')) ? 1 : 0,
  }));
}

/** Plugin skills roots for the skills-loader to scan (name → dir). */
function pluginSkillsDirs(cwd = process.cwd()) {
  return _pluginDirs(cwd).map(p => ({ plugin: p.name, dir: path.join(p.dir, 'skills') }));
}

/** Plugin commands roots for the skills-loader to scan. */
function pluginCommandsDirs(cwd = process.cwd()) {
  return _pluginDirs(cwd).map(p => ({ plugin: p.name, dir: path.join(p.dir, 'commands') }));
}

/**
 * Merge plugin hooks.json files (normalized to AgentHooks shape).
 * SECURITY: hooks are arbitrary shell commands sourced from the workspace —
 * running them merely by opening a cloned repo would be supply-chain RCE.
 * Only plugins whose names are listed in the user's global config
 * ("trustedPlugins": [...]) contribute hooks. Untrusted plugin hooks are
 * reported (not executed) so the user can decide to trust them.
 *
 * @param {string} cwd
 * @param {{trusted?: string[]}} [options] — trusted plugin names
 * @returns {{ preToolUse: [...], postToolUse: [...], untrusted: string[] }}
 */
function pluginHooks(cwd = process.cwd(), options = {}) {
  const trusted = new Set(options.trusted || []);
  const merged = { preToolUse: [], postToolUse: [], untrusted: [] };
  for (const p of _pluginDirs(cwd)) {
    const hooksPath = path.join(p.dir, 'hooks.json');
    if (!_readJsonSafe(hooksPath)) continue; // no hooks → nothing to gate
    if (!trusted.has(p.name)) {
      merged.untrusted.push(p.name);
      continue;
    }
    const hooks = _readJsonSafe(hooksPath);
    for (const event of ['preToolUse', 'postToolUse']) {
      const entry = hooks[event];
      if (typeof entry === 'string') merged[event].push({ command: entry });
      else if (Array.isArray(entry)) {
        for (const h of entry) {
          if (typeof h === 'string') merged[event].push({ command: h });
          else if (h && h.command) merged[event].push(h);
        }
      }
    }
  }
  return merged;
}

module.exports = { listPlugins, pluginSkillsDirs, pluginCommandsDirs, pluginHooks };

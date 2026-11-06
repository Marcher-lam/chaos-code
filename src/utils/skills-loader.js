/**
 * Loader for built-in STDD skills (src/templates/skills/stdd/<name>/SKILL.md)
 * and command templates (src/templates/commands/<name>.md).
 *
 * Used by both the REPL (/skills, /skill, /cmds, /cmd) and the agent kernel
 * (the `skill` tool) so the model can load instructions on demand.
 *
 * Workspace overrides: <cwd>/stdd/skills/<name>/SKILL.md and
 * <cwd>/stdd/commands/<name>.md take precedence over the built-in templates.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getPackageRoot } = require('./path-resolver');
const { pluginSkillsDirs, pluginCommandsDirs } = require('./plugins-loader');

// ── TTL cache ──
// The REPL completer hits these listings on every Tab press; each uncached
// call re-reads and YAML-parses the whole catalog synchronously. A short TTL
// bounds staleness (new skills appear within 3s) while making completion
// effectively free. loadSkill/loadCommand stay UNCACHED — freshness matters
// at execution time.

const LIST_CACHE_TTL_MS = 3000;
const _listCache = new Map(); // kind → { expires, value }

function _cachedList(kind, compute) {
  const hit = _listCache.get(kind);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;
  const value = compute();
  _listCache.set(kind, { expires: now + LIST_CACHE_TTL_MS, value });
  return value;
}

/** Test seam: drop cached listings so the next call re-scans. */
function _resetListCache() {
  _listCache.clear();
}

// ── Frontmatter parsing ──

function parseMarkdown(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: raw.trim() };
  let frontmatter = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object') frontmatter = parsed;
  } catch (_) { /* keep empty frontmatter on malformed YAML */ }
  return { frontmatter, body: raw.slice(match[0].length).trim() };
}

// Accepts "commit", "stdd.commit", "/stdd:commit", "/STDD:Commit" → "commit".
// Returns null for anything containing path separators or '..' — names must
// resolve INSIDE the skills/commands roots (model-controlled input).
function normalizeSkillName(name) {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/^stdd:/, '')
    .replace(/^stdd\./, '');
  if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    return null;
  }
  return normalized;
}

function _builtinSkillsDir() {
  return path.join(getPackageRoot(), 'src', 'templates', 'skills', 'stdd');
}

function _builtinCommandsDir() {
  return path.join(getPackageRoot(), 'src', 'templates', 'commands');
}

// ── Skills ──

/**
 * List available skills. Workspace skills (stdd/skills/<name>/SKILL.md)
 * override built-in templates with the same name.
 * @returns {Array<{name: string, description: string, riskLevel?: string, phase?: string, source: 'workspace'|'builtin'}>}
 */
function _listSkillsUncached(cwd = process.cwd()) {
  const byName = new Map();

  const readSkillDir = (dir, source) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillPath = path.join(dir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;
        const { frontmatter, body } = parseMarkdown(fs.readFileSync(skillPath, 'utf8'));
        byName.set(entry.name.toLowerCase(), {
          name: entry.name,
          description: String(frontmatter.description || _firstBodyLine(body) || ''),
          riskLevel: frontmatter.risk_level,
          phase: frontmatter.phase,
          source,
        });
      }
    } catch (_) { /* dir missing */ }
  };

  // Priority order (later wins): builtin → plugins → workspace
  readSkillDir(_builtinSkillsDir(), 'builtin');
  for (const { plugin, dir } of pluginSkillsDirs(cwd)) readSkillDir(dir, `plugin:${plugin}`);
  readSkillDir(path.join(cwd, 'stdd', 'skills'), 'workspace');

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * List available skills (TTL-cached — see LIST_CACHE_TTL_MS).
 * Workspace skills (stdd/skills/<name>/SKILL.md) override built-in templates
 * with the same name.
 * @returns {Array<{name, description, riskLevel?, phase?, source}>}
 */
function listSkills(cwd = process.cwd()) {
  return _cachedList(`skills:${path.resolve(cwd)}`, () => _listSkillsUncached(cwd));
}

/**
 * Names-only fast path for Tab completion: a readdir per root, no file
 * reads and no YAML parsing. Priority (later wins on clash, matching
 * loadSkill): builtin → plugins → workspace.
 */
function skillNames(cwd = process.cwd()) {
  return _cachedList(`skillNames:${path.resolve(cwd)}`, () => {
    const byLower = new Map();
    const readRoot = (dir) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) byLower.set(entry.name.toLowerCase(), entry.name);
        }
      } catch (_) { /* dir missing */ }
    };
    readRoot(_builtinSkillsDir());
    for (const { dir } of pluginSkillsDirs(cwd)) readRoot(dir);
    readRoot(path.join(cwd, 'stdd', 'skills'));
    return [...byLower.values()].sort((a, b) => a.localeCompare(b));
  });
}

function _firstBodyLine(body) {
  const line = String(body || '').split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>'));
  return line ? line.trim() : '';
}

/**
 * Load one skill by name (accepts "commit", "stdd.commit", "/stdd:commit").
 * Directory names are matched case-insensitively.
 * @returns {{name, description, riskLevel, phase, body, source}|null}
 */
function loadSkill(name, cwd = process.cwd()) {
  const normalized = normalizeSkillName(name);
  if (!normalized) return null;

  const candidates = [
    { dir: path.join(cwd, 'stdd', 'skills'), source: 'workspace' },
    ...pluginSkillsDirs(cwd).map(({ plugin, dir }) => ({ dir, source: `plugin:${plugin}` })),
    { dir: _builtinSkillsDir(), source: 'builtin' },
  ];
  for (const { dir, source } of candidates) {
    // Directory casing may differ from the (lowercased) normalized name
    let match = null;
    try {
      match = fs.readdirSync(dir).find(e => e.toLowerCase() === normalized);
    } catch (_) { /* dir missing */ }
    if (!match) continue;
    const skillPath = path.join(dir, match, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const { frontmatter, body } = parseMarkdown(fs.readFileSync(skillPath, 'utf8'));
      return {
        name: match,
        description: String(frontmatter.description || _firstBodyLine(body) || ''),
        riskLevel: frontmatter.risk_level,
        phase: frontmatter.phase,
        body,
        source,
      };
    }
  }
  return null;
}

// Shared template rendering for skills and command templates: substitute
// $ARGUMENTS (Claude Code convention). The no-args cleanup is scoped to the
// placeholder site only — a global whitespace collapse would corrupt code
// fences and aligned tables inside the body.
function renderTemplate(label, body, argsString) {
  const args = String(argsString || '').trim();
  const rendered = args
    ? body.split('$ARGUMENTS').join(args)
    : body.replace(/[ \t]*\$ARGUMENTS([ \t]*\n)?/g, '').trim();
  return `[${label}]\n\n${rendered}`;
}

/**
 * Render a skill into a user prompt for the REPL, substituting $ARGUMENTS
 * (Claude Code command-template convention).
 */
function renderSkillPrompt(name, argsString = '', cwd = process.cwd()) {
  const skill = loadSkill(name, cwd);
  if (!skill) return null;
  return renderTemplate(`Skill: ${skill.name}`, skill.body, argsString);
}

// ── Command templates ──

/**
 * List command templates (TTL-cached; builtin → plugins → workspace priority).
 */
function _listCommandsUncached(cwd = process.cwd()) {
  const byName = new Map();
  const readDir = (dir, source) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        const name = entry.name.replace(/\.md$/, '');
        const { frontmatter, body } = parseMarkdown(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
        byName.set(name, {
          name,
          description: String(frontmatter.description || _firstBodyLine(body) || ''),
          source,
        });
      }
    } catch (_) { /* dir missing */ }
  };
  // Priority order (later wins): builtin → plugins → workspace
  readDir(_builtinCommandsDir(), 'builtin');
  for (const { plugin, dir } of pluginCommandsDirs(cwd)) readDir(dir, `plugin:${plugin}`);
  readDir(path.join(cwd, 'stdd', 'commands'), 'workspace');
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function listCommands(cwd = process.cwd()) {
  return _cachedList(`commands:${path.resolve(cwd)}`, () => _listCommandsUncached(cwd));
}

/**
 * Names-only fast path for Tab completion (readdir per root, no file reads).
 */
function commandNames(cwd = process.cwd()) {
  return _cachedList(`commandNames:${path.resolve(cwd)}`, () => {
    const byLower = new Map();
    const readRoot = (dir) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isFile() && entry.name.endsWith('.md')) {
            byLower.set(entry.name.replace(/\.md$/, '').toLowerCase(), entry.name.replace(/\.md$/, ''));
          }
        }
      } catch (_) { /* dir missing */ }
    };
    readRoot(_builtinCommandsDir());
    for (const { dir } of pluginCommandsDirs(cwd)) readRoot(dir);
    readRoot(path.join(cwd, 'stdd', 'commands'));
    return [...byLower.values()].sort((a, b) => a.localeCompare(b));
  });
}

/**
 * Load one command template by name (traversal-guarded, case-insensitive).
 * @returns {{name, description, body, source}|null}
 */
function loadCommand(name, cwd = process.cwd()) {
  const normalized = String(name || '').trim().toLowerCase().replace(/\.md$/, '');
  if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) return null;
  const candidates = [
    { dir: path.join(cwd, 'stdd', 'commands'), source: 'workspace' },
    ...pluginCommandsDirs(cwd).map(({ plugin, dir }) => ({ dir, source: `plugin:${plugin}` })),
    { dir: _builtinCommandsDir(), source: 'builtin' },
  ];
  for (const { dir, source } of candidates) {
    let match = null;
    try {
      match = fs.readdirSync(dir).find(f => f.toLowerCase() === `${normalized}.md`);
    } catch (_) { /* dir missing */ }
    if (!match) continue;
    const { frontmatter, body } = parseMarkdown(fs.readFileSync(path.join(dir, match), 'utf8'));
    return { name: match.replace(/\.md$/, ''), description: String(frontmatter.description || ''), body, source };
  }
  return null;
}

/**
 * Render a command template into a user prompt, substituting $ARGUMENTS.
 */
function renderCommandPrompt(name, argsString = '', cwd = process.cwd()) {
  const cmd = loadCommand(name, cwd);
  if (!cmd) return null;
  return renderTemplate(`Command: ${cmd.name}`, cmd.body, argsString);
}

module.exports = {
  parseMarkdown,
  normalizeSkillName,
  listSkills,
  skillNames,
  loadSkill,
  renderSkillPrompt,
  listCommands,
  commandNames,
  loadCommand,
  renderCommandPrompt,
  _resetListCache,
};

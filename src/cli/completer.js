/**
 * Tab completion engine for Chaos Code REPL.
 * Three-layer matching: commands → model names → file paths.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SLASH_COMMANDS = [
  '/exit', '/quit', '/help', '/clear', '/connect', '/models', '/providers',
  '/diff', '/commit', '/rollback', '/undo', '/status', '/recommend', '/verify',
  '/doctor', '/model', '/compact', '/cost', '/session', '/reset',
  '/history', '/resume', '/export', '/verbose', '/config',
];

/**
 * Create a completer function for readline.
 * @param {object} opts
 * @param {string[]} [opts.models] - Available model names from active provider
 * @returns {function} completer(line) => [[matches], original]
 */
function createCompleter(opts = {}) {
  const { getModels } = opts;

  return function completer(line) {
    // ── Layer 1: Slash command completion ──
    if (line.startsWith('/')) {
      const hits = SLASH_COMMANDS.filter(c => c.startsWith(line));
      return [hits.length ? hits : SLASH_COMMANDS, line];
    }

    // ── Layer 2: Model name completion after "/model " ──
    if (/^\/model\s+/.test(line)) {
      const models = getModels ? getModels() : [];
      const partial = line.replace(/^\/model\s+/, '');
      const hits = models.filter(m => m.startsWith(partial));
      // Return full "/model <name>" strings for readline
      const full = hits.map(m => '/model ' + m);
      return [full.length ? full : models.map(m => '/model ' + m), line];
    }

    // ── Layer 3: File path completion ──
    const pathHit = tryPathCompletion(line);
    if (pathHit) return pathHit;

    // No match
    return [[], line];
  };
}

/**
 * Attempt file path completion.
 * Detects paths starting with ./ ../ ~/ or absolute paths.
 */
function tryPathCompletion(line) {
  // Extract last word (potential path)
  const words = line.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (!lastWord) return null;

  let dirPath, prefix;

  if (lastWord.startsWith('~/')) {
    dirPath = path.join(os.homedir(), lastWord.slice(2));
    prefix = lastWord;
  } else if (lastWord.startsWith('./') || lastWord.startsWith('../') || lastWord.startsWith('/')) {
    dirPath = path.resolve(lastWord);
    prefix = lastWord;
  } else {
    return null;
  }

  // If the path ends with a separator or is a directory, list its contents
  if (lastWord.endsWith('/') || lastWord === '~') {
    try {
      const entries = fs.readdirSync(dirPath).slice(0, 50);
      const full = entries.map(e => {
        const base = line.slice(0, line.length - lastWord.length);
        return base + (lastWord === '~' ? '~/' : lastWord) + e;
      });
      return [full, line];
    } catch (_) {
      return null;
    }
  }

  // Otherwise, list entries matching the prefix of the directory
  const parentDir = path.dirname(dirPath);
  const baseName = path.basename(dirPath);

  try {
    const entries = fs.readdirSync(parentDir).slice(0, 50);
    const matches = entries.filter(e => e.startsWith(baseName));
    if (matches.length === 0) return null;

    const base = line.slice(0, line.length - baseName.length);
    const full = matches.map(e => base + e);
    return [full, line];
  } catch (_) {
    return null;
  }
}

module.exports = { createCompleter, SLASH_COMMANDS };

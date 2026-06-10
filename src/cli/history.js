/**
 * Command history manager with JSONL persistence.
 * Stores at ~/.chaos/history.jsonl, max 10000 entries (FIFO).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CHAOS_DIR = path.join(os.homedir(), '.chaos');
const HISTORY_FILE = path.join(CHAOS_DIR, 'history.jsonl');
const MAX_ENTRIES = 10000;

function _ensureDir() {
  if (!fs.existsSync(CHAOS_DIR)) fs.mkdirSync(CHAOS_DIR, { recursive: true });
}

/**
 * Append an entry to history.
 * @param {string} input - The user input
 * @param {'command'|'prompt'} type
 */
function appendHistory(input, type = 'prompt') {
  if (!input || !input.trim()) return;
  input = input.trim();

  // Skip duplicate consecutive entries
  const last = _readLastLine();
  if (last && last.input === input) return;

  _ensureDir();
  const entry = JSON.stringify({ ts: new Date().toISOString(), input, type });
  fs.appendFileSync(HISTORY_FILE, entry + '\n', 'utf8');

  // Trim if over limit
  _trimIfNeeded();
}

/**
 * Read all history entries.
 * @returns {Array<{ts: string, input: string, type: string}>}
 */
function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
  return lines.map(l => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
}

/**
 * Get recent inputs for readline history navigation.
 * Returns deduplicated, most-recent-last array.
 * @param {number} limit
 * @returns {string[]}
 */
function getRecentInputs(limit = 1000) {
  const entries = readHistory();
  // Deduplicate consecutive, keep order
  const seen = new Set();
  const result = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const inp = entries[i].input;
    if (!seen.has(inp)) {
      seen.add(inp);
      result.unshift(inp);
    }
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Search history by keyword.
 * @param {string} keyword
 * @param {number} limit
 * @returns {Array<{ts: string, input: string, type: string}>}
 */
function searchHistory(keyword, limit = 20) {
  const kw = keyword.toLowerCase();
  return readHistory()
    .filter(e => e.input.toLowerCase().includes(kw))
    .slice(-limit)
    .reverse();
}

/**
 * Clear all history.
 */
function clearHistory() {
  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
}

// ── Internal helpers ──

function _readLastLine() {
  if (!fs.existsSync(HISTORY_FILE)) return null;
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf8').trim();
    const lines = content.split('\n');
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch (_) {
    return null;
  }
}

function _trimIfNeeded() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return;
    const stat = fs.statSync(HISTORY_FILE);
    // Quick check: if file < 1MB, skip detailed trimming
    if (stat.size < 1024 * 1024) return;

    const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
    if (lines.length <= MAX_ENTRIES) return;

    const trimmed = lines.slice(lines.length - MAX_ENTRIES);
    fs.writeFileSync(HISTORY_FILE, trimmed.join('\n') + '\n', 'utf8');
  } catch (_) { /* non-critical */ }
}

module.exports = { appendHistory, readHistory, getRecentInputs, searchHistory, clearHistory };

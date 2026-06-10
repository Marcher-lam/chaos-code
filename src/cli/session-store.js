/**
 * Session persistence manager.
 * Saves/loads chat history and session metadata to ~/.chaos/sessions/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CHAOS_DIR = path.join(os.homedir(), '.chaos');
const SESSIONS_DIR = path.join(CHAOS_DIR, 'sessions');
const MAX_SESSIONS = 50;

function _ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Generate a new session ID.
 */
function createSessionId() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const id = crypto.randomBytes(4).toString('hex');
  return `${ts}-${id}`;
}

/**
 * Save a session.
 * @param {string} sessionId
 * @param {object} data
 * @param {Array} data.chatHistory - Message array
 * @param {object} [data.stats] - Session stats (tokens, cost, etc.)
 * @param {string} [data.provider] - Provider ID
 * @param {string} [data.model] - Model name
 */
function saveSession(sessionId, data) {
  _ensureDir();
  const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(file, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString(),
  }, null, 2), 'utf8');

  // Trim old sessions
  _trimSessions();
}

/**
 * Load a session by ID.
 * @param {string} sessionId
 * @returns {object|null}
 */
function loadSession(sessionId) {
  const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * List recent sessions.
 * @param {number} limit
 * @returns {Array<{id: string, savedAt: string, provider: string, model: string, messageCount: number}>}
 */
function listSessions(limit = 10) {
  _ensureDir();
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
        return {
          id: f.replace('.json', ''),
          savedAt: data.savedAt || '',
          provider: data.provider || '',
          model: data.model || '',
          messageCount: (data.chatHistory || []).length,
        };
      } catch (_) {
        return null;
      }
    }).filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * Delete a session.
 */
function deleteSession(sessionId) {
  const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function _trimSessions() {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();
    while (files.length > MAX_SESSIONS) {
      const oldest = files.shift();
      fs.unlinkSync(path.join(SESSIONS_DIR, oldest));
    }
  } catch (_) { /* non-critical */ }
}

module.exports = { createSessionId, saveSession, loadSession, listSessions, deleteSession };
